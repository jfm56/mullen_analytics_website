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


class LogoutResponse(BaseModel):
    success: bool
    message: str


class SessionResponse(BaseModel):
    authenticated: bool
    user: Optional["UserResponse"] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    
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


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetResponse(BaseModel):
    success: bool
    message: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


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
