"""FastAPI auth/authz dependencies for the unified platform.

- `get_current_user` validates the Bearer Cognito ID token and resolves the
  app-side User. Option-B linking: an existing portal account is matched by email
  and stamped with `cognito_sub` on first Cognito login; a brand-new Cognito user
  (e.g. invited staff) is created.
- `require_membership` enforces agency separation (caller must belong to the
  agency in the path); platform admins get synthetic full access.
- `require_capability(...)` enforces the review / receive-reviews / both model.
- `require_module(...)` enforces per-organization module entitlements.
"""
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DBSession

from ..database import get_db
from ..models import Agency, AgencyMembership, ModuleEntitlement, Profile, User
from ..security_rls import set_agency_context, set_user_context
from .cognito import verify_cognito_token


class AuthContext:
    """Resolved identity for a request: the app User plus raw Cognito claims."""

    def __init__(self, user: User, claims: dict):
        self.user = user
        self.claims = claims
        self.groups = claims.get("cognito:groups", []) or []

    @property
    def is_platform_admin(self) -> bool:
        return "platform_admin" in self.groups


def _bearer(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return header[7:].strip()


def _resolve_user(db: DBSession, claims: dict) -> User:
    sub = claims.get("sub")
    email = (claims.get("email") or "").lower().strip()

    user = db.query(User).filter(User.cognito_sub == sub).first()
    if user is None and email:
        existing = db.query(User).filter(User.email == email).first()
        if existing is not None:
            # Option B: link an existing portal account on first Cognito login.
            existing.cognito_sub = sub
            user = existing
            db.commit()
        else:
            # New Cognito-provisioned account (e.g. invited staff member).
            user = User(email=email, cognito_sub=sub, email_confirmed=True, password_hash="")
            db.add(user)
            db.flush()
            db.add(Profile(id=user.id, email=email))
            db.commit()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has no resolvable user")
    return user


def get_auth(request: Request, db: DBSession = Depends(get_db)) -> AuthContext:
    claims = verify_cognito_token(_bearer(request))
    user = _resolve_user(db, claims)
    # Establish the RLS identity for this request's transaction: the user can see
    # their OWN memberships + the agencies they belong to. Agency-scoped data stays
    # deny-by-default until an agency context is set after a membership check.
    set_user_context(db, user.id)
    return AuthContext(user, claims)


def get_current_user(ctx: AuthContext = Depends(get_auth)) -> User:
    return ctx.user


def require_platform_admin(ctx: AuthContext = Depends(get_auth)) -> AuthContext:
    if not ctx.is_platform_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform admin only")
    return ctx


def require_membership(
    agency_id: UUID,
    ctx: AuthContext = Depends(get_auth),
    db: DBSession = Depends(get_db),
) -> AgencyMembership:
    """The caller's membership in `agency_id` — enforces agency separation.
    Platform admins get a synthetic full-capability membership (not persisted)."""
    if ctx.is_platform_admin:
        # Explicit privileged path: a platform admin is authorized, so the agency
        # context is set DELIBERATELY here (the non-superuser app_user role cannot
        # bypass RLS — access is granted by this explicit check, not by a bypass).
        set_agency_context(db, agency_id)
        return AgencyMembership(
            agency_id=agency_id,
            user_id=ctx.user.id,
            role="platform_admin",
            can_review=True,
            can_receive_reviews=True,
            is_agency_admin=True,
        )
    membership = (
        db.query(AgencyMembership)
        .filter(
            AgencyMembership.agency_id == agency_id,
            AgencyMembership.user_id == ctx.user.id,
        )
        .first()
    )
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this agency")
    # Membership verified -> scope this transaction's RLS to exactly this agency.
    # The agency_id came from the path but is only honored after this check, so a
    # browser-supplied agency the user doesn't belong to never establishes context.
    set_agency_context(db, agency_id)
    # Server-side trial expiration: an expired/suspended org blocks agency access
    # (platform admins are exempt — handled by the early return above).
    from ..services.emscharts.lifecycle import assert_org_active
    assert_org_active(db, agency_id)
    return membership


def require_capability(*capabilities: str):
    """Dependency factory: require at least one of the capability flags
    (`can_review`, `can_receive_reviews`, `is_agency_admin`) on the membership."""

    def _dep(membership: AgencyMembership = Depends(require_membership)) -> AgencyMembership:
        if not any(getattr(membership, cap, False) for cap in capabilities):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires capability: {' or '.join(capabilities)}",
            )
        return membership

    return _dep


def require_module(module: str):
    """Dependency factory: require the agency's organization to be entitled to
    `module` (analytics | predictive | geographic | qa | ecg)."""

    def _dep(
        agency_id: UUID,
        ctx: AuthContext = Depends(get_auth),
        db: DBSession = Depends(get_db),
    ) -> None:
        if ctx.is_platform_admin:
            return
        agency = db.query(Agency).filter(Agency.id == agency_id).first()
        if agency is None or agency.org_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Agency is not provisioned")
        entitled = (
            db.query(ModuleEntitlement)
            .filter(
                ModuleEntitlement.org_id == agency.org_id,
                ModuleEntitlement.module == module,
                ModuleEntitlement.enabled.is_(True),
            )
            .first()
        )
        if entitled is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Module not enabled: {module}")

    return _dep
