"""
EMS predictive analytics — Phase 1: call-volume forecast + staffing.

Reuses the ML forecaster in pipeline/forecasting.py and the dashboard's column
resolution (detect_mapped_column) so it runs on the same EMSCharts schema the
client dashboard already uses. Always returns weekday/hour demand patterns and a
staffing estimate; the ML monthly forecast is included when there is enough
history (the pipeline forecaster needs ~210 days).
"""
import logging
import math
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .ems_analytics_service import detect_mapped_column
from .ems_column_mapping_service import get_column_overrides
from .pipeline.forecasting import _forecast_call_volume

logger = logging.getLogger(__name__)

_WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# In-process caches keyed by (upload_id, cleaning-result signature) so repeated
# dashboard loads (PredictiveAnalytics, TurnoverRisk, AI insights, emergency/IFT
# outlooks) don't re-parse the CSV or re-train the forecast on every request.
# Auto-invalidates when the upload is re-cleaned (the signature changes).
_DF_CACHE: Dict[tuple, pd.DataFrame] = {}
_DASH_CACHE: Dict[tuple, Dict[str, Any]] = {}


def _result_sig(upload) -> str:
    r = upload.cleaning_results[-1] if getattr(upload, "cleaning_results", None) else None
    if r is None:
        return f"raw|{getattr(upload, 'file_path', None)}"
    return f"{getattr(r, 'id', None)}|{getattr(r, 'created_at', None)}"


def _load_df(upload) -> Optional[pd.DataFrame]:
    """Cached DataFrame load — parses the CSV/gz blob once per (upload, cleaning)."""
    key = (str(getattr(upload, "id", "")), _result_sig(upload))
    hit = _DF_CACHE.get(key)
    if hit is not None:
        return hit.copy()
    df = _load_df_raw(upload)
    if df is not None:
        if len(_DF_CACHE) > 8:
            _DF_CACHE.clear()
        _DF_CACHE[key] = df
        return df.copy()
    return None


def _load_df_raw(upload) -> Optional[pd.DataFrame]:
    result = upload.cleaning_results[-1] if upload.cleaning_results else None
    path = result.cleaned_file_path if result and result.cleaned_file_path else upload.file_path
    if path:
        try:
            return pd.read_csv(path, low_memory=False)
        except Exception as exc:  # noqa: BLE001
            logger.warning("predictive: could not read %s: %s — trying DB copy", path, exc)
    # Fallback: cleaned CSV persisted in the DB (server-accessible; works when the
    # file isn't on this server's disk — e.g. ephemeral Railway storage or a path
    # from a different machine).
    blob = getattr(result, "cleaned_data_gz", None) if result is not None else None
    if blob:
        try:
            import gzip
            import io
            return pd.read_csv(io.BytesIO(gzip.decompress(blob)), low_memory=False)
        except Exception as exc:  # noqa: BLE001
            logger.warning("predictive: DB cleaned-data load failed: %s", exc)
    return None


def _resolve_dt(df: pd.DataFrame, overrides: Dict) -> tuple:
    """Resolve a usable dispatch/received datetime column → (col_name, parsed Series)."""
    for field in ("incident_date", "received_time", "dispatch_time"):
        col = detect_mapped_column(df, field, overrides)
        if col and col in df.columns:
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().sum() >= max(30, 0.5 * len(df)):
                return col, parsed
    return None, None


def _confidence(days: int) -> str:
    if days >= 730:
        return "high"
    if days >= 210:
        return "medium"
    return "low"


