"""
Module 2 — Call Volume Analyzer.

Reads dispatch files and produces call volume summaries:
  - Total calls
  - Calls by month, day-of-week, hour-of-day
  - Calls by incident type, priority, unit, municipality
  - Busiest periods

When a cleaned DataFrame from data_quality.clean_dispatch() is provided
the pre-computed ``_dt_created`` and ``_hour / _month / _day_of_week``
columns are used directly.  Raw fallback is used otherwise.

If the data quality layer flagged ``datetime_all_zero_hour=True`` the
hourly breakdown is suppressed and a warning is returned instead.
"""
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from .columns import normalize_cols, resolve

# Unit filter is data-driven (see data_quality._infer_unit_pattern).
# No hardcoded pattern here — pattern comes from quality_report["detected_unit_pattern"].

logger = logging.getLogger(__name__)

_DOW_MAP = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}


def analyze_dispatch(
    df: pd.DataFrame,
    quality_report: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Produce call volume summary from *df*.

    Uses pre-computed calendar columns (``_hour``, ``_month``, etc.) when
    present; otherwise derives them fresh from the best available date column.
    """
    total = int(len(df))
    result: Dict[str, Any] = {
        "total_calls":     total,
        "by_month":        {},
        "by_day_of_week":  {},
        "by_hour":         {},
        "by_incident_type": {},
        "by_priority":     {},
        "by_unit":         {},
        "by_municipality": {},
        "busiest_month":   None,
        "busiest_hour":    None,
        "busiest_day":     None,
        "date_range":      {"start": None, "end": None},
        "warnings":        [],
    }

    chart_flags      = (quality_report or {}).get("chart_flags", {})
    all_zero_hour    = (quality_report or {}).get("datetime_all_zero_hour", False)
    missing_critical = (quality_report or {}).get("missing_critical", [])

    # ── Date series ───────────────────────────────────────────────────────
    dates: Optional[pd.Series] = None

    if "_dt_created" in df.columns:
        dates = df["_dt_created"].dropna()
    else:
        df_n = normalize_cols(df)
        date_col = resolve(df_n, "date_created") or resolve(df_n, "call_date")
        if date_col:
            dates = pd.to_datetime(df_n[date_col], errors="coerce").dropna()

    if chart_flags.get("call_volume_by_date") is False or missing_critical:
        result["warnings"].append(
            "Date column missing or unparseable — month/hour distributions unavailable."
        )
        dates = None

    if dates is not None and not dates.empty:
        result["date_range"]["start"] = str(dates.min().date())
        result["date_range"]["end"]   = str(dates.max().date())

        # ── Monthly distribution ──────────────────────────────────────
        if "_month" in df.columns and "_year" in df.columns:
            periods = df["_year"].astype(str) + "-" + df["_month"].astype(str).str.zfill(2)
            by_month = periods.value_counts().sort_index()
        else:
            by_month = dates.dt.to_period("M").astype(str).value_counts().sort_index()
        result["by_month"] = by_month.to_dict()
        if not by_month.empty:
            result["busiest_month"] = str(by_month.idxmax())

        # ── Day-of-week distribution ──────────────────────────────────
        if "_day_of_week" in df.columns:
            by_dow = df["_day_of_week"].map(_DOW_MAP).value_counts()
        else:
            by_dow = dates.dt.dayofweek.map(_DOW_MAP).value_counts()
        result["by_day_of_week"] = by_dow.to_dict()
        if not by_dow.empty:
            result["busiest_day"] = str(by_dow.idxmax())

        # ── Hourly distribution ───────────────────────────────────────
        if chart_flags.get("call_volume_by_hour") is False or all_zero_hour:
            result["warnings"].append(
                "Hourly chart disabled: datetime field appears to be date-only "
                "(>95% of records have hour=0)."
            )
        else:
            if "_hour" in df.columns:
                by_hour = df["_hour"].value_counts().sort_index()
            else:
                by_hour = dates.dt.hour.value_counts().sort_index()
            result["by_hour"] = {str(k): int(v) for k, v in by_hour.items()}
            if not by_hour.empty:
                result["busiest_hour"] = int(by_hour.idxmax())

    # ── Category breakdowns ───────────────────────────────────────────────
    df_n = normalize_cols(df) if not any(c.startswith("_") for c in df.columns) else df

    field_map = (quality_report or {}).get("field_map", {})

    def _col(semantic: str) -> Optional[str]:
        return field_map.get(semantic) or resolve(df_n, semantic)

    type_col = _col("incident_type")
    prio_col = _col("priority")
    unit_col = _col("unit_id")
    muni_col = _col("municipality")

    src = df_n  # use normalized frame for category columns

    def _counts(col: str, n: int = 30) -> dict:
        return (
            src[col].dropna().astype(str).str.strip()
            .replace("", pd.NA).dropna().value_counts().head(n).to_dict()
        )

    if type_col and type_col in src.columns:
        result["by_incident_type"] = _counts(type_col, 20)

    if prio_col and prio_col in src.columns:
        result["by_priority"] = _counts(prio_col)

    if unit_col and unit_col in src.columns:
        unit_series = src[unit_col].dropna().astype(str).str.strip()
        unit_pattern_str = (quality_report or {}).get("detected_unit_pattern")
        if unit_pattern_str:
            try:
                unit_re = re.compile(unit_pattern_str, re.IGNORECASE)
                unit_series = unit_series[unit_series.str.match(unit_re, na=False)]
            except re.error:
                pass  # invalid pattern — fall back to all units
        result["by_unit"] = unit_series.value_counts().head(30).to_dict()

    if muni_col and muni_col in src.columns:
        result["by_municipality"] = _counts(muni_col)

    return result


def run(
    dispatch_files: List[Dict[str, Any]],
    output_dir: str,
    cleaned_df: Optional[pd.DataFrame] = None,
    quality_report: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run call volume analysis, using pre-cleaned data when available."""
    if cleaned_df is not None and not cleaned_df.empty:
        analysis = analyze_dispatch(cleaned_df, quality_report)
    else:
        frames: List[pd.DataFrame] = []
        for f in dispatch_files:
            path = f.get("upload_path", "")
            ext  = Path(path).suffix.lower()
            try:
                df = pd.read_csv(path, low_memory=False) if ext == ".csv" else pd.read_excel(path)
                frames.append(df)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.warning("Could not load dispatch file %s: %s", path, exc)
        if not frames:
            analysis = {"error": "No dispatch files could be loaded."}
        else:
            analysis = analyze_dispatch(pd.concat(frames, ignore_index=True))

    summary  = {"module": "call_volume", **analysis}
    out_path = Path(output_dir) / "call_volume_summary.json"
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)
    logger.info("Call volume analysis complete: %s total calls", summary.get("total_calls", 0))
    return summary
