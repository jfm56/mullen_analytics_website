"""
Flexible column-name resolver for EMS CAD exports.

Different CAD vendors use different naming conventions. This module maps
semantic field names to a list of candidate column name variants and picks
the first one found in a given DataFrame.
"""
from typing import Dict, List, Optional
import pandas as pd

DISPATCH_COLUMNS: Dict[str, List[str]] = {
    "incident_number": [
        "incident_number", "incident_id", "call_id", "call_number",
        "incident#", "incidentnumber", "master_incident_number",
        "dispatch_id", "cad_id", "cad_number", "case_number",
        "call_no", "case_no", "event_id", "event_number",
    ],
    "call_date": [
        "call_date", "call_datetime", "incident_date", "date",
        "calldate", "alarm_date", "received_date",
    ],
    # ── canonical temporal fields (full datetime preferred) ──────────────
    "date_created": [
        "date_created", "time_created", "call_received", "call_datetime",
        "alarm_datetime", "received_datetime", "call_date_time",
        "incident_datetime", "call_date", "incident_date",
        "create_date", "createdate", "created_datetime",
        "date_dispatched",  # Mullen export: Date Dispatched is the primary timestamp
    ],
    "date_dispatched": [
        "date_dispatched", "time_dispatched", "dispatch_datetime",
        "dispatched_datetime", "dispatch_time", "dispatched", "dispatchtime",
        "dispatch_date",
    ],
    "date_enroute": [
        "date_enroute", "time_enroute", "enroute_datetime", "en_route_datetime",
        "en_route_time", "en_route", "enroute", "enroutetime",
        "responding", "response_date", "enroute_date",
    ],
    "date_arrived": [
        "date_arrived", "time_arrived", "arrived_datetime", "on_scene_datetime",
        "on_scene_time", "on_scene", "onscene", "arrival_time",
        "arrivaltime", "arrived", "scene_date", "arrive_date",
    ],
    "date_available": [
        "date_available", "time_available", "time_clear", "available_datetime",
        "clear_datetime", "clear_time", "clear", "cleared", "available",
        "cleartime", "in_service_time", "available_date",
    ],
    # ── legacy interval columns (kept for backwards compat) ─────────────
    "dispatch_time": [
        "dispatch_time", "dispatched", "dispatch_datetime",
        "dispatchtime", "time_dispatched",
    ],
    "en_route_time": [
        "en_route_time", "en_route", "enroute", "responding",
        "time_enroute", "enroutetime",
    ],
    "on_scene_time": [
        "on_scene_time", "on_scene", "onscene", "arrived",
        "time_arrived", "arrival_time", "arrivaltime",
    ],
    "clear_time": [
        "clear_time", "clear", "cleared", "available",
        "time_clear", "cleartime", "in_service_time",
    ],
    "incident_type": [
        "incident_type",
        # Prefer populated category fields over call_type which is often null
        "patient_category", "chief_complaint", "call_category",
        "nature_of_call", "problem_type", "incident_category",
        "call_type", "type", "nature", "problem", "call_nature", "primary_type",
        "type_of_service",
    ],
    "priority": [
        "priority", "call_priority", "response_type",
        "ems_priority", "dispatch_priority",
    ],
    "unit_id": [
        "unit_id", "unit", "apparatus", "resource",
        "vehicle", "unit_name", "apparatus_id",
    ],
    "address": [
        "address", "location", "incident_address",
        "street_address", "address_of_occurrence",
    ],
    "latitude": ["latitude", "lat", "y"],
    "longitude": ["longitude", "lon", "lng", "x"],
    "municipality": [
        "municipality", "city", "town", "jurisdiction",
        "zone", "district", "service_area",
    ],
}

STAFFING_COLUMNS: Dict[str, List[str]] = {
    "employee_id": [
        "employee_id", "emp_id", "staff_id",
        "employee_number", "badge", "badge_number", "staff_number",
        "employee_no", "emp_no", "id",
    ],
    "name": [
        "name", "employee_name", "full_name",
        "last_name", "last, first",
    ],
    "shift": ["shift", "platoon", "group", "tour"],
    "position": [
        "position", "rank", "title", "job_title",
        "classification",
    ],
    "date": ["date", "work_date", "shift_date", "hire_date", "start_date"],
    "hours": ["hours", "hours_worked", "scheduled_hours"],
}


def normalize_cols(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy with lower-cased, stripped, underscore-space column names."""
    df = df.copy()
    df.columns = [
        str(c).strip().lower().replace(" ", "_").replace("-", "_")
        for c in df.columns
    ]
    return df


def resolve(df: pd.DataFrame, semantic: str, file_type: str = "dispatch") -> Optional[str]:
    """
    Return the actual column name in *df* that best matches *semantic*.
    Returns None if no candidate is found.
    """
    mapping = DISPATCH_COLUMNS if file_type == "dispatch" else STAFFING_COLUMNS
    candidates = mapping.get(semantic, [semantic])
    actual_cols = set(df.columns.str.lower().str.strip())
    for candidate in candidates:
        if candidate.lower() in actual_cols:
            matched = [c for c in df.columns if c.lower().strip() == candidate.lower()]
            if matched:
                return matched[0]
    return None


def resolve_many(df: pd.DataFrame, semantics: List[str], file_type: str = "dispatch") -> Dict[str, Optional[str]]:
    """Resolve multiple semantic fields at once."""
    return {s: resolve(df, s, file_type) for s in semantics}
