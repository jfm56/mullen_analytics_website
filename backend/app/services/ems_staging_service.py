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
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
import pandas as pd

from . import weather_service
from .ems_analytics_service import detect_mapped_column
from .ems_column_mapping_service import get_column_overrides
from .ems_geographic_service import _centroid_for, _detect_location_column, _normalize_location
from .ems_predictive_service import _load_df, _resolve_dt

logger = logging.getLogger(__name__)

# ── Scene GPS (newer emsCharts export) → point-level, cross-street staging ──
_LATLNG_RE = re.compile(r"(-?\d{1,3}(?:\.\d+)?)\s*[,;| ]\s*(-?\d{1,3}(?:\.\d+)?)")
_GEO_CACHE: Dict[Tuple[float, float], str] = {}
_MIN_GPS_POINTS = 8   # need a reasonable cloud of points before clustering is meaningful


def _parse_latlng(val: Any) -> Optional[Tuple[float, float]]:
    """Parse a scene-GPS cell into (lat, lng). Tolerant of 'lat,lng', 'lat lng',
    '(lat, lng)'. Service area is NJ, so we auto-correct lng,lat order and reject
    (0,0) / out-of-range junk."""
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null"):
        return None
    m = _LATLNG_RE.search(s)
    if not m:
        return None
    try:
        a, b = float(m.group(1)), float(m.group(2))
    except (TypeError, ValueError):
        return None
    # NJ service area ~ lat 38–43, lng -77 to -72; swap if given lng,lat.
    if (-77 <= a <= -72) and (38 <= b <= 43):
        a, b = b, a
    lat, lng = a, b
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    if abs(lat) < 0.01 and abs(lng) < 0.01:
        return None
    return (lat, lng)


def _coerce_latlng(a: Any, b: Any) -> Optional[Tuple[float, float]]:
    """Two SEPARATE latitude / longitude cells → validated (lat, lng). Same NJ
    lng,lat auto-swap and junk rejection as _parse_latlng, for exports that ship
    referring/scene coordinates in two columns rather than one 'lat,lng' string."""
    try:
        lat = float(str(a).strip())
        lng = float(str(b).strip())
    except (TypeError, ValueError):
        return None
    if math.isnan(lat) or math.isnan(lng):
        return None
    if (-77 <= lat <= -72) and (38 <= lng <= 43):   # given as (lng, lat) → swap
        lat, lng = lng, lat
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    if abs(lat) < 0.01 and abs(lng) < 0.01:
        return None
    return (lat, lng)


def _resolve_scene_points(df: pd.DataFrame, index, overrides: Optional[Dict]):
    """Per-call incident (demand) coordinates for staging, from an explicit
    scene/referring source ONLY — never dispatch (station) or destination
    (hospital) GPS, which would bias posts toward quarters or the ED.

    Handles both a combined 'lat,lng' column and separate latitude/longitude
    columns, preferring scene, then referring. Returns (lat_series, lng_series,
    source) aligned to *index*, or (None, None, None) when no usable source."""
    # 1) combined "lat,lng" GPS column
    for field, src in (("scene_gps", "scene"), ("referring_gps", "referring")):
        col = detect_mapped_column(df, field, overrides)
        if col and col in df.columns:
            gps = df.loc[index, col].map(_parse_latlng)
            lat = gps.map(lambda p: p[0] if p else None)
            lng = gps.map(lambda p: p[1] if p else None)
            if lat.notna().sum() > 0:
                return lat, lng, src
    # 2) separate latitude / longitude columns
    for latf, lngf, src in (("scene_lat", "scene_lng", "scene"),
                            ("referring_lat", "referring_lng", "referring")):
        lat_col = detect_mapped_column(df, latf, overrides)
        lng_col = detect_mapped_column(df, lngf, overrides)
        if lat_col and lng_col and lat_col in df.columns and lng_col in df.columns:
            pairs = [_coerce_latlng(a, b)
                     for a, b in zip(df.loc[index, lat_col], df.loc[index, lng_col])]
            lat = pd.Series([p[0] if p else None for p in pairs], index=index)
            lng = pd.Series([p[1] if p else None for p in pairs], index=index)
            if lat.notna().sum() > 0:
                return lat, lng, src
    return None, None, None


def _reverse_geocode(lat: float, lng: float) -> str:
    """Nearest road + town for a coordinate, via OpenStreetMap Nominatim. Cached and
    fail-soft: returns the coordinate string if lookup is unavailable."""
    key = (round(lat, 4), round(lng, 4))
    if key in _GEO_CACHE:
        return _GEO_CACHE[key]
    label = None
    try:
        r = httpx.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lng, "format": "jsonv2", "zoom": 17, "addressdetails": 1},
            headers={"User-Agent": "MullenAnalytics/1.0 (jmullen@mullenanalytics.com)"},
            timeout=8.0,
        )
        r.raise_for_status()
        a = (r.json() or {}).get("address", {}) or {}
        road = a.get("road") or a.get("pedestrian") or a.get("footway") or a.get("cycleway")
        town = (a.get("town") or a.get("city") or a.get("village") or a.get("hamlet")
                or a.get("municipality") or a.get("township") or a.get("suburb"))
        if road and town:
            label = f"{road}, {town}"
        else:
            label = road or town
    except Exception as exc:  # noqa: BLE001
        logger.info("staging reverse-geocode failed (%s,%s): %s", lat, lng, exc)
    if not label:
        label = f"{lat:.4f}, {lng:.4f}"
    _GEO_CACHE[key] = label
    return label


