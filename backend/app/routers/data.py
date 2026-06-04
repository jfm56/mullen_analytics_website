"""
Data upload and cleaning router.

Routes:
  POST   /api/data/uploads                            – upload a CSV
  GET    /api/data/uploads                            – list uploads
  GET    /api/data/uploads/{upload_id}                – single upload
  DELETE /api/data/uploads/{upload_id}                – delete upload + files
  POST   /api/data/uploads/{upload_id}/clean          – run EMS cleaning
  GET    /api/data/uploads/{upload_id}/cleaning-results
  GET    /api/data/uploads/{upload_id}/download-original
  GET    /api/data/uploads/{upload_id}/download-cleaned

Permissions:
  Admin  – full access to all clients/projects
  Client – own client_id only
"""

import logging
import os
import uuid as uuid_lib
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from ..config import get_settings
from ..database import get_db
from ..models.data_upload import (
    DataCleaningResult, DataUpload, EMSDashboardMetrics, DataProfile,
    AnalyticsColumnSettings, EMSColumnMapping,
)
from ..services.ems_column_mapping_service import (
    ANALYTICS_FIELDS, FIELD_LABELS,
    get_columns_for_upload, get_current_mapping, get_column_overrides,
    auto_detect_mapping, save_mapping, reset_mapping,
    validate_mapping, preview_metrics,
)
from ..services.data_profile_service import (
    profile_dataset, get_filter_options, query_dataset, preview_dataset, get_chart_data,
)
from ..services.ems_filter_service import (
    build_filter_options,
    filtered_dashboard,
    compare_dashboard,
    get_column_settings,
    patch_column_settings,
    bulk_ignore_columns,
    restore_columns,
)
from ..models.user import Profile, User
from ..models.project import Project
from .auth import get_current_user

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/data", tags=["data"])

ALLOWED_EXTENSIONS = {".csv"}
SOURCE_SYSTEMS = {"EMSCHARTS"}


# ============================================================================
# Helpers
# ============================================================================

def _get_profile(db: Session, user: User) -> Optional[Profile]:
    return db.query(Profile).filter(Profile.id == user.id).first()


def _is_admin(db: Session, user: User) -> bool:
    p = _get_profile(db, user)
    return p is not None and p.role == "admin"


