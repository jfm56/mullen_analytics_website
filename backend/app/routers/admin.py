"""
Admin-only API endpoints.

All routes require the authenticated user to have role='admin'.

GET /api/admin/agencies          — all agencies with run counts
GET /api/admin/pipeline/runs     — all recent pipeline runs
GET /api/admin/audit-logs        — recent audit log entries
GET /api/admin/stats             — platform-wide summary stats
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.agency import Agency, AgencyFile, AuditLog, PipelineRun
from ..models.user import User
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
