"""
Date-range comparison across "like" files.

Pools cleaned uploads that share the SAME column structure — so only compatible
EMSCharts exports get combined; odd/one-off files with different columns stay in
their own group and never contaminate the pool. The pool is de-duplicated by
incident id, then the full dashboard metrics are computed for each user-defined
FROM/TO window, letting windows be compared side-by-side even when their rows
span multiple files.

FROM/TO are inclusive by calendar day (TO covers the entire day), sliced on the
dispatch datetime.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

import pandas as pd

from ..models.data_upload import DataUpload
from .ems_analytics_service import compute_ems_metrics, detect_column, detect_mapped_column
from .ems_filter_service import _load_cleaned_df

logger = logging.getLogger(__name__)

def _norm(c: str) -> str:
    return str(c).strip().lower()


def _schema_sig(cols) -> str:
    """Order-independent signature of a column set, so re-ordered but otherwise
    identical exports still group together."""
    return "|".join(sorted(_norm(c) for c in cols))


def _date_col(df: pd.DataFrame) -> Optional[str]:
    """Dispatch datetime is the reference for slicing; fall back to a generic
    incident date if dispatch isn't present."""
    return detect_mapped_column(df, "dispatch_time", None) or detect_column(df, "incident_date")


def _bounds(df: pd.DataFrame) -> tuple[Optional[str], Optional[str]]:
    col = _date_col(df)
    if not col:
        return None, None
    parsed = pd.to_datetime(df[col], errors="coerce").dropna()
    if not len(parsed):
        return None, None
    return str(parsed.min().date()), str(parsed.max().date())


def combinable_groups(uploads: List[DataUpload], db) -> List[Dict[str, Any]]:
    """Group cleaned uploads by identical column structure ("like files")."""
    groups: Dict[str, Dict[str, Any]] = {}
    for up in uploads:
        df = _load_cleaned_df(up, db)
        if df is None or df.empty:
            continue
        sig = _schema_sig(df.columns)
        g = groups.setdefault(sig, {"columns": sorted(_norm(c) for c in df.columns), "files": []})
        dmin, dmax = _bounds(df)
        g["files"].append({
            "upload_id": str(up.id),
            "filename": up.original_filename,
            "rows": int(len(df)),
            "date_min": dmin,
            "date_max": dmax,
            "uploaded_at": up.created_at.isoformat() if up.created_at else None,
        })

    out: List[Dict[str, Any]] = []
    # Largest groups first — the real EMSCharts exports rise to the top.
    ordered = sorted(groups.values(), key=lambda x: -sum(f["rows"] for f in x["files"]))
    for i, g in enumerate(ordered):
        mins = [f["date_min"] for f in g["files"] if f["date_min"]]
        maxs = [f["date_max"] for f in g["files"] if f["date_max"]]
        out.append({
            "group_id": f"g{i}",
            "file_count": len(g["files"]),
            "total_rows": sum(f["rows"] for f in g["files"]),
            "column_count": len(g["columns"]),
            "date_min": min(mins) if mins else None,
            "date_max": max(maxs) if maxs else None,
            "files": sorted(g["files"], key=lambda f: (f.get("date_min") or "", f["filename"])),
            "columns_preview": g["columns"][:14],
        })
    return out


def _slice_window(pooled: pd.DataFrame, frm: Optional[str], to: Optional[str]) -> pd.DataFrame:
    """Inclusive-by-day slice on the dispatch datetime (TO covers the whole day)."""
    col = _date_col(pooled)
    if not col or (not frm and not to):
        return pooled
    parsed = pd.to_datetime(pooled[col], errors="coerce")
    mask = parsed.notna()
    if frm:
        start = pd.to_datetime(frm, errors="coerce")
        if pd.notna(start):
            mask &= parsed >= start
    if to:
        end = pd.to_datetime(to, errors="coerce")
        if pd.notna(end):
            # +1 day, exclusive → the entire TO calendar day is included.
            mask &= parsed < (end + pd.Timedelta(days=1))
    return pooled[mask]


def _metrics_for(df: pd.DataFrame, label: str) -> Optional[Dict[str, Any]]:
    if df.empty:
        return None
    fd, tmp = tempfile.mkstemp(suffix=".csv")
    os.close(fd)
    try:
        df.to_csv(tmp, index=False)
        m = compute_ems_metrics(
            tmp,
            {"file_name": label, "row_count_original": len(df), "row_count_cleaned": len(df)},
            {"duplicate_rows_count": 0, "removed_rows_count": 0, "missing_values_summary": {}},
            None,
        )
        return m if isinstance(m, dict) and not m.get("error") else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("daterange: metrics failed for %s: %s", label, exc)
        return None
    finally:
        try:
            os.remove(tmp)
        except Exception:  # noqa: BLE001
            pass


