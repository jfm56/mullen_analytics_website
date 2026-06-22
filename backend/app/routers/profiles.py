from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.user import User, Profile
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/profiles", tags=["profiles"])


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    project_phase: Optional[str] = None
    project_deadline: Optional[datetime] = None
    client_status: Optional[str] = None
    health_score: Optional[int] = None
    contract_value: Optional[float] = None
    start_date: Optional[datetime] = None
    renewal_date: Optional[datetime] = None
    next_check_in: Optional[datetime] = None
    check_in_notes: Optional[str] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = None
    tableau_open_url: Optional[str] = None
    upload_enabled: Optional[bool] = None
    allowed_file_types: Optional[str] = None
    max_upload_mb: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    ems_qa_enabled: Optional[bool] = None
    ems_agency_slug: Optional[str] = None
    ems_role: Optional[str] = None


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
    project_deadline: Optional[datetime] = None
    client_status: Optional[str] = None
    health_score: Optional[int] = None
    contract_value: Optional[float] = None
    start_date: Optional[datetime] = None
    renewal_date: Optional[datetime] = None
    next_check_in: Optional[datetime] = None
    upload_enabled: bool = False
    allowed_file_types: Optional[str] = None
    max_upload_mb: Optional[int] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = None
    tableau_open_url: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    ems_qa_enabled: bool = False
    ems_agency_slug: Optional[str] = None
    ems_role: Optional[str] = None

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
async def list_profiles(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all profiles (admin only)."""
    profiles = db.query(Profile).order_by(Profile.created_at.desc()).all()
    return profiles


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific profile."""
    # Check if user is admin or accessing own profile
    user_profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    
    if str(profile_id) != str(current_user.id) and (not user_profile or user_profile.role != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: UUID,
    updates: ProfileUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a profile (admin only - all fields)."""
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    
    return profile