def _assert_upload_access(db: Session, upload: DataUpload, user: User) -> None:
    """Raise 403 if a non-admin user tries to access another client's upload."""
    if not _is_admin(db, user) and str(upload.client_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")


def _upload_dir(client_id: str) -> Path:
    return Path(settings.data_uploads_root) / "clients" / client_id


def _cleaned_dir(client_id: str) -> Path:
    return Path(settings.data_uploads_root) / "clients" / client_id / "cleaned"


# ============================================================================
# Pydantic schemas
# ============================================================================

class FilterSpec(BaseModel):
    column: str
    operator: str
    value: Any = None


class QueryRequest(BaseModel):
    filters: List[FilterSpec] = []
    selected_columns: List[str] = []
    limit: int = 100
    offset: int = 0
    sort_by: Optional[str] = None
    sort_dir: str = "asc"


class ChartRequest(BaseModel):
    x_col: str
    y_col: Optional[str] = None
    aggregation: str = "count"
    chart_type: str = "bar"
    filters: List[FilterSpec] = []
    limit: int = 50


class DashboardFilterRequest(BaseModel):
    date_range: Optional[List[str]] = None
    units: Optional[List[str]] = None
    municipalities: Optional[List[str]] = None
    call_types: Optional[List[str]] = None
    exclude_interfacility: bool = False
    emergency_only: bool = False


class CompareGroupSpec(BaseModel):
    label: str
    filters: DashboardFilterRequest


class CompareRequest(BaseModel):
    group_a: CompareGroupSpec
    group_b: CompareGroupSpec


class ColumnSettingPatch(BaseModel):
    column_name: str
    is_ignored: bool
    reason: Optional[str] = None


class BulkIgnoreRequest(BaseModel):
    column_names: List[str]
    reason: Optional[str] = None


class RestoreRequest(BaseModel):
    column_names: List[str]


class CleaningResultResponse(BaseModel):
    id: UUID
    data_upload_id: UUID
    missing_values_summary: Optional[Dict[str, Any]] = None
    duplicate_rows_count: int
    removed_rows_count: int
    cleaned_file_path: Optional[str] = None
    cleaning_notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DataUploadResponse(BaseModel):
    id: UUID
    client_id: UUID
    project_id: Optional[UUID] = None
    uploaded_by_user_id: UUID
    original_filename: str
    stored_filename: str
    file_size: int
    source_system: str
    upload_status: str
    row_count_original: Optional[int] = None
    row_count_cleaned: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    cleaning_results: List[CleaningResultResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# POST /api/data/uploads
# ============================================================================

@router.post("/uploads", response_model=DataUploadResponse)
async def upload_csv(
    request: Request,
    file: UploadFile = File(...),
    client_id: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    source_system: str = Form("EMSCHARTS"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a CSV file. Admin must supply client_id; clients auto-use their own id."""
    admin = _is_admin(db, current_user)

    # Resolve effective client_id
    if admin:
        if not client_id:
            # Fall back to active impersonation target (admin using the client portal)
            impersonated = request.cookies.get("ma_impersonate")
            if impersonated:
                client_id = impersonated
            else:
                raise HTTPException(status_code=422, detail="client_id is required for admin uploads")
        effective_client_id = UUID(client_id)
    else:
        effective_client_id = current_user.id
        # Clients may not upload for someone else
        if client_id and str(client_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")

    # Validate file extension
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only CSV files are accepted. Got: '{suffix}'",
        )

    # Validate file size
    contents = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB",
        )

    # Validate project ownership if provided
    resolved_project_id: Optional[UUID] = None
    if project_id:
        p = db.query(Project).filter(Project.id == UUID(project_id)).first()
        if not p:
            raise HTTPException(status_code=404, detail="Project not found")
        if not admin and str(p.client_id) != str(effective_client_id):
            raise HTTPException(status_code=403, detail="Project does not belong to your account")
        resolved_project_id = p.id

    # Build stored filename and save to disk
    stored_name = f"{uuid_lib.uuid4().hex}_{Path(file.filename).name}"
    upload_dir = _upload_dir(str(effective_client_id))
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_name

    file_path.write_bytes(contents)
    logger.info("Saved upload: %s (%d bytes)", file_path, len(contents))

    # Persist record
    record = DataUpload(
        client_id=effective_client_id,
        project_id=resolved_project_id,
        uploaded_by_user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=stored_name,
        file_path=str(file_path),
        file_size=len(contents),
        source_system=source_system.upper() if source_system else "EMSCHARTS",
        upload_status="UPLOADED",
        notes=notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ============================================================================
# GET /api/data/uploads
# ============================================================================

@router.get("/uploads", response_model=List[DataUploadResponse])
async def list_uploads(
    client_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List uploads. Admin sees all (filterable); clients see only their own."""
    admin = _is_admin(db, current_user)

    query = db.query(DataUpload)

    if admin:
        if client_id:
            query = query.filter(DataUpload.client_id == UUID(client_id))
    else:
        query = query.filter(DataUpload.client_id == current_user.id)

    if project_id:
        query = query.filter(DataUpload.project_id == UUID(project_id))

    uploads = query.order_by(DataUpload.created_at.desc()).all()
    return uploads


# ============================================================================
# GET /api/data/uploads/{upload_id}
# ============================================================================

@router.get("/uploads/{upload_id}", response_model=DataUploadResponse)
async def get_upload(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return upload


# ============================================================================
# DELETE /api/data/uploads/{upload_id}
# ============================================================================

@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    # Delete files from disk
    for path_attr in [upload.file_path]:
        if path_attr and Path(path_attr).exists():
            Path(path_attr).unlink(missing_ok=True)

    for result in upload.cleaning_results:
        if result.cleaned_file_path and Path(result.cleaned_file_path).exists():
            Path(result.cleaned_file_path).unlink(missing_ok=True)

    # Remove dependent rows that have plain (non-cascading) foreign keys, or the
    # final delete fails with a FK violation for any *processed* upload (one that
    # has generated dashboard metrics, a data profile, column settings, or column
    # mappings). data_cleaning_results is handled by its ORM delete-orphan cascade
    # via db.delete(upload) below, so it's intentionally excluded here.
    for _dependent in (EMSDashboardMetrics, DataProfile, AnalyticsColumnSettings, EMSColumnMapping):
        db.query(_dependent).filter(_dependent.data_upload_id == upload.id).delete(
            synchronize_session=False
        )

    db.delete(upload)
    db.commit()
    return {"success": True}


# ============================================================================
# PATCH /api/data/uploads/{upload_id}
# ============================================================================

class UploadReassign(BaseModel):
    client_id: Optional[UUID] = None
    project_id: Optional[UUID] = None


@router.patch("/uploads/{upload_id}", response_model=DataUploadResponse)
async def reassign_upload(
    upload_id: UUID,
    body: UploadReassign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reassign an upload to a different client or project (admin only)."""
    if not _is_admin(db, current_user):
        raise HTTPException(status_code=403, detail="Admin only")

    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    if body.client_id is not None:
        from ..models.user import User as UserModel
        client = db.query(UserModel).filter(UserModel.id == body.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        upload.client_id = body.client_id

    if body.project_id is not None:
        proj = db.query(Project).filter(Project.id == body.project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")
        upload.project_id = body.project_id
    elif "project_id" in body.model_fields_set:
        upload.project_id = None

    db.commit()
    db.refresh(upload)
    return upload


# ============================================================================
# POST /api/data/uploads/{upload_id}/clean
# ============================================================================

@router.post("/uploads/{upload_id}/clean", response_model=DataUploadResponse)
async def clean_upload(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run the EMS cleaning pipeline on an uploaded CSV."""
    from ..services.ems_cleaning_service import run_ems_cleaning

    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    if not Path(upload.file_path).exists():
        raise HTTPException(status_code=404, detail="Original file not found on disk")

    # Mark as cleaning
    upload.upload_status = "CLEANING"
    db.commit()

    # Build output path
    cleaned_dir = _cleaned_dir(str(upload.client_id))
    cleaned_dir.mkdir(parents=True, exist_ok=True)
    cleaned_filename = f"cleaned_{upload.stored_filename}"
    cleaned_path = str(cleaned_dir / cleaned_filename)

    try:
        stats = run_ems_cleaning(upload.file_path, cleaned_path)
    except Exception as exc:
        upload.upload_status = "FAILED"
        db.commit()
        logger.error("Cleaning failed for upload %s: %s", upload_id, exc)
        raise HTTPException(status_code=500, detail=f"Cleaning failed: {exc}")

    # Persist a gzipped copy of the cleaned CSV in the DB so the analytics
    # services can read it even when the file isn't on this server's disk
    # (ephemeral storage / paths written on a different machine).
    cleaned_blob = None
    try:
        import gzip
        with open(cleaned_path, "rb") as _fh:
            cleaned_blob = gzip.compress(_fh.read())
    except Exception as _exc:  # noqa: BLE001
        logger.warning("Could not store cleaned-data blob for %s: %s", upload_id, _exc)

    # Persist cleaning result
    result = DataCleaningResult(
        data_upload_id=upload.id,
        missing_values_summary=stats["missing_values_summary"],
        duplicate_rows_count=stats["duplicate_rows_count"],
        removed_rows_count=stats["removed_rows_count"],
        cleaned_file_path=cleaned_path,
        cleaned_data_gz=cleaned_blob,
        cleaning_notes=stats["cleaning_notes"],
    )
    db.add(result)

    # Update upload record
    upload.upload_status = "CLEANED"
    upload.row_count_original = stats["row_count_original"]
    upload.row_count_cleaned = stats["row_count_cleaned"]
    db.commit()

    # Generate dashboard metrics
    try:
        from ..services.ems_analytics_service import compute_ems_metrics
        summary = {
            "file_name": upload.original_filename,
            "client_id": str(upload.client_id),
            "project_id": str(upload.project_id) if upload.project_id else None,
            "upload_date": upload.created_at.isoformat() if upload.created_at else None,
            "row_count_original": stats["row_count_original"],
            "row_count_cleaned": stats["row_count_cleaned"],
            "duplicate_count": stats["duplicate_rows_count"],
            "missing_value_count": sum(stats["missing_values_summary"].values()),
        }
        overrides = get_column_overrides(upload, db)
        metrics_json = compute_ems_metrics(cleaned_path, summary, stats, overrides=overrides)
        # Upsert: replace if exists
        existing_dm = (
            db.query(EMSDashboardMetrics)
            .filter(EMSDashboardMetrics.data_upload_id == upload.id)
            .first()
        )
        if existing_dm:
            existing_dm.metrics_json = metrics_json
            existing_dm.updated_at = datetime.utcnow()
        else:
            dm = EMSDashboardMetrics(
                data_upload_id=upload.id,
                client_id=upload.client_id,
                project_id=upload.project_id,
                metrics_json=metrics_json,
            )
            db.add(dm)
        db.commit()
    except Exception as dm_exc:
        logger.warning("Dashboard metrics generation failed for %s: %s", upload_id, dm_exc)

    db.refresh(upload)
    return upload


# ============================================================================
# GET /api/data/uploads/{upload_id}/dashboard
# ============================================================================

@router.get("/uploads/{upload_id}/dashboard")
async def get_upload_dashboard(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return pre-computed dashboard metrics for a specific upload."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    dm = (
        db.query(EMSDashboardMetrics)
        .filter(EMSDashboardMetrics.data_upload_id == upload_id)
        .first()
    )
    if not dm:
        raise HTTPException(status_code=404, detail="Dashboard metrics not yet generated. Run cleaning first.")
    return {
        "upload_id": str(upload_id),
        "upload_status": upload.upload_status,
        "metrics": dm.metrics_json,
        "generated_at": dm.updated_at.isoformat() if dm.updated_at else dm.created_at.isoformat(),
    }


# ============================================================================
# GET /api/data/uploads/{upload_id}/predictive
# ============================================================================

@router.get("/uploads/{upload_id}/predictive")
async def get_upload_predictive(
    upload_id: UUID,
    horizon: int = 12,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Predictive analytics — call-volume forecast, demand patterns, and staffing."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    from ..services.ems_predictive_service import get_predictive_dashboard
    return get_predictive_dashboard(upload, db, horizon=horizon)


# ============================================================================
# GET /api/data/uploads/{upload_id}/geographic
# ============================================================================

@router.get("/uploads/{upload_id}/geographic")
async def get_upload_geographic(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Geographic analytics — call volume by township with map coordinates + trend."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    from ..services.ems_geographic_service import get_geographic_dashboard
    return get_geographic_dashboard(upload, db)


# ============================================================================
# GET /api/data/uploads/{upload_id}/response-time-risk
# ============================================================================

@router.get("/uploads/{upload_id}/response-time-risk")
async def get_upload_response_time_risk(
    upload_id: UUID,
    target_minutes: float = 9.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Response-time risk — by weather, hour-of-day (traffic proxy), and township."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    from ..services.ems_response_time_service import get_response_time_risk
    return get_response_time_risk(upload, db, target_minutes=target_minutes)


# ============================================================================
# GET /api/data/uploads/{upload_id}/mva-hotspots
# ============================================================================

@router.get("/uploads/{upload_id}/mva-hotspots")
async def get_upload_mva_hotspots(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Motor-vehicle-collision hotspots — by township, hour, weekday, and weather."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    from ..services.ems_mva_service import get_mva_hotspots
    return get_mva_hotspots(upload, db)


# ============================================================================
# GET /api/data/clients/{client_id}/dashboard
# ============================================================================

@router.get("/clients/{client_id}/dashboard")
async def get_client_dashboard(
    client_id: UUID,
    project_id: Optional[str] = None,
    upload_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return dashboard metrics for a client (latest upload by default, filterable)."""
    admin = _is_admin(db, current_user)
    if not admin and current_user.id != client_id:
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(EMSDashboardMetrics).filter(
        EMSDashboardMetrics.client_id == client_id
    )
    if project_id:
        query = query.filter(EMSDashboardMetrics.project_id == UUID(project_id))
    if upload_id:
        query = query.filter(EMSDashboardMetrics.data_upload_id == UUID(upload_id))

    records = query.order_by(EMSDashboardMetrics.updated_at.desc()).all()
    return [
        {
            "upload_id": str(r.data_upload_id),
            "project_id": str(r.project_id) if r.project_id else None,
            "metrics": r.metrics_json,
            "generated_at": r.updated_at.isoformat() if r.updated_at else r.created_at.isoformat(),
        }
        for r in records
    ]


# ============================================================================
# GET /api/data/projects/{project_id}/dashboard
# ============================================================================

@router.get("/projects/{project_id}/dashboard")
async def get_project_dashboard(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all dashboard metrics for uploads linked to a project."""
    admin = _is_admin(db, current_user)

    records = (
        db.query(EMSDashboardMetrics)
        .filter(EMSDashboardMetrics.project_id == project_id)
        .order_by(EMSDashboardMetrics.updated_at.desc())
        .all()
    )

    if not admin:
        records = [r for r in records if r.client_id == current_user.id]

    return [
        {
            "upload_id": str(r.data_upload_id),
            "client_id": str(r.client_id),
            "metrics": r.metrics_json,
            "generated_at": r.updated_at.isoformat() if r.updated_at else r.created_at.isoformat(),
        }
        for r in records
    ]


# ============================================================================
# GET /api/data/uploads/{upload_id}/cleaning-results
# ============================================================================

@router.get("/uploads/{upload_id}/cleaning-results",
            response_model=List[CleaningResultResponse])
async def get_cleaning_results(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return upload.cleaning_results


# ============================================================================
# GET /api/data/uploads/{upload_id}/download-original
# ============================================================================

@router.get("/uploads/{upload_id}/download-original")
async def download_original(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    file_path = Path(upload.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type="text/csv",
        filename=upload.original_filename,
    )


# ============================================================================
# GET /api/data/uploads/{upload_id}/download-cleaned
# ============================================================================

@router.get("/uploads/{upload_id}/download-cleaned")
async def download_cleaned(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    if upload.upload_status != "CLEANED":
        raise HTTPException(status_code=400, detail="Cleaning has not been run yet")

    # Find the latest cleaning result with a file
    latest = (
        db.query(DataCleaningResult)
        .filter(DataCleaningResult.data_upload_id == upload_id)
        .filter(DataCleaningResult.cleaned_file_path.isnot(None))
        .order_by(DataCleaningResult.created_at.desc())
        .first()
    )
    if not latest or not Path(latest.cleaned_file_path).exists():
        raise HTTPException(status_code=404, detail="Cleaned file not found on disk")

    cleaned_name = f"cleaned_{upload.original_filename}"
    return FileResponse(
        path=latest.cleaned_file_path,
        media_type="text/csv",
        filename=cleaned_name,
    )


# ============================================================================
# GET /api/data/uploads/{upload_id}/profile
# ============================================================================

@router.get("/uploads/{upload_id}/profile")
async def get_data_profile(
    upload_id: UUID,
    refresh: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return (or compute + cache) a statistical profile for an upload."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    cached = db.query(DataProfile).filter(DataProfile.data_upload_id == upload_id).first()
    if cached and not refresh:
        return {
            "upload_id": str(upload_id),
            "profile": cached.profile_json,
            "cached": True,
            "generated_at": (cached.updated_at or cached.created_at).isoformat(),
        }

    profile_data = profile_dataset(upload, db)

    if cached:
        cached.profile_json = profile_data
        cached.updated_at = datetime.utcnow()
    else:
        cached = DataProfile(
            data_upload_id=upload.id,
            client_id=upload.client_id,
            project_id=upload.project_id,
            profile_json=profile_data,
        )
        db.add(cached)
    db.commit()

    return {
        "upload_id": str(upload_id),
        "profile": profile_data,
        "cached": False,
        "generated_at": datetime.utcnow().isoformat(),
    }


# ============================================================================
# GET /api/data/uploads/{upload_id}/columns
# ============================================================================

@router.get("/uploads/{upload_id}/columns")
async def get_columns(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return column names + type metadata (fast — from cached profile)."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    cached = db.query(DataProfile).filter(DataProfile.data_upload_id == upload_id).first()
    if not cached:
        profile_data = profile_dataset(upload, db)
        cached = DataProfile(
            data_upload_id=upload.id, client_id=upload.client_id,
            project_id=upload.project_id, profile_json=profile_data,
        )
        db.add(cached)
        db.commit()
    else:
        profile_data = cached.profile_json

    p = profile_data
    return [
        {
            "name": col,
            "type": p.get("data_types", {}).get(col, "text"),
            "missing": p.get("missing_values", {}).get(col, 0),
            "missing_pct": p.get("missing_percent", {}).get(col, 0.0),
            "unique_count": p.get("unique_counts", {}).get(col, 0),
            "is_date": col in p.get("date_columns_detected", []),
            "is_categorical": col in p.get("categorical_columns_detected", []),
            "sample_values": p.get("sample_values", {}).get(col, []),
        }
        for col in (p.get("columns") or [])
    ]


# ============================================================================
# GET /api/data/uploads/{upload_id}/preview
# ============================================================================

@router.get("/uploads/{upload_id}/preview")
async def get_preview(
    upload_id: UUID,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the first N rows (no filters). Limit capped at 500."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    limit = min(limit, 500)
    return preview_dataset(upload, db, limit=limit, offset=offset)


# ============================================================================
# GET /api/data/uploads/{upload_id}/filters/{column_name}
# ============================================================================

@router.get("/uploads/{upload_id}/filters/{column_name}")
async def get_column_filter_options(
    upload_id: UUID,
    column_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return unique values for a column (for categorical filter dropdowns)."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return {"column": column_name, "values": get_filter_options(upload, column_name, db)}


# ============================================================================
# POST /api/data/uploads/{upload_id}/query
# ============================================================================

@router.post("/uploads/{upload_id}/query")
async def query_upload(
    upload_id: UUID,
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply JSON filters and return paginated rows. No raw SQL."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    limit = min(body.limit, 500)
    return query_dataset(
        upload, db,
        filters=[f.model_dump() for f in body.filters],
        selected_columns=body.selected_columns,
        limit=limit,
        offset=body.offset,
        sort_by=body.sort_by,
        sort_dir=body.sort_dir,
    )


# ============================================================================
# POST /api/data/uploads/{upload_id}/chart-data
# ============================================================================

@router.post("/uploads/{upload_id}/chart-data")
async def get_upload_chart_data(
    upload_id: UUID,
    body: ChartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return aggregated chart data for the selected columns/aggregation."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return get_chart_data(
        upload, db,
        x_col=body.x_col,
        y_col=body.y_col,
        aggregation=body.aggregation,
        filters=[f.model_dump() for f in body.filters],
        limit=body.limit,
    )


# ============================================================================
# GET /api/data/uploads/{upload_id}/filter-options
# ============================================================================

@router.get("/uploads/{upload_id}/filter-options")
async def get_dashboard_filter_options(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return distinct units, municipalities, call types, date range for filter dropdowns."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return build_filter_options(upload, db)


# ============================================================================
# POST /api/data/uploads/{upload_id}/dashboard/filter
# ============================================================================

@router.post("/uploads/{upload_id}/dashboard/filter")
async def dashboard_filtered(
    upload_id: UUID,
    body: DashboardFilterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return full dashboard metrics for a filtered subset of the data."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return filtered_dashboard(upload, db, body.model_dump(exclude_none=False))


# ============================================================================
# POST /api/data/uploads/{upload_id}/dashboard/compare
# ============================================================================

@router.post("/uploads/{upload_id}/dashboard/compare")
async def dashboard_compare(
    upload_id: UUID,
    body: CompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compare two filtered groups side-by-side with difference metrics."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return compare_dashboard(
        upload, db,
        group_a_label=body.group_a.label,
        group_a_filters=body.group_a.filters.model_dump(exclude_none=False),
        group_b_label=body.group_b.label,
        group_b_filters=body.group_b.filters.model_dump(exclude_none=False),
    )


# ============================================================================
# GET /api/data/uploads/{upload_id}/columns/settings
# ============================================================================

@router.get("/uploads/{upload_id}/columns/settings")
async def get_col_settings(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return per-column analytics visibility settings."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return get_column_settings(upload_id, db)


# ============================================================================
# PATCH /api/data/uploads/{upload_id}/columns/settings
# ============================================================================

@router.patch("/uploads/{upload_id}/columns/settings")
async def patch_col_settings(
    upload_id: UUID,
    patches: List[ColumnSettingPatch],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upsert column visibility settings (list of {column_name, is_ignored, reason?})."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return patch_column_settings(upload, [p.model_dump() for p in patches], db)


# ============================================================================
# POST /api/data/uploads/{upload_id}/columns/bulk-ignore
# ============================================================================

@router.post("/uploads/{upload_id}/columns/bulk-ignore")
async def bulk_ignore(
    upload_id: UUID,
    body: BulkIgnoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark multiple columns as ignored in one request."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return bulk_ignore_columns(upload, body.column_names, body.reason, db)


# ============================================================================
# POST /api/data/uploads/{upload_id}/columns/restore
# ============================================================================

@router.post("/uploads/{upload_id}/columns/restore")
async def restore_ignored_columns(
    upload_id: UUID,
    body: RestoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Restore previously ignored columns."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return restore_columns(upload, body.column_names, db)


# ============================================================================
# Pydantic schemas for column mapping
# ============================================================================

class ColumnMappingPatch(BaseModel):
    mapping: Dict[str, Optional[str]]


# ============================================================================
# Helper: regenerate + upsert dashboard metrics with latest overrides
# ============================================================================

def _regen_metrics(upload: DataUpload, db: Session) -> None:
    """Recompute EMSDashboardMetrics using the saved column mapping."""
    from ..services.ems_analytics_service import compute_ems_metrics
    from ..services.ems_column_mapping_service import get_column_overrides
    from pathlib import Path

    result = upload.cleaning_results[-1] if upload.cleaning_results else None
    if not result or not result.cleaned_file_path:
        return
    cleaned_path = result.cleaned_file_path
    if not Path(cleaned_path).exists():
        return

    stats = {
        "duplicate_rows_count":   result.duplicate_rows_count or 0,
        "removed_rows_count":     result.removed_rows_count or 0,
        "missing_values_summary": result.missing_values_summary or {},
    }
    summary = {
        "file_name":          upload.original_filename,
        "client_id":          str(upload.client_id),
        "project_id":         str(upload.project_id) if upload.project_id else None,
        "upload_date":        upload.created_at.isoformat() if upload.created_at else None,
        "row_count_original": upload.row_count_original,
        "row_count_cleaned":  upload.row_count_cleaned,
    }
    overrides = get_column_overrides(upload, db)
    metrics_json = compute_ems_metrics(cleaned_path, summary, stats, overrides=overrides)

    existing = db.query(EMSDashboardMetrics).filter(
        EMSDashboardMetrics.data_upload_id == upload.id
    ).first()
    if existing:
        existing.metrics_json = metrics_json
        existing.updated_at = datetime.utcnow()
    else:
        db.add(EMSDashboardMetrics(
            data_upload_id=upload.id,
            client_id=upload.client_id,
            project_id=upload.project_id,
            metrics_json=metrics_json,
        ))
    db.commit()


# ============================================================================
# GET /api/data/uploads/{upload_id}/column-mapping
# ============================================================================

@router.get("/uploads/{upload_id}/column-mapping")
async def get_column_mapping(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return current column mapping + available CSV columns + field definitions."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    current = get_current_mapping(upload_id, db)
    columns = get_columns_for_upload(upload)
    return {
        "upload_id":        str(upload_id),
        "mapping":          current,
        "available_columns": columns,
        "analytics_fields": [
            {"field": f, "label": FIELD_LABELS.get(f, f), "mapped": current.get(f)}
            for f in ANALYTICS_FIELDS
        ],
    }


# ============================================================================
# POST /api/data/uploads/{upload_id}/column-mapping/autodetect
# ============================================================================

@router.post("/uploads/{upload_id}/column-mapping/autodetect")
async def autodetect_column_mapping(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return auto-detected column mapping suggestions."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    detected = auto_detect_mapping(upload)
    return {"mapping": detected, "columns": get_columns_for_upload(upload)}


# ============================================================================
# PATCH /api/data/uploads/{upload_id}/column-mapping
# ============================================================================

@router.patch("/uploads/{upload_id}/column-mapping")
async def patch_column_mapping(
    upload_id: UUID,
    body: ColumnMappingPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save column mapping and regenerate dashboard metrics."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    saved = save_mapping(upload, db, body.mapping)
    try:
        _regen_metrics(upload, db)
    except Exception as e:
        logger.warning("Metrics regen after mapping failed: %s", e)

    return {"saved": saved, "metrics_regenerated": True}


# ============================================================================
# DELETE /api/data/uploads/{upload_id}/column-mapping
# ============================================================================

@router.delete("/uploads/{upload_id}/column-mapping")
async def delete_column_mapping(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset (delete) all column mappings for this upload and regenerate metrics."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)

    reset_mapping(upload, db)
    try:
        _regen_metrics(upload, db)
    except Exception as e:
        logger.warning("Metrics regen after reset failed: %s", e)

    return {"reset": True, "metrics_regenerated": True}


# ============================================================================
# POST /api/data/uploads/{upload_id}/preview-metrics
# ============================================================================

@router.post("/uploads/{upload_id}/preview-metrics")
async def preview_upload_metrics(
    upload_id: UUID,
    body: ColumnMappingPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Preview dashboard metrics with a given mapping without saving it."""
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    _assert_upload_access(db, upload, current_user)
    return preview_metrics(upload, db, body.mapping)