def daterange_compare(uploads: List[DataUpload], windows: List[Dict[str, Any]], db) -> Dict[str, Any]:
    """Pool the given uploads (de-duped by incident) and compute full metrics for
    each FROM/TO window."""
    dfs: List[pd.DataFrame] = []
    for up in uploads:
        df = _load_cleaned_df(up, db)
        if df is not None and not df.empty:
            dfs.append(df)
    if not dfs:
        return {"error": "No cleaned data available for the selected files."}

    pooled = pd.concat(dfs, ignore_index=True, sort=False)
    rows_pooled = len(pooled)
    deduped = 0
    if len(dfs) > 1:
        # Only when pooling MULTIPLE files: drop EXACT duplicate rows (the same record
        # appearing in two overlapping exports). This never collapses legitimate
        # multi-unit / multi-patient rows (they differ in other columns). A single
        # file is used as-is so its slices match the dashboard's own numbers exactly.
        pooled = pooled.drop_duplicates()
        deduped = rows_pooled - len(pooled)

    pmin, pmax = _bounds(pooled)

    results: List[Dict[str, Any]] = []
    for w in windows:
        frm, to = (w.get("from") or None), (w.get("to") or None)
        label = w.get("label") or f"{frm or '…'} → {to or '…'}"
        sliced = _slice_window(pooled, frm, to)
        results.append({
            "label": label,
            "from": frm,
            "to": to,
            "row_count": int(len(sliced)),
            "empty": bool(sliced.empty),
            "metrics": _metrics_for(sliced, label),
        })

    return {
        "windows": results,
        "pool": {
            "files": len(dfs),
            "rows_pooled": rows_pooled,
            "rows_used": int(len(pooled)),
            "deduped": int(deduped),
            "date_min": pmin,
            "date_max": pmax,
        },
    }


def _dedup_key(pooled: pd.DataFrame) -> List[str]:
    """Natural key for collapsing the same unit-response that appears in overlapping
    exports: (call id, unit, dispatch time), using whichever are detectable."""
    return [c for c in (
        detect_column(pooled, "incident_number"),
        detect_column(pooled, "unit"),
        detect_mapped_column(pooled, "dispatch_time", None),
    ) if c]


def _pool(uploads: List[DataUpload], db):
    """Load + concat every cleaned upload that has a recognizable call id, tagging
    each row with its source filename. Returns (pooled_df|None, used, skipped).
    Columns align by name (missing -> NaN) so slightly-different exports still pool."""
    dfs: List[pd.DataFrame] = []
    used: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    for up in uploads:
        df = _load_cleaned_df(up, db)
        if df is None or df.empty:
            skipped.append({"filename": up.original_filename, "reason": "no cleaned data on server"})
            continue
        if detect_column(df, "incident_number") is None:
            skipped.append({"filename": up.original_filename, "reason": "no recognizable call-id column"})
            continue
        df = df.copy()
        df["__source_file"] = up.original_filename
        dfs.append(df)
        used.append({"upload_id": str(up.id), "filename": up.original_filename, "rows": int(len(df))})
    if not dfs:
        return None, used, skipped
    return pd.concat(dfs, ignore_index=True, sort=False), used, skipped


def _pooled_deduped(uploads: List[DataUpload], db):
    """Pool + drop overlapping duplicate unit-responses. Returns (pooled_df|None, meta).
    pooled_df keeps the __source_file column; callers drop it before metrics."""
    pooled, used, skipped = _pool(uploads, db)
    if pooled is None:
        return None, {
            "files_combined": 0, "files_total": len(uploads),
            "files_skipped": len(skipped), "skipped_files": skipped,
            "rows_pooled": 0, "rows_used": 0, "deduped": 0,
            "date_min": None, "date_max": None, "files": [],
        }
    rows_pooled = len(pooled)
    deduped = 0
    if len(used) > 1:
        key = _dedup_key(pooled)
        dup = pooled.duplicated(subset=key, keep="first") if key else pooled.duplicated(keep="first")
        deduped = int(dup.sum())
        pooled = pooled[~dup]
    pmin, pmax = _bounds(pooled)
    meta = {
        "files_combined": len(used), "files_total": len(uploads),
        "files_skipped": len(skipped), "skipped_files": skipped,
        "rows_pooled": rows_pooled, "rows_used": int(len(pooled)), "deduped": deduped,
        "date_min": pmin, "date_max": pmax, "files": used,
    }
    return pooled, meta


