"""
Historical daily weather via Open-Meteo's archive API (free, no API key).

Used to enrich EMS calls with the weather conditions on each call's date so we
can analyse / predict how weather affects response times. Results are cached in
process per (location, date-range). Fails soft: returns {} so callers degrade
gracefully when the network or API is unavailable.
"""
import json
import logging
import urllib.parse
import urllib.request
from typing import Any, Dict

logger = logging.getLogger(__name__)

_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
_CACHE: Dict[str, Dict[str, Dict[str, Any]]] = {}


def _categorize(snow, precip_in, tmax_f, tmin_f, wind_mph) -> str:
    s = snow or 0.0
    p = precip_in or 0.0
    tmax = tmax_f if tmax_f is not None else 60.0
    tmin = tmin_f if tmin_f is not None else 40.0
    w = wind_mph or 0.0
    if s >= 0.1:
        return "snow"
    if tmin <= 32 and p > 0.01:
        return "ice"
    if p >= 0.5:
        return "heavy_rain"
    if p > 0.01:
        return "rain"
    if w >= 25:
        return "wind"
    if tmax >= 90:
        return "extreme_heat"
    if tmax <= 32:
        return "cold"
    return "clear"


def get_weather_map(lat: float, lng: float, start: str, end: str) -> Dict[str, Dict[str, Any]]:
    """Return {'YYYY-MM-DD': {condition, temp_max_f, temp_min_f, precip_in, snow, wind_mph}}.

    Returns {} on any failure so the caller can degrade gracefully.
    """
    key = f"{round(lat, 2)},{round(lng, 2)},{start},{end}"
    if key in _CACHE:
        return _CACHE[key]

    params = {
        "latitude": round(lat, 3),
        "longitude": round(lng, 3),
        "start_date": start,
        "end_date": end,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max",
        "timezone": "America/New_York",
        "temperature_unit": "fahrenheit",
        "precipitation_unit": "inch",
        "wind_speed_unit": "mph",
    }
    url = _ARCHIVE_URL + "?" + urllib.parse.urlencode(params)
    out: Dict[str, Dict[str, Any]] = {}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MullenAnalytics/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        daily = data.get("daily", {}) or {}
        dates = daily.get("time", []) or []
        tmax = daily.get("temperature_2m_max", []) or []
        tmin = daily.get("temperature_2m_min", []) or []
        precip = daily.get("precipitation_sum", []) or []
        snow = daily.get("snowfall_sum", []) or []
        wind = daily.get("wind_speed_10m_max", []) or []

        def at(arr, i):
            return arr[i] if i < len(arr) else None

        for i, d in enumerate(dates):
            tx, tn = at(tmax, i), at(tmin, i)
            pr, sn, wd = at(precip, i), at(snow, i), at(wind, i)
            out[d] = {
                "condition": _categorize(sn, pr, tx, tn, wd),
                "temp_max_f": tx,
                "temp_min_f": tn,
                "precip_in": pr,
                "snow": sn,
                "wind_mph": wd,
            }
    except Exception as exc:  # noqa: BLE001
        logger.warning("weather fetch failed (%s): %s", url[:80], exc)
        return {}

    _CACHE[key] = out
    return out
