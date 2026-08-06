"""
Verify a session cookie against the UPSTREAM (cloud) auth backend.

The on-prem instance serves the admin analytics / leads / outreach endpoints, but
the admin's login session is created and stored in the CLOUD (Railway) database —
it does not exist in the local on-prem DB. So when local session validation fails,
the on-prem box asks the cloud "is this cookie a valid admin?" by calling its
/api/auth/session (directly, or via the public site's /api/proxy/auth/session).

Active only when settings.upstream_auth_url is set (the on-prem box). On the cloud
backend and normal local dev it is unset, so this is never consulted and admin auth
stays purely local — no behavior change there.
"""
from __future__ import annotations

import time
from typing import Optional

import httpx

from ..config import get_settings

# cookie -> (expires_at, identity_or_empty). Small TTL cache so a polling dashboard
# does not round-trip to the cloud on every request. Misses cached as {} briefly.
_cache: "dict[str, tuple[float, dict]]" = {}
_TTL_SECONDS = 60


def verify_admin(cookie_header: str) -> Optional[dict]:
    """Return {'id','email','role':'admin'} when the cookie is a valid ADMIN session
    per the upstream backend, else None. Returns None (no-op) when not configured."""
    s = get_settings()
    base = (s.upstream_auth_url or "").rstrip("/")
    if not base or not cookie_header:
        return None

    now = time.time()
    cached = _cache.get(cookie_header)
    if cached and cached[0] > now:
        return cached[1] or None

    url = base + (s.upstream_auth_path or "/api/auth/session")
    try:
        r = httpx.get(url, headers={"Cookie": cookie_header, "Accept": "application/json"}, timeout=8)
        data = r.json() if r.status_code == 200 else {}
    except Exception:
        data = {}

    identity: Optional[dict] = None
    if data.get("authenticated"):
        profile = data.get("profile") or {}
        admin_user = data.get("admin_user")
        if profile.get("role") == "admin":
            u = data.get("user") or {}
            identity = {"id": u.get("id"), "email": u.get("email"), "role": "admin"}
        elif data.get("impersonating") and admin_user:
            # An admin currently impersonating a client still counts as admin here.
            identity = {"id": admin_user.get("id"), "email": admin_user.get("email"), "role": "admin"}

    if len(_cache) > 500:
        _cache.clear()
    _cache[cookie_header] = (now + _TTL_SECONDS, identity or {})
    return identity
