"""SUPER_ADMIN authorization — explicit backend platform-admin path (dual auth mode).

- is_super_admin: the authoritative check (users.platform_role == 'super_admin').
- resolve_user: resolve the authenticated user in whichever auth mode (no authz).
- platform_audit: record a platform-admin action with the REAL actor (View-As never
  obscures it).

Scope rules (enforced by the router dependencies that call these):
- Platform scope (cross-agency) requires SUPER_ADMIN AND an explicit request; it sets
  set_platform_context(). A missing agency_id NEVER implies platform scope.
- Agency scope / View-As requires SUPER_ADMIN and a chosen agency_id; it sets
  set_agency_context(agency_id) — the super admin sees that one tenant, audited as View-As.
"""
from __future__ import annotations

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session as DBSession

from ...config import get_settings
from ...models.platform_audit import PlatformAuditEvent


def is_super_admin(user) -> bool:
    return getattr(user, "platform_role", None) == "super_admin"


async def resolve_user(request: Request, db: DBSession):
    """Resolve the authenticated user in the active auth mode (NO authorization yet)."""
    if get_settings().auth_mode == "cognito":
        from ...auth.deps import get_auth
        return get_auth(request, db).user
    from ...routers.auth import get_current_user
    return await get_current_user(request, db)


async def require_super_admin_user(request: Request, db: DBSession):
    """Return the authenticated user iff they are a SUPER_ADMIN, else 403."""
    user = await resolve_user(request, db)
    if not is_super_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform super-admin only")
    return user


def platform_audit(db: DBSession, actor_id, action: str, *, scope=None, selected_agency=None,
                   resource_agency=None, resource_type=None, resource_id=None, view_as=False,
                   view_as_role=None, before=None, after=None, reason=None, ip=None):
    db.add(PlatformAuditEvent(
        actor_user_id=actor_id, actor_platform_role="super_admin", action=action, scope=scope,
        selected_agency_id=selected_agency, resource_agency_id=resource_agency,
        resource_type=resource_type, resource_id=(str(resource_id) if resource_id else None),
        view_as=view_as, view_as_role=view_as_role, environment=get_settings().environment,
        before=before, after=after, reason=reason, ip_address=ip))
