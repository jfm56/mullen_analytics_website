"""
EMS geographic analytics — Phase 2: township call-volume hotspots + projection.

The EMSCharts exports have no lat/lng; location lives in `scene_grid` as a
township name with a numeric prefix (e.g. "46 -Township of Clinton"). We strip
the prefix, group by municipality, and map each to a curated NJ centroid so the
frontend can plot a real hotspot map. A simple recent-vs-earlier trend + a
near-term projection give the "hotspots to come" signal without 23 separate
ML models.
"""
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from .ems_predictive_service import _load_df, _resolve_dt
from .ems_column_mapping_service import get_column_overrides

logger = logging.getLogger(__name__)

# Curated approximate municipal centroids (lat, lng) for the Hunterdon County, NJ
# service area and neighbors. Township-level markers — refine if exact centroids
# are needed. Keys are matched case/punctuation-insensitively.
NJ_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "township of clinton": (40.6418, -74.8860),
    "town of clinton": (40.6373, -74.9099),
    "union township": (40.6440, -74.9930),
    "raritan township": (40.5170, -74.8760),
    "high bridge borough": (40.6679, -74.8954),
    "lebanon borough": (40.6418, -74.8338),
    "glen gardner borough": (40.6929, -74.9438),
    "hampton borough": (40.7037, -74.9532),
    "bethlehem township": (40.6712, -74.9710),
    "washington township warren": (40.7560, -74.9793),
    "franklin township": (40.5845, -74.9760),
    "washington borough warren": (40.7579, -74.9821),
    "franklin township warren": (40.7790, -75.0640),
    "tewksbury township": (40.6968, -74.8077),
    "lebanon township": (40.7180, -74.8340),
    "readington township": (40.5640, -74.7710),
    "bloomsbury borough": (40.6740, -75.0860),
    "east amwell": (40.4410, -74.8330),
    "east amwell township": (40.4410, -74.8330),
    "flemington borough": (40.5123, -74.8593),
    "white township warren county": (40.7790, -75.0490),
    "delaware twp": (40.4290, -74.9180),
    "delaware township": (40.4290, -74.9180),
    "alexandria township": (40.5790, -75.0240),
    "phillipsburg warren co": (40.6937, -75.1899),
    "holland township": (40.5760, -75.0890),
    "califon borough": (40.7193, -74.8338),
    "oxford township": (40.8040, -75.0030),
    "stockton borough": (40.4040, -74.9790),
    "west amwell": (40.3760, -74.9170),
    "west amwell township": (40.3760, -74.9170),
    "raritan boro somerset co": (40.5698, -74.6338),
    "bridgewater township somerset co": (40.5940, -74.6160),
}

_PREFIX_RE = re.compile(r"^\s*\d+\s*-\s*")


def _normalize_location(value: Any) -> str:
    s = str(value).strip()
    s = _PREFIX_RE.sub("", s)          # strip "46 -" prefix
    return s.strip()


def _simplify(name: str) -> str:
    s = name.lower().replace("twp.", "township").replace("twp", "township")
    s = re.sub(r"[^a-z0-9 ]", " ", s)  # drop punctuation
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _centroid_for(name: str) -> Optional[Tuple[float, float]]:
    return NJ_CENTROIDS.get(_simplify(name))


def _detect_location_column(df: pd.DataFrame, overrides: Dict) -> Optional[str]:
    cols = {c.lower(): c for c in df.columns}
    for cand in ("scene_grid", "municipality", "response_zone", "zone", "zip_code", "incident_address"):
        if cand in cols:
            return cols[cand]
    # column-mapping override for a municipality-like field
    for fld in ("municipality", "scene_grid", "zone", "incident_city"):
        actual = (overrides or {}).get(fld)
        if actual and actual in df.columns:
            return actual
    return None


def get_geographic_dashboard(upload, db, filters: Optional[Dict] = None) -> Dict[str, Any]:
    df = _load_df(upload)
    if df is None or df.empty:
        return {"available": False, "reason": "No cleaned data available for this upload."}

    try:
        overrides = get_column_overrides(upload, db) or {}
    except Exception:  # noqa: BLE001
        overrides = {}

    loc_col = _detect_location_column(df, overrides)
    if not loc_col:
        return {
            "available": False,
            "reason": "No geographic field detected. Map a municipality / scene-grid / zone "
                      "column in Column Mapping to enable the hotspot map.",
        }

    total_calls = int(len(df))
    norm = df[loc_col].dropna().astype(str).map(_normalize_location)
    norm = norm[norm.str.len() > 0]
    calls_with_location = int(len(norm))

    # Optional datetime for trend / projection
    _, dt = _resolve_dt(df, overrides)
    recent_mask = None
    span_days = 0
    if dt is not None:
        valid = dt.dropna()
        if len(valid):
            span_days = int((valid.max() - valid.min()).days + 1)
            midpoint = valid.min() + (valid.max() - valid.min()) / 2
            recent_mask = dt >= midpoint  # second half = "recent"

    counts = norm.value_counts()
    location_volume: List[Dict[str, Any]] = []
    map_points: List[Dict[str, Any]] = []
    lat_sum = lng_sum = 0.0
    mapped = 0

    for name, count in counts.items():
        count = int(count)
        pct = round(count / total_calls * 100, 1) if total_calls else 0.0
        centroid = _centroid_for(name)

        trend = "n/a"
        projected_30 = None
        if recent_mask is not None and span_days > 0:
            idx = norm.index
            this = norm == name
            recent_ct = int((this & recent_mask.reindex(idx, fill_value=False)).sum())
            earlier_ct = count - recent_ct
            if earlier_ct > 0:
                ratio = recent_ct / earlier_ct
                trend = "rising" if ratio >= 1.15 else ("falling" if ratio <= 0.85 else "stable")
            recent_days = max(span_days / 2.0, 1.0)
            projected_30 = round(recent_ct / recent_days * 30.0, 1)

        row = {
            "location": name,
            "call_count": count,
            "percent": pct,
            "trend": trend,
            "projected_30d": projected_30,
            "lat": centroid[0] if centroid else None,
            "lng": centroid[1] if centroid else None,
            "mapped": centroid is not None,
        }
        location_volume.append(row)
        if centroid:
            mapped += 1
            lat_sum += centroid[0]
            lng_sum += centroid[1]
            map_points.append(row)

    top = location_volume[0]["location"] if location_volume else None
    center = {"lat": lat_sum / mapped, "lng": lng_sum / mapped} if mapped else {"lat": 40.63, "lng": -74.90}

    warnings: List[str] = []
    unmapped = [r["location"] for r in location_volume if not r["mapped"]]
    if unmapped:
        warnings.append(
            f"{len(unmapped)} location(s) have no map coordinates and appear in the table only: "
            + ", ".join(unmapped[:6]) + ("…" if len(unmapped) > 6 else "")
        )
    if dt is None:
        warnings.append("No usable date column — trend and projection are unavailable.")

    return {
        "available": True,
        "location_field": loc_col,
        "summary": {
            "total_calls": total_calls,
            "calls_with_location": calls_with_location,
            "location_coverage_percent": round(calls_with_location / total_calls * 100, 1) if total_calls else 0.0,
            "unique_locations": int(len(counts)),
            "mapped_locations": mapped,
            "top_location": top,
            "top_location_calls": location_volume[0]["call_count"] if location_volume else 0,
        },
        "center": center,
        "map_points": map_points,
        "location_volume": location_volume,
        "warnings": warnings,
    }
