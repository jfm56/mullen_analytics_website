"""
EMS Column Mapping Service

Allows users to manually map CSV column names to analytics field names.
When a mapping exists it takes precedence over auto-detection in the analytics service.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from ..models.data_upload import DataUpload, EMSColumnMapping

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Field definitions
# ---------------------------------------------------------------------------

ANALYTICS_FIELDS: List[str] = [
    "call_id",
    "dispatch_datetime",
    "received_datetime",
    "enroute_datetime",
    "arrival_datetime",
    "available_datetime",
    "unit",
    "municipality_or_zone",
    "incident_type",
    "service_type",
    "patient_category",
    "response_mode",
    "priority",
]

FIELD_LABELS: Dict[str, str] = {
    "call_id":              "Call ID",
    "dispatch_datetime":    "Dispatch Time",
    "received_datetime":    "Received Time",
    "enroute_datetime":     "Enroute Time",
    "arrival_datetime":     "Arrival Time",
    "available_datetime":   "Available / Clear Time",
    "unit":                 "Unit",
    "municipality_or_zone": "Municipality / Zone",
    "incident_type":        "Incident Type",
    "service_type":         "Service Type",
    "patient_category":     "Patient Category",
    "response_mode":        "Response Mode",
    "priority":             "Priority / Acuity",
}

# Candidate column names in preference order (EMSCharts-specific first)
AUTO_DETECT_RULES: Dict[str, List[str]] = {
    "call_id": [
        "incident_number", "call_number", "call_id", "incident_no",
        "incident_nbr", "incidentnumber",
    ],
    "dispatch_datetime": [
        "date_dispatched", "dispatch_time", "dispatched", "time_dispatched",
        "dispatch_dt", "dispatchtime",
    ],
    "received_datetime": [
        "date_received", "received_time", "time_received", "date_called",
        "call_received_time",
    ],
    "enroute_datetime": [
        "date_enroute", "enroute_time", "en_route_time", "enroute",
        "responding_time", "mobile_time",
    ],
    "arrival_datetime": [
        "date_arrived", "arrival_time", "arrived", "on_scene_time",
        "scene_arrival_time", "time_arrived", "date_arrive",
    ],
    "available_datetime": [
        "date_available", "date_arrive_rec", "available_time", "clear_time",
        "in_service_time", "cleared",
    ],
    "unit": [
        "unit", "unit_id", "vehicle", "apparatus", "unitname", "unit_name",
    ],
    "municipality_or_zone": [
        "scene_grid", "vehicle_grid", "municipality", "city", "zone",
        "district", "response_area", "township", "area",
    ],
    "incident_type": [
        "type_of_service_ihscene", "incident_type", "call_type",
        "type_of_call", "nature", "complaint", "call_nature",
    ],
    "service_type": [
        "type_of_service_ihscene", "service_type", "call_type",
    ],
    "patient_category": [
        "patient_category", "patient_type", "chief_complaint",
    ],
    "response_mode": [
        "response_mode", "mode_of_response", "lights_siren", "lights_and_siren",
    ],
    "priority": [
        "dispatch_priority_codetable", "priority", "dispatch_priority", "acuity",
    ],
}

# Translation from analytics field → internal analytics-service field name
# (used to build the overrides dict passed to compute_ems_metrics)
FIELD_TO_INTERNAL: Dict[str, str] = {
    "call_id":              "incident_number",
    "dispatch_datetime":    "dispatch_time",
    "received_datetime":    "received_time",
    "enroute_datetime":     "enroute_time",
    "arrival_datetime":     "arrival_time",
    "available_datetime":   "clear_time",
    "unit":                 "unit",
    "municipality_or_zone": "municipality",
    "incident_type":        "incident_type",
    "service_type":         "service_type",
    "patient_category":     "patient_category",
    "response_mode":        "response_mode",
    "priority":             "priority",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_cleaned_path(upload: DataUpload) -> Optional[str]:
    for r in upload.cleaning_results:
        if r.cleaned_file_path and Path(r.cleaned_file_path).exists():
            return r.cleaned_file_path
    return None


def _read_columns(upload: DataUpload) -> List[str]:
    """Return column names from the cleaned (or original) CSV."""
    path = _get_cleaned_path(upload) or upload.file_path
    if not path or not Path(path).exists():
        return []
    try:
        df = pd.read_csv(path, nrows=0, dtype=str)
        return list(df.columns)
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_columns_for_upload(upload: DataUpload) -> List[str]:
    """Return all column names available in the upload."""
    return _read_columns(upload)


def get_current_mapping(upload_id, db: Session) -> Dict[str, Optional[str]]:
    """Return current mapping as {analytics_field: mapped_column_name}."""
    rows = (
        db.query(EMSColumnMapping)
        .filter(EMSColumnMapping.data_upload_id == upload_id)
        .all()
    )
    return {r.analytics_field: r.mapped_column_name for r in rows}


def get_column_overrides(upload: DataUpload, db: Session) -> Optional[Dict[str, Optional[str]]]:
    """
    Return the overrides dict consumed by compute_ems_metrics (keys = internal field names).
    Returns None if no mapping has been saved.
    """
    mapping = get_current_mapping(upload.id, db)
    if not mapping:
        return None
    return {
        FIELD_TO_INTERNAL[field]: col
        for field, col in mapping.items()
        if field in FIELD_TO_INTERNAL
    }


def auto_detect_mapping(upload: DataUpload) -> Dict[str, Optional[str]]:
    """Suggest mappings by matching candidate column names against available columns."""
    cols_lower = {c.lower(): c for c in _read_columns(upload)}
    result: Dict[str, Optional[str]] = {}
    for field, candidates in AUTO_DETECT_RULES.items():
        matched = None
        for candidate in candidates:
            if candidate.lower() in cols_lower:
                matched = cols_lower[candidate.lower()]
                break
        result[field] = matched
    return result


def save_mapping(
    upload: DataUpload,
    db: Session,
    mapping: Dict[str, Optional[str]],
) -> List[Dict[str, Any]]:
    """
    Upsert mapping rows for the upload.
    Returns the serialized saved rows.
    """
    from datetime import datetime

    for field, col_name in mapping.items():
        existing = (
            db.query(EMSColumnMapping)
            .filter(
                EMSColumnMapping.data_upload_id == upload.id,
                EMSColumnMapping.analytics_field == field,
            )
            .first()
        )
        if existing:
            existing.mapped_column_name = col_name
            existing.updated_at = datetime.utcnow()
        else:
            db.add(EMSColumnMapping(
                data_upload_id=upload.id,
                client_id=upload.client_id,
                project_id=upload.project_id,
                analytics_field=field,
                mapped_column_name=col_name,
            ))
    db.commit()

    rows = (
        db.query(EMSColumnMapping)
        .filter(EMSColumnMapping.data_upload_id == upload.id)
        .all()
    )
    return [
        {
            "analytics_field": r.analytics_field,
            "mapped_column_name": r.mapped_column_name,
            "field_label": FIELD_LABELS.get(r.analytics_field, r.analytics_field),
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


def reset_mapping(upload: DataUpload, db: Session) -> None:
    """Delete all mapping rows for the upload."""
    db.query(EMSColumnMapping).filter(
        EMSColumnMapping.data_upload_id == upload.id
    ).delete()
    db.commit()


def validate_mapping(
    upload: DataUpload,
    db: Session,
    mapping: Dict[str, Optional[str]],
) -> Dict[str, Any]:
    """Return validation results: which fields are mapped vs missing."""
    available_cols = set(_read_columns(upload))
    valid: List[str] = []
    invalid: List[str] = []
    missing: List[str] = []

    for field in ANALYTICS_FIELDS:
        col = mapping.get(field)
        if not col:
            missing.append(field)
        elif col in available_cols:
            valid.append(field)
        else:
            invalid.append(f"{field} → '{col}' (column not found)")

    return {
        "valid": valid,
        "invalid": invalid,
        "missing": missing,
        "available_columns": sorted(available_cols),
        "ready_for_analytics": len(invalid) == 0,
    }


def preview_metrics(upload: DataUpload, db: Session, mapping: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """
    Compute dashboard metrics using the provided mapping without saving it.
    Used for the Preview Calculations button.
    """
    from ..services.ems_analytics_service import compute_ems_metrics

    cleaned_path = _get_cleaned_path(upload)
    if not cleaned_path:
        return {"error": "No cleaned file found. Run cleaning first."}

    overrides = {
        FIELD_TO_INTERNAL[field]: col
        for field, col in mapping.items()
        if field in FIELD_TO_INTERNAL and col
    }

    cleaning_result = upload.cleaning_results[-1] if upload.cleaning_results else None
    stats = {}
    if cleaning_result:
        stats = {
            "duplicate_rows_count": cleaning_result.duplicate_rows_count or 0,
            "removed_rows_count":   cleaning_result.removed_rows_count or 0,
            "missing_values_summary": cleaning_result.missing_values_summary or {},
        }

    summary = {
        "file_name":          upload.original_filename,
        "client_id":          str(upload.client_id),
        "project_id":         str(upload.project_id) if upload.project_id else None,
        "upload_date":        upload.created_at.isoformat() if upload.created_at else None,
        "row_count_original": upload.row_count_original,
        "row_count_cleaned":  upload.row_count_cleaned,
    }

    return compute_ems_metrics(cleaned_path, summary, stats, overrides=overrides)
