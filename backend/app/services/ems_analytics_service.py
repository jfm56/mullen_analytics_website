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
                        "incidentnumber", "call_number", "call_no", "incident_id", "incident_",
                        # CAD / dispatch-level call identifiers (shared across units on one
                        # call). Without these, agencies whose export keys calls by a
                        # "Dispatch ID" fall through to counting dispatched rows = one per
                        # unit response, over-reporting call volume (e.g. SBES: 521 rows /
                        # 435 calls). PCR/report numbers are intentionally excluded — those
                        # are per-response and would just reproduce the row count.
                        "dispatch_id", "dispatch_no", "dispatch_number",
                        "cad_incident_number", "cad_number", "cad_id"],
    "incident_date":   ["incident_date", "call_date", "date", "dispatch_date",
                        "date_dispatched", "incidentdate", "calldate"],
    "received_time":   ["received_time", "date_received", "time_received", "date_called",
                        "call_received_time"],
    "dispatch_time":   ["dispatch_time", "dispatched", "time_dispatched", "date_dispatched",
                        "dispatch_dt", "dispatchtime", "dispatch", "dt_disp"],
    "enroute_time":    ["enroute_time", "en_route_time", "enroute", "date_enroute",
                        "responding_time", "mobile_time", "mobiletime", "dt_enroute"],
    "arrival_time":    ["arrival_time", "arrived", "on_scene_time", "scene_arrival_time",
                        "date_arrived", "onscene_time", "arrivaltime", "time_arrived", "on_scene", "dt_arrive"],
    "clear_time":      ["clear_time", "cleared", "cleartime", "time_cleared",
                        "date_available", "date_arrive_rec", "available_time", "available",
                        "in_service_time"],
    # ZOLL emsCharts canonical interval endpoints (dt_lvref / dt_arvrec / dt_available).
    "leave_scene_time":        ["leave_scene_time", "date_leave_ref", "dt_lvref", "left_scene",
                                "depart_scene", "date_left_scene", "scene_depart_time"],
    "arrive_destination_time": ["arrive_destination_time", "date_arrive_rec", "dt_arvrec",
                                "arrived_destination", "at_destination", "destination_arrival_time"],
    "available_time":          ["available_time", "date_available", "dt_available", "available",
                                "in_service_time", "date_in_service"],
    "unit":            ["unit", "unit_id", "responding_unit", "apparatus",
                        "unitname", "unit_name", "truck", "vehicle"],
    "incident_type":   ["incident_type", "call_type", "nature", "complaint",
                        "type_of_service_ihscene", "calltype", "type_of_call",
                        "incident_nature", "call_nature", "dispatched_as"],
    "municipality":    ["municipality", "city", "township", "zone",
                        "scene_grid", "scene_grid_lookup_table", "vehicle_grid",
                        "response_area", "district", "area", "town"],
    "service_type":    ["service_type", "type_of_service_ihscene", "call_type",
                        "ambulance_transport_code"],
    "disposition":     ["disposition", "disposition_outcome", "transport_disposition",
                        "patient_disposition", "outcome"],
    # Scene / referring GPS (new emsCharts export) — the incident (demand) location,
    # enables point-level / cross-street staging. "Referring" is emsCharts' term for
    # the scene / origin (vs "Receiving" = destination hospital). Both combined
    # "lat,lng" columns and separate latitude/longitude columns are supported.
    "scene_gps":       ["scene_location_gps", "scene_gps", "scene_lat_long", "scene_latitude_longitude"],
    "referring_gps":   ["referring_location_gps", "referring_gps", "referring_lat_long",
                        "referring_latitude_longitude", "referring_gps_coordinates", "referring_coordinates"],
    "scene_lat":       ["scene_latitude", "scene_lat"],
    "scene_lng":       ["scene_longitude", "scene_lng", "scene_lon", "scene_long"],
    "referring_lat":   ["referring_latitude", "referring_lat"],
    "referring_lng":   ["referring_longitude", "referring_lng", "referring_lon", "referring_long"],
    "dispatch_gps":    ["dispatch_location_gps", "dispatch_gps", "vehicle_gps"],
    "destination_gps": ["destination_location_gps", "destination_gps"],
    "patient_category": ["patient_category", "patient_type", "chief_complaint"],
    "response_mode":   ["response_mode", "mode_of_response", "lights_and_siren"],
    "priority":        ["priority", "dispatch_priority_codetable", "dispatch_priority", "acuity"],
    "hour":            ["hour", "hour_of_day", "call_hour", "hour_of_day_of_dispatch"],
    # --- Transport / destination (new emsCharts export) ---
    "destination_hospital": ["receiving_hospital", "receiving_facility", "destination_hospital",
                             "transported_to", "receiving_hospital_designation"],
    "destination_area":     ["destination_grid", "destination_municipality", "destination_location"],
    "destination_basis":    ["destination_basis", "destination_reason", "transport_reason"],
    "mileage":              ["mileage_total", "total_mileage", "transport_miles", "loaded_miles", "miles"],
    "referring_facility":   ["common_referring_address_reporting", "referring_facility",
                             "referring_address", "sending_facility", "transfer_from"],
    # --- Operational / record-keeping (recognized so they stop flagging as unknown) ---
    "cancelled_time":       ["date_cancelled", "cancel_time", "cancelled_at", "time_cancelled"],
    "base_station":         ["basesite", "base_site", "station", "home_station", "quarters"],
    "record_id":            ["prid", "pcr_number", "pcr_no", "patient_record_id",
                             "report_number", "report_no"],
    "dispatch_location":    ["dispatch_location", "response_location", "incident_location", "scene_address"],
    "outcome_historical":   ["outcome_historical", "historical_outcome"],
    # Derived date-parts emsCharts ships pre-computed; recognized (we derive our own).
    "day_of_week":          ["day_of_week_of_dispatch", "dispatch_day_of_week", "day_of_week", "dow"],
    "month_of_year":        ["month_of_year_of_dispatch", "dispatch_month_of_year", "month_of_year"],
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


