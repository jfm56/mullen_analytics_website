from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional["UserResponse"] = None
    # True when the user has TOTP enabled: the session cookie is set but pending,
    # and the client must POST /auth/mfa/verify with a code to complete login.
    mfa_required: bool = False


class LogoutResponse(BaseModel):
    success: bool
    message: str


class SessionResponse(BaseModel):
    authenticated: bool
    user: Optional["UserResponse"] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    # Defaults True so code paths that don't set it explicitly (e.g. legacy/
    # impersonation responses built from a profile) never show a false
    # "unverified" banner. The session/login endpoints set the real value.
    email_confirmed: bool = True
    totp_enabled: bool = False

    class Config:
        from_attributes = True


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    role: str
    full_name: Optional[str] = None
    company: Optional[str] = None
    logo_url: Optional[str] = None
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    project_phase: Optional[str] = None
    client_status: Optional[str] = None
    health_score: Optional[int] = None
    upload_enabled: bool = False
    allowed_file_types: Optional[str] = None
    max_upload_mb: Optional[int] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = None
    tableau_open_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    # Membership / plan
    plan: Optional[str] = None
    plan_status: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    # EMS QA add-on — lets the portal show the "QA Platform" SSO tile.
    ems_qa_enabled: bool = False
    ems_agency_slug: Optional[str] = None
    ems_role: Optional[str] = None

    class Config:
        from_attributes = True


class FullSessionResponse(BaseModel):
    authenticated: bool
    user: Optional[UserResponse] = None
    profile: Optional[ProfileResponse] = None
    impersonating: bool = False
    admin_user: Optional[UserResponse] = None
    # MFA state for THIS session. mfa_enabled: user has TOTP configured.
    # mfa_passed: this session has satisfied the challenge (or none was needed).
    # mfa_required: a challenge is pending (enabled but not yet passed).
    mfa_enabled: bool = False
    mfa_passed: bool = True
    mfa_required: bool = False


# ---- MFA (TOTP) ----

class MfaEnrollResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_svg: str  # data:image/svg+xml;base64,... for <img src>


class MfaVerifyRequest(BaseModel):
    code: str  # 6-digit TOTP, or a recovery code


class MfaActivateResponse(BaseModel):
    success: bool
    recovery_codes: list[str]  # shown exactly once


class MfaVerifyResponse(BaseModel):
    success: bool
    message: str = ""


class MfaStatusResponse(BaseModel):
    enabled: bool
    passed: bool
    recovery_codes_remaining: int = 0


class MfaDisableRequest(BaseModel):
    password: str
    code: str  # current TOTP or recovery code


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetResponse(BaseModel):
    success: bool
    message: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class EmailVerificationConfirm(BaseModel):
    token: str


class EmailVerificationResponse(BaseModel):
    success: bool
    message: str
    already_verified: bool = False


class ResendVerificationResponse(BaseModel):
    success: bool
    message: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    company: Optional[str] = None
    plan: Optional[str] = "free_trial"


class RegisterResponse(BaseModel):
    success: bool
    message: str
    user: Optional["UserResponse"] = None
    plan: Optional[str] = None
    plan_status: Optional[str] = None
    requires_activation: bool = False


# Update forward references
LoginResponse.model_rebuild()
SessionResponse.model_rebuild()
