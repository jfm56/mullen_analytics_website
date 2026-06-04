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


def _load_df(upload) -> Optional[pd.DataFrame]:
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


def _staffing(daily: pd.Series, hour: Dict[int, int], settings: Optional[Dict] = None) -> Dict[str, Any]:
    s = settings or {}
    target = s.get("target_calls_per_unit_per_shift", 6)
    shift_hours = s.get("shift_length_hours", 12)
    buffer = s.get("peak_buffer_pct", 15) / 100.0
    avg_call_hours = s.get("avg_call_duration_hours", 1.0)
    min_units = s.get("min_units", 1)

    avg_per_day = float(daily.mean()) if len(daily) else 0.0
    peak_share = (max(hour.values()) / sum(hour.values())) if hour and sum(hour.values()) else (1.0 / 24.0)
    peak_calls_per_hour = avg_per_day * peak_share
    concurrent_peak = max(min_units, math.ceil(peak_calls_per_hour * avg_call_hours * (1 + buffer)))

    by_weekday: List[Dict[str, Any]] = []
    if len(daily):
        idx = pd.to_datetime(daily.index)
        wk_avg = daily.groupby(idx.day_name()).mean()
        overall = float(wk_avg.mean()) if len(wk_avg) else avg_per_day
        for d in _WEEKDAY_ORDER:
            if d not in wk_avg.index:
                continue
            calls = float(wk_avg[d])
            units = max(min_units, math.ceil(calls * peak_share * avg_call_hours * (1 + buffer)))
            ratio = (calls / overall) if overall else 1.0
            risk = "High" if ratio >= 1.2 else ("Moderate" if ratio >= 1.05 else "Low")
            by_weekday.append({
                "weekday": d, "predicted_calls": round(calls, 1),
                "recommended_units": units, "risk": risk,
            })

    return {
        "recommended_units_peak": concurrent_peak,
        "avg_calls_per_day": round(avg_per_day, 1),
        "by_weekday": by_weekday,
        "assumptions": {
            "target_calls_per_unit_per_shift": target,
            "shift_length_hours": shift_hours,
            "peak_buffer_pct": int(buffer * 100),
            "avg_call_duration_hours": avg_call_hours,
        },
        "disclaimer": (
            "Decision-support estimates based on historical call patterns. Review with agency "
            "leadership, local policy, mutual-aid agreements, and operational constraints."
        ),
    }


def get_predictive_dashboard(upload, db, horizon: int = 12, settings: Optional[Dict] = None) -> Dict[str, Any]:
    """Main entry point used by the API. Returns forecast + patterns + staffing."""
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
    staffing = _staffing(daily, hour, settings)

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

    return {
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