# Curated equivalences for pooling datasets whose exports name the SAME concept
# differently (e.g. old files use "scene_grid", the newer emsCharts export uses
# "scene_grid_lookup_table"). We coalesce ONLY genuinely-equivalent columns —
# deliberately NOT vehicle_grid / zone / area, which are distinct fields that can
# co-exist in a single dataset. Each list is priority order (first non-null wins).
_COALESCE: Dict[str, List[str]] = {
    "incident_number": ["incident_number", "incident_no", "incident_nbr", "call_number",
                        "call_no", "incident_id", "dispatch_id", "dispatch_no",
                        "cad_incident_number", "cad_number", "cad_id"],
    "municipality":    ["municipality", "township", "city", "town", "scene_grid",
                        "scene_grid_lookup_table"],
    "incident_type":   ["incident_type", "call_type", "nature", "complaint",
                        "type_of_service_ihscene", "dispatched_as"],
    "unit":            ["unit", "unit_id", "responding_unit", "apparatus",
                        "unit_name", "unitname", "truck"],
    "disposition":     ["disposition", "disposition_outcome", "transport_disposition"],
    "incident_date":   ["incident_date", "call_date", "dispatch_date", "date_dispatched", "calldate"],
    "dispatch_time":   ["dispatch_time", "dispatched", "time_dispatched", "dispatch_dt", "dt_disp"],
    "enroute_time":    ["enroute_time", "en_route_time", "enroute", "date_enroute", "dt_enroute"],
    "arrival_time":    ["arrival_time", "arrived", "on_scene_time", "date_arrived", "dt_arrive"],
    "scene_gps":       ["scene_location_gps", "scene_gps"],
}


