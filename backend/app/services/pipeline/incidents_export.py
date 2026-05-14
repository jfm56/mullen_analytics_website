"""
Compact incident-level export.

Called by runner.execute() immediately after data_quality.clean_dispatch().
Writes incidents_compact.json to the run's processed/ directory.

The payload is designed to be fetched once by the browser; the client
applies filters and recomputes aggregations in JavaScript.

Row schema (one dict per incident):
  ts  — ISO datetime string  (from _dt_created)
  hr  — hour of day 0-23     (int | null)
  dow — day of week 0=Mon    (int | null)
  mo  — month 1-12           (int | null)
  unit — unit identifier     (str | null)
  cat  — incident type/category (str | null)
  cp  — call-processing secs (dispatch - call)          (int | null)
  to  — turnout secs         (enroute  - dispatch)      (int | null)
  tr  — travel secs          (arrived  - enroute)       (int | null)
  rp  — total response secs  (arrived  - dispatch)      (int | null)
"""
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Hard bounds for each NFPA phase (seconds) — values outside are nulled out
_PHASE_BOUNDS = {
    "cp": (0, 3_600),   # call processing ≤ 1 h
    "to": (0, 1_800),   # turnout ≤ 30 min
    "tr": (0, 3_600),   # travel ≤ 60 min
    "rp": (0, 7_200),   # total response ≤ 2 h
}


def _secs_between(df: pd.DataFrame, col_a: str, col_b: str) -> Optional[pd.Series]:
    if col_a in df.columns and col_b in df.columns:
        return (df[col_b] - df[col_a]).dt.total_seconds()
    return None


def _bounded(s: Optional[pd.Series], lo: float, hi: float) -> Optional[pd.Series]:
    if s is None:
        return None
    return s.where((s >= lo) & (s <= hi))


def _to_int_list(s: Optional[pd.Series], n: int) -> List[Optional[int]]:
    """Convert a float series to a Python int list, NaN → None."""
    if s is None:
        return [None] * n
    arr = s.to_numpy(dtype=float, na_value=float("nan"))
    return [None if np.isnan(v) else int(round(v)) for v in arr]


def export_compact_incidents(
    cleaned_df: pd.DataFrame,
    quality_report: Dict[str, Any],
    output_dir: str,
) -> str:
    """
    Write incidents_compact.json for the interactive dashboard.

    Returns the absolute path of the written file.
    """
    df = cleaned_df.copy()

    # ── Apply unit pattern filter (mirrors unit_performance) ──────────────
    field_map = quality_report.get("field_map", {})
    unit_col = field_map.get("unit_id")
    unit_pattern_str = quality_report.get("detected_unit_pattern")

    if unit_col and unit_pattern_str and unit_col in df.columns:
        try:
            unit_re = re.compile(unit_pattern_str, re.IGNORECASE)
            mask = df[unit_col].astype(str).str.match(unit_re, na=False)
            n_excluded = int((~mask).sum())
            df = df[mask].reset_index(drop=True)
            logger.info(
                "incidents_export: %d rows after unit filter (%s); excluded %d",
                len(df), unit_pattern_str, n_excluded,
            )
        except re.error as exc:
            logger.warning("incidents_export: invalid unit pattern '%s': %s", unit_pattern_str, exc)

    n = len(df)
    if n == 0:
        logger.warning("incidents_export: no rows to export after filtering")

    cat_col = field_map.get("incident_type")

    # ── Compute NFPA phase durations ──────────────────────────────────────
    raw_phases = {
        "cp": _secs_between(df, "_dt_created",    "_dt_dispatched"),
        "to": _secs_between(df, "_dt_dispatched", "_dt_enroute"),
        "tr": _secs_between(df, "_dt_enroute",    "_dt_arrived"),
        "rp": _secs_between(df, "_dt_dispatched", "_dt_arrived"),
    }
    phases = {k: _bounded(v, *_PHASE_BOUNDS[k]) for k, v in raw_phases.items()}

    # ── Timestamp series ───────────────────────────────────────────────────
    if "_dt_created" in df.columns:
        ts_list: List[Optional[str]] = [
            v.isoformat() if pd.notna(v) else None
            for v in df["_dt_created"]
        ]
    else:
        ts_list = [None] * n

    # ── Unit / category ───────────────────────────────────────────────────
    def _str_list(col: Optional[str]) -> List[Optional[str]]:
        if not col or col not in df.columns:
            return [None] * n
        return [
            None if (pd.isna(v) or str(v).strip().lower() == "nan")
            else str(v).strip()
            for v in df[col]
        ]

    unit_list = _str_list(unit_col)
    cat_list  = _str_list(cat_col)

    # ── Calendar features ─────────────────────────────────────────────────
    hr_list  = _to_int_list(df["_hour"]        if "_hour"        in df.columns else None, n)
    dow_list = _to_int_list(df["_day_of_week"] if "_day_of_week" in df.columns else None, n)
    mo_list  = _to_int_list(df["_month"]       if "_month"       in df.columns else None, n)

    phase_lists = {k: _to_int_list(v, n) for k, v in phases.items()}

    # ── Assemble row-oriented records ─────────────────────────────────────
    rows: List[Dict[str, Any]] = [
        {
            "ts":   ts_list[i],
            "hr":   hr_list[i],
            "dow":  dow_list[i],
            "mo":   mo_list[i],
            "unit": unit_list[i],
            "cat":  cat_list[i],
            "cp":   phase_lists["cp"][i],
            "to":   phase_lists["to"][i],
            "tr":   phase_lists["tr"][i],
            "rp":   phase_lists["rp"][i],
        }
        for i in range(n)
    ]

    # ── Detect timestamp resolution ───────────────────────────────────────
    ts_resolution = "unknown"
    if "_dt_created" in df.columns:
        valid_ts = df["_dt_created"].dropna()
        if len(valid_ts) > 0:
            ts_resolution = (
                "second" if (valid_ts.dt.second > 0).mean() > 0.05 else "minute"
            )

    payload: Dict[str, Any] = {
        "unit_type":     "BLS" if unit_pattern_str and "BLS" in (unit_pattern_str or "").upper() else "mixed",
        "ts_resolution": ts_resolution,
        "total_rows":    n,
        "rows":          rows,
    }

    out_path = str(Path(output_dir) / "incidents_compact.json")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"))

    logger.info("incidents_export: wrote %d rows → %s", n, out_path)
    return out_path
