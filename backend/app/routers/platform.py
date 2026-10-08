"""Unified-platform v1 API (Cognito-authed, API-first).

Every agency-scoped route enforces agency separation (require_membership) plus,
where relevant, the review / receive-reviews / both capability model
(require_capability) and per-organization module entitlements (require_module).
This is the backend a future mobile app will reuse unchanged.
"""
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from ..auth import (
    AuthContext,
    get_auth,
    require_capability,
    require_membership,
    require_module,
)
from ..database import get_db
from ..models import Agency, AgencyMembership, ModuleEntitlement, Profile, User

router = APIRouter(prefix="/v1", tags=["platform"])


@router.get("/me")
def me(ctx: AuthContext = Depends(get_auth), db: DBSession = Depends(get_db)):
    """Identity + the agencies the caller may access, each with their capabilities
    and the org's enabled modules. Drives the module-gated nav + agency switcher."""
    memberships = (
        db.query(AgencyMembership).filter(AgencyMembership.user_id == ctx.user.id).all()
    )
    agencies = []
    for mem in memberships:
        agency = db.query(Agency).filter(Agency.id == mem.agency_id).first()
        if agency is None:
            continue
        modules = []
        if agency.org_id:
            modules = [
                e.module
                for e in db.query(ModuleEntitlement)
                .filter(
                    ModuleEntitlement.org_id == agency.org_id,
                    ModuleEntitlement.enabled.is_(True),
                )
                .all()
            ]
        agencies.append(
            {
                "agency_id": str(agency.id),
                "agency_name": agency.agency_name,
                "slug": agency.slug,
                "capabilities": {
                    "can_review": mem.can_review,
                    "can_receive_reviews": mem.can_receive_reviews,
                    "is_agency_admin": mem.is_agency_admin,
                },
                "modules": modules,
            }
        )
    return {
        "user": {"id": str(ctx.user.id), "email": ctx.user.email},
        "is_platform_admin": ctx.is_platform_admin,
        "agencies": agencies,
    }


@router.get("/agencies/{agency_id}/overview")
def agency_overview(
    agency_id: UUID,
    membership: AgencyMembership = Depends(require_membership),
    db: DBSession = Depends(get_db),
):
    """Agency landing — requires membership (enforces agency separation)."""
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    return {
        "agency_id": str(agency_id),
        "agency_name": agency.agency_name if agency else None,
        "your_capabilities": {
            "can_review": membership.can_review,
            "can_receive_reviews": membership.can_receive_reviews,
            "is_agency_admin": membership.is_agency_admin,
        },
    }


@router.post("/agencies/{agency_id}/qa/charts/{chart_id}/review")
def review_chart(
    agency_id: UUID,
    chart_id: str,
    membership: AgencyMembership = Depends(require_capability("can_review")),
    _module=Depends(require_module("qa")),
):
    """Record a QA review decision — requires the 'review charts' capability and
    the QA module."""
    return {
        "ok": True,
        "action": "review_recorded",
        "agency_id": str(agency_id),
        "chart_id": chart_id,
    }


@router.get("/agencies/{agency_id}/my-reviews")
def my_reviews(
    agency_id: UUID,
    membership: AgencyMembership = Depends(
        require_capability("can_receive_reviews", "can_review")
    ),
):
    """Feedback on the caller's OWN charts — the crew/provider 'receive reviews'
    surface."""
    return {
        "ok": True,
        "agency_id": str(agency_id),
        "provider_id": membership.provider_id,
    }


@router.get("/agencies/{agency_id}/staff")
def list_staff(
    agency_id: UUID,
    membership: AgencyMembership = Depends(require_capability("is_agency_admin")),
    db: DBSession = Depends(get_db),
):
    """Staff management — list agency members (agency_admin only)."""
    rows = (
        db.query(AgencyMembership)
        .filter(AgencyMembership.agency_id == agency_id)
        .all()
    )
    staff = []
    for r in rows:
        u = db.query(User).filter(User.id == r.user_id).first()
        staff.append(
            {
                "email": u.email if u else None,
                "can_review": r.can_review,
                "can_receive_reviews": r.can_receive_reviews,
                "is_agency_admin": r.is_agency_admin,
                "provider_id": r.provider_id,
            }
        )
    return {"agency_id": str(agency_id), "staff": staff}


@router.post("/agencies/{agency_id}/staff")
def add_staff(
    agency_id: UUID,
    body: dict,
    membership: AgencyMembership = Depends(require_capability("is_agency_admin")),
    db: DBSession = Depends(get_db),
):
    """Invite/add a staff member and assign capabilities (agency_admin only)."""
    email = (body.get("email") or "").lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(email=email, password_hash="", email_confirmed=True)
        db.add(user)
        db.flush()
        db.add(Profile(id=user.id, email=email))
    existing = (
        db.query(AgencyMembership)
        .filter(
            AgencyMembership.agency_id == agency_id,
            AgencyMembership.user_id == user.id,
        )
        .first()
    )
    if existing is None:
        existing = AgencyMembership(agency_id=agency_id, user_id=user.id)
        db.add(existing)
    existing.can_review = bool(body.get("can_review"))
    existing.can_receive_reviews = bool(body.get("can_receive_reviews"))
    existing.is_agency_admin = bool(body.get("is_agency_admin"))
    existing.provider_id = body.get("provider_id")
    db.commit()
    return {
        "ok": True,
        "added": email,
        "capabilities": {
            "can_review": existing.can_review,
            "can_receive_reviews": existing.can_receive_reviews,
            "is_agency_admin": existing.is_agency_admin,
        },
    }
