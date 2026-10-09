"""
Settings API — platform-wide configuration.

Admin-only:
  GET  /api/settings/admin           — all settings grouped by category
  PATCH /api/settings/admin          — bulk update settings
  POST /api/settings/admin/reset     — reset to defaults (local only)
  GET  /api/settings/admin/health    — system health check

Client-safe:
  GET  /api/settings/public          — public-safe portal settings
"""
import os
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db, engine
from ..config import get_settings
from ..services.runtime_status import storage_metadata, check_storage
from ..models.app_settings import AppSetting
from ..models.user import User
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/settings", tags=["settings"])

# ---------------------------------------------------------------------------
# Default values — merged with DB overrides at runtime
# ---------------------------------------------------------------------------
DEFAULTS: Dict[str, Any] = {
    # Company
    "company.name":           ("Mullen Analytics & AI Consulting", "company", "string", False),
    "company.support_email":  ("admin@mullenanalytics.com",        "company", "string", False),
    "company.phone":          ("",                                  "company", "string", False),
    "company.website_url":    ("https://mullenanalytics.com",       "company", "string", False),
    "company.address":        ("",                                  "company", "string", False),
    "company.timezone":       ("America/New_York",                  "company", "string", False),
    # Branding
    "branding.portal_name":        ("Client Analytics Portal",  "branding", "string",  True),
    "branding.primary_color":      ("#2563EB",                   "branding", "string",  True),
    "branding.secondary_color":    ("#1E40AF",                   "branding", "string",  True),
    "branding.logo_url":           ("",                          "branding", "string",  True),
    "branding.show_powered_by":    ("true",                      "branding", "boolean", True),
    "branding.welcome_message":    ("Welcome to your analytics portal.", "branding", "string", True),
    # Uploads
    "uploads.max_file_size_mb":        ("50",    "uploads", "integer", False),
    "uploads.accepted_file_types":     (".csv",  "uploads", "string",  False),
    "uploads.require_csv_template":    ("false", "uploads", "boolean", False),
    "uploads.auto_clean":              ("false", "uploads", "boolean", False),
    "uploads.auto_generate_dashboard": ("true",  "uploads", "boolean", False),
    "uploads.keep_original":           ("true",  "uploads", "boolean", False),
    "uploads.allow_client_download":   ("true",  "uploads", "boolean", True),
    "uploads.allow_client_delete":     ("false", "uploads", "boolean", True),
    # EMS Analytics
    "ems.exclude_ift_default":          ("false",             "ems", "boolean", True),
    "ems.response_time_metric":         ("dispatch_to_arrival","ems", "string",  True),
    "ems.call_volume_grouping":         ("day_of_week",        "ems", "string",  True),
    "ems.missing_timestamp_threshold":  ("10",                 "ems", "integer", False),
    "ems.duplicate_detection":          ("true",               "ems", "boolean", False),
    "ems.phi_protection":               ("true",               "ems", "boolean", False),
    # Dashboard
    "dashboard.default_date_range":    ("all",             "dashboard", "string",  True),
    "dashboard.default_dataset":       ("latest_cleaned",  "dashboard", "string",  True),
    "dashboard.show_executive_summary":("true",            "dashboard", "boolean", True),
    "dashboard.show_data_quality":     ("true",            "dashboard", "boolean", True),
    "dashboard.show_unit_analysis":    ("true",            "dashboard", "boolean", True),
    "dashboard.show_incident_types":   ("true",            "dashboard", "boolean", True),
    "dashboard.show_response_trends":  ("true",            "dashboard", "boolean", True),
    # Email
    "email.from_email":                ("noreply@mullenanalytics.com", "email", "string", False),
    "email.from_name":                 ("Mullen Analytics",            "email", "string", False),
    "email.invite_enabled":            ("true",  "email", "boolean", False),
    "email.password_reset_enabled":    ("true",  "email", "boolean", False),
    "email.upload_complete_notify":    ("false", "email", "boolean", False),
    "email.failed_upload_notify":      ("false", "email", "boolean", False),
    "email.dashboard_ready_notify":    ("false", "email", "boolean", False),
    # Security
    "security.require_email_verification": ("true",  "security", "boolean", False),
    "security.session_timeout_minutes":    ("480",   "security", "integer", False),
    "security.admin_approval_required":    ("true",  "security", "boolean", False),
    "security.client_can_invite":          ("false", "security", "boolean", False),
    "security.audit_logging":              ("true",  "security", "boolean", False),
    "security.hide_phi_columns":           ("true",  "security", "boolean", True),
}