def coalesce_aliases(df: pd.DataFrame) -> pd.DataFrame:
    """Merge equivalent-but-differently-named columns into one canonical-named column.

    Lets datasets that use different column names for the same concept pool and
    filter as one (a row from any format lands in the canonical column). No-op when
    only one matching column is present, so single-schema data is unaffected.
    """
    if df is None or df.empty:
        return df
    cols_lower = {c.lower(): c for c in df.columns}
    _BLANK = {"", "nan", "nat", "none", "null"}
    for field, names in _COALESCE.items():
        present = [cols_lower[n] for n in names if n in cols_lower]
        if not present:
            continue
        series = df[present[0]]
        for c in present[1:]:
            invalid = series.isna() | series.astype(str).str.strip().str.lower().isin(_BLANK)
            series = series.where(~invalid, df[c])
        df[field] = series

    # Normalize municipality values so old ("46 -Town of Clinton") and new
    # ("Town of Clinton") formats match when filtering/grouping — strip the leading
    # grid-code prefix and trim, mirroring the geographic service's _normalize_location.
    if "municipality" in df.columns:
        s = df["municipality"].astype("string").str.replace(r"^\s*\d+\s*-\s*", "", regex=True).str.strip()
        df["municipality"] = s.replace({"": pd.NA, "nan": pd.NA, "none": pd.NA, "null": pd.NA})
    return df


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
        ift_mask = detect_interfacility_rows(df)
        if inc_col:
            # Reconcile the split to the deduplicated total: count unique
            # incidents (a call is interfacility if any of its unit rows is),
            # not unit-response rows, so emergency + IFT == total_calls.
            ids = df[inc_col].astype(str).str.strip().replace("", pd.NA)
            ift_calls = int(ids[ift_mask].dropna().nunique())
            out["interfacility_calls"] = ift_calls
            out["emergency_calls"] = int(total - ift_calls)
        else:
            ift_n = int(ift_mask.sum())
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
    """Response-time intervals aligned with ZOLL emsCharts' canonical definitions:
        chute = enroute − dispatch · response = arrival − enroute · scene = leave − arrival
        transport = arrive_dest − leave · turnaround = available − arrive_dest
        total = available − dispatch.
    The headline 'response time' is ZOLL's en route → on-scene; dispatch → on-scene
    (chute + response) is kept separately for time-to-scene / staffing use."""
    received_col = detect_mapped_column(df, "received_time", overrides)
    dispatch_col = detect_mapped_column(df, "dispatch_time", overrides)
    enroute_col  = detect_mapped_column(df, "enroute_time", overrides)
    arrival_col  = detect_mapped_column(df, "arrival_time", overrides)
    leave_col    = detect_mapped_column(df, "leave_scene_time", overrides)
    dest_col     = detect_mapped_column(df, "arrive_destination_time", overrides)
    avail_col    = detect_mapped_column(df, "available_time", overrides) or detect_mapped_column(df, "clear_time", overrides)

    def _iv(a_col, b_col) -> Optional[pd.Series]:
        if a_col and b_col and a_col != b_col:
            s = _minutes_between(df, a_col, b_col)
            if s is not None and s.notna().sum() > 0:
                return s
        return None

    chute      = _iv(dispatch_col, enroute_col)
    response   = _iv(enroute_col, arrival_col)        # ZOLL "response time"
    scene      = _iv(arrival_col, leave_col)
    transport  = _iv(leave_col, dest_col)
    turnaround = _iv(dest_col, avail_col)
    total      = _iv(dispatch_col, avail_col)
    d2a        = _iv(dispatch_col, arrival_col)       # dispatch → on-scene (chute + response)
    r2d        = _iv(received_col, dispatch_col)

    # Headline = ZOLL response (en route → arrival); fall back to dispatch → arrival.
    if response is not None:
        primary, metric, mlabel = response, "enroute_to_arrival", "Response time (en route → on-scene)"
    elif d2a is not None:
        primary, metric, mlabel = d2a, "dispatch_to_arrival", "Dispatch → on-scene"
    else:
        return {"available": False, "reason": "no usable time columns found — set column mapping"}

    def _stats(s: pd.Series) -> Dict[str, Any]:
        return {
            "median_minutes": _safe(round(float(s.median()), 2)),
            "mean_minutes":   _safe(round(float(s.mean()), 2)),
            "p90_minutes":    _safe(round(float(s.quantile(0.90)), 2)),
            "max_minutes":    _safe(round(float(s.max()), 2)),
            "sample_size":    int(s.notna().sum()),
        }

    out: Dict[str, Any] = {"available": True, "metric": metric, "metric_label": mlabel}
    out.update(_stats(primary))
    out["min_minutes"] = _safe(round(float(primary.min()), 2))

    # Full ZOLL interval set (for the breakdown table + downstream consumers).
    intervals: Dict[str, Any] = {}
    for name, lbl, s in [
        ("chute_time",          "Chute time (dispatch → en route)", chute),
        ("response_time",       "Response time (en route → on-scene)", response),
        ("scene_time",          "On-scene time (arrival → depart scene)", scene),
        ("transport_time",      "Transport time (depart scene → destination)", transport),
        ("turnaround_time",     "Turnaround (destination → available)", turnaround),
        ("total_time",          "Total task time (dispatch → available)", total),
        ("dispatch_to_arrival", "Dispatch → on-scene (chute + response)", d2a),
    ]:
        if s is not None:
            intervals[name] = {"label": lbl, **_stats(s)}
    out["intervals"] = intervals

    # Back-compat keys still read by the dashboard + predictive/staffing.
    def _med(s: Optional[pd.Series]) -> Any:
        return _safe(round(float(s.median()), 2)) if s is not None else None

    out["dispatch_to_enroute_median"] = _med(chute)
    out["enroute_to_arrival_median"]  = _med(response)
    out["received_to_dispatch_median"] = _med(r2d)
    out["dispatch_to_arrival_median"] = _med(d2a)
    if chute is not None:
        out["turnout_median_minutes"] = _med(chute)   # chute == turnout
    if response is not None:
        out["travel_time"] = {"label": "Response time (en route → on-scene)", **_stats(response)}
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


