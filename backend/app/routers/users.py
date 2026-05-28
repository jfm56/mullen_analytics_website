from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, EmailStr
from datetime import datetime
import secrets
import asyncio

from ..database import get_db
from ..models.user import User, Profile, Session as UserSession, PasswordResetToken
from ..models.message import Message
from ..models.project import Project
from ..models.task import EnhancedTask
from ..models.invoice import Invoice
from ..models.document import Document
from ..models.upload import Upload
from ..models.data_upload import DataUpload, DataCleaningResult, EMSDashboardMetrics, DataProfile, AnalyticsColumnSettings, EMSColumnMapping
from ..models.agency import AgencyMembership, AgencyFile, AuditLog
from ..models.pipeline import RevenuePipeline
from ..models.impersonation import ImpersonationLog
from ..services.auth import hash_password, create_password_reset_token
from ..services.email import send_invite_email
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["users"])


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    project_phase: Optional[str] = None
    client_status: Optional[str] = None
    health_score: Optional[int] = None
    contract_value: Optional[float] = None
    next_check_in: Optional[datetime] = None
    check_in_notes: Optional[str] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = None
    tableau_open_url: Optional[str] = None
    upload_enabled: Optional[bool] = None
    allowed_file_types: Optional[str] = None
    max_upload_mb: Optional[int] = None
    notes: Optional[str] = None
    role: Optional[str] = None
    last_login: Optional[datetime] = None


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
    contract_value: Optional[float] = None
    upload_enabled: bool = False
    allowed_file_types: Optional[str] = None
    max_upload_mb: Optional[int] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = None
    tableau_open_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's profile."""
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    updates: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's profile (limited fields for clients)."""
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Clients can only update certain fields
    allowed_fields = ["full_name", "company"]
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in allowed_fields:
            setattr(profile, field, value)
    
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    
    return profile


# Admin endpoints
@router.get("/", response_model=List[ProfileResponse])
async def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    profiles = db.query(Profile).order_by(Profile.created_at.desc()).all()
    return profiles


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user(
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a specific user's profile (admin only)."""
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    return profile


@router.patch("/{user_id}", response_model=ProfileResponse)
async def update_user(
    user_id: UUID,
    updates: ProfileUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a user's profile (admin only - all fields)."""
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    
    return profile


class RoleUpdate(BaseModel):
    role: str


@router.patch("/{user_id}/role", response_model=ProfileResponse)
async def update_user_role(
    user_id: UUID,
    role_update: RoleUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a user's role (admin only)."""
    if role_update.role not in ["admin", "client"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile.role = role_update.role
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    
    return profile


class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company: Optional[str] = None
    role: str = "client"


class UserCreateResponse(BaseModel):
    id: UUID
    email: str
    role: str
    full_name: Optional[str] = None
    company: Optional[str] = None
    temporary_password: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a user and all their data (admin only)."""
    if str(user_id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete FK-constrained child records before removing the user row.
    # Order matters: deepest dependents first, auth records last.

    # EMS data uploads and all dependent analytics records
    upload_ids = [
        r.id for r in db.query(DataUpload.id).filter(
            (DataUpload.client_id == user_id) | (DataUpload.uploaded_by_user_id == user_id)
        ).all()
    ]
    if upload_ids:
        db.query(EMSColumnMapping).filter(EMSColumnMapping.data_upload_id.in_(upload_ids)).delete(synchronize_session=False)
        db.query(AnalyticsColumnSettings).filter(AnalyticsColumnSettings.data_upload_id.in_(upload_ids)).delete(synchronize_session=False)
        db.query(DataProfile).filter(DataProfile.data_upload_id.in_(upload_ids)).delete(synchronize_session=False)
        db.query(EMSDashboardMetrics).filter(EMSDashboardMetrics.data_upload_id.in_(upload_ids)).delete(synchronize_session=False)
        db.query(DataCleaningResult).filter(DataCleaningResult.data_upload_id.in_(upload_ids)).delete(synchronize_session=False)
    db.query(DataUpload).filter(
        (DataUpload.client_id == user_id) | (DataUpload.uploaded_by_user_id == user_id)
    ).delete(synchronize_session=False)

    # Legacy uploads table
    db.query(Upload).filter(Upload.client_id == user_id).delete(synchronize_session=False)

    # Agency files, memberships, audit logs
    db.query(AgencyFile).filter(AgencyFile.uploaded_by == user_id).delete(synchronize_session=False)
    db.query(AgencyMembership).filter(AgencyMembership.user_id == user_id).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({"user_id": None}, synchronize_session=False)

    # Null out nullable FK in revenue pipeline (preserve the deal record)
    db.query(RevenuePipeline).filter(RevenuePipeline.client_id == user_id).update({"client_id": None}, synchronize_session=False)
    db.query(ImpersonationLog).filter(
        (ImpersonationLog.client_id == user_id) | (ImpersonationLog.admin_id == user_id)
    ).delete(synchronize_session=False)

    # Core client records
    db.query(Document).filter(Document.client_id == user_id).delete(synchronize_session=False)
    db.query(Invoice).filter(Invoice.client_id == user_id).delete(synchronize_session=False)
    db.query(EnhancedTask).filter(EnhancedTask.client_id == user_id).delete(synchronize_session=False)
    db.query(Project).filter(Project.client_id == user_id).delete(synchronize_session=False)
    db.query(Message).filter(Message.user_id == user_id).delete(synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete(synchronize_session=False)
    db.query(UserSession).filter(UserSession.user_id == user_id).delete(synchronize_session=False)
    db.query(Profile).filter(Profile.id == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()


@router.post("/", response_model=UserCreateResponse)
async def create_user(
    user_data: UserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserCreateResponse:
    """Create a new user (admin only). Returns a temporary password."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user_data.role not in ["admin", "client"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Generate a temporary password
    temp_password = secrets.token_urlsafe(12)
    
    # Create user ID
    user_id = uuid4()
    
    # Create user
    new_user = User(
        id=user_id,
        email=user_data.email,
        password_hash=hash_password(temp_password),
    )
    db.add(new_user)
    
    # Create profile
    new_profile = Profile(
        id=user_id,
        email=user_data.email,
        role=user_data.role,
        full_name=user_data.full_name,
        company=user_data.company,
    )
    db.add(new_profile)
    
    db.commit()
    db.refresh(new_profile)

    setup_token = create_password_reset_token(db, str(user_id))

    async def _send_invite():
        try:
            await asyncio.wait_for(
                send_invite_email(
                    to_email=new_profile.email,
                    full_name=new_profile.full_name,
                    temporary_password=temp_password,
                    setup_token=setup_token,
                ),
                timeout=10.0,
            )
        except Exception as e:
            print(f"[Email] Invite email failed (non-blocking): {e}")

    asyncio.create_task(_send_invite())
    
    return UserCreateResponse(
        id=new_profile.id,
        email=new_profile.email,
        role=new_profile.role,
        full_name=new_profile.full_name,
        company=new_profile.company,
        temporary_password=temp_password,
        created_at=new_profile.created_at,
    )
