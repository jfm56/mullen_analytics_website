"""
EMS response-time risk — Phase 3.

Computes dispatch->on-scene response time per call and analyses / predicts it by:
  - weather condition (historical weather joined by date, via weather_service)
  - hour of day  (the free traffic proxy — rush hour is the dominant traffic effect)
  - township     (per-area risk)
plus risk vs a configurable response-time target and per-weather scenario P90s.

Traffic is pluggable: `traffic_provider` defaults to "time_proxy". A paid
provider (Google/TomTom/HERE) can be slotted in later — it needs an API key and
the township coordinates produced by the geographic service.
"""
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .ems_analytics_service import detect_mapped_column, _minutes_between
from .ems_column_mapping_service import get_column_overrides
from .ems_predictive_service import _load_df, _resolve_dt
from .ems_geographic_service import _normalize_location, _centroid_for
from . import weather_service

logger = logging.getLogger(__name__)

_DEFAULT_CENTER = (40.63, -74.90)  # Hunterdon County, NJ (service-area fallback)


def _p90(s) -> Optional[float]:
    s = pd.Series(s).dropna()
    return float(np.percentile(s, 90)) if len(s) else None


def _median(s) -> Optional[float]:
    s = pd.Series(s).dropna()
    return float(np.median(s)) if len(s) else None


def _agency_center(df: pd.DataFrame, muni_col: Optional[str]):
    if not muni_col:
        return _DEFAULT_CENTER
    lats, lngs = [], []
    for v in df[muni_col].dropna().astype(str):
        c = _centroid_for(_normalize_location(v))
        if c:
            lats.append(c[0])
            lngs.append(c[1])
    if lats:
        return (sum(lats) / len(lats), sum(lngs) / len(lngs))
    return _DEFAULT_CENTER


def get_response_time_risk(upload, db, target_minutes: float = 9.0, settings: Optional[Dict] = None) -> Dict[str, Any]:
    df = _load_df(upload)
    if df is None or df.empty:
        return {"available": False, "reason": "No cleaned data available for this upload."}

    try:
        overrides = get_column_overrides(upload, db) or {}
    except Exception:  # noqa: BLE001
        overrides = {}

    dispatch_col = detect_mapped_column(df, "dispatch_time", overrides)
    arrival_col = detect_mapped_column(df, "arrival_time", overrides)
    if not dispatch_col or not arrival_col:
        return {"available": False, "reason": "Need dispatch and on-scene-arrival times to compute response times."}

    rt = _minutes_between(df, dispatch_col, arrival_col)
    if rt is None or rt.notna().sum() == 0:
        return {"available": False, "reason": "Could not compute response times from the available timestamps."}

    work = pd.DataFrame({"rt": rt})
    _, dt = _resolve_dt(df, overrides)
    work["dt"] = dt if dt is not None else pd.NaT

    cols = {c.lower(): c for c in df.columns}
    hod = cols.get("hour_of_day_of_dispatch")
    if hod:
        work["hour"] = pd.to_numeric(df[hod], errors="coerce")
    elif dt is not None:
        work["hour"] = dt.dt.hour
    else:
        work["hour"] = np.nan

    muni_col = detect_mapped_column(df, "municipality", overrides)
    work["township"] = df[muni_col].astype(str).map(_normalize_location) if muni_col else None

    work = work[work["rt"].notna()].copy()
    total = int(len(work))

    summary = {
        "total_calls": total,
        "overall_p90": round(_p90(work["rt"]), 1) if total else None,
        "overall_median": round(_median(work["rt"]), 1) if total else None,
        "pct_over_target": round(float((work["rt"] > target_minutes).mean()) * 100, 1) if total else 0.0,
        "weather_available": False,
    }

    warnings: List[str] = []

    # ── Weather impact + scenarios ───────────────────────────────────────────
    weather_impact: List[Dict[str, Any]] = []
    scenarios: List[Dict[str, Any]] = []
    if work["dt"].notna().sum() > 0:
        valid = work["dt"].dropna()
        start, end = str(valid.min().date()), str(valid.max().date())
        center = _agency_center(df, muni_col)
        wmap = weather_service.get_weather_map(center[0], center[1], start, end)
        if wmap:
            summary["weather_available"] = True
            work["wdate"] = work["dt"].dt.strftime("%Y-%m-%d")
            work["weather"] = work["wdate"].map(lambda d: (wmap.get(d) or {}).get("condition"))
            wg = work.dropna(subset=["weather"])
            for cond, grp in wg.groupby("weather"):
                if len(grp) < 5:
                    continue
                weather_impact.append({
                    "condition": cond,
                    "calls": int(len(grp)),
                    "median": round(_median(grp["rt"]), 1),
                    "p90": round(_p90(grp["rt"]), 1),
                    "pct_over_target": round(float((grp["rt"] > target_minutes).mean()) * 100, 1),
                })
            weather_impact.sort(key=lambda x: -x["p90"])
            clear_p90 = next((w["p90"] for w in weather_impact if w["condition"] == "clear"), None)
            for w in weather_impact:
                scenarios.append({
                    "condition": w["condition"],
                    "predicted_p90": w["p90"],
                    "vs_clear": round(w["p90"] - clear_p90, 1) if clear_p90 is not None else None,
                })
        else:
            warnings.append("Historical weather could not be fetched — weather impact is unavailable.")
    else:
        warnings.append("No usable date column — weather impact is unavailable.")

    # ── By hour of day (traffic proxy) ───────────────────────────────────────
    by_hour: List[Dict[str, Any]] = []
    hw = work.dropna(subset=["hour"]).copy()
    if len(hw):
        hw["hour"] = hw["hour"].astype(int)
        for h, grp in hw.groupby("hour"):
            by_hour.append({
                "hour": int(h),
                "calls": int(len(grp)),
                "median": round(_median(grp["rt"]), 1),
                "p90": round(_p90(grp["rt"]), 1),
            })
        by_hour.sort(key=lambda x: x["hour"])

    # ── By township ──────────────────────────────────────────────────────────
    by_township: List[Dict[str, Any]] = []
    if muni_col:
        for t, grp in work.dropna(subset=["township"]).groupby("township"):
            if len(grp) >= 10:
                by_township.append({
                    "township": t,
                    "calls": int(len(grp)),
                    "p90": round(_p90(grp["rt"]), 1),
                    "pct_over_target": round(float((grp["rt"] > target_minutes).mean()) * 100, 1),
                })
        by_township.sort(key=lambda x: -x["p90"])

    return {
        "available": True,
        "target_minutes": target_minutes,
        "traffic_provider": "time_proxy",
        "summary": summary,
        "weather_impact": weather_impact,
        "scenarios": scenarios,
        "by_hour": by_hour,
        "by_township": by_township[:10],
        "warnings": warnings,
    }
