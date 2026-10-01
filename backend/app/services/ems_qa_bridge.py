"""Server-side identity bridge: portal -> EMS QA.

Lets QA screens rendered INSIDE the client portal call the EMS QA backend
same-origin (/api/qa/*) without the browser ever holding an EMS QA cookie or any
secret. For an EMS-QA-entitled portal member we mint a single-use Ed25519 SSO
ticket (routers/sso.mint_sso_token), exchange it SERVER-SIDE at EMS QA's
/api/auth/sso for a first-party session, and reuse that session for proxied API
calls. EMS QA independently verifies the ticket and enforces agency membership +
role (its own session + Postgres RLS) — the portal adds NO new auth path there.

Phase 1 note: the EMS QA session is cached in-process (Railway runs a single
persistent instance). For multi-instance scaling, move this cache to a shared
store (the portal Postgres or Redis), keyed + encrypted per user.
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from typing import Optional

import httpx

from ..config import get_settings
from ..models.user import Profile, User
from ..routers.sso import mint_sso_token

logger = logging.getLogger(__name__)

# Conservative reuse window. EMS QA sessions are 12h absolute / 30m idle; we
# refresh well before that and also re-exchange on any 401 from EMS QA.
_SESSION_REUSE_SECONDS = 20 * 60
_AGENCY_RE = re.compile(r"/ems-qa/([0-9a-fA-F-]{36})")


class BridgeError(Exception):
    """QA bridge could not establish an EMS QA session for the member."""


@dataclass
class EmsQaSession:
    session_token: str
    agency_id: str
    obtained_at: float


_CACHE: dict[str, EmsQaSession] = {}


def _entitled(profile: Optional[Profile]) -> bool:
    return bool(profile and profile.ems_qa_enabled and profile.ems_agency_slug)


async def _exchange(profile: Profile, fallback_email: str) -> EmsQaSession:
    """Mint an SSO ticket and exchange it server-side for an EMS QA session."""
    settings = get_settings()
    if not settings.sso_private_key or not settings.ems_qa_api_base:
        raise BridgeError("QA bridge is not configured")
    token = mint_sso_token(profile, fallback_email, settings)
    url = settings.ems_qa_api_base.rstrip("/") + "/api/auth/sso"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
            resp = await client.post(url, data={"token": token})
    except httpx.HTTPError as exc:  # noqa: BLE001
        raise BridgeError(f"EMS QA unreachable: {exc}") from exc
    # /api/auth/sso returns a 303 redirect to .../ems-qa/{agency_id}/dashboard,
    # setting the first-party `session` cookie. We read both, server-side only.
    if resp.status_code not in (302, 303):
        raise BridgeError(f"SSO exchange failed ({resp.status_code})")
    sid = resp.cookies.get("session")
    if not sid:
        raise BridgeError("EMS QA did not return a session")
    m = _AGENCY_RE.search(resp.headers.get("location", ""))
    return EmsQaSession(session_token=sid, agency_id=(m.group(1) if m else ""),
                        obtained_at=time.time())


async def get_ems_qa_session(user: User, profile: Profile, *, force: bool = False) -> EmsQaSession:
    """Return a usable EMS QA session (cached) for an entitled portal member."""
    if not _entitled(profile):
        raise BridgeError("EMS QA is not enabled for this account")
    key = str(user.id)
    hit = _CACHE.get(key)
    if hit and not force and (time.time() - hit.obtained_at) < _SESSION_REUSE_SECONDS:
        return hit
    fresh = await _exchange(profile, user.email)
    _CACHE[key] = fresh
    return fresh


def invalidate(user_id) -> None:
    _CACHE.pop(str(user_id), None)