def combined_dashboard(uploads: List[DataUpload], db) -> Dict[str, Any]:
    """Pool every cleaned upload with a recognizable call id into ONE dashboard.
    Overlapping records are collapsed on the natural key; call volume counts unique
    incident ids so overlaps never double-count."""
    pooled, meta = _pooled_deduped(uploads, db)
    if pooled is None:
        return {"error": "No cleaned data with a recognizable call id to combine.", "pool": meta}
    body = pooled.drop(columns=["__source_file"], errors="ignore")
    metrics = _metrics_for(body, "Combined - all datasets")
    if not metrics:
        return {"error": "Could not compute combined metrics.", "pool": meta}
    return {"metrics": metrics, "generated_at": None, "pool": meta}


def combined_dashboard_filtered(uploads: List[DataUpload], db, filters: Dict[str, Any]) -> Dict[str, Any]:
    """Same pool, with dashboard filters applied — returns the metrics dict directly
    (like filtered_dashboard) so the combined view's filter bar renders it."""
    from .ems_filter_service import apply_dashboard_filters
    pooled, meta = _pooled_deduped(uploads, db)
    if pooled is None:
        return {"empty": True, "filters_applied": [], "row_count": 0, "pool": meta}
    body = pooled.drop(columns=["__source_file"], errors="ignore")
    body, applied = apply_dashboard_filters(body, filters or {}, None)
    if body.empty:
        return {"empty": True, "filters_applied": applied, "row_count": 0, "pool": meta}
    metrics = _metrics_for(body, "Combined - all datasets")
    if not metrics:
        return {"empty": True, "filters_applied": applied, "row_count": int(len(body)), "pool": meta}
    metrics["filters_applied"] = applied
    metrics["row_count"] = int(len(body))
    metrics["pool"] = meta
    return metrics


def combined_filter_options(uploads: List[DataUpload], db) -> Dict[str, Any]:
    """Filter options (units / municipalities / call types / date range / IFT count)
    over the pooled, de-duped data — so the combined view's filter bar is populated."""
    from .ems_filter_service import detect_interfacility_rows
    pooled, meta = _pooled_deduped(uploads, db)
    if pooled is None:
        return {"units": [], "municipalities": [], "call_types": [], "date_range": {}, "interfacility_count": 0}
    body = pooled.drop(columns=["__source_file"], errors="ignore")

    def uniq(field: str) -> List[str]:
        col = detect_mapped_column(body, field, None)
        if not col:
            return []
        vals = body[col].astype(str).str.strip().replace("", pd.NA).dropna().unique()
        return sorted(str(v) for v in vals if str(v) not in ("nan", "None", ""))[:300]

    date_col = detect_mapped_column(body, "incident_date", None)
    dr: Dict[str, str] = {}
    if date_col:
        p = pd.to_datetime(body[date_col], errors="coerce").dropna()
        if len(p):
            dr = {"min": str(p.min().date()), "max": str(p.max().date())}
    return {
        "units": uniq("unit"),
        "municipalities": uniq("municipality"),
        "call_types": uniq("incident_type"),
        "date_range": dr,
        "interfacility_count": int(detect_interfacility_rows(body).sum()),
    }


def combined_overlaps(uploads: List[DataUpload], db, limit: int = 1000) -> Dict[str, Any]:
    """List the overlapping unit-responses removed when pooling — each with the file
    it came from and the file whose (kept) row it duplicated, so the client can see
    WHAT was removed and WHY."""
    pooled, used, _skipped = _pool(uploads, db)
    if pooled is None or len(used) <= 1:
        return {"removed": [], "total": 0, "shown": 0, "key_fields": []}
    key = _dedup_key(pooled)
    if not key:
        return {"removed": [], "total": 0, "shown": 0, "key_fields": []}
    dup = pooled.duplicated(subset=key, keep="first")
    total = int(dup.sum())
    first = pooled[~dup]
    inc = detect_column(pooled, "incident_number")
    unit = detect_column(pooled, "unit")
    disp = detect_mapped_column(pooled, "dispatch_time", None)
    # key tuple -> source file of the kept (first) row it duplicates
    first_keys = list(zip(*[first[k].astype(str) for k in key]))
    keep_src = dict(zip(first_keys, first["__source_file"]))
    rem = pooled[dup].head(limit)
    rem_keys = list(zip(*[rem[k].astype(str) for k in key])) if len(rem) else []
    out: List[Dict[str, Any]] = []
    for (_, r), kv in zip(rem.iterrows(), rem_keys):
        out.append({
            "incident": None if inc is None else r.get(inc),
            "unit": None if unit is None else r.get(unit),
            "dispatch_time": None if disp is None else r.get(disp),
            "from_file": r.get("__source_file"),
            "duplicate_of_file": keep_src.get(kv),
        })
    return {"removed": out, "total": total, "shown": len(out), "key_fields": key}