def _transport_destinations(df: pd.DataFrame, overrides: Optional[Dict] = None) -> Dict[str, Any]:
    """Where patients are transported: receiving-hospital mix + transport rate.
    Non-transports (refusals, cancellations, treat/no-transport) carry a blank
    receiving hospital and are reported as the non-transport share, so the rate
    isn't inflated. Runs on the incident-collapsed frame (one row per call)."""
    hosp_col = detect_mapped_column(df, "destination_hospital", overrides)
    disp_col = detect_mapped_column(df, "disposition", overrides)
    canc_col = detect_mapped_column(df, "cancelled_time", overrides)
    if not hosp_col and not disp_col:
        return {"available": False,
                "reason": "no receiving-hospital or disposition column found — set column mapping"}
    total = int(len(df))

    # Transported count: disposition is authoritative — a call is transported even
    # when the receiving-hospital field is left blank (many exports don't populate
    # it). Only fall back to receiving-hospital presence when there's no disposition.
    transported: Optional[int] = None
    basis: Optional[str] = None
    if disp_col:
        transported = int((_outcome_categories(df, disp_col, canc_col) == "Transported").sum())
        basis = "disposition"

    hospitals: List[Dict[str, Any]] = []
    hosp_recorded = 0
    if hosp_col:
        s = (df[hosp_col].astype(str).str.strip()
             .replace({"nan": "", "None": "", "NaN": ""}).replace("", pd.NA))
        hosp_recorded = int(s.notna().sum())
        hospitals = _value_counts_top(s, top=15)
        if transported is None:
            transported, basis = hosp_recorded, "receiving_hospital"

    transported = int(transported or 0)
    out: Dict[str, Any] = {
        "available": True,
        "total_calls": total,
        "transported_calls": transported,
        "non_transport_calls": int(total - transported),
        "transport_rate_pct": round(100.0 * transported / total, 1) if total else None,
        "transported_basis": basis,
        "hospital_recorded_calls": hosp_recorded,
        "by_hospital": hospitals,
    }
    # Mileage — only surface when the column is actually populated (some exports
    # ship the column empty). Guards against a "0 miles" section on absent data.
    mil_col = detect_mapped_column(df, "mileage", overrides)
    if mil_col:
        miles = pd.to_numeric(df[mil_col], errors="coerce")
        # Require a meaningful share populated — some exports ship the column nearly
        # empty (a lone stray value shouldn't render a "mileage" card).
        if miles.notna().sum() >= max(10, int(0.10 * len(df))):
            out["mileage"] = {
                "records_with_mileage": int(miles.notna().sum()),
                "total_miles": _safe(round(float(miles.sum()), 1)),
                "median_miles": _safe(round(float(miles.median()), 1)),
                "mean_miles": _safe(round(float(miles.mean()), 1)),
            }
    basis_col = detect_mapped_column(df, "destination_basis", overrides)
    if basis_col:
        vals = _value_counts_top(df[basis_col], top=10)
        if vals:
            out["by_destination_basis"] = vals
    return out


