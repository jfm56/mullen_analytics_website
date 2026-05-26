"""
EMSCharts CSV Cleaning Pipeline — v1

Cleaning steps:
1. Load CSV with pandas (all columns as strings to avoid type coercion)
2. Standardize column names: lowercase, trim, underscores, remove special chars
3. Remove completely empty rows
4. Remove completely empty columns
5. Detect duplicate rows (count only, do not drop)
6. Trim whitespace from all text fields
7. Attempt to parse date/time columns
8. Detect missing values per column
9. Save cleaned CSV
10. Return summary stats

Philosophy: conservative — do not drop rows with missing values, do not
rename EMS domain fields. Only structural/formatting normalization.
"""

import re
import logging
from pathlib import Path
from typing import Dict, Any

import pandas as pd

logger = logging.getLogger(__name__)


def _standardize_col(col: str) -> str:
    """Lowercase, strip, spaces→underscores, strip non-alphanumeric (keep _)."""
    col = str(col).strip().lower()
    col = re.sub(r"\s+", "_", col)
    col = re.sub(r"[^a-z0-9_]", "", col)
    col = re.sub(r"_+", "_", col)  # collapse multiple underscores
    col = col.strip("_")
    return col or "unnamed"


_DATE_KEYWORDS = {"date", "time", "dt", "dttm", "datetime", "timestamp", "dob"}


def _looks_like_date_col(col: str) -> bool:
    return any(kw in col.split("_") or col.endswith(kw) for kw in _DATE_KEYWORDS)


def run_ems_cleaning(file_path: str, output_path: str) -> Dict[str, Any]:
    """
    Run the cleaning pipeline on an EMSCharts CSV.

    Args:
        file_path:   Absolute path to the original uploaded CSV.
        output_path: Absolute path where the cleaned CSV should be saved.

    Returns:
        dict with keys:
          row_count_original, row_count_cleaned, duplicate_rows_count,
          removed_rows_count, missing_values_summary, cleaning_notes
    """
    logger.info("EMS cleaning: loading %s", file_path)

    df = pd.read_csv(file_path, dtype=str, keep_default_na=True, low_memory=False)
    row_count_original = len(df)
    col_count_original = len(df.columns)

    # ── 1. Standardize column names ──────────────────────────────────────────
    df.columns = [_standardize_col(c) for c in df.columns]

    # ── 2. Remove completely empty rows ──────────────────────────────────────
    before_empty_rows = len(df)
    df.dropna(how="all", inplace=True)
    # also drop rows where every cell is an empty string after stripping
    all_blank_mask = df.apply(
        lambda row: all(
            (pd.isna(v) or str(v).strip() in ("", "nan", "NaN", "None"))
            for v in row
        ),
        axis=1,
    )
    df = df[~all_blank_mask]
    empty_rows_removed = before_empty_rows - len(df)

    # ── 3. Remove completely empty columns ───────────────────────────────────
    def _col_all_blank(series: pd.Series) -> bool:
        return series.apply(
            lambda v: pd.isna(v) or str(v).strip() in ("", "nan", "NaN", "None")
        ).all()

    empty_cols = [c for c in df.columns if _col_all_blank(df[c])]
    df.drop(columns=empty_cols, inplace=True)

    # ── 4. Detect duplicate rows (count, do not drop) ────────────────────────
    duplicate_rows_count = int(df.duplicated().sum())

    # ── 5. Trim whitespace from text fields ──────────────────────────────────
    for col in df.columns:
        df[col] = df[col].apply(
            lambda v: str(v).strip()
            if (pd.notna(v) and str(v).strip() not in ("nan", "NaN", "None"))
            else (None if pd.isna(v) else v)
        )

    # ── 6. Parse date/time columns ───────────────────────────────────────────
    date_cols_parsed: list[str] = []
    for col in df.columns:
        if _looks_like_date_col(col):
            try:
                parsed = pd.to_datetime(df[col], errors="coerce")
                if parsed.notna().sum() > 0:
                    df[col] = parsed.dt.strftime("%Y-%m-%d %H:%M:%S").where(parsed.notna(), None)
                    date_cols_parsed.append(col)
            except Exception:
                pass

    # ── 7. Missing value summary (after cleaning) ────────────────────────────
    missing_values_summary: Dict[str, int] = {}
    for col in df.columns:
        n_missing = int(
            df[col].apply(lambda v: pd.isna(v) or str(v).strip() in ("", "nan")).sum()
        )
        if n_missing > 0:
            missing_values_summary[col] = n_missing

    row_count_cleaned = len(df)
    removed_rows_count = row_count_original - row_count_cleaned

    # ── 8. Save cleaned CSV ───────────────────────────────────────────────────
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    logger.info("EMS cleaning: saved cleaned file to %s (%d rows)", output_path, row_count_cleaned)

    notes_parts = [
        f"Original: {row_count_original} rows, {col_count_original} columns.",
        f"Removed {empty_rows_removed} empty row(s).",
        f"Removed {len(empty_cols)} empty column(s).",
        f"Found {duplicate_rows_count} duplicate row(s) (not dropped).",
        f"Parsed {len(date_cols_parsed)} date column(s): {', '.join(date_cols_parsed) or 'none'}.",
        f"Cleaned: {row_count_cleaned} rows, {len(df.columns)} columns.",
    ]

    return {
        "row_count_original": row_count_original,
        "row_count_cleaned": row_count_cleaned,
        "duplicate_rows_count": duplicate_rows_count,
        "removed_rows_count": removed_rows_count,
        "missing_values_summary": missing_values_summary,
        "cleaning_notes": " ".join(notes_parts),
    }
