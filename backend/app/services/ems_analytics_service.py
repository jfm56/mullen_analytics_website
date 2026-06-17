"""
EMS Analytics Service

Reads a cleaned EMSCharts CSV and produces a metrics_json payload covering:
  - upload_summary
  - call_volume   (total, by_day, by_hour, by_incident_type, by_municipality)
  - response_times (median, mean, p90, max)
  - unit_performance (calls_per_unit, avg_response_time_by_unit)
  - data_quality  (missing_values, duplicates, columns_detected, columns_unrecognized)

Defensive: never raises — missing columns return {"available": false, "reason": "..."}.
"""

from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Column aliases — order = preference
# ---------------------------------------------------------------------------
_ALIASES: Dict[str, List[str]] = {
    "incident_number": ["incident_number", "incident_no", "incident_nbr",
                        "incidentnumber", "call_number", "call_no", "incident_id", "incident_"],
    "incident_date":   ["incident_date", "call_date", "date", "dispatch_date",
                        "date_dispatched", "incidentdate", "calldate"],
    "received_time":   ["received_time", "date_received", "time_received", "date_called",
                        "call_received_time"],
    "dispatch_time":   ["dispatch_time", "dispatched", "time_dispatched", "date_dispatched",
                        "dispatch_dt", "dispatchtime", "dispatch"],
    "enroute_time":    ["enroute_time", "en_route_time", "enroute", "date_enroute",
                        "responding_time", "mobile_time", "mobiletime"],
    "arrival_time":    ["arrival_time", "arrived", "on_scene_time", "scene_arrival_time",
                        "date_arrived", "onscene_time", "arrivaltime", "time_arrived", "on_scene"],
    "clear_time":      ["clear_time", "cleared", "cleartime", "time_cleared",
                        "date_available", "date_arrive_rec", "available_time", "available",
                        "in_service_time"],
    "unit":            ["unit", "unit_id", "responding_unit", "apparatus",
                        "unitname", "unit_name", "truck", "vehicle"],
    "incident_type":   ["incident_type", "call_type", "nature", "complaint",
                        "type_of_service_ihscene", "calltype", "type_of_call",
                        "incident_nature", "call_nature"],
    "municipality":    ["municipality", "city", "township", "zone",
                        "scene_grid", "vehicle_grid",
                        "response_area", "district", "area", "town"],
    "service_type":    ["service_type", "type_of_service_ihscene", "call_type"],
    "patient_category": ["patient_category", "patient_type", "chief_complaint"],
    "response_mode":   ["response_mode", "mode_of_response", "lights_and_siren"],
    "priority":        ["priority", "dispatch_priority_codetable", "dispatch_priority", "acuity"],
    "hour":            ["hour", "hour_of_day", "call_hour"],
}


def detect_column(df: pd.DataFrame, field: str) -> Optional[str]:
    """Return the first column in *df* that matches any alias for *field*, else None."""
    aliases = _ALIASES.get(field, [field])
    cols_lower = {c.lower(): c for c in df.columns}
    for alias in aliases:
        if alias in cols_lower:
            return cols_lower[alias]
    return None


def detect_mapped_column(
    df: pd.DataFrame,
    field: str,
    overrides: Optional[Dict[str, Optional[str]]] = None,
) -> Optional[str]:
    """Check overrides dict first, then fall back to detect_column."""
    if overrides:
        mapped = overrides.get(field)
        if mapped and mapped in df.columns:
            return mapped
        if mapped == "":
            return None  # explicit "Not Available"
    return detect_column(df, field)


def _safe(value: Any) -> Any:
    """Convert NaN/Inf to None so JSON serialisation never fails."""
    if value is None:
        return None
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def _minutes_between(df: pd.DataFrame, start_col: str, end_col: str) -> Optional[pd.Series]:
    """Return a Series of elapsed minutes; None if columns cannot be parsed."""
    try:
        start = pd.to_datetime(df[start_col], errors="coerce")
        end   = pd.to_datetime(df[end_col],   errors="coerce")
        delta = (end - start).dt.total_seconds() / 60.0
        # Drop physically impossible values (negative or >600 min)
        delta = delta.where((delta >= 0) & (delta <= 600))
        return delta if delta.notna().sum() > 0 else None
    except Exception:
        return None