_OUTCOME_ORDER = ["Transported", "Cancelled", "Standby", "Refused", "Other"]


def _outcome_categories(df: pd.DataFrame, disp_col: Optional[str], canc_col: Optional[str]) -> pd.Series:
    """Classify each call into a coarse outcome bucket. Priority is
    Transported > Cancelled so 'Transported By BLS, ALS Cancelled' (a completed
    BLS transport where only the ALS tier was cancelled) counts as a transport,
    not a cancellation. Order applied so the highest-priority match wins."""
    n = len(df)
    s = (df[disp_col].astype(str).str.strip().str.lower()
         if disp_col else pd.Series([""] * n, index=df.index))
    cancelled_flag = pd.Series(False, index=df.index)
    if canc_col:
        cancelled_flag = (df[canc_col].astype(str).str.strip()
                          .replace({"nan": "", "none": "", "nat": ""}).replace("", pd.NA).notna())
    transported = s.str.match(r"transport")        # "Transported By ..."
    standby     = s.str.match(r"stand\s*by")        # "Standby", "Stand By ..."
    refused     = s.str.contains("refus", na=False)  # "Patient Refused Care", "Treated, Refused Transport"
    cancelled   = s.str.match(r"cancel") | cancelled_flag
    cat = pd.Series("Other", index=df.index)
    cat = cat.mask(refused, "Refused")
    cat = cat.mask(cancelled, "Cancelled")
    cat = cat.mask(standby, "Standby")
    cat = cat.mask(transported, "Transported")      # highest priority — applied last
    return cat


def _dispositions(df: pd.DataFrame, overrides: Optional[Dict] = None) -> Dict[str, Any]:
    """Call-outcome mix: a coarse Transported / Cancelled / Standby / Refused / Other
    rollup for at-a-glance counts, plus the detailed disposition breakdown."""
    disp_col = detect_mapped_column(df, "disposition", overrides)
    canc_col = detect_mapped_column(df, "cancelled_time", overrides)
    if not disp_col and not canc_col:
        return {"available": False, "reason": "no disposition column found — set column mapping"}
    total = int(len(df))
    out: Dict[str, Any] = {"available": True, "total_calls": total}
    if disp_col:
        out["by_disposition"] = _value_counts_top(df[disp_col], top=15)
    vc = _outcome_categories(df, disp_col, canc_col).value_counts()
    out["summary"] = [
        {"label": k, "count": int(vc.get(k, 0)),
         "share": round(100.0 * int(vc.get(k, 0)) / total, 1) if total else 0.0}
        for k in _OUTCOME_ORDER if int(vc.get(k, 0)) > 0
    ]
    return out