def _weekday_hour(df: pd.DataFrame, dt: pd.Series) -> tuple:
    cols = {c.lower(): c for c in df.columns}

    # Weekday from the parsed datetime → consistent full names, Mon→Sun order.
    wvc = dt.dt.day_name().dropna().value_counts()
    weekday = {d: int(wvc.get(d, 0)) for d in _WEEKDAY_ORDER if d in wvc.index}
    busiest_weekday = max(weekday, key=weekday.get) if weekday else None

    hod_col = cols.get("hour_of_day_of_dispatch")
    if hod_col:
        h = pd.to_numeric(df[hod_col], errors="coerce").dropna().astype(int)
    else:
        h = dt.dt.hour.dropna().astype(int)
    h = h[(h >= 0) & (h <= 23)]
    hour = {int(k): int(v) for k, v in h.value_counts().sort_index().items()}
    busiest_hour = int(h.value_counts().idxmax()) if len(h) else None
    return weekday, hour, busiest_weekday, busiest_hour


def _coverage_and_duration(df: pd.DataFrame) -> tuple:
    """Derive (active_station_count, actual_call_duration_hours) from the data.

    • active stations = distinct base sites each handling >=3% of calls — the
      geographic coverage footprint a rural system must keep staffed.
    • call duration  = median dispatch->available (unit busy time), in hours.
    Returns (coverage_units or None, call_duration_hours or None).
    """
    cols = {c.lower(): c for c in df.columns}
    coverage = None
    base_col = cols.get("basesite") or cols.get("station") or cols.get("base")
    if base_col:
        vc = df[base_col].dropna().astype(str)
        vc = vc[vc.str.strip().str.len() > 0].value_counts()
        if len(vc):
            share = vc / vc.sum()
            coverage = int((share >= 0.03).sum()) or int(len(vc))

    dur = None
    disp = cols.get("date_dispatched") or cols.get("dispatch_time")
    avail = cols.get("date_available") or cols.get("available_time")
    if disp and avail:
        td = (pd.to_datetime(df[avail], errors="coerce") - pd.to_datetime(df[disp], errors="coerce"))
        hrs = td.dt.total_seconds() / 3600.0
        hrs = hrs[(hrs > 0) & (hrs < 6)]
        if len(hrs) >= 30:
            dur = float(hrs.median())
    return coverage, dur