def _value_counts_top(series: pd.Series, top: int = 20) -> List[Dict[str, Any]]:
    vc = (
        series.dropna()
        .astype(str)
        .str.strip()
        .replace("", pd.NA)
        .dropna()
        .value_counts()
        .head(top)
    )
    return [{"label": k, "count": int(v)} for k, v in vc.items()]


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------

def _call_volume(df: pd.DataFrame, overrides: Optional[Dict] = None) -> Dict[str, Any]:
    inc_col = detect_mapped_column(df, "incident_number", overrides)
    dispatch_col = detect_mapped_column(df, "dispatch_time", overrides)

    # Deduplicated call volume
    if inc_col:
        total = int(df[inc_col].dropna().nunique())
        method = "unique_incident_number"
    elif dispatch_col:
        total = int(df[dispatch_col].dropna().shape[0])
        method = "dispatch_datetime_not_null"
    else:
        total = len(df)
        method = "row_count"
    out: Dict[str, Any] = {"total_calls": total, "total": total, "method": method}

    # Counting breakdown (additive — does NOT change `total`): split into
    # emergency vs interfacility so the headline can be reconciled to an
    # external reference (e.g. an emergency-only count).
    try:
        from .ems_filter_service import detect_interfacility_rows
        ift_n = int(detect_interfacility_rows(df).sum())
        out["interfacility_calls"] = ift_n
        out["emergency_calls"] = int(len(df) - ift_n)
    except Exception:
        pass
    out["count_basis"] = (
        "unique incidents" if method == "unique_incident_number"
        else "dispatched responses (one row per unit dispatch)" if method == "dispatch_datetime_not_null"
        else "raw rows"
    )

    _DOW_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    # by_day — use dispatch_time or incident_date
    date_col = dispatch_col or detect_mapped_column(df, "incident_date", overrides)
    if date_col:
        try:
            dts = pd.to_datetime(df[date_col], errors="coerce").dropna()
            dates = dts.dt.date

            # by_day (daily totals for trend chart)
            by_day = dates.value_counts().sort_index().reset_index()
            by_day.columns = ["date", "count"]
            out["by_day"] = [
                {"date": str(r["date"]), "count": int(r["count"])}
                for _, r in by_day.iterrows()
            ]

            if len(by_day):
                out["avg_calls_per_day"] = round(float(by_day["count"].mean()), 1)

                # by_day_of_week_avg — average daily calls per weekday
                by_day["dow"] = pd.to_datetime(by_day["date"]).dt.day_name()
                dow_avg = by_day.groupby("dow")["count"].mean().round(1)
                out["by_day_of_week_avg"] = [
                    {"day": d, "avg": float(dow_avg.get(d, 0))}
                    for d in _DOW_ORDER
                ]
                if not dow_avg.empty:
                    out["busiest_day_of_week"] = str(dow_avg.idxmax())

                # by_week (weekly totals)
                weekly = dts.dt.to_period("W").value_counts().sort_index()
                out["by_week"] = [
                    {"week": str(idx.start_time.date()), "count": int(cnt)}
                    for idx, cnt in weekly.items()
                ]
                out["avg_calls_per_week"] = round(float(weekly.mean()), 1)

                # by_month (monthly totals)
                monthly = dts.dt.to_period("M").value_counts().sort_index()
                out["by_month"] = [
                    {"month": str(idx), "count": int(cnt)}
                    for idx, cnt in monthly.items()
                ]

        except Exception:
            out["by_day"] = {"available": False, "reason": "date parse error"}
    else:
        out["by_day"] = {"available": False, "reason": "no date column found — set column mapping"}

    # by_hour — derive from dispatch or date
    hour_col = detect_mapped_column(df, "hour", overrides)
    if hour_col:
        hours = pd.to_numeric(df[hour_col], errors="coerce")
    elif date_col:
        hours = pd.to_datetime(df[date_col], errors="coerce").dt.hour
    else:
        hours = None

    if hours is not None and hours.notna().sum() > 0:
        by_hour = (
            hours.dropna()
            .astype(int)
            .value_counts()
            .sort_index()
            .reset_index()
        )
        by_hour.columns = ["hour", "count"]
        out["by_hour"] = [
            {"hour": int(r["hour"]), "count": int(r["count"])}
            for _, r in by_hour.iterrows()
        ]
    else:
        out["by_hour"] = {"available": False, "reason": "no time column found — set column mapping"}

    # by_incident_type
    type_col = detect_mapped_column(df, "incident_type", overrides)
    if type_col:
        out["by_incident_type"] = _value_counts_top(df[type_col])
    else:
        out["by_incident_type"] = {"available": False, "reason": "no incident type column found — set column mapping"}

    # by_municipality
    muni_col = detect_mapped_column(df, "municipality", overrides)
    if muni_col:
        out["by_municipality"] = _value_counts_top(df[muni_col])
    else:
        out["by_municipality"] = {"available": False, "reason": "no municipality column found — set column mapping"}

    # by_unit (mirrors unit_performance for filter bar)
    unit_col = detect_mapped_column(df, "unit", overrides)
    if unit_col:
        out["by_unit"] = _value_counts_top(df[unit_col])

    return out


