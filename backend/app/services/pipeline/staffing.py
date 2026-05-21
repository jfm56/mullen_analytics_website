"""
Module 5 — Staffing Analyzer  (Operational+ tier).

Processes staffing roster/schedule files and produces:
  - Headcount by shift / platoon
  - Headcount by position / rank
  - Unit staffing levels over time
  - Overtime indicators (hours > standard shift threshold)
  - Staffing gap flags (units below minimum staffing)
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from .columns import normalize_cols, resolve

logger = logging.getLogger(__name__)

STANDARD_SHIFT_HOURS = 12.0   # flag anything above this as potential OT
MIN_UNIT_STAFFING    = 2      # minimum crew per unit


def _analyze(df: pd.DataFrame) -> Dict[str, Any]:
    df = normalize_cols(df)

    emp_col   = resolve(df, "employee_id",  "staffing")
    name_col  = resolve(df, "name",         "staffing")
    shift_col = resolve(df, "shift",        "staffing")
    pos_col   = resolve(df, "position",     "staffing")
    date_col  = resolve(df, "date",         "staffing")
    hours_col = resolve(df, "hours",        "staffing")

    result: Dict[str, Any] = {
        "total_records":        int(len(df)),
        "unique_employees":     0,
        "by_shift":             {},
        "by_position":          {},
        "by_date":              {},
        "overtime_records":     0,
        "overtime_pct":         0.0,
        "avg_hours_per_shift":  None,
        "staffing_gaps":        [],
        "tenure_data_available": False,
        "warnings":             [],
    }

    if emp_col:
        result["unique_employees"] = int(df[emp_col].nunique())

    if shift_col:
        result["by_shift"] = (
            df[shift_col].dropna().astype(str).str.strip()
            .replace("", pd.NA).dropna().value_counts().to_dict()
        )

    if pos_col:
        result["by_position"] = (
            df[pos_col].dropna().astype(str).str.strip()
            .replace("", pd.NA).dropna().value_counts().to_dict()
        )

    if hours_col:
        hours_series = pd.to_numeric(df[hours_col], errors="coerce").dropna()
        if not hours_series.empty:
            result["avg_hours_per_shift"] = round(float(hours_series.mean()), 1)
            ot_mask = hours_series > STANDARD_SHIFT_HOURS
            result["overtime_records"] = int(ot_mask.sum())
            result["overtime_pct"]     = round(float(ot_mask.mean() * 100), 1)
            if result["overtime_pct"] > 20:
                result["warnings"].append(
                    f"{result['overtime_pct']}% of shifts exceed {STANDARD_SHIFT_HOURS}h — "
                    "potential overtime burden."
                )

    if date_col:
        # If the resolved date column is hire_date or start_date, this is a roster
        # file with tenure data, not a timekeeping file with shift dates.
        if date_col in ("hire_date", "start_date"):
            result["tenure_data_available"] = True
        try:
            dates = pd.to_datetime(df[date_col], errors="coerce")
            by_date = dates.dt.to_period("M").astype(str).value_counts().sort_index()
            result["by_date"] = by_date.to_dict()
        except Exception:  # pylint: disable=broad-exception-caught
            pass

    # Staffing gap detection: find dates where unit count < minimum
    if date_col and emp_col:
        try:
            tmp = df[[date_col, emp_col]].copy()
            tmp["_date"] = pd.to_datetime(tmp[date_col], errors="coerce").dt.date
            daily_counts = tmp.groupby("_date")[emp_col].nunique()
            gaps = daily_counts[daily_counts < MIN_UNIT_STAFFING]
            if not gaps.empty:
                result["staffing_gaps"] = [str(d) for d in gaps.index[:10]]
                result["warnings"].append(
                    f"{len(gaps)} date(s) had fewer than {MIN_UNIT_STAFFING} staff on record."
                )
        except Exception:  # pylint: disable=broad-exception-caught
            pass

    return result


def run(staffing_files: List[Dict[str, Any]], output_dir: str) -> Dict[str, Any]:
    """Run staffing analysis on all staffing-type files."""
    all_frames: List[pd.DataFrame] = []

    for f in staffing_files:
        path = f.get("upload_path", "")
        ext  = Path(path).suffix.lower()
        try:
            df = pd.read_csv(path, low_memory=False) if ext == ".csv" else pd.read_excel(path)
            all_frames.append(df)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.warning("Could not load staffing file %s: %s", path, exc)

    if not all_frames:
        summary = {"module": "staffing", "error": "No staffing files could be loaded."}
    else:
        combined = pd.concat(all_frames, ignore_index=True)
        analysis = _analyze(combined)
        summary  = {"module": "staffing", **analysis}

    out_path = str(Path(output_dir) / "staffing_summary.json")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)

    logger.info("Staffing analysis complete: %d records", summary.get("total_records", 0))
    return summary
