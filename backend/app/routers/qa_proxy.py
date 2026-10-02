"""Same-origin proxy: portal /api/qa/* -> EMS QA backend /api/*.

The browser only ever talks to the portal (same origin). This router:
  1. requires a valid PORTAL session (the one login),
  2. confirms the member is EMS-QA-entitled,
  3. obtains an EMS QA session SERVER-SIDE via the identity bridge,
  4. forwards ONLY allow-listed QA-screen paths.
EMS QA then independently enforces agency membership + role (its own session +
Postgres RLS), so cross-agency / privilege escalation is denied at the authority.
The EMS QA session and any secrets never reach the browser.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
import httpx
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models.user import Profile, User
from ..services import ems_qa_bridge
from ..services.auth import get_session_row
from .auth import get_current_user, get_session_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/qa", tags=["qa-proxy"])

_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
# Hop-by-hop headers + the EMS QA session cookie must NOT be relayed to the browser.
_STRIP = {"set-cookie", "transfer-encoding", "connection", "keep-alive",
          "content-encoding", "content-length"}
# Least privilege: only the QA screens' own API surface is reachable through the
# portal. Every agency-scoped route (/api/agencies/{id}/...) backs a QA screen and
# is independently guarded by EMS QA's role checks + Postgres RLS. The platform
# operator surface (admin console, billing) and raw auth (login/logout/sso) are
# blocked — identity is established server-side by the bridge, never via the proxy.
_ALLOWED_EXACT = {"auth/me", "auth/me/agencies"}
_ALLOWED_PREFIXES = ("agencies/",)


def _allowed(path: str) -> bool:
    p = path.lstrip("/")
    return p in _ALLOWED_EXACT or p.startswith(_ALLOWED_PREFIXES)


@router.api_route("/{path:path}", methods=_METHODS)
async def qa_proxy(
    path: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    settings = get_settings()
    if not settings.ems_qa_api_base:
        raise HTTPException(status_code=503, detail="QA integration is not configured")
    if not _allowed(path):
        raise HTTPException(status_code=403, detail="Not permitted through the QA portal")

    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    if not profile or not profile.ems_qa_enabled or not profile.ems_agency_slug:
        raise HTTPException(status_code=403, detail="EMS QA is not enabled for this account")

    # MFA is mandatory for QA (preserves the EMS QA guarantee). The member must
    # have TOTP enrolled AND this session must have passed the challenge. The
    # portal UI gates on /auth/session first, so this is defense-in-depth; the
    # detail codes let the client route to enrollment vs. verification.
    if not current_user.totp_enabled:
        raise HTTPException(status_code=403, detail="mfa_enrollment_required")
    token = get_session_token(request)
    session_row = get_session_row(db, token) if token else None
    if not session_row or not session_row.mfa_passed:
        raise HTTPException(status_code=403, detail="mfa_verification_required")

    body = await request.body()
    target = settings.ems_qa_api_base.rstrip("/") + "/api/" + path.lstrip("/")

    async def _send(sess: ems_qa_bridge.EmsQaSession) -> httpx.Response:
        headers = {"cookie": f"session={sess.session_token}"}
        for h in ("content-type", "accept"):
            v = request.headers.get(h)
            if v:
                headers[h] = v
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
            return await client.request(
                request.method, target, params=request.query_params,
                content=body, headers=headers,
            )

    try:
        sess = await ems_qa_bridge.get_ems_qa_session(current_user, profile)
        upstream = await _send(sess)
        if upstream.status_code == 401:  # EMS QA session expired -> re-exchange once
            ems_qa_bridge.invalidate(current_user.id)
            sess = await ems_qa_bridge.get_ems_qa_session(current_user, profile, force=True)
            upstream = await _send(sess)
    except ems_qa_bridge.BridgeError as exc:
        logger.warning("qa proxy bridge error for user %s: %s", current_user.id, exc)
        raise HTTPException(status_code=502, detail="Could not reach the QA service") from exc

    out_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in _STRIP}
    return Response(content=upstream.content, status_code=upstream.status_code,
                    headers=out_headers, media_type=upstream.headers.get("content-type"))
