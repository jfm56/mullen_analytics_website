"""
Admin-only API endpoints.

All routes require the authenticated user to have role='admin'.

GET /api/admin/agencies          — all agencies with run counts
GET /api/admin/pipeline/runs     — all recent pipeline runs
GET /api/admin/audit-logs        — recent audit log entries
GET /api/admin/stats             — platform-wide summary stats
GET /api/admin/clients           — all client profiles with upload stats
GET /api/admin/clients/{id}      — single client detail
GET /api/admin/clients/{id}/uploads        — all uploads for a client
GET /api/admin/clients/{id}/latest-upload  — latest upload for a client
GET /api/admin/clients/{id}/dashboard-summary
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.agency import Agency, AgencyFile, AuditLog, PipelineRun
from ..models.user import User, Profile
from ..models.data_upload import DataUpload, EMSDashboardMetrics
from ..schemas.agency import AuditLogResponse, PipelineRunResponse
from ..services.auth import get_user_profile
from .auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(db: Session, user: User) -> None:
    profile = get_user_profile(db, str(user.id))
    if not profile or profile.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/stats")
async def platform_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    total_agencies   = db.query(func.count(Agency.id)).scalar()
    active_agencies  = db.query(func.count(Agency.id)).filter(Agency.status == "active").scalar()
    total_files      = db.query(func.count(AgencyFile.id)).scalar()
    total_runs       = db.query(func.count(PipelineRun.id)).scalar()
    completed_runs   = db.query(func.count(PipelineRun.id)).filter(PipelineRun.status == "completed").scalar()
    active_runs      = db.query(func.count(PipelineRun.id)).filter(PipelineRun.status.in_(["queued", "running"])).scalar()
    return {
        "total_agencies":  total_agencies,
        "active_agencies": active_agencies,
        "total_files":     total_files,
        "total_runs":      total_runs,
        "completed_runs":  completed_runs,
        "active_runs":     active_runs,
    }


@router.get("/agencies")
async def list_all_agencies(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    query = db.query(Agency)
    if status:
        query = query.filter(Agency.status == status)
    agencies = query.order_by(Agency.created_at.desc()).all()

    run_counts = {
        row[0]: row[1]
        for row in db.query(PipelineRun.agency_id, func.count(PipelineRun.id))
        .group_by(PipelineRun.agency_id)
        .all()
    }
    file_counts = {
        row[0]: row[1]
        for row in db.query(AgencyFile.agency_id, func.count(AgencyFile.id))
        .group_by(AgencyFile.agency_id)
        .all()
    }

    return [
        {
            "id":                str(a.id),
            "agency_name":       a.agency_name,
            "slug":              a.slug,
            "subscription_tier": a.subscription_tier,
            "status":            a.status,
            "state":             a.state,
            "agency_type":       a.agency_type,
            "created_at":        a.created_at.isoformat(),
            "pipeline_runs":     run_counts.get(a.id, 0),
            "file_count":        file_counts.get(a.id, 0),
        }
        for a in agencies
    ]


@router.get("/pipeline/runs", response_model=List[PipelineRunResponse])
async def list_all_runs(
    limit: int = Query(50, le=200),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    query = db.query(PipelineRun)
    if status:
        query = query.filter(PipelineRun.status == status)
    return query.order_by(PipelineRun.created_at.desc()).limit(limit).all()


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(100, le=500),
    agency_id: Optional[str] = None,
    action: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    query = db.query(AuditLog)
    if agency_id:
        query = query.filter(AuditLog.agency_id == agency_id)
    if action:
        query = query.filter(AuditLog.action == action)
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


# ============================================================================
# Admin Client Management
# ============================================================================

def _upload_stats(db: Session, client_ids: list) -> dict:
    """Return {client_id: {count, last_upload, has_dashboard, has_failed}} for each id."""
    rows = (
        db.query(
            DataUpload.client_id,
            func.count(DataUpload.id).label("upload_count"),
            func.max(DataUpload.created_at).label("last_upload"),
        )
        .filter(DataUpload.client_id.in_(client_ids))
        .group_by(DataUpload.client_id)
        .all()
    )
    failed_ids = {
        row[0]
        for row in db.query(DataUpload.client_id)
        .filter(DataUpload.client_id.in_(client_ids), DataUpload.upload_status == "FAILED")
        .distinct()
        .all()
    }
    dash_ids = {
        row[0]
        for row in db.query(DataUpload.client_id)
        .filter(DataUpload.client_id.in_(client_ids), DataUpload.upload_status == "CLEANED")
        .distinct()
        .all()
    }
    return {
        str(r.client_id): {
            "upload_count": r.upload_count,
            "last_upload": r.last_upload.isoformat() if r.last_upload else None,
            "has_dashboard": str(r.client_id) in dash_ids,
            "has_failed": str(r.client_id) in failed_ids,
        }
        for r in rows
    }


@router.get("/clients")
async def list_admin_clients(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    query = db.query(Profile).filter(Profile.role == "client")
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Profile.full_name).like(like) |
            func.lower(Profile.email).like(like) |
            func.lower(Profile.company).like(like)
        )
    profiles = query.order_by(Profile.created_at.desc()).all()
    client_ids = [p.id for p in profiles]
    stats = _upload_stats(db, client_ids)
    return [
        {
            "id": str(p.id),
            "full_name": p.full_name,
            "email": p.email,
            "company": p.company,
            "client_status": p.client_status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            **stats.get(str(p.id), {"upload_count": 0, "last_upload": None, "has_dashboard": False, "has_failed": False}),
        }
        for p in profiles
    ]


@router.get("/clients/{client_id}")
async def get_admin_client(
    client_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    p = db.query(Profile).filter(Profile.id == client_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Client not found")
    stats = _upload_stats(db, [client_id])
    return {
        "id": str(p.id),
        "full_name": p.full_name,
        "email": p.email,
        "company": p.company,
        "client_status": p.client_status,
        "notes": p.notes,
        "health_score": p.health_score,
        "contract_value": float(p.contract_value or 0),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        **stats.get(str(client_id), {"upload_count": 0, "last_upload": None, "has_dashboard": False, "has_failed": False}),
    }


@router.get("/clients/{client_id}/uploads")
async def list_client_uploads(
    client_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    uploads = (
        db.query(DataUpload)
        .filter(DataUpload.client_id == client_id)
        .order_by(desc(DataUpload.created_at))
        .all()
    )
    return [
        {
            "id": str(u.id),
            "original_filename": u.original_filename,
            "upload_status": u.upload_status,
            "file_size": u.file_size,
            "row_count_original": u.row_count_original,
            "row_count_cleaned": u.row_count_cleaned,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "updated_at": u.updated_at.isoformat() if u.updated_at else None,
        }
        for u in uploads
    ]


@router.get("/clients/{client_id}/latest-upload")
async def get_client_latest_upload(
    client_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    u = (
        db.query(DataUpload)
        .filter(DataUpload.client_id == client_id)
        .order_by(desc(DataUpload.created_at))
        .first()
    )
    if not u:
        return None
    return {
        "id": str(u.id),
        "original_filename": u.original_filename,
        "upload_status": u.upload_status,
        "row_count_original": u.row_count_original,
        "row_count_cleaned": u.row_count_cleaned,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("/clients/{client_id}/dashboard-summary")
async def get_client_dashboard_summary(
    client_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)
    latest = (
        db.query(DataUpload)
        .filter(DataUpload.client_id == client_id, DataUpload.upload_status == "CLEANED")
        .order_by(desc(DataUpload.created_at))
        .first()
    )
    if not latest:
        return {"has_dashboard": False, "upload_id": None, "metrics": None}
    metrics = db.query(EMSDashboardMetrics).filter(EMSDashboardMetrics.data_upload_id == latest.id).first()
    if not metrics:
        return {"has_dashboard": False, "upload_id": str(latest.id), "metrics": None}
    return {
        "has_dashboard": True,
        "upload_id": str(latest.id),
        "metrics": metrics.metrics_json if metrics else None,
        "generated_at": metrics.updated_at.isoformat() if metrics and metrics.updated_at else None,
    }
