from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, EmailStr
from datetime import datetime
import secrets

from ..database import get_db
from ..models.user import User, Profile
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

    await send_invite_email(
        to_email=new_profile.email,
        full_name=new_profile.full_name,
        temporary_password=temp_password,
        setup_token=setup_token,
    )
    
    return UserCreateResponse(
        id=new_profile.id,
        email=new_profile.email,
        role=new_profile.role,
        full_name=new_profile.full_name,
        company=new_profile.company,
        temporary_password=temp_password,
        created_at=new_profile.created_at,
    )
