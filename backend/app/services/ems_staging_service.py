"""
EMS staging recommender — where to post ambulances given conditions.

Learns the demand distribution across municipalities from historical calls,
sliced by time-of-day block and season, with a weather overlay, then recommends
the top-K staging centroids (coverage-aware) for a chosen — or the current — set
of conditions. Reuses the geographic service's curated centroid map and the
weather service. Empirical and explainable: no per-cell ML, just historical
rates with a graceful fallback when a weather cell is too sparse to trust.
"""
import logging
import math
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd

from . import weather_service
from .ems_column_mapping_service import get_column_overrides
from .ems_geographic_service import _centroid_for, _detect_location_column, _normalize_location
from .ems_predictive_service import _load_df, _resolve_dt

logger = logging.getLogger(__name__)

# Time-of-day blocks (24h). Coarse enough to stay dense per municipality.
TIME_BLOCKS = [
    ("overnight", "Overnight (12–6 AM)", range(0, 6)),
    ("morning",   "Morning (6 AM–12 PM)", range(6, 12)),
    ("afternoon", "Afternoon (12–6 PM)", range(12, 18)),
    ("evening",   "Evening (6 PM–12 AM)", range(18, 24)),
]
_BLOCK_OF_HOUR = {h: k for k, _, hrs in TIME_BLOCKS for h in hrs}

SEASONS = [
    ("winter", "Winter", {12, 1, 2}),
    ("spring", "Spring", {3, 4, 5}),
    ("summer", "Summer", {6, 7, 8}),
    ("fall",   "Fall",   {9, 10, 11}),
]
_SEASON_OF_MONTH = {m: k for k, _, months in SEASONS for m in months}

# Raw weather-service conditions → UI weather groups.
_WEATHER_GROUP = {
    "clear": "clear", "wind": "clear",
    "rain": "rain", "heavy_rain": "rain",
    "snow": "snow_ice", "ice": "snow_ice",
    "cold": "cold", "extreme_heat": "hot",
}
WEATHER_GROUPS = [
    ("any", "Typical"),
    ("clear", "Clear"),
    ("rain", "Rain"),
    ("snow_ice", "Snow / Ice"),
    ("cold", "Cold"),
    ("hot", "Hot"),
]

_BLOCK_KEYS = {k for k, _, _ in TIME_BLOCKS}
_SEASON_KEYS = {k for k, _, _ in SEASONS}
_WGROUP_KEYS = {k for k, _ in WEATHER_GROUPS}

_MIN_CELL = 15   # min matching calls before trusting a weather-specific distribution
_D0_KM = 6.0     # coverage-penalty distance scale (posts closer than this overlap)


def _block_label(k: str) -> str:
    return next((l for kk, l, _ in TIME_BLOCKS if kk == k), k)


def _season_label(k: str) -> str:
    return next((l for kk, l, _ in SEASONS if kk == k), k)


def _weather_label(k: str) -> str:
    return next((l for kk, l in WEATHER_GROUPS if kk == k), k)


