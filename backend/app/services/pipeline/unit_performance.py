"""
Module 7 — Unit Performance Analyzer  (Operational+ tier).

For each unit/apparatus, computes:
  - Total calls responded
  - Response time percentiles (median, P90, P95)
  - NFPA 1710 compliance rate per unit
  - Utilisation hours (on-scene time accumulated)
  - Busiest month / hour for each unit
  - Flagged units (P90 > target or compliance < threshold)
"""
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

from .columns import normalize_cols, resolve
from .response_times import NFPA_1710_TOTAL_SECONDS

# Unit filter regex is auto-detected per-run from the data (see data_quality._infer_unit_pattern).
# No hardcoded pattern here — the pattern is stored in quality_report["detected_unit_pattern"].

logger = logging.getLogger(__name__)

COMPLIANCE_WARN_THRESHOLD = 75.0   # flag units below this % compliance


def _safe_parse(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _unit_stats(df: pd.DataFrame, quality_report: dict = None) -> Dict[str, Any]:
    df = normalize_cols(df)

    unit_col = resolve(df, "unit_id")

    # Prefer pre-computed columns injected by data_quality.clean_dispatch()
    has_precomputed = "_response_time_min" in df.columns

    # Raw-column fallback (only resolved when pre-computed cols are absent)
    call_col  = None
    scene_col = None
    clear_col = None
    if not has_precomputed:
        call_col  = resolve(df, "call_date")
        scene_col = resolve(df, "on_scene_time")
        clear_col = resolve(df, "clear_time")

    if not unit_col:
        return {"error": "No unit column found."}

    # Filter to operational units using the pattern detected from the data.
    # quality_report is threaded in from clean_dispatch(); falls back to no filter.
    unit_pattern_str = (quality_report or {}).get("detected_unit_pattern")
    if unit_pattern_str:
        try:
            unit_re = re.compile(unit_pattern_str, re.IGNORECASE)
            mask = df[unit_col].astype(str).str.match(unit_re, na=False)
            n_excluded = int((~mask).sum())
            df = df[mask].copy()
            if n_excluded:
                logger.info(
                    "unit_performance: excluded %d records not matching unit pattern %s",
                    n_excluded, unit_pattern_str,
                )
        except re.error as exc:
            logger.warning("unit_performance: invalid unit pattern '%s': %s", unit_pattern_str, exc)

    units: Dict[str, Any] = {}
    flagged: List[str]    = []

    for unit, grp in df.groupby(unit_col, dropna=True):
        unit = str(unit).strip()
        if not unit or unit.lower() == "nan":
            continue
        stat: Dict[str, Any] = {"calls": int(len(grp))}

        if has_precomputed:
            # ── Pre-computed path: use _response_time_min (enroute→arrived, bounded + p99-capped)
            if "_response_time_min" in grp.columns:
                rt_min = grp["_response_time_min"].dropna()
                rt_min = rt_min[rt_min >= 0]
                if not rt_min.empty:
                    rt_secs = rt_min * 60.0
                    stat["response_median"] = round(float(rt_secs.median()), 1)
                    stat["response_p90"]    = round(float(rt_secs.quantile(0.90)), 1)
                    stat["response_p95"]    = round(float(rt_secs.quantile(0.95)), 1)
                    within = float((rt_secs <= NFPA_1710_TOTAL_SECONDS).mean() * 100)
                    stat["nfpa_compliance_pct"] = round(within, 1)
                    if within < COMPLIANCE_WARN_THRESHOLD:
                        flagged.append(unit)

            # Utilisation from call duration (dispatch → available, minutes)
            if "_call_duration_min" in grp.columns:
                util = grp["_call_duration_min"].dropna()
                util = util[(util >= 0) & (util <= 180)]
                if not util.empty:
                    stat["utilisation_hours"] = round(float(util.sum()) / 60, 1)

            # Busiest hour from pre-computed feature column
            if "_hour" in grp.columns:
                hours = grp["_hour"].dropna()
                if not hours.empty:
                    stat["busiest_hour"] = int(hours.mode().iloc[0])

        else:
            # ── Raw-timestamp fallback path
            if call_col and scene_col:
                t_call  = _safe_parse(grp[call_col])
                t_scene = _safe_parse(grp[scene_col])
                secs    = (t_scene - t_call).dt.total_seconds()
                secs    = secs[(secs >= 0) & (secs < 86400)].dropna()
                if not secs.empty:
                    stat["response_median"] = round(float(secs.median()), 1)
                    stat["response_p90"]    = round(float(secs.quantile(0.90)), 1)
                    stat["response_p95"]    = round(float(secs.quantile(0.95)), 1)
                    within = float((secs <= NFPA_1710_TOTAL_SECONDS).mean() * 100)
                    stat["nfpa_compliance_pct"] = round(within, 1)
                    if within < COMPLIANCE_WARN_THRESHOLD:
                        flagged.append(unit)

            if scene_col and clear_col:
                t_scene = _safe_parse(grp[scene_col])
                t_clear = _safe_parse(grp[clear_col])
                util    = (t_clear - t_scene).dt.total_seconds() / 60
                util    = util[(util >= 0) & (util < 1440)].dropna()
                if not util.empty:
                    stat["utilisation_hours"] = round(float(util.sum()) / 60, 1)

            if call_col:
                hours = _safe_parse(grp[call_col]).dt.hour.dropna()
                if not hours.empty:
                    stat["busiest_hour"] = int(hours.mode().iloc[0])

        units[unit] = stat

    # Sort by call count descending
    units = dict(sorted(units.items(), key=lambda kv: kv[1]["calls"], reverse=True))

    return {
        "units":        units,
        "flagged_units": flagged,
        "total_units":   len(units),
    }


def run(
    dispatch_files: List[Dict[str, Any]],
    output_dir: str,
    cleaned_df=None,
    quality_report=None,
) -> Dict[str, Any]:
    if cleaned_df is not None and not cleaned_df.empty:
        analysis = _unit_stats(cleaned_df, quality_report=quality_report)
        summary  = {"module": "unit_performance", **analysis}
    else:
        all_frames: List[pd.DataFrame] = []
        for f in dispatch_files:
            path = f.get("upload_path", "")
            ext  = Path(path).suffix.lower()
            try:
                df = pd.read_csv(path, low_memory=False) if ext == ".csv" else pd.read_excel(path)
                all_frames.append(df)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.warning("Could not load dispatch file %s: %s", path, exc)

        if not all_frames:
            summary = {"module": "unit_performance", "error": "No dispatch files loaded."}
        else:
            combined = pd.concat(all_frames, ignore_index=True)
            analysis = _unit_stats(combined, quality_report=quality_report)
            summary  = {"module": "unit_performance", **analysis}

    out_path = str(Path(output_dir) / "unit_performance_summary.json")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)

    logger.info(
        "Unit performance analysis complete: %d units, %d flagged",
        summary.get("total_units", 0),
        len(summary.get("flagged_units", [])),
    )
    return summary