def _data_completeness(df: pd.DataFrame, overrides: Optional[Dict] = None) -> Dict[str, Any]:
    """Response-time documentation completeness.

    How many calls lack the en route / on-scene timestamps needed to compute a
    response time — split into legitimate cancellations (no arrival expected) vs
    genuine documentation gaps (a real response whose time was never recorded).
    The gap count is a concrete QA/QI target; cancellations are separated so they
    don't get mistaken for missing documentation."""
    out: Dict[str, Any] = {"available": True, "total_calls": int(len(df))}

    canc_col = detect_mapped_column(df, "cancelled_time", overrides)
    disp_col = detect_mapped_column(df, "disposition", overrides)
    cancelled = pd.Series(False, index=df.index)
    if canc_col:
        cancelled = cancelled | (df[canc_col].astype(str).str.strip()
                                 .replace({"nan": "", "None": ""}).replace("", pd.NA).notna())
    if disp_col:
        # Only a *call* cancellation counts (disposition begins with "cancel", e.g.
        # "Cancelled - Enroute"). "Transported By BLS, ALS Cancelled" is a completed
        # BLS transport with the ALS tier cancelled — NOT a cancelled call.
        cancelled = cancelled | (df[disp_col].astype(str).str.strip().str.lower()
                                 .str.startswith("cancel"))
    out["cancelled_calls"] = int(cancelled.sum())

    def _missing(field: str) -> Optional[pd.Series]:
        col = detect_mapped_column(df, field, overrides)
        if not col:
            return None
        v = (df[col].astype(str).str.strip()
             .replace({"nan": "", "None": "", "NaT": ""}).replace("", pd.NA))
        return v.isna()

    any_interval = False
    for field, key in [("arrival_time", "arrival"), ("enroute_time", "enroute")]:
        miss = _missing(field)
        if miss is None:
            continue
        any_interval = True
        n = int(miss.sum())
        gap = int((miss & ~cancelled).sum())
        out[f"missing_{key}"] = n
        out[f"missing_{key}_cancelled"] = int((miss & cancelled).sum())
        out[f"missing_{key}_gap"] = gap  # real responses with no recorded time
        if len(df):
            out[f"{key}_documented_pct"] = round(100.0 * (1 - gap / len(df)), 1)
    out["available"] = any_interval
    if not any_interval:
        out["reason"] = "no arrival/en route columns found — set column mapping"
    return out


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

def _collapse_to_incidents(df: pd.DataFrame, overrides: Optional[Dict] = None) -> pd.DataFrame:
    """Reduce multi-unit incidents to ONE row each, keeping the FIRST dispatched
    unit that actually responded: among an incident's rows, prefer those with an
    arrival (or enroute) time, then take the earliest dispatch. This makes call
    volume and response times reflect the incident and its first unit, not every
    unit that rolled. No-op when there's no recognizable incident-id column; rows
    with a blank incident id are left as their own records.
    """
    inc_col = detect_mapped_column(df, "incident_number", overrides)
    if not inc_col or df.empty:
        return df
    disp_col = detect_mapped_column(df, "dispatch_time", overrides)
    resp_col = (detect_mapped_column(df, "arrival_time", overrides)
                or detect_mapped_column(df, "enroute_time", overrides))
    work = df.copy()
    work["__id"] = work[inc_col].astype(str).str.strip().replace("", pd.NA)
    if resp_col:
        work["__responded"] = work[resp_col].astype(str).str.strip().replace("", pd.NA).notna()
    else:
        work["__responded"] = True
    work["__disp"] = pd.to_datetime(work[disp_col], errors="coerce") if disp_col else pd.NaT
    # responded-first, then earliest dispatch -> the "first dispatched & responding" unit
    work = work.sort_values(by=["__responded", "__disp"], ascending=[False, True],
                            kind="stable", na_position="last")
    has_id = work["__id"].notna()
    collapsed = work[has_id].drop_duplicates(subset="__id", keep="first")
    result = pd.concat([collapsed, work[~has_id]], ignore_index=True)
    return result.drop(columns=[c for c in ("__id", "__responded", "__disp") if c in result.columns])


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

    # Incident-level view: collapse multi-unit incidents to one record (first
    # dispatched-and-responding unit's times) so call volume and response times are
    # per incident, not per unit response. Unit performance stays on the full,
    # per-response rows (it is inherently per-unit).
    df_inc = _collapse_to_incidents(df, overrides)

    return {
        "upload_summary":   upload_summary,
        "call_volume":      _call_volume(df_inc, overrides),
        "response_times":   _response_times(df_inc, overrides),
        "unit_performance": _unit_performance(df, rt_series, overrides),
        "transport":        _transport_destinations(df_inc, overrides),
        "dispositions":     _dispositions(df_inc, overrides),
        "data_completeness": _data_completeness(df_inc, overrides),
        "data_quality":     _data_quality(df, cleaning_stats),
        "column_mapping_applied": bool(overrides),
        "incident_collapse": {
            "unit_responses": int(len(df)),
            "incidents":      int(len(df_inc)),
            "basis":          "first dispatched & responding unit per incident",
        },
    }
