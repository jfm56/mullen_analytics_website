"""Platform SUPER_ADMIN API (Mullen Analytics operator).

Every endpoint requires SUPER_ADMIN (users.platform_role). Platform-scope (cross-
agency) endpoints set the authenticated platform RLS clause (set_platform_context);
agency View-As uses set_agency_context for the chosen tenant. Missing agency_id never
implies platform scope. All access is audited with the REAL actor.
"""
from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session as DBSession

from ..config import get_settings
from ..database import get_db
from ..security_rls import set_user_context, set_platform_context, set_agency_context
from ..services.platform_admin import authz, aggregates
from ..models.agency import Agency
from ..models.platform_audit import PlatformAuditEvent

router = APIRouter(prefix="/v1/platform", tags=["platform-admin"])


class PlatformCtx:
    def __init__(self, db, user):
        self.db = db
        self.user = user
        self.ip = None


async def platform_ctx(request: Request, db: DBSession = Depends(get_db)) -> PlatformCtx:
    """SUPER_ADMIN + platform scope. Sets user + platform RLS context; audits access."""
    user = await authz.require_super_admin_user(request, db)
    set_user_context(db, user.id)
    set_platform_context(db)          # authenticated cross-agency clause — NOT an RLS bypass
    ctx = PlatformCtx(db, user)
    ctx.ip = request.client.host if request.client else None
    return ctx


@router.get("/me")
async def platform_me(request: Request, db: DBSession = Depends(get_db)):
    """Lightweight check used by the UI to decide whether to show the platform area."""
    try:
        user = await authz.resolve_user(request, db)
    except HTTPException:
        return {"super_admin": False}
    return {"super_admin": authz.is_super_admin(user),
            "email": user.email if authz.is_super_admin(user) else None,
            "environment": get_settings().environment}


@router.get("/overview")
def overview(ctx: PlatformCtx = Depends(platform_ctx)):
    data = aggregates.platform_overview(ctx.db)
    authz.platform_audit(ctx.db, ctx.user.id, "platform_overview_viewed", scope="platform", ip=ctx.ip)
    ctx.db.commit()
    return data


@router.get("/agencies")
def agencies(ctx: PlatformCtx = Depends(platform_ctx)):
    rows = []
    for a in ctx.db.query(Agency).order_by(Agency.agency_name).all():
        rows.append({"id": str(a.id), "name": a.agency_name, "slug": a.slug,
                     "classification": a.data_classification,
                     "org_id": str(a.org_id) if a.org_id else None})
    authz.platform_audit(ctx.db, ctx.user.id, "platform_agencies_listed", scope="platform", ip=ctx.ip)
    ctx.db.commit()
    return {"agencies": rows}


@router.get("/qa/monitor")
def qa_monitor(ctx: PlatformCtx = Depends(platform_ctx),
               agency_id: UUID | None = Query(None), classification: str | None = Query(None),
               status_filter: str | None = Query(None, alias="status")):
    data = aggregates.qa_monitor(ctx.db, agency_id=agency_id, classification=classification, status=status_filter)
    authz.platform_audit(ctx.db, ctx.user.id, "platform_qa_monitor_viewed", scope="platform",
                         selected_agency=agency_id, ip=ctx.ip)
    ctx.db.commit()
    return data


@router.get("/qa/validation")
def qa_validation(ctx: PlatformCtx = Depends(platform_ctx),
                  agency_id: UUID | None = Query(None), classification: str | None = Query(None)):
    data = aggregates.qa_validation(ctx.db, agency_id=agency_id, classification=classification)
    authz.platform_audit(ctx.db, ctx.user.id, "platform_qa_validation_viewed", scope="platform",
                         selected_agency=agency_id, ip=ctx.ip)
    ctx.db.commit()
    return data


@router.get("/features")
def features(ctx: PlatformCtx = Depends(platform_ctx)):
    s = get_settings()
    return {"features": [
        {"key": "EMSCS_QA_V1_ENABLED", "status": "enabled" if s.emscs_qa_v1_enabled else "disabled",
         "note": "synthetic/no-PHI dev-test only"},
        {"key": "Forecaster v2", "status": "unwired", "note": "built, not wired to any route"},
        {"key": "Geographic v2", "status": "unimplemented", "note": "design only"},
        {"key": "EMSCharts / ZOLL", "status": "disconnected", "note": "no live connection"},
    ], "note": "Status only — modules are never auto-enabled here."}


@router.get("/health")
def health(ctx: PlatformCtx = Depends(platform_ctx)):
    s = get_settings()
    db_ok = True
    try:
        from sqlalchemy import text
        ctx.db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_ok = False
    return {"application": "ok", "database": "ok" if db_ok else "error",
            "environment": s.environment, "auth_mode": s.auth_mode,
            "emscs_qa_v1_enabled": s.emscs_qa_v1_enabled,
            "backup_verification": "see Gate B restore drill (staging RDS)",
            "note": "No secrets or credentials are exposed here."}


@router.get("/audit")
def audit(ctx: PlatformCtx = Depends(platform_ctx), limit: int = Query(200, le=1000)):
    rows = (ctx.db.query(PlatformAuditEvent).order_by(PlatformAuditEvent.at.desc()).limit(limit).all())
    return {"events": [{
        "actor": str(e.actor_user_id), "platform_role": e.actor_platform_role, "action": e.action,
        "scope": e.scope, "selected_agency": str(e.selected_agency_id) if e.selected_agency_id else None,
        "resource_agency": str(e.resource_agency_id) if e.resource_agency_id else None,
        "view_as": e.view_as, "view_as_role": e.view_as_role, "environment": e.environment,
        "reason": e.reason, "at": e.at.isoformat() if e.at else None} for e in rows]}


@router.post("/view-as")
async def view_as(request: Request, db: DBSession = Depends(get_db)):
    """Record a SUPER_ADMIN View-As selection (context switch, NOT impersonation).
    The actual tenant data is then read through the normal agency-scoped endpoints,
    which authorize the super admin per request. Audited with the real actor."""
    user = await authz.require_super_admin_user(request, db)
    body = await request.json()
    agency_id = body.get("agency_id")
    if not agency_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "agency_id is required for View-As")
    set_user_context(db, user.id)
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if agency is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "agency not found")
    authz.platform_audit(db, user.id, "view_as_start", scope="tenant", selected_agency=agency_id,
                         resource_agency=agency_id, view_as=True, view_as_role="agency_admin",
                         ip=request.client.host if request.client else None)
    db.commit()
    return {"agency_id": str(agency.id), "agency_name": agency.agency_name,
            "classification": agency.data_classification,
            "banner": f"MULLEN PLATFORM ADMIN — VIEW-AS — {agency.agency_name} / Agency Admin"}