# Keys that should NEVER be accepted from the UI
BLOCKED_KEYS = {
    "DATABASE_URL", "SECRET_KEY", "SENDGRID_API_KEY", "SMTP_PASSWORD",
    "AWS_SECRET_ACCESS_KEY", "AWS_ACCESS_KEY_ID", "SESSION_SECRET",
}

CATEGORY_LABELS = {
    "company":   "Company Profile",
    "branding":  "Portal Branding",
    "uploads":   "Data Upload Settings",
    "ems":       "EMS Analytics Settings",
    "dashboard": "Dashboard Defaults",
    "email":     "Email & Notifications",
    "security":  "Security & Access",
}


def _coerce(value: str, vtype: str) -> Any:
    if vtype == "boolean":
        return value.lower() in ("true", "1", "yes")
    if vtype == "integer":
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0
    if vtype == "float":
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0
    return value


def _load_settings(db: Session) -> Dict[str, str]:
    """Return {key: value} from DB."""
    rows = db.query(AppSetting).all()
    return {r.key: r.value for r in rows}


def _merged_settings(db: Session) -> Dict[str, Dict]:
    """Merge defaults with DB overrides, group by category."""
    db_vals = _load_settings(db)
    groups: Dict[str, list] = {}
    for key, (default_val, category, vtype, is_public) in DEFAULTS.items():
        raw = db_vals.get(key, default_val)
        entry = {
            "key": key,
            "value": _coerce(raw, vtype),
            "raw_value": raw,
            "value_type": vtype,
            "is_public": is_public,
            "category": category,
        }
        groups.setdefault(category, []).append(entry)
    return groups


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class SettingsBulkUpdate(BaseModel):
    updates: Dict[str, Any]


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------
@router.get("/admin")
async def get_admin_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    grouped = _merged_settings(db)
    return {
        "settings": grouped,
        "meta": {**storage_metadata(get_settings()),
                 "last_updated": datetime.utcnow().isoformat()},
    }


@router.patch("/admin")
async def update_admin_settings(
    payload: SettingsBulkUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    blocked = [k for k in payload.updates if k.upper() in BLOCKED_KEYS]
    if blocked:
        raise HTTPException(400, detail=f"Blocked keys: {blocked}")

    unknown = [k for k in payload.updates if k not in DEFAULTS]
    if unknown:
        raise HTTPException(400, detail=f"Unknown setting keys: {unknown}")

    for key, new_val in payload.updates.items():
        str_val = str(new_val).lower() if isinstance(new_val, bool) else str(new_val)
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row:
            row.value = str_val
            row.updated_at = datetime.utcnow()
            row.updated_by = admin.id
        else:
            default_val, category, vtype, is_public = DEFAULTS[key]
            db.add(AppSetting(
                key=key,
                value=str_val,
                category=category,
                value_type=vtype,
                is_public=is_public,
                updated_by=admin.id,
            ))

    db.commit()
    return {"success": True, "updated": list(payload.updates.keys())}


@router.post("/admin/reset")
async def reset_settings_to_defaults(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    env = os.environ.get("APP_ENV", os.environ.get("ENVIRONMENT", "local")).lower()
    if env != "local":
        raise HTTPException(403, detail="Reset is only allowed in local environment")
    db.query(AppSetting).delete()
    db.commit()
    return {"success": True, "message": "All settings reset to defaults"}


@router.get("/admin/health")
async def settings_health_check(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    storage = check_storage(settings)
    sendgrid_key = os.environ.get("SENDGRID_API_KEY", "")
    smtp_host = os.environ.get("SMTP_HOST", "")
    email_configured = bool(sendgrid_key or smtp_host)

    return {
        "backend": "ok",
        "database": db_status,
        **storage,
        "email": "configured" if email_configured else "not_configured",
        "analytics_pipeline": "not_checked",
        "migration_verification": "not_checked",
        "database_host": engine.url.host,
        "database_name": engine.url.database,
        "environment": settings.environment,
        "storage_backend": settings.storage_backend,
        "uploads_root": settings.data_uploads_root,
        "storage_root": settings.data_storage_root,
        "checked_at": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Public route — client-safe settings
# ---------------------------------------------------------------------------
@router.get("/public")
async def get_public_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    grouped = _merged_settings(db)
    public: Dict[str, Any] = {}
    for _cat, entries in grouped.items():
        for entry in entries:
            if entry["is_public"]:
                public[entry["key"]] = entry["value"]
    return {"settings": public}