def _response_times(df: pd.DataFrame, overrides: Optional[Dict] = None) -> Dict[str, Any]:
    received_col  = detect_mapped_column(df, "received_time",  overrides)
    dispatch_col  = detect_mapped_column(df, "dispatch_time",  overrides)
    enroute_col   = detect_mapped_column(df, "enroute_time",   overrides)
    arrival_col   = detect_mapped_column(df, "arrival_time",   overrides)
    clear_col     = detect_mapped_column(df, "clear_time",     overrides)

    primary: Optional[pd.Series] = None
    label = ""
    if dispatch_col and arrival_col:
        primary = _minutes_between(df, dispatch_col, arrival_col)
        label = "dispatch_to_arrival"
    elif dispatch_col and clear_col:
        primary = _minutes_between(df, dispatch_col, clear_col)
        label = "dispatch_to_clear"
    elif enroute_col and arrival_col:
        primary = _minutes_between(df, enroute_col, arrival_col)
        label = "enroute_to_arrival"

    if primary is None or primary.notna().sum() == 0:
        return {"available": False, "reason": "no usable time columns found — set column mapping"}

    out = {
        "available": True,
        "metric": label,
        "sample_size":    int(primary.notna().sum()),
        "median_minutes": _safe(round(float(primary.median()), 2)),
        "mean_minutes":   _safe(round(float(primary.mean()),   2)),
        "p90_minutes":    _safe(round(float(primary.quantile(0.90)), 2)),
        "max_minutes":    _safe(round(float(primary.max()),    2)),
        "min_minutes":    _safe(round(float(primary.min()),    2)),
    }

    # Breakdown segments
    def _seg(a_col, b_col, name):
        if a_col and b_col:
            s = _minutes_between(df, a_col, b_col)
            if s is not None and s.notna().sum() > 0:
                out[name] = _safe(round(float(s.median()), 2))

    _seg(received_col, dispatch_col,  "received_to_dispatch_median")
    _seg(dispatch_col, enroute_col,   "dispatch_to_enroute_median")
    _seg(enroute_col,  arrival_col,   "enroute_to_arrival_median")
    _seg(dispatch_col, arrival_col,   "dispatch_to_arrival_median")
    _seg(received_col, clear_col,     "total_call_time_median")

    # Explicit labels + a full travel-time breakdown so the UI can distinguish
    # "response time" (dispatch -> on-scene, incl. turnout) from "travel time"
    # (en route -> on-scene) rather than conflating them.
    _LABELS = {
        "dispatch_to_arrival": "Response time (dispatch → on-scene)",
        "dispatch_to_clear":   "Dispatch → clear",
        "enroute_to_arrival":  "Travel time (en route → on-scene)",
    }
    out["metric_label"] = _LABELS.get(label, label)
    if dispatch_col and enroute_col:
        _to = _minutes_between(df, dispatch_col, enroute_col)
        if _to is not None and _to.notna().sum() > 0:
            out["turnout_median_minutes"] = _safe(round(float(_to.median()), 2))
    if enroute_col and arrival_col and label != "enroute_to_arrival":
        _tv = _minutes_between(df, enroute_col, arrival_col)
        if _tv is not None and _tv.notna().sum() > 0:
            out["travel_time"] = {
                "label": "Travel time (en route → on-scene)",
                "median_minutes": _safe(round(float(_tv.median()), 2)),
                "mean_minutes":   _safe(round(float(_tv.mean()),   2)),
                "p90_minutes":    _safe(round(float(_tv.quantile(0.90)), 2)),
                "sample_size":    int(_tv.notna().sum()),
            }

    return out


