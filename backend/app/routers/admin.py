"""
Admin-only API endpoints.

All routes require the authenticated user to have role='admin'.

GET /api/admin/agencies          — all agencies with run counts
GET /api/admin/pipeline/runs     — all recent pipeline runs
GET /api/admin/audit-logs        — recent audit log entries
GET /api/admin/stats             — platform-wide summary stats
GET /api/admin/dashboard/summary — full dashboard summary (KPIs + panels)
GET /api/admin/clients           — all client profiles with upload stats
GET /api/admin/clients/{id}      — single client detail
GET /api/admin/clients/{id}/uploads        — all uploads for a client
GET /api/admin/clients/{id}/latest-upload  — latest upload for a client
GET /api/admin/clients/{id}/dashboard-summary
"""
import os
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc, text
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.agency import Agency, AgencyFile, AuditLog, PipelineRun
from ..models.user import User, Profile, Session as UserSession
from ..models.data_upload import DataUpload, EMSDashboardMetrics
from ..models.message import Message
from ..models.task import EnhancedTask
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


@router.get("/dashboard/summary")
async def admin_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(db, current_user)

    def _safe_count(q):
        try:
            return q.scalar() or 0
        except Exception:
            return 0

    total_clients = _safe_count(db.query(func.count(Profile.id)).filter(Profile.role == "client"))
    active_clients = _safe_count(
        db.query(func.count(Profile.id)).filter(Profile.role == "client", Profile.client_status == "active")
    )
    total_uploads = _safe_count(db.query(func.count(DataUpload.id)))
    dashboards_ready = _safe_count(
        db.query(func.count(DataUpload.id)).filter(DataUpload.upload_status == "CLEANED")
    )
    failed_uploads = _safe_count(
        db.query(func.count(DataUpload.id)).filter(DataUpload.upload_status == "FAILED")
    )
    data_quality_warnings = _safe_count(
        db.query(func.count(DataUpload.id)).filter(DataUpload.upload_status == "NEEDS_MAPPING")
    )

    try:
        unread_messages = _safe_count(db.query(func.count(Message.id)).filter(Message.read_at.is_(None)))
    except Exception:
        unread_messages = 0

    try:
        open_tasks = _safe_count(
            db.query(func.count(EnhancedTask.id)).filter(EnhancedTask.status.in_(["todo", "in_progress"]))
        )
    except Exception:
        open_tasks = 0

    # Recent uploads (last 5)
    recent_uploads = []
    try:
        rows = (
            db.query(DataUpload, Profile)
            .outerjoin(Profile, DataUpload.client_id == Profile.id)
            .order_by(desc(DataUpload.created_at))
            .limit(5)
            .all()
        )
        recent_uploads = [
            {
                "id": str(u.id),
                "original_filename": u.original_filename,
                "upload_status": u.upload_status,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "client_name": (p.full_name or p.email) if p else "—",
                "client_id": str(u.client_id),
            }
            for u, p in rows
        ]
    except Exception:
        pass

    # Clients needing attention
    clients_needing_attention = []
    try:
        clients = db.query(Profile).filter(Profile.role == "client").order_by(Profile.created_at.desc()).limit(50).all()
        cids = [c.id for c in clients]
        stats = _upload_stats(db, cids)
        for c in clients:
            s = stats.get(str(c.id), {})
            issues = []
            if s.get("has_failed"):
                issues.append("Failed upload")
            if not s.get("upload_count"):
                issues.append("No uploads yet")
            elif not s.get("has_dashboard"):
                issues.append("Dashboard not ready")
            if issues:
                clients_needing_attention.append({
                    "id": str(c.id),
                    "full_name": c.full_name,
                    "email": c.email,
                    "company": c.company,
                    "issue": ", ".join(issues),
                    "last_upload": s.get("last_upload"),
                })
    except Exception:
        pass

    # Recent messages (last 5)
    recent_messages = []
    try:
        msg_rows = (
            db.query(Message, Profile)
            .outerjoin(Profile, Message.user_id == Profile.id)
            .order_by(desc(Message.created_at))
            .limit(5)
            .all()
        )
        recent_messages = [
            {
                "id": str(m.id),
                "subject": m.subject,
                "preview": (m.body or "")[:100],
                "read_at": m.read_at.isoformat() if m.read_at else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "client_name": (p.full_name or p.email) if p else "—",
            }
            for m, p in msg_rows
        ]
    except Exception:
        pass

    # Tasks due soon (next 7 days)
    tasks_due_soon = []
    try:
        now = datetime.utcnow()
        week_out = now + timedelta(days=7)
        task_rows = (
            db.query(EnhancedTask, Profile)
            .outerjoin(Profile, EnhancedTask.client_id == Profile.id)
            .filter(
                EnhancedTask.status.in_(["todo", "in_progress"]),
                EnhancedTask.due_date.isnot(None),
                EnhancedTask.due_date <= week_out,
            )
            .order_by(EnhancedTask.due_date.asc())
            .limit(5)
            .all()
        )
        tasks_due_soon = [
            {
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "client_name": (p.full_name or p.email) if p else "—",
            }
            for t, p in task_rows
        ]
    except Exception:
        pass

    # System health
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    env = os.environ.get("APP_ENV", os.environ.get("ENVIRONMENT", "local")).lower()

    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "total_uploads": total_uploads,
        "dashboards_ready": dashboards_ready,
        "failed_uploads": failed_uploads,
        "unread_messages": unread_messages,
        "open_tasks": open_tasks,
        "data_quality_warnings": data_quality_warnings,
        "recent_uploads": recent_uploads,
        "clients_needing_attention": clients_needing_attention,
        "recent_messages": recent_messages,
        "tasks_due_soon": tasks_due_soon,
        "system_health": {
            "backend": "ok",
            "database": db_status,
            "storage": "ok",
            "email": "unknown",
            "analytics_pipeline": "unknown",
            "environment": env,
        },
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


