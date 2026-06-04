"""
EMS Motor-Vehicle-Collision (MVA) hotspots — Phase 4.

Identifies MVA calls from the incident-type / patient-category column and
analyses where and when they concentrate: by township (mapped), by hour, by
weekday, and by weather (MVAs-per-day under each condition — the "bad weather =
more crashes" signal). Reuses the geographic centroids and weather service.
"""
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .ems_analytics_service import detect_mapped_column
from .ems_column_mapping_service import get_column_overrides
from .ems_predictive_service import _load_df, _resolve_dt
from .ems_geographic_service import _normalize_location, _centroid_for
from .ems_response_time_service import _agency_center
from . import weather_service

logger = logging.getLogger(__name__)

_MVA_KEYWORDS = ["motor vehicle", "collision", "vehicle accident", "vehicle crash",
                 "auto accident", "mvc", "mva"]
_WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _is_mva(series: pd.Series) -> pd.Series:
    low = series.astype(str).str.lower()
    mask = pd.Series(False, index=series.index)
    for kw in _MVA_KEYWORDS:
        mask = mask | low.str.contains(kw, regex=False, na=False)
    return mask


def get_mva_hotspots(upload, db) -> Dict[str, Any]:
    df = _load_df(upload)
    if df is None or df.empty:
        return {"available": False, "reason": "No cleaned data available for this upload."}

    try:
        overrides = get_column_overrides(upload, db) or {}
    except Exception:  # noqa: BLE001
        overrides = {}

    type_col = detect_mapped_column(df, "patient_category", overrides) or detect_mapped_column(df, "incident_type", overrides)
    if not type_col:
        return {"available": False, "reason": "No incident-type / patient-category column to identify motor-vehicle collisions."}

    mva_mask = _is_mva(df[type_col])
    total_calls = int(len(df))
    mva_count = int(mva_mask.sum())
    if mva_count < 10:
        return {"available": False, "reason": f"Only {mva_count} motor-vehicle collisions detected — too few for hotspot analysis."}

    mva_df = df[mva_mask].copy()
    _, dt_all = _resolve_dt(df, overrides)
    dt_mva = dt_all[mva_mask] if dt_all is not None else None
    cols = {c.lower(): c for c in df.columns}
    warnings: List[str] = []

    # ── By township (mapped) ─────────────────────────────────────────────────
    muni_col = detect_mapped_column(df, "municipality", overrides)
    top_areas: List[Dict[str, Any]] = []
    map_points: List[Dict[str, Any]] = []
    if muni_col:
        mva_df["township"] = mva_df[muni_col].astype(str).map(_normalize_location)
        for name, grp in mva_df.dropna(subset=["township"]).groupby("township"):
            c = _centroid_for(name)
            row = {
                "location": name,
                "call_count": int(len(grp)),          # keyed for TownshipMap reuse
                "percent": round(len(grp) / mva_count * 100, 1),
                "trend": "n/a",
                "lat": c[0] if c else None,
                "lng": c[1] if c else None,
                "mapped": c is not None,
            }
            top_areas.append(row)
            if c:
                map_points.append(row)
        top_areas.sort(key=lambda x: -x["call_count"])
    else:
        warnings.append("No location column — MVA map unavailable.")

    # ── By hour ──────────────────────────────────────────────────────────────
    hod = cols.get("hour_of_day_of_dispatch")
    if hod:
        hours = pd.to_numeric(mva_df[hod], errors="coerce").dropna().astype(int)
    elif dt_mva is not None:
        hours = dt_mva.dt.hour.dropna().astype(int)
    else:
        hours = pd.Series([], dtype=int)
    hours = hours[(hours >= 0) & (hours <= 23)]
    by_hour = [{"hour": int(h), "count": int(n)} for h, n in hours.value_counts().sort_index().items()]
    peak_hour = int(hours.value_counts().idxmax()) if len(hours) else None

    # ── By weekday ───────────────────────────────────────────────────────────
    by_weekday = []
    peak_weekday = None
    if dt_mva is not None:
        wd = dt_mva.dt.day_name().dropna().value_counts()
        by_weekday = [{"weekday": d, "count": int(wd.get(d, 0))} for d in _WEEKDAY_ORDER if d in wd.index]
        peak_weekday = max(by_weekday, key=lambda x: x["count"])["weekday"] if by_weekday else None

    # ── By weather (MVAs per day) ────────────────────────────────────────────
    by_weather = []
    peak_weather = None
    if dt_all is not None and dt_all.notna().sum() > 0:
        valid = dt_all.dropna()
        start, end = str(valid.min().date()), str(valid.max().date())
        center = _agency_center(df, muni_col)
        wmap = weather_service.get_weather_map(center[0], center[1], start, end)
        if wmap:
            day = pd.DataFrame({
                "date": dt_all.dt.strftime("%Y-%m-%d"),
                "is_mva": mva_mask.astype(int),
            }).dropna(subset=["date"])
            daily = day.groupby("date").agg(mva=("is_mva", "sum"), total=("is_mva", "count")).reset_index()
            daily["weather"] = daily["date"].map(lambda d: (wmap.get(d) or {}).get("condition"))
            for cond, g in daily.dropna(subset=["weather"]).groupby("weather"):
                if len(g) < 3:
                    continue
                tot = int(g["total"].sum())
                by_weather.append({
                    "condition": cond,
                    "days": int(len(g)),
                    "total_mvas": int(g["mva"].sum()),
                    "mvas_per_day": round(float(g["mva"].mean()), 2),
                    "mva_share_pct": round(int(g["mva"].sum()) / tot * 100, 1) if tot else 0.0,
                })
            by_weather.sort(key=lambda x: -x["mvas_per_day"])
            peak_weather = by_weather[0]["condition"] if by_weather else None
        else:
            warnings.append("Historical weather could not be fetched — weather breakdown unavailable.")

    center = {"lat": np.mean([p["lat"] for p in map_points]), "lng": np.mean([p["lng"] for p in map_points])} \
        if map_points else {"lat": 40.63, "lng": -74.90}

    return {
        "available": True,
        "incident_field": type_col,
        "summary": {
            "mva_count": mva_count,
            "mva_pct_of_calls": round(mva_count / total_calls * 100, 1) if total_calls else 0.0,
            "top_area": top_areas[0]["location"] if top_areas else None,
            "top_area_count": top_areas[0]["call_count"] if top_areas else 0,
            "peak_hour": peak_hour,
            "peak_weekday": peak_weekday,
            "peak_weather": peak_weather,
        },
        "center": center,
        "map_points": map_points,
        "top_areas": top_areas,
        "by_hour": by_hour,
        "by_weekday": by_weekday,
        "by_weather": by_weather,
        "warnings": warnings,
    }
