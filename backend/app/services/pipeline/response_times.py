"""
Module 3 — Response Time Analyzer.

Calculates EMS response time intervals from dispatch data:
  - dispatch_to_enroute  (date_dispatched → date_enroute)    turnout
  - response_time        (date_enroute    → date_arrived)    travel
  - call_duration        (date_created    → date_available)  total engagement

When a cleaned DataFrame produced by data_quality.clean_dispatch() is
passed in, the pre-computed ``_*_min`` interval columns and ``_dt_*``
datetime columns are used directly.  Otherwise the module falls back to
raw datetime resolution from the file.

Bounds (applied by data_quality, enforced again defensively):
  - dispatch_to_enroute_min : 0 – 30 min
  - response_time_min       : 0 – 60 min  (also capped at 99th pct)
  - call_duration_min       : 0 – 180 min
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .columns import normalize_cols, resolve

logger = logging.getLogger(__name__)

NFPA_1710_TOTAL_SECONDS = 360  # 6-minute total response, 90th-pct target

# Per-interval bounds in minutes (matches data_quality.INTERVAL_BOUNDS)
_BOUNDS_MIN: Dict[str, tuple] = {
    "_dispatch_to_enroute_min": (0.0, 30.0),
    "_response_time_min":       (0.0, 60.0),
    "_call_duration_min":       (0.0, 180.0),
}


# ── Stats helpers ─────────────────────────────────────────────────────────────

def _interval_stats(seconds: pd.Series) -> Dict[str, Any]:
    """Descriptive stats for a seconds series."""
    clean = seconds.dropna()
    clean = clean[(clean >= 0) & (clean < 86400)]
    if clean.empty:
        return {"count": 0}
    return {
        "count":  int(len(clean)),
        "mean":   round(float(clean.mean()), 1),
        "median": round(float(clean.median()), 1),
        "p90":    round(float(np.percentile(clean, 90)), 1),
        "p95":    round(float(np.percentile(clean, 95)), 1),
        "min":    round(float(clean.min()), 1),
        "max":    round(float(clean.max()), 1),
        "std":    round(float(clean.std()), 1),
    }


def _pct_within(seconds: pd.Series, threshold: float) -> float:
    clean = seconds.dropna()
    clean = clean[(clean >= 0) & (clean < 86400)]
    if clean.empty:
        return 0.0
    return round(float((clean <= threshold).mean() * 100), 1)


def _safe_parse(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce")


def _secs(a: Optional[pd.Series], b: Optional[pd.Series]) -> pd.Series:
    if a is None or b is None:
        return pd.Series(dtype=float)
    return (b - a).dt.total_seconds()


def _mins_to_secs(col: pd.Series, lo: float, hi: float) -> pd.Series:
    """Convert a bounded-minute Series to seconds, dropping out-of-bounds."""
    out = col * 60.0
    out = out.where((col >= lo) & (col <= hi))
    return out


# ── Core analysis ─────────────────────────────────────────────────────────────

def analyze_response_times(
    df: pd.DataFrame,
    quality_report: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Analyse response times.

    Prefers pre-computed ``_*_min`` columns injected by data_quality.
    Falls back to raw datetime resolution if they are absent.
    """
    call_proc_s:  pd.Series = pd.Series(dtype=float)
    total_resp_s: pd.Series = pd.Series(dtype=float)

    result: Dict[str, Any] = {
        "total_records":      int(len(df)),
        "call_processing":    {},
        "turnout":            {},
        "travel":             {},
        "total_response":     {},
        "on_scene_duration":  {},
        "nfpa_1710": {
            "target_seconds":    NFPA_1710_TOTAL_SECONDS,
            "pct_within_target": None,
            "compliant":         None,
            "valid":             None,
        },
        "by_priority":   {},
        "by_unit_top10": {},
        "intervals_source": "computed",
    }

    chart_flags = (quality_report or {}).get("chart_flags", {})
    if chart_flags.get("response_time") is False:
        result["warning"] = (
            "Response-time chart disabled by data quality check. "
            + "; ".join((quality_report or {}).get("warnings", []))
        )

    # ── Prefer pre-computed minute columns ──────────────────────────────
    has_precomputed = "_response_time_min" in df.columns

    if has_precomputed:
        result["intervals_source"] = "data_quality"
        turnout_s   = _mins_to_secs(df["_dispatch_to_enroute_min"], *_BOUNDS_MIN["_dispatch_to_enroute_min"]) \
                      if "_dispatch_to_enroute_min" in df.columns else pd.Series(dtype=float)
        travel_s    = _mins_to_secs(df["_response_time_min"],       *_BOUNDS_MIN["_response_time_min"])
        duration_s  = _mins_to_secs(df["_call_duration_min"],       *_BOUNDS_MIN["_call_duration_min"]) \
                      if "_call_duration_min" in df.columns else pd.Series(dtype=float)

        # Call processing and total response from timestamps when available
        dt_created    = df.get("_dt_created")
        dt_dispatched = df.get("_dt_dispatched")
        dt_arrived    = df.get("_dt_arrived")
        call_proc_s  = _secs(dt_created, dt_dispatched)
        total_resp_s = _secs(dt_created, dt_arrived)
        if not total_resp_s.empty:
            _p99 = total_resp_s.dropna().quantile(0.99)
            if pd.notna(_p99) and _p99 > 0:
                total_resp_s = total_resp_s.clip(upper=float(_p99))

    else:
        # ── Fallback: raw datetime parsing ────────────────────────────
        result["intervals_source"] = "fallback"
        df_n = normalize_cols(df)

        call_col     = resolve(df_n, "date_created")   or resolve(df_n, "call_date")
        dispatch_col = resolve(df_n, "date_dispatched") or resolve(df_n, "dispatch_time")
        enroute_col  = resolve(df_n, "date_enroute")   or resolve(df_n, "en_route_time")
        onscene_col  = resolve(df_n, "date_arrived")   or resolve(df_n, "on_scene_time")
        clear_col    = resolve(df_n, "date_available") or resolve(df_n, "clear_time")

        if not call_col:
            result["warning"] = "call_date / date_created not found — cannot compute response times."
            return result

        call_dt     = _safe_parse(df_n[call_col])
        dispatch_dt = _safe_parse(df_n[dispatch_col]) if dispatch_col else None
        enroute_dt  = _safe_parse(df_n[enroute_col])  if enroute_col  else None
        onscene_dt  = _safe_parse(df_n[onscene_col])  if onscene_col  else None
        clear_dt    = _safe_parse(df_n[clear_col])    if clear_col    else None

        call_proc_s  = _secs(call_dt, dispatch_dt)
        turnout_s    = _secs(dispatch_dt, enroute_dt)
        travel_s     = _secs(enroute_dt, onscene_dt)
        total_resp_s = _secs(call_dt, onscene_dt)
        duration_s   = _secs(onscene_dt, clear_dt)

        # Apply bounds to fallback intervals
        def _bound_secs(s: pd.Series, lo_min: float, hi_min: float) -> pd.Series:
            lo_s, hi_s = lo_min * 60, hi_min * 60
            return s.where((s >= lo_s) & (s <= hi_s))

        turnout_s   = _bound_secs(turnout_s,   *_BOUNDS_MIN["_dispatch_to_enroute_min"])
        travel_s    = _bound_secs(travel_s,    *_BOUNDS_MIN["_response_time_min"])
        duration_s  = _bound_secs(duration_s,  *_BOUNDS_MIN["_call_duration_min"])
        if not travel_s.empty:
            p99 = travel_s.quantile(0.99)
            if pd.notna(p99):
                travel_s = travel_s.clip(upper=float(p99))

        total_resp_s = _secs(call_dt, onscene_dt)

    # ── Aggregate stats ───────────────────────────────────────────────────
    result["call_processing"]   = _interval_stats(call_proc_s)
    result["turnout"]           = _interval_stats(turnout_s)
    result["travel"]            = _interval_stats(travel_s)
    result["on_scene_duration"] = _interval_stats(duration_s)

    # Total response = travel + turnout if total_resp not directly computable
    combined_resp: pd.Series = pd.Series(dtype=float)
    if not total_resp_s.empty:
        result["total_response"] = _interval_stats(total_resp_s)
        pct = _pct_within(total_resp_s, NFPA_1710_TOTAL_SECONDS)
        _resp_for_nfpa = total_resp_s
    else:
        # Derive from travel + turnout
        combined_resp = turnout_s.fillna(0) + travel_s.fillna(0)
        result["total_response"] = _interval_stats(combined_resp)
        pct = _pct_within(combined_resp, NFPA_1710_TOTAL_SECONDS)
        _resp_for_nfpa = combined_resp

    # Gate NFPA: require at least 10 valid, non-zero response-time records.
    # All-zero values mean timestamps had no time component (date-only fields).
    _resp_valid = _resp_for_nfpa.dropna()
    _resp_valid = _resp_valid[_resp_valid > 0]
    if len(_resp_valid) < 10:
        result["nfpa_1710"]["valid"]             = False
        result["nfpa_1710"]["pct_within_target"] = None
        result["nfpa_1710"]["compliant"]         = None
        result["nfpa_1710"]["reason"]            = (
            "Insufficient valid response-time data \u2014 NFPA compliance cannot be computed. "
            "Check that date_enroute and date_arrived columns contain full datetime values."
        )
    else:
        result["nfpa_1710"]["valid"]             = True
        result["nfpa_1710"]["pct_within_target"] = pct
        result["nfpa_1710"]["compliant"]         = pct >= 90.0

    # ── Breakdowns by priority and unit ──────────────────────────────────
    df_work = normalize_cols(df) if "_response_time_min" not in df.columns else df
    prio_col = resolve(df_work, "priority") or (
        "priority" if "priority" in df_work.columns else None
    )
    unit_col = resolve(df_work, "unit_id") or (
        qr_unit if (qr_unit := (quality_report or {}).get("field_map", {}).get("unit_id")) else None
    )

    resp_series = travel_s if not travel_s.empty else pd.Series(dtype=float)

    if prio_col and prio_col in df_work.columns and not resp_series.empty:
        tmp = df_work[[prio_col]].copy()
        tmp["_resp"] = resp_series.values
        for prio, grp in tmp.groupby(prio_col):
            stats = _interval_stats(grp["_resp"])
            if stats.get("count", 0) > 0:
                result["by_priority"][str(prio)] = stats

    if unit_col and unit_col in df_work.columns and not resp_series.empty:
        tmp = df_work[[unit_col]].copy()
        tmp["_resp"] = resp_series.values
        by_unit = (
            tmp.groupby(unit_col)["_resp"]
            .agg(["count", "mean", "median"])
            .nlargest(10, "count")
        )
        result["by_unit_top10"] = {
            str(u): {
                "count":  int(row["count"]),
                "mean":   round(float(row["mean"]), 1),
                "median": round(float(row["median"]), 1),
            }
            for u, row in by_unit.iterrows()
        }

    return result


# ── Public run() ─────────────────────────────────────────────────────────────

def run(
    dispatch_files: List[Dict[str, Any]],
    output_dir: str,
    cleaned_df: Optional[pd.DataFrame] = None,
    quality_report: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run response time analysis, using pre-cleaned data when available."""
    if cleaned_df is not None and not cleaned_df.empty:
        analysis = analyze_response_times(cleaned_df, quality_report)
    else:
        frames: List[pd.DataFrame] = []
        for f in dispatch_files:
            path = f.get("upload_path", "")
            ext  = Path(path).suffix.lower()
            try:
                df = pd.read_csv(path, low_memory=False) if ext == ".csv" else pd.read_excel(path)
                frames.append(df)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.warning("Could not load %s: %s", path, exc)
        if not frames:
            analysis = {"error": "No dispatch files could be loaded."}
        else:
            analysis = analyze_response_times(pd.concat(frames, ignore_index=True))

    summary  = {"module": "response_times", **analysis}
    out_path = Path(output_dir) / "response_times_summary.json"
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)
    logger.info("Response time analysis complete.")
    return summary