def _staffing(
    daily: pd.Series,
    hour: Dict[int, int],
    settings: Optional[Dict] = None,
    coverage_units: Optional[int] = None,
    call_duration_hours: Optional[float] = None,
    resp_p90_min: Optional[float] = None,
    ift: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Peak emergency units = max(concurrent demand, geographic coverage), then
    adjusted for response-time performance, plus a separate dedicated IFT crew.

    Rural EMS is coverage-driven (a unit per active station). On top of that:
      • RESPONSE TIME — if the 90th-percentile response exceeds target, add
        coverage, since slow response signals stretched/poorly-positioned units.
      • IFT — interfacility transfers tie up a unit for long round-trips; a
        dedicated transport crew on the IFT window keeps emergency units free,
        so it is recommended separately rather than folded into emergency demand.
    """
    s = settings or {}
    shift_hours = s.get("shift_length_hours", 12)
    buffer = s.get("peak_buffer_pct", 15) / 100.0
    target_uhu = s.get("target_unit_hour_utilization", 0.30)  # EMS norm ~0.25-0.35
    resp_target_min = s.get("response_p90_target_min", 9.0)
    call_hours = call_duration_hours or s.get("avg_call_duration_hours", 1.0)
    min_units = s.get("min_units", 1)

    avg_per_day = float(daily.mean()) if len(daily) else 0.0
    peak_share = (max(hour.values()) / sum(hour.values())) if hour and sum(hour.values()) else (1.0 / 24.0)
    peak_calls_per_hour = avg_per_day * peak_share

    # 1) Demand: units to cover concurrent calls in the busiest hour.
    demand_units = max(min_units, math.ceil(peak_calls_per_hour * call_hours * (1 + buffer)))
    # 2) Coverage: a unit per active station for geographic response-time coverage.
    coverage_floor = max(min_units, int(coverage_units)) if coverage_units else min_units
    base_peak = max(demand_units, coverage_floor)

    # 3) Response-time pressure: P90 above target → add coverage (+1 per ~50%
    #    over target, capped at +3) to bring response back toward target.
    resp_adj = 0
    meeting_target = None
    if resp_p90_min is not None:
        meeting_target = bool(resp_p90_min <= resp_target_min)
        if not meeting_target:
            over = (resp_p90_min - resp_target_min) / max(resp_target_min, 1.0)
            resp_adj = min(3, max(1, math.ceil(over / 0.5)))
    emergency_units = base_peak + resp_adj

    # 4) IFT: a dedicated transport crew on the IFT window (offloads transfers).
    ift_crew: Dict[str, Any] = {"recommended": False, "units": 0}
    if ift and ift.get("applicable"):
        sched = ift.get("schedule_recommendation", {}) or {}
        wk = ift.get("weekly_expected_ift") or 0
        ift_crew = {
            "recommended": True,
            "units": 2 if wk > 25 else 1,
            "window_days": sched.get("window_days"),
            "window_start": sched.get("window_start"),
            "window_end": sched.get("window_end"),
            "weekly_transfers": wk,
            "reason": (
                "Dedicated transport crew on the IFT window offloads scheduled transfers "
                "so emergency units stay available."
            ),
        }

    busy_unit_hours = avg_per_day * call_hours
    proj_uhu = round(busy_unit_hours / (emergency_units * shift_hours), 2) if emergency_units else None

    by_weekday: List[Dict[str, Any]] = []
    if len(daily):
        idx = pd.to_datetime(daily.index)
        wk_avg = daily.groupby(idx.day_name()).mean()
        overall = float(wk_avg.mean()) if len(wk_avg) else avg_per_day
        for d in _WEEKDAY_ORDER:
            if d not in wk_avg.index:
                continue
            calls = float(wk_avg[d])
            day_demand = math.ceil(calls * peak_share * call_hours * (1 + buffer))
            units = max(min_units, day_demand, coverage_floor) + resp_adj
            ratio = (calls / overall) if overall else 1.0
            risk = "High" if ratio >= 1.2 else ("Moderate" if ratio >= 1.05 else "Low")
            by_weekday.append({
                "weekday": d, "predicted_calls": round(calls, 1),
                "recommended_units": units, "risk": risk,
            })

    binding = "coverage" if coverage_floor >= demand_units else "demand"
    if resp_adj > 0:
        binding = "response-time"

    return {
        "recommended_units_peak": emergency_units,
        "emergency_units": emergency_units,
        "demand_units": demand_units,
        "coverage_units": coverage_floor,
        "binding_constraint": binding,
        "response_time": {
            "p90_minutes": resp_p90_min,
            "target_p90_minutes": resp_target_min,
            "meeting_target": meeting_target,
            "adjustment_units": resp_adj,
        },
        "ift_crew": ift_crew,
        "total_units_in_ift_window": emergency_units + ift_crew.get("units", 0),
        "avg_calls_per_day": round(avg_per_day, 1),
        "avg_call_duration_hours": round(call_hours, 2),
        "projected_unit_hour_utilization": proj_uhu,
        "by_weekday": by_weekday,
        "assumptions": {
            "shift_length_hours": shift_hours,
            "peak_buffer_pct": int(buffer * 100),
            "avg_call_duration_hours": round(call_hours, 2),
            "target_unit_hour_utilization": target_uhu,
            "response_p90_target_min": resp_target_min,
            "coverage_basis": "one unit per active station (>=3% of calls) for geographic coverage",
        },
        "disclaimer": (
            "Decision-support estimate. Emergency peak = max(concurrent demand, station coverage) "
            "adjusted for response-time performance; the IFT crew is staffed separately on the "
            "transfer window. Review with agency leadership, mutual-aid agreements, and response targets."
        ),
    }


def get_predictive_dashboard(upload, db, horizon: int = 12, settings: Optional[Dict] = None) -> Dict[str, Any]:
    """Main entry point used by the API. Returns forecast + patterns + staffing.

    Result is cached per (upload, cleaning signature, horizon, settings) so the
    Predictions tab + TurnoverRisk + AI insights reuse one computation instead of
    re-training the forecast on every request."""
    _ckey = (
        str(getattr(upload, "id", "")), _result_sig(upload), horizon,
        repr(sorted(settings.items())) if settings else "",
    )
    _hit = _DASH_CACHE.get(_ckey)
    if _hit is not None:
        return _hit

    df = _load_df(upload)
    if df is None or df.empty:
        return {"available": False, "reason": "No cleaned data available for this upload."}

    try:
        overrides = get_column_overrides(upload, db) or {}
    except Exception:  # noqa: BLE001
        overrides = {}

    dt_col, dt = _resolve_dt(df, overrides)
    if dt is None:
        return {"available": False, "reason": "No usable dispatch/received date column was detected in this upload."}

    df = df.copy()
    df["_dt_created"] = dt
    valid = dt.dropna()
    days_available = int((valid.max() - valid.min()).days + 1) if len(valid) else 0
    total_calls = int(len(valid))

    daily = valid.dt.normalize().value_counts().sort_index()
    if len(daily):
        daily.index = pd.DatetimeIndex(daily.index)
        full = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
        daily = daily.reindex(full, fill_value=0)

    weekday, hour, busiest_weekday, busiest_hour = _weekday_hour(df, dt)
    cov_units, call_dur = _coverage_and_duration(df)

    # Response-time performance + IFT load feed the staffing recommendation.
    resp_p90 = None
    try:
        from .ems_analytics_service import _response_times
        _rt = _response_times(df, overrides)
        if _rt.get("available"):
            # Staffing pressure uses dispatch → on-scene (time-to-scene); the
            # headline 'response time' is now ZOLL's en route → on-scene (shorter).
            _ivs = _rt.get("intervals") or {}
            resp_p90 = (_ivs.get("dispatch_to_arrival") or {}).get("p90_minutes") or _rt.get("p90_minutes")
    except Exception:  # noqa: BLE001
        pass
    ift_outlook = None
    try:
        from .ems_ift_service import get_ift_outlook
        ift_outlook = get_ift_outlook(upload, db)
    except Exception:  # noqa: BLE001
        pass

    staffing = _staffing(
        daily, hour, settings,
        coverage_units=cov_units, call_duration_hours=call_dur,
        resp_p90_min=resp_p90, ift=ift_outlook,
    )

    forecast = _forecast_call_volume(df, horizon=horizon)
    forecast_ok = "error" not in forecast

    warnings: List[str] = []
    if not forecast_ok:
        warnings.append(forecast.get("error", "Monthly forecast unavailable."))
    if 0 < days_available < 365:
        warnings.append(
            f"Only ~{days_available} days of history — seasonal patterns and long-range "
            "forecasts are limited. 12+ months is recommended for reliable forecasting."
        )

    result = {
        "available": True,
        "confidence": _confidence(days_available),
        "context": {
            "history_start": str(valid.min().date()) if len(valid) else None,
            "history_end": str(valid.max().date()) if len(valid) else None,
            "days_available": days_available,
            "total_calls": total_calls,
            "datetime_column": dt_col,
            "model_used": forecast.get("model_name") if forecast_ok else None,
        },
        "call_volume_forecast": forecast if forecast_ok else {"available": False, "reason": forecast.get("error")},
        "patterns": {
            "weekday": weekday,
            "hour": hour,
            "busiest_weekday": busiest_weekday,
            "busiest_hour": busiest_hour,
        },
        "staffing": staffing,
        "warnings": warnings,
    }
    if len(_DASH_CACHE) > 16:
        _DASH_CACHE.clear()
    _DASH_CACHE[_ckey] = result
    return result
