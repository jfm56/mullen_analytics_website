"""
Data profiling service.

Generates a statistical profile (column types, missing values, unique counts,
sample values, numeric summaries) from an uploaded/cleaned CSV.
All filtering is pandas-based — no raw SQL from the frontend.
"""

import math
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ALLOWED_OPERATORS = {
    "equals", "not_equals", "contains", "starts_with", "ends_with",
    "gt", "gte", "lt", "lte", "between", "in", "is_null", "is_not_null",
}

MAX_SAMPLE_VALUES = 10
CATEGORICAL_MAX_UNIQUE_ABS = 200
CATEGORICAL_MAX_UNIQUE_FRACTION = 0.5

AGG_FN_MAP = {
    "sum": "sum",
    "average": "mean",
    "median": "median",
    "min": "min",
    "max": "max",
}


# ---------------------------------------------------------------------------
# Serialisation helpers
# ---------------------------------------------------------------------------

def _safe(v: Any) -> Any:
    """Convert numpy / pandas scalars and NaN → JSON-safe Python types."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if hasattr(v, "item"):          # numpy scalar
        r = v.item()
        if isinstance(r, float) and (math.isnan(r) or math.isinf(r)):
            return None
        return r
    if hasattr(v, "isoformat"):     # datetime / Timestamp
        return v.isoformat()
    return v


# ---------------------------------------------------------------------------
# Dtype detection
# ---------------------------------------------------------------------------

_DATE_KEYWORDS = ("date", "time", "dt", "timestamp")


def _map_dtype(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series.dtype):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series.dtype):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(series.dtype):
        return "date"
    name = str(series.name).lower()
    if any(kw in name for kw in _DATE_KEYWORDS):
        sample = series.dropna().head(30)
        if len(sample) > 0:
            parsed = pd.to_datetime(sample, errors="coerce")
            if parsed.notna().sum() / len(sample) >= 0.75:
                return "date"
    return "text"


# ---------------------------------------------------------------------------
# CSV loader — prefers cleaned file
# ---------------------------------------------------------------------------

def _load_df(upload, db) -> Optional[pd.DataFrame]:
    from ..models.data_upload import DataCleaningResult

    if upload.upload_status == "CLEANED":
        result = (
            db.query(DataCleaningResult)
            .filter(DataCleaningResult.data_upload_id == upload.id)
            .filter(DataCleaningResult.cleaned_file_path.isnot(None))
            .order_by(DataCleaningResult.created_at.desc())
            .first()
        )
        if result and result.cleaned_file_path and Path(result.cleaned_file_path).exists():
            try:
                return pd.read_csv(result.cleaned_file_path, low_memory=False)
            except Exception:
                pass

    if upload.file_path and Path(upload.file_path).exists():
        try:
            return pd.read_csv(upload.file_path, low_memory=False)
        except Exception:
            pass

    return None


# ---------------------------------------------------------------------------
# Core profiler
# ---------------------------------------------------------------------------

def profile_dataset(upload, db) -> Dict[str, Any]:
    """Compute full statistical profile for an upload and return as dict."""
    df = _load_df(upload, db)
    if df is None:
        return {
            "error": "File not found or unreadable",
            "row_count": 0, "column_count": 0,
            "columns": [], "data_types": {}, "missing_values": {},
            "missing_percent": {}, "unique_counts": {}, "sample_values": {},
            "numeric_summary": {}, "date_columns_detected": [],
            "categorical_columns_detected": [], "date_range": None,
        }

    row_count, col_count = df.shape
    columns = list(df.columns)

    data_types: Dict[str, str] = {}
    missing_values: Dict[str, int] = {}
    missing_percent: Dict[str, float] = {}
    unique_counts: Dict[str, int] = {}
    sample_values: Dict[str, List] = {}
    numeric_summary: Dict[str, Dict] = {}
    date_cols: List[str] = []
    cat_cols: List[str] = []

    for col in columns:
        s = df[col]
        dtype_str = _map_dtype(s)
        data_types[col] = dtype_str

        miss = int(s.isna().sum())
        missing_values[col] = miss
        missing_percent[col] = round(miss / row_count * 100, 2) if row_count > 0 else 0.0

        n_uniq = int(s.nunique(dropna=True))
        unique_counts[col] = n_uniq

        try:
            samples = [_safe(v) for v in s.dropna().unique()[:MAX_SAMPLE_VALUES].tolist()]
        except Exception:
            samples = []
        sample_values[col] = samples

        if dtype_str == "number":
            num = pd.to_numeric(s, errors="coerce")
            mn, mx, me, md, st = num.min(), num.max(), num.mean(), num.median(), num.std()
            numeric_summary[col] = {
                "min": _safe(mn), "max": _safe(mx),
                "mean": _safe(round(float(me), 4)) if not (isinstance(me, float) and math.isnan(me)) else None,
                "median": _safe(md),
                "std": _safe(round(float(st), 4)) if not (isinstance(st, float) and math.isnan(st)) else None,
            }

        if dtype_str == "date":
            date_cols.append(col)

        if dtype_str == "text" and row_count > 0:
            if n_uniq <= CATEGORICAL_MAX_UNIQUE_ABS and (n_uniq / row_count) <= CATEGORICAL_MAX_UNIQUE_FRACTION:
                cat_cols.append(col)

    # Date range from first parseable date column
    date_range = None
    for dc in date_cols:
        try:
            parsed = pd.to_datetime(df[dc], errors="coerce").dropna()
            if len(parsed) > 0:
                date_range = {
                    "column": dc,
                    "min": parsed.min().isoformat(),
                    "max": parsed.max().isoformat(),
                }
                break
        except Exception:
            pass

    return {
        "row_count": row_count,
        "column_count": col_count,
        "columns": columns,
        "data_types": data_types,
        "missing_values": missing_values,
        "missing_percent": missing_percent,
        "unique_counts": unique_counts,
        "sample_values": sample_values,
        "numeric_summary": numeric_summary,
        "date_columns_detected": date_cols,
        "categorical_columns_detected": cat_cols,
        "date_range": date_range,
    }


# ---------------------------------------------------------------------------
# Filter options
# ---------------------------------------------------------------------------

def get_filter_options(upload, column_name: str, db) -> List:
    """Return sorted unique values for a column (categorical dropdowns)."""
    df = _load_df(upload, db)
    if df is None or column_name not in df.columns:
        return []
    vals = [_safe(v) for v in df[column_name].dropna().unique()[:200].tolist()]
    return sorted(vals, key=lambda x: str(x) if x is not None else "")


# ---------------------------------------------------------------------------
# Filter engine
# ---------------------------------------------------------------------------

def _apply_one(df: pd.DataFrame, col: str, operator: str, value: Any) -> pd.DataFrame:
    if col not in df.columns:
        return df
    s = df[col]
    try:
        if operator == "is_null":
            return df[s.isna()]
        if operator == "is_not_null":
            return df[s.notna()]

        # Detect if column is mostly numeric
        num = pd.to_numeric(s, errors="coerce")
        is_numeric = num.notna().sum() / max(len(s), 1) > 0.5

        if operator == "equals":
            return df[num == float(value)] if is_numeric else df[s.astype(str).str.strip() == str(value)]
        if operator == "not_equals":
            return df[num != float(value)] if is_numeric else df[s.astype(str).str.strip() != str(value)]
        if operator == "contains":
            return df[s.astype(str).str.contains(str(value), case=False, na=False)]
        if operator == "starts_with":
            return df[s.astype(str).str.startswith(str(value), na=False)]
        if operator == "ends_with":
            return df[s.astype(str).str.endswith(str(value), na=False)]
        if operator in ("gt", "gte", "lt", "lte"):
            fv = float(value)
            masks = {"gt": num > fv, "gte": num >= fv, "lt": num < fv, "lte": num <= fv}
            return df[masks[operator]]
        if operator == "between":
            lo, hi = value[0], value[1]
            if is_numeric:
                return df[(num >= float(lo)) & (num <= float(hi))]
            dt = pd.to_datetime(s, errors="coerce")
            if dt.notna().sum() / max(len(s), 1) > 0.5:
                return df[(dt >= pd.Timestamp(lo)) & (dt <= pd.Timestamp(hi))]
            return df
        if operator == "in":
            vals = [str(v) for v in (value if isinstance(value, list) else [value])]
            return df[s.astype(str).isin(vals)]
    except Exception:
        pass
    return df


def apply_filters(df: pd.DataFrame, filters: List[Dict]) -> pd.DataFrame:
    """Apply a list of filter specs to a DataFrame. No eval/SQL — pure pandas."""
    for f in filters:
        op = f.get("operator", "")
        if op not in ALLOWED_OPERATORS:
            continue
        df = _apply_one(df, str(f.get("column", "")), op, f.get("value"))
    return df


# ---------------------------------------------------------------------------
# Query (paginated rows)
# ---------------------------------------------------------------------------

def query_dataset(
    upload, db,
    filters: List[Dict],
    selected_columns: List[str],
    limit: int,
    offset: int,
    sort_by: Optional[str] = None,
    sort_dir: str = "asc",
) -> Dict[str, Any]:
    df = _load_df(upload, db)
    if df is None:
        return {"rows": [], "total": 0, "columns": [], "limit": limit, "offset": offset}

    if filters:
        df = apply_filters(df, filters)

    total = len(df)

    if sort_by and sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=(sort_dir.lower() != "desc"), na_position="last")

    if selected_columns:
        valid = [c for c in selected_columns if c in df.columns]
        if valid:
            df = df[valid]

    page = df.iloc[offset: offset + limit]
    rows = [{k: _safe(v) for k, v in row.items()} for _, row in page.iterrows()]

    return {
        "rows": rows,
        "total": total,
        "columns": list(df.columns),
        "limit": limit,
        "offset": offset,
    }


# ---------------------------------------------------------------------------
# Preview (first N rows, no filters)
# ---------------------------------------------------------------------------

def preview_dataset(upload, db, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    df = _load_df(upload, db)
    if df is None:
        return {"rows": [], "total": 0, "columns": [], "limit": limit, "offset": offset}
    total = len(df)
    page = df.iloc[offset: offset + limit]
    rows = [{k: _safe(v) for k, v in row.items()} for _, row in page.iterrows()]
    return {"rows": rows, "total": total, "columns": list(df.columns), "limit": limit, "offset": offset}


# ---------------------------------------------------------------------------
# Chart data
# ---------------------------------------------------------------------------

def get_chart_data(
    upload, db,
    x_col: str,
    y_col: Optional[str],
    aggregation: str,
    filters: List[Dict],
    limit: int = 50,
) -> Dict[str, Any]:
    df = _load_df(upload, db)
    base = {"data": [], "x_col": x_col, "y_col": y_col, "aggregation": aggregation}
    if df is None or x_col not in df.columns:
        return base

    if filters:
        df = apply_filters(df, filters)

    df = df.dropna(subset=[x_col])
    if df.empty:
        return base

    try:
        use_count = aggregation == "count" or not y_col or y_col not in df.columns
        if use_count:
            grouped = df.groupby(x_col).size().reset_index(name="value")
        else:
            agg_fn = AGG_FN_MAP.get(aggregation, "count")
            if agg_fn == "count":
                grouped = df.groupby(x_col).size().reset_index(name="value")
            else:
                y_num = pd.to_numeric(df[y_col], errors="coerce")
                tmp = df[[x_col]].copy()
                tmp["__y__"] = y_num
                grouped = tmp.groupby(x_col)["__y__"].agg(agg_fn).reset_index(name="value")

        grouped = grouped.dropna(subset=["value"])
        grouped = grouped.sort_values("value", ascending=False).head(limit)

        data = [{"name": _safe(row[x_col]), "value": _safe(row["value"])}
                for _, row in grouped.iterrows()]
        return {**base, "data": data, "total_groups": len(grouped)}
    except Exception as exc:
        return {**base, "error": str(exc)}