def _haversine_km(a, b) -> float:
    (lat1, lng1), (lat2, lng2) = a, b
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def recommend_staging(upload=None, db=None, df: Optional[pd.DataFrame] = None,
                      overrides: Optional[Dict] = None, time_block: Optional[str] = None,
                      season: Optional[str] = None, weather: Optional[str] = None,
                      units: int = 3) -> Dict[str, Any]:
    """Recommend where to stage `units` ambulances for the given (or current) conditions."""
    if df is None:
        df = _load_df(upload)
        if df is None or df.empty:
            return {"available": False, "reason": "No cleaned data available for this upload."}
        try:
            overrides = get_column_overrides(upload, db) or {}
        except Exception:  # noqa: BLE001
            overrides = {}
    else:
        if df.empty:
            return {"available": False, "reason": "No cleaned data available."}
        overrides = overrides or {}

    try:
        units = max(1, min(6, int(units or 3)))
    except (TypeError, ValueError):
        units = 3

    loc_col = _detect_location_column(df, overrides)
    if not loc_col:
        return {"available": False,
                "reason": "No geographic field detected. Map a municipality / scene-grid column "
                          "in Column Mapping to enable staging recommendations."}

    _, dt = _resolve_dt(df, overrides)
    if dt is None or dt.dropna().empty:
        return {"available": False,
                "reason": "No usable dispatch date/time column detected — staging needs call timestamps."}

    work = pd.DataFrame({"area": df[loc_col].astype(str).map(_normalize_location), "dt": dt})
    work = work[(work["area"].str.len() > 0) & work["dt"].notna()].copy()
    if work.empty:
        return {"available": False, "reason": "No calls have both a location and a timestamp."}

    work["block"] = work["dt"].dt.hour.map(_BLOCK_OF_HOUR)
    work["season"] = work["dt"].dt.month.map(_SEASON_OF_MONTH)
    work["date"] = work["dt"].dt.strftime("%Y-%m-%d")
    work["centroid"] = work["area"].map(_centroid_for)

    # Service-area centroid (mean of mapped municipality centroids) for weather.
    mapped_pts = [c for c in work["centroid"].tolist() if c]
    if mapped_pts:
        clat = sum(p[0] for p in mapped_pts) / len(mapped_pts)
        clng = sum(p[1] for p in mapped_pts) / len(mapped_pts)
    else:
        clat, clng = 40.63, -74.90

    weather_available = False
    wmap: Dict[str, Any] = {}
    try:
        wmap = weather_service.get_weather_map(clat, clng, work["date"].min(), work["date"].max()) or {}
        weather_available = len(wmap) > 0
    except Exception as exc:  # noqa: BLE001
        logger.warning("staging: weather join failed: %s", exc)
    if weather_available:
        work["wgroup"] = work["date"].map(lambda d: _WEATHER_GROUP.get((wmap.get(d) or {}).get("condition")))
    else:
        work["wgroup"] = None

    # ── current ("now") conditions — server clock for block/season, live API for weather ──
    now = datetime.now()
    now_block = _BLOCK_OF_HOUR.get(now.hour, "afternoon")
    now_season = _SEASON_OF_MONTH.get(now.month, "spring")
    now_weather = "any"
    if weather_available:
        try:
            today = now.strftime("%Y-%m-%d")
            fc = weather_service.get_weather_forecast(clat, clng, today, today) or {}
            grp = _WEATHER_GROUP.get((fc.get(today) or {}).get("condition"))
            if grp:
                now_weather = grp
        except Exception:  # noqa: BLE001
            pass

    sel_block = time_block if time_block in _BLOCK_KEYS else now_block
    sel_season = season if season in _SEASON_KEYS else now_season
    sel_weather = weather if weather in _WGROUP_KEYS else now_weather

    # ── demand distribution for the selected conditions ──
    note = None
    used_weather = False
    subset = work[(work["block"] == sel_block) & (work["season"] == sel_season)]
    if sel_weather and sel_weather != "any" and weather_available:
        wsub = subset[subset["wgroup"] == sel_weather]
        if len(wsub) >= _MIN_CELL:
            subset, used_weather = wsub, True
        else:
            note = (f"Not enough {_weather_label(sel_weather)} history in this window — showing the "
                    f"typical {_season_label(sel_season)} {_block_label(sel_block)} pattern.")
    if subset.empty:
        subset = work[work["season"] == sel_season]
        note = (note + " " if note else "") + "Sparse data for that exact window; broadened to the season."
    if subset.empty:
        subset = work

    counts = subset["area"].value_counts()
    total = int(counts.sum())
    n_days = int(subset["date"].nunique()) or 1

    areas: List[Dict[str, Any]] = []
    for area, cnt in counts.items():
        centroid = _centroid_for(area)
        areas.append({
            "area": area,
            "calls": int(cnt),
            "share": round(cnt / total * 100, 1) if total else 0.0,
            "lat": centroid[0] if centroid else None,
            "lng": centroid[1] if centroid else None,
            "mapped": centroid is not None,
        })

    # ── coverage-aware greedy top-K over mappable municipalities ──
    pool = [a for a in areas if a["mapped"]]
    recommended: List[Dict[str, Any]] = []
    chosen_pts: List[tuple] = []
    while pool and len(recommended) < units:
        best, best_score = None, -1.0
        for a in pool:
            if chosen_pts:
                dnear = min(_haversine_km((a["lat"], a["lng"]), c) for c in chosen_pts)
                overlap = math.exp(-dnear / _D0_KM)         # ~1 if very close, →0 far apart
            else:
                overlap = 0.0
            score = a["share"] * (0.45 + 0.55 * (1 - overlap))   # demand, weighted for coverage
            if score > best_score:
                best, best_score = a, score
        recommended.append({**best, "rank": len(recommended) + 1})
        chosen_pts.append((best["lat"], best["lng"]))
        pool = [a for a in pool if a["area"] != best["area"]]

    return {
        "available": True,
        "recommended": recommended,
        "areas": areas[:20],
        "units": units,
        "selected": {
            "block": sel_block, "block_label": _block_label(sel_block),
            "season": sel_season, "season_label": _season_label(sel_season),
            "weather": sel_weather, "weather_label": _weather_label(sel_weather),
            "weather_used": used_weather,
        },
        "current": {"block": now_block, "season": now_season, "weather": now_weather},
        "expected_calls_per_day": round(total / n_days, 1),
        "window_days": n_days,
        "sample_calls": total,
        "weather_available": weather_available,
        "note": note,
        "center": {"lat": clat, "lng": clng},
        "options": {
            "blocks": [{"key": k, "label": l} for k, l, _ in TIME_BLOCKS],
            "seasons": [{"key": k, "label": l} for k, l, _ in SEASONS],
            "weather": [{"key": k, "label": l} for k, l in WEATHER_GROUPS],
        },
    }