def _unit_performance(
    df: pd.DataFrame,
    response_times_col_minutes: Optional[pd.Series],
    overrides: Optional[Dict] = None,
) -> Dict[str, Any]:
    unit_col = detect_mapped_column(df, "unit", overrides)
    if not unit_col:
        return {"available": False, "reason": "no unit column found"}

    units = df[unit_col].astype(str).str.strip().replace("", pd.NA)
    counts = units.value_counts().head(30)
    calls_per_unit = [{"unit": k, "calls": int(v)} for k, v in counts.items()]

    avg_rt_by_unit: List[Dict[str, Any]] = []
    if response_times_col_minutes is not None:
        tmp = pd.DataFrame({"unit": units, "rt": response_times_col_minutes})
        avg = tmp.groupby("unit")["rt"].mean().dropna().sort_values().head(30)
        avg_rt_by_unit = [
            {"unit": k, "avg_response_time_minutes": _safe(round(float(v), 2))}
            for k, v in avg.items()
        ]

    return {
        "available": True,
        "calls_per_unit": calls_per_unit,
        "avg_response_time_by_unit": avg_rt_by_unit,
    }


def _data_quality(df: pd.DataFrame, cleaning_stats: Dict[str, Any]) -> Dict[str, Any]:
    missing = {
        col: int(df[col].isna().sum() + (df[col].astype(str).str.strip() == "").sum())
        for col in df.columns
    }
    missing = {k: v for k, v in missing.items() if v > 0}

    recognized = set(_ALIASES.keys())
    detected = set(df.columns)
    unrecognized = sorted(
        c for c in detected
        if not any(c in aliases for aliases in _ALIASES.values())
    )

    return {
        "missing_values_by_column": missing,
        "duplicate_rows":  cleaning_stats.get("duplicate_rows_count", 0),
        "rows_removed":    cleaning_stats.get("removed_rows_count", 0),
        "columns_detected": sorted(detected),
        "columns_unrecognized": unrecognized,
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def compute_ems_metrics(
    cleaned_file_path: str,
    upload_summary: Dict[str, Any],
    cleaning_stats: Dict[str, Any],
    overrides: Optional[Dict[str, Optional[str]]] = None,
) -> Dict[str, Any]:
    """
    Compute full dashboard metrics from a cleaned CSV.

    Args:
        cleaned_file_path: Absolute path to the cleaned CSV written by ems_cleaning_service.
        upload_summary:    Dict with file_name, client_id, project_id, upload_date,
                           row_count_original, row_count_cleaned.
        cleaning_stats:    Dict returned by run_ems_cleaning().

    Returns:
        metrics_json dict (ready to store in JSONB).
    """
    if not Path(cleaned_file_path).exists():
        return {
            "error": "Cleaned file not found",
            "upload_summary": upload_summary,
        }

    try:
        df = pd.read_csv(cleaned_file_path, dtype=str, low_memory=False)
    except Exception as exc:
        return {
            "error": f"Failed to read cleaned CSV: {exc}",
            "upload_summary": upload_summary,
        }

    # Build response-time series for reuse in unit_performance
    dispatch_col = detect_mapped_column(df, "dispatch_time", overrides)
    arrival_col  = detect_mapped_column(df, "arrival_time",  overrides)
    clear_col    = detect_mapped_column(df, "clear_time",    overrides)
    enroute_col  = detect_mapped_column(df, "enroute_time",  overrides)

    rt_series: Optional[pd.Series] = None
    if dispatch_col and arrival_col:
        rt_series = _minutes_between(df, dispatch_col, arrival_col)
    elif dispatch_col and clear_col:
        rt_series = _minutes_between(df, dispatch_col, clear_col)
    elif enroute_col and arrival_col:
        rt_series = _minutes_between(df, enroute_col, arrival_col)

    return {
        "upload_summary":   upload_summary,
        "call_volume":      _call_volume(df, overrides),
        "response_times":   _response_times(df, overrides),
        "unit_performance": _unit_performance(df, rt_series, overrides),
        "data_quality":     _data_quality(df, cleaning_stats),
        "column_mapping_applied": bool(overrides),
    }