def _gps_staging(pts_df: pd.DataFrame, units: int) -> List[Dict[str, Any]]:
    """Demand-weighted k-means over scene coordinates → up to `units` optimal staging
    points (each cluster center minimizes travel to its calls), reverse-geocoded to
    the nearest road. Returns [] if clustering isn't possible."""
    try:
        import numpy as np
        from sklearn.cluster import KMeans
    except Exception:  # noqa: BLE001
        return []
    pts = pts_df[["gps_lat", "gps_lng"]].to_numpy(dtype=float)
    n = len(pts)
    if n == 0:
        return []
    k = max(1, min(int(units), n))
    lat0 = float(pts[:, 0].mean())
    scale = math.cos(math.radians(lat0)) or 1.0     # keep east–west distance true when clustering
    X = np.column_stack([pts[:, 0], pts[:, 1] * scale])
    try:
        km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
    except Exception as exc:  # noqa: BLE001
        logger.warning("staging: KMeans failed: %s", exc)
        return []
    centers = km.cluster_centers_.astype(float).copy()
    centers[:, 1] = centers[:, 1] / scale
    labels = km.labels_
    clusters = [(float(centers[i][0]), float(centers[i][1]), int((labels == i).sum()))
                for i in range(k) if int((labels == i).sum()) > 0]
    clusters.sort(key=lambda c: -c[2])
    out: List[Dict[str, Any]] = []
    for rank, (clat, clng, cnt) in enumerate(clusters, 1):
        label = _reverse_geocode(clat, clng)
        out.append({
            "rank": rank, "lat": round(clat, 5), "lng": round(clng, 5),
            "label": label, "area": label, "calls": cnt,
            "share": round(cnt / n * 100, 1), "mapped": True,
        })
    return out


def _core_points(pts_df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """Drop geographically far outlier calls (mutual aid / long-distance transports /
    bad coordinates) so staging stays in the core response area, not dragged to a lone
    distant call. Robust Tukey rule on distance from the median center, with a 12 km
    floor so genuinely spread areas aren't over-trimmed. Returns (core_df, n_excluded)."""
    try:
        import numpy as np
    except Exception:  # noqa: BLE001
        return pts_df, 0
    pts = pts_df[["gps_lat", "gps_lng"]].to_numpy(dtype=float)
    if len(pts) < 6:
        return pts_df, 0
    clat, clng = float(np.median(pts[:, 0])), float(np.median(pts[:, 1]))
    d = np.array([_haversine_km((p[0], p[1]), (clat, clng)) for p in pts])
    q1, q3 = np.percentile(d, [25, 75])
    # Keep everything within a generous max-staging radius (~40 km / 25 mi) OR within
    # the data's own spread (Tukey) for agencies larger than that — whichever is more
    # permissive. Only genuinely far-flung calls (distant mutual aid / transports) drop.
    thresh = max(40.0, float(q3 + 1.5 * (q3 - q1)))
    keep = d <= thresh
    n_excl = int((~keep).sum())
    if n_excl == 0 or int(keep.sum()) < 3:
        return pts_df, 0
    return pts_df[keep], n_excl

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

    # Scene / referring GPS (newer export) → point-level staging on the incident
    # (demand) location; absent on older uploads (falls back to municipality).
    scene_lat, scene_lng, gps_source = _resolve_scene_points(df, work.index, overrides)
    if scene_lat is not None:
        work["gps_lat"] = scene_lat
        work["gps_lng"] = scene_lng
    else:
        work["gps_lat"] = None
        work["gps_lng"] = None
        gps_source = None

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

    # ── Recommended posts: cluster real scene GPS when available (point-level /
    # cross-street), else coverage-aware greedy over municipality centroids ──
    method = "centroid"
    recommended: List[Dict[str, Any]] = []
    gps_pts = subset[["gps_lat", "gps_lng"]].dropna()
    gps_count = int(len(gps_pts))
    gps_excluded = 0
    if gps_count >= max(_MIN_GPS_POINTS, units):
        core, gps_excluded = _core_points(gps_pts)
        recommended = _gps_staging(core, units)
        if recommended:
            method = "gps"
            gps_count = int(len(core))

    if not recommended:
        pool = [a for a in areas if a["mapped"]]
        chosen_pts: List[tuple] = []
        while pool and len(recommended) < units:
            best, best_score = None, -1.0
            for a in pool:
                if chosen_pts:
                    dnear = min(_haversine_km((a["lat"], a["lng"]), c) for c in chosen_pts)
                    overlap = math.exp(-dnear / _D0_KM)     # ~1 if very close, →0 far apart
                else:
                    overlap = 0.0
                score = a["share"] * (0.45 + 0.55 * (1 - overlap))   # demand, weighted for coverage
                if score > best_score:
                    best, best_score = a, score
            recommended.append({**best, "rank": len(recommended) + 1})
            chosen_pts.append((best["lat"], best["lng"]))
            pool = [a for a in pool if a["area"] != best["area"]]

    if method == "gps" and gps_excluded > 0:
        note = ((note + " ") if note else "") + (
            f"{gps_excluded} call{'s' if gps_excluded != 1 else ''} far outside the core response area "
            "(mutual aid / long-distance transport) excluded so staging stays in your coverage zone."
        )

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
        "method": method,
        "gps_source": gps_source if method == "gps" else None,
        "gps_points": gps_count,
        "gps_excluded": gps_excluded,
        "weather_available": weather_available,
        "note": note,
        "center": {"lat": clat, "lng": clng},
        "options": {
            "blocks": [{"key": k, "label": l} for k, l, _ in TIME_BLOCKS],
            "seasons": [{"key": k, "label": l} for k, l, _ in SEASONS],
            "weather": [{"key": k, "label": l} for k, l in WEATHER_GROUPS],
        },
    }