@router.get("/monitoring")
async def admin_monitoring(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unified monitoring — user roster/activity, recent audit log, and auth/security events."""
    _require_admin(db, current_user)
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    def _safe(q, default=0):
        try:
            return q.scalar() or 0
        except Exception:
            return default

    kpis = {
        "total_users": _safe(db.query(func.count(Profile.id))),
        "admins": _safe(db.query(func.count(Profile.id)).filter(Profile.role == "admin")),
        "clients": _safe(db.query(func.count(Profile.id)).filter(Profile.role == "client")),
        "active_24h": _safe(db.query(func.count(Profile.id)).filter(Profile.last_login >= day_ago)),
        "active_7d": _safe(db.query(func.count(Profile.id)).filter(Profile.last_login >= week_ago)),
        "active_sessions": _safe(db.query(func.count(UserSession.id)).filter(UserSession.expires_at > now)),
        "logins_24h": _safe(db.query(func.count(UserSession.id)).filter(UserSession.created_at >= day_ago)),
        "failed_24h": _safe(
            db.query(func.count(AuditLog.id)).filter(AuditLog.action == "login_failed", AuditLog.created_at >= day_ago)
        ),
    }

    try:
        sess_by_user = {
            str(r.user_id): int(r.n)
            for r in db.query(UserSession.user_id, func.count(UserSession.id).label("n"))
            .filter(UserSession.expires_at > now)
            .group_by(UserSession.user_id)
            .all()
        }
    except Exception:
        sess_by_user = {}

    users = []
    try:
        for prof, usr in db.query(Profile, User).outerjoin(User, Profile.id == User.id).all():
            uid = str(prof.id)
            last_login = prof.last_login or (usr.last_sign_in_at if usr else None)
            users.append({
                "id": uid,
                "email": prof.email,
                "full_name": prof.full_name,
                "company": prof.company,
                "role": prof.role,
                "client_status": prof.client_status,
                "plan": getattr(prof, "plan", None),
                "plan_status": getattr(prof, "plan_status", None),
                "last_login": last_login.isoformat() if last_login else None,
                "active_sessions": sess_by_user.get(uid, 0),
            })
        users.sort(key=lambda u: (u["last_login"] or ""), reverse=True)
    except Exception:
        users = []

    name_by_id = {u["id"]: (u["full_name"] or u["email"]) for u in users}

    recent_activity = []
    try:
        for a in db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(40).all():
            recent_activity.append({
                "id": str(a.id),
                "action": a.action,
                "user": name_by_id.get(str(a.user_id)) if a.user_id else None,
                "resource_type": a.resource_type,
                "resource_id": a.resource_id,
                "details": a.details,
                "ip_address": a.ip_address,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })
    except Exception:
        recent_activity = []

    security_events = []
    try:
        sec = ("login", "login_failed", "logout", "password_reset", "role_changed", "account_created")
        for a in (
            db.query(AuditLog).filter(AuditLog.action.in_(sec))
            .order_by(AuditLog.created_at.desc()).limit(40).all()
        ):
            security_events.append({
                "type": a.action,
                "user": name_by_id.get(str(a.user_id)) if a.user_id else (a.details or {}).get("email"),
                "ip_address": a.ip_address,
                "details": a.details,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })
    except Exception:
        pass
    try:
        from ..models.impersonation import ImpersonationLog
        for im in db.query(ImpersonationLog).order_by(ImpersonationLog.created_at.desc()).limit(20).all():
            security_events.append({
                "type": f"impersonation_{im.action}",
                "user": name_by_id.get(str(im.admin_id)),
                "target": name_by_id.get(str(im.client_id)),
                "ip_address": im.ip_address,
                "details": {"page_path": im.page_path},
                "created_at": im.created_at.isoformat() if im.created_at else None,
            })
    except Exception:
        pass
    security_events.sort(key=lambda e: (e.get("created_at") or ""), reverse=True)
    security_events = security_events[:40]

    alerts = []
    if kpis["failed_24h"] >= 5:
        alerts.append({
            "level": "warning",
            "title": "Failed logins",
            "message": f"{kpis['failed_24h']} failed login attempts in the last 24h.",
        })

    return {
        "generated_at": now.isoformat(),
        "kpis": kpis,
        "alerts": alerts,
        "users": users,
        "recent_activity": recent_activity,
        "security_events": security_events,
    }


# ============================================================================
# Admin — Errors / issues + per-user login history (IT support visibility)
# ============================================================================

@router.get("/errors")
async def admin_errors(
    source: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Application errors (server 500s + client JS) plus user-reported issues, newest first."""
    _require_admin(db, current_user)
    from ..models.error_log import ErrorLog

    name_by_id = {}
    try:
        for prof in db.query(Profile).all():
            name_by_id[str(prof.id)] = prof.full_name or prof.email
    except Exception:
        pass

    q = db.query(ErrorLog)
    if source:
        q = q.filter(ErrorLog.source == source)
    if resolved is not None:
        q = q.filter(ErrorLog.resolved == resolved)
    errors = []
    for e in q.order_by(ErrorLog.created_at.desc()).limit(min(limit, 500)).all():
        errors.append({
            "id": str(e.id),
            "source": e.source,
            "level": e.level,
            "error_type": e.error_type,
            "message": e.message,
            "path": e.path,
            "method": e.method,
            "status_code": e.status_code,
            "user": name_by_id.get(str(e.user_id)) if e.user_id else None,
            "user_id": str(e.user_id) if e.user_id else None,
            "ip_address": e.ip_address,
            "resolved": bool(e.resolved),
            "has_stacktrace": bool(e.stacktrace),
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })

    # User-reported issues (Feedback type='issue') surfaced alongside.
    issues = []
    try:
        from ..models.feedback import Feedback
        for f in (
            db.query(Feedback).filter(Feedback.type == "issue")
            .order_by(Feedback.created_at.desc()).limit(50).all()
        ):
            issues.append({
                "id": str(f.id),
                "title": f.title,
                "body": f.body,
                "status": f.status,
                "user": name_by_id.get(str(f.user_id)) if f.user_id else None,
                "admin_response": f.admin_response,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            })
    except Exception:
        pass

    day_ago = datetime.utcnow() - timedelta(days=1)
    counts = {
        "open_errors": _q_count(db, ErrorLog, ErrorLog.resolved.is_(False)),
        "errors_24h": _q_count(db, ErrorLog, ErrorLog.created_at >= day_ago),
        "open_issues": len([i for i in issues if i["status"] in ("open", "in_review")]),
    }
    return {"errors": errors, "issues": issues, "counts": counts}


def _q_count(db, model, *filters) -> int:
    try:
        return db.query(func.count(model.id)).filter(*filters).scalar() or 0
    except Exception:
        return 0


@router.get("/errors/{error_id}")
async def admin_error_detail(
    error_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full error detail including stacktrace."""
    _require_admin(db, current_user)
    from ..models.error_log import ErrorLog
    e = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Error not found")
    prof = db.query(Profile).filter(Profile.id == e.user_id).first() if e.user_id else None
    return {
        "id": str(e.id), "source": e.source, "level": e.level, "error_type": e.error_type,
        "message": e.message, "path": e.path, "method": e.method, "status_code": e.status_code,
        "stacktrace": e.stacktrace, "user_agent": e.user_agent, "ip_address": e.ip_address,
        "user": (prof.full_name or prof.email) if prof else None,
        "resolved": bool(e.resolved),
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.patch("/errors/{error_id}/resolve")
async def admin_resolve_error(
    error_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle an error's resolved/reviewed state."""
    _require_admin(db, current_user)
    from ..models.error_log import ErrorLog
    e = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Error not found")
    e.resolved = not bool(e.resolved)
    db.commit()
    return {"success": True, "resolved": bool(e.resolved)}


@router.get("/users/{user_id}/logins")
async def admin_user_logins(
    user_id: UUID,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Per-user login history — each session row is one login (when, IP, device)."""
    _require_admin(db, current_user)
    now = datetime.utcnow()
    prof = db.query(Profile).filter(Profile.id == user_id).first()
    rows = (
        db.query(UserSession).filter(UserSession.user_id == user_id)
        .order_by(UserSession.created_at.desc()).limit(min(limit, 200)).all()
    )
    logins = [{
        "id": str(s.id),
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "ip_address": s.ip_address,
        "user_agent": s.user_agent,
        "active": bool(s.expires_at and s.expires_at > now),
        "expires_at": s.expires_at.isoformat() if s.expires_at else None,
    } for s in rows]
    return {
        "user_id": str(user_id),
        "user": (prof.full_name or prof.email) if prof else None,
        "email": prof.email if prof else None,
        "total_logins": _q_count(db, UserSession, UserSession.user_id == user_id),
        "logins": logins,
    }


@router.patch("/users/{user_id}/plan")
async def admin_set_user_plan(
    user_id: UUID,
    plan: Optional[str] = None,
    plan_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set or activate a user's membership plan (admin). e.g. mark a pending paid
    signup 'active' once billing is arranged."""
    _require_admin(db, current_user)
    from ..services.plans import is_valid_plan
    prof = db.query(Profile).filter(Profile.id == user_id).first()
    if not prof:
        raise HTTPException(status_code=404, detail="User not found")
    if plan is not None:
        if not is_valid_plan(plan):
            raise HTTPException(status_code=400, detail="Invalid plan")
        prof.plan = plan
    if plan_status is not None:
        if plan_status not in ("trialing", "pending", "active", "canceled"):
            raise HTTPException(status_code=400, detail="Invalid plan_status")
        prof.plan_status = plan_status
        if plan_status == "active":
            prof.client_status = "active"
    db.commit()
    return {"success": True, "plan": prof.plan, "plan_status": prof.plan_status}


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
