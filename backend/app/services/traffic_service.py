"""
Pluggable traffic provider for response-time / MVA enrichment.

Providers:
  - time_proxy (default): no external calls. Per-area congestion isn't available
    from a time proxy, so this returns available=False with a note; the
    hour-of-day analysis already captures the time dimension for free.
  - google: Google Routes API (computeRoutes, TRAFFIC_AWARE). For each township
    centroid it computes typical drive time from the station/agency origin at a
    representative rush-hour departure, and a congestion factor
    (traffic_duration / free_flow_duration). Needs GOOGLE_MAPS_API_KEY (Routes
    API enabled + billing). Results are cached in process.

This is the per-area signal a free time proxy cannot give: which townships are
hardest to reach in typical traffic.
"""
import json
import logging
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from ..config import get_settings

logger = logging.getLogger(__name__)

_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
_CACHE: Dict[str, Dict[str, Any]] = {}


def _secs(v) -> Optional[float]:
    # Google durations look like "1234s"
    if not v:
        return None
    try:
        return float(str(v).rstrip("s"))
    except Exception:  # noqa: BLE001
        return None


def _next_rush_departure() -> str:
    """RFC3339 timestamp for the next weekday ~5pm ET (21:00 UTC) — Routes needs a future time."""
    now = datetime.now(timezone.utc)
    target = now.replace(hour=21, minute=0, second=0, microsecond=0)
    if target <= now + timedelta(minutes=5):
        target += timedelta(days=1)
    while target.weekday() >= 5:  # skip Sat/Sun
        target += timedelta(days=1)
    return target.strftime("%Y-%m-%dT%H:%M:%SZ")


def _route(origin: Tuple[float, float], dest: Tuple[float, float], key: str, departure: str):
    body = {
        "origin": {"location": {"latLng": {"latitude": origin[0], "longitude": origin[1]}}},
        "destination": {"location": {"latLng": {"latitude": dest[0], "longitude": dest[1]}}},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "departureTime": departure,
    }
    req = urllib.request.Request(
        _ROUTES_URL,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:  # hardcoded https Google Routes URL, no user-controlled scheme  # nosec B310
        data = json.loads(resp.read().decode("utf-8"))
    routes = data.get("routes") or []
    if not routes:
        return None
    return _secs(routes[0].get("duration")), _secs(routes[0].get("staticDuration")), routes[0].get("distanceMeters")


def get_area_congestion(origin: Tuple[float, float], areas: Dict[str, Tuple[float, float]]) -> Dict[str, Any]:
    """Return typical-traffic congestion per area from the configured provider."""
    s = get_settings()
    if s.traffic_provider != "google" or not s.google_maps_api_key:
        return {
            "provider": "time_proxy",
            "available": False,
            "note": "Google traffic not configured. Set traffic_provider=google and "
                    "google_maps_api_key (Routes API + billing) to enable per-area congestion.",
            "areas": [],
        }

    # Allow a configured station origin override ("lat,lng")
    if s.traffic_origin:
        try:
            lat, lng = [float(x) for x in s.traffic_origin.split(",")]
            origin = (lat, lng)
        except Exception:  # noqa: BLE001
            pass

    departure = _next_rush_departure()
    cache_key = f"{round(origin[0], 3)},{round(origin[1], 3)}|{len(areas)}|{departure[:13]}"
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    out = []
    for name, (lat, lng) in areas.items():
        try:
            r = _route(origin, (lat, lng), s.google_maps_api_key, departure)
            if not r:
                continue
            dur, static, dist = r
            out.append({
                "name": name,
                "lat": lat, "lng": lng,
                "congestion_factor": round(dur / static, 2) if (dur and static) else None,
                "typical_min": round(dur / 60, 1) if dur else None,
                "free_flow_min": round(static / 60, 1) if static else None,
                "distance_mi": round(dist / 1609.34, 1) if dist else None,
            })
        except Exception as exc:  # noqa: BLE001
            logger.warning("traffic route failed for %s: %s", name, exc)

    out.sort(key=lambda x: -(x["congestion_factor"] or 0))
    result = {
        "provider": "google",
        "available": len(out) > 0,
        "departure": departure,
        "origin": {"lat": origin[0], "lng": origin[1]},
        "areas": out,
        "note": None if out else "No routes returned — check the API key, Routes API enablement, and billing.",
    }
    if out:
        _CACHE[cache_key] = result  # only cache successful lookups so failures retry
    return result
