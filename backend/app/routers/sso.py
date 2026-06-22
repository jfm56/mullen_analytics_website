"""Portal -> EMS QA single sign-on handoff.

A logged-in portal member who has the EMS QA add-on gets a short-lived, single-use
Ed25519-signed token. The browser POSTs it to the EMS QA app's /api/auth/sso, which
verifies it with the matching public key, provisions/links the user, and starts
their session there — no second login. The portal holds ONLY the private key.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models.user import Profile, User
from .auth import get_current_user

router = APIRouter(prefix="/sso", tags=["sso"])


class LaunchResponse(BaseModel):
    # The EMS QA SSO endpoint + the signed token the browser should POST to it.
    sso_url: str
    token: str


@router.post("/launch-ems-qa", response_model=LaunchResponse)
async def launch_ems_qa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LaunchResponse:
    """Mint a one-time SSO token for the current member to enter the EMS QA app."""
    settings = get_settings()
    if not settings.sso_private_key:
        raise HTTPException(status_code=503, detail="SSO is not configured")

    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    if not profile or not profile.ems_qa_enabled or not profile.ems_agency_slug:
        raise HTTPException(status_code=403, detail="EMS QA is not enabled for this account")

    now = datetime.now(timezone.utc)
    claims = {
        "iss": settings.sso_issuer,
        "aud": settings.sso_audience,
        "sub": profile.email or current_user.email,
        "agency": profile.ems_agency_slug,
        "name": profile.full_name,
        "role": profile.ems_role or "qa_reviewer",
        "iat": now,
        "exp": now + timedelta(seconds=settings.sso_token_ttl_seconds),
        "jti": uuid4().hex,
    }
    token = jwt.encode(claims, settings.sso_private_key, algorithm="EdDSA")
    return LaunchResponse(sso_url=settings.ems_qa_sso_url, token=token)
