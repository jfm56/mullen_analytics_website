"""Unified-platform auth (AWS Cognito). JWKS-verified Bearer ID tokens + the
agency/capability/module authorization dependencies that enforce Jim's
review / receive-reviews / both model, module entitlements, and agency separation.
"""
from .cognito import verify_cognito_token
from .deps import (
    AuthContext,
    get_auth,
    get_current_user,
    require_platform_admin,
    require_membership,
    require_capability,
    require_module,
)

__all__ = [
    "verify_cognito_token",
    "AuthContext",
    "get_auth",
    "get_current_user",
    "require_platform_admin",
    "require_membership",
    "require_capability",
    "require_module",
]
