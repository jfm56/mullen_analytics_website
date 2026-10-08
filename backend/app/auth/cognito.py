"""Cognito JWT verification.

Verifies ID tokens issued by the configured Cognito user pool against the pool's
JWKS. We validate the ID token (not the access token) because the access token
carries no email, and the first-party frontend uses the same Cognito app client
as both issuer and audience, so the ID token is the natural Bearer credential
for our own API. Returns the validated claims (sub, email, cognito:groups).
"""
from functools import lru_cache

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from ..config import get_settings

settings = get_settings()


def _issuer() -> str:
    return (
        f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/"
        f"{settings.cognito_user_pool_id}"
    )


@lru_cache(maxsize=1)
def _jwk_client() -> PyJWKClient:
    # PyJWKClient fetches + caches the pool's signing keys (keyed by `kid`).
    return PyJWKClient(f"{_issuer()}/.well-known/jwks.json")


def verify_cognito_token(token: str) -> dict:
    """Verify a Cognito ID token's signature + standard claims; return the claims.

    Raises HTTPException(401) on any verification failure, 503 if Cognito isn't
    configured.
    """
    if not settings.cognito_user_pool_id or not settings.cognito_client_id:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Cognito auth is not configured"
        )
    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.cognito_client_id,  # ID token `aud` == app client id
            issuer=_issuer(),
            options={"require": ["exp", "iss", "sub", "aud"]},
        )
    except Exception as exc:  # noqa: BLE001 — any failure is an auth failure
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, f"Invalid Cognito token: {exc}"
        ) from exc

    if claims.get("token_use") != "id":
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Expected a Cognito ID token"
        )
    return claims
