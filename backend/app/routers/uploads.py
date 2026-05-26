from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
import os

from ..database import get_db
from ..models.user import User, Profile
from ..models.upload import Upload
from ..models.project import Project
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/uploads", tags=["uploads"])


class UploadCreate(BaseModel):
    original_filename: str
    storage_path: str
    content_type: Optional[str] = None
    size_bytes: int = 0


class UploadUpdate(BaseModel):
    client_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    processed_at: Optional[datetime] = None


class UploadResponse(BaseModel):
    id: UUID
    client_id: UUID
    original_filename: str
    storage_path: str
    content_type: Optional[str] = None
    size_bytes: int = 0
    status: str = "pending"
    uploaded_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[UploadResponse])
async def get_my_uploads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's uploads."""
    uploads = db.query(Upload).filter(
        Upload.client_id == current_user.id
    ).order_by(Upload.uploaded_at.desc()).all()
    
    return uploads


@router.get("/{upload_id}", response_model=UploadResponse)
async def get_upload(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific upload."""
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Only allow access to own uploads unless admin
    if str(upload.client_id) != str(current_user.id) and (not profile or profile.role != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return upload


@router.get("/{upload_id}/download")
async def get_download_url(
    upload_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a presigned download URL for an upload."""
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Only allow access to own uploads unless admin
    if str(upload.client_id) != str(current_user.id) and (not profile or profile.role != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # TODO: Generate presigned URL from storage service
    # For now, return the storage path
    return {"url": upload.storage_path, "filename": upload.original_filename}


# Admin endpoints
@router.post("/", response_model=UploadResponse)
async def create_upload_record(
    upload: UploadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an upload record (after file is uploaded to storage)."""
    new_upload = Upload(
        client_id=current_user.id,
        original_filename=upload.original_filename,
        storage_path=upload.storage_path,
        content_type=upload.content_type,
        size_bytes=upload.size_bytes,
        status="pending",
    )
    
    db.add(new_upload)
    db.commit()
    db.refresh(new_upload)
    
    return new_upload


@router.get("/admin/client/{client_id}", response_model=List[UploadResponse])
async def get_client_uploads_admin(
    client_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get uploads for a specific client (admin only)."""
    uploads = db.query(Upload).filter(
        Upload.client_id == client_id
    ).order_by(Upload.uploaded_at.desc()).all()
    
    return uploads


@router.get("/client/{client_id}", response_model=List[UploadResponse])
async def get_client_uploads(
    client_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get uploads for a specific client (admin only)."""
    uploads = db.query(Upload).filter(
        Upload.client_id == client_id
    ).order_by(Upload.uploaded_at.desc()).all()
    
    return uploads


@router.patch("/{upload_id}", response_model=UploadResponse)
async def update_upload(
    upload_id: UUID,
    updates: UploadUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update an upload record (admin only)."""
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(upload, field, value)
    
    db.commit()
    db.refresh(upload)
    
    return upload


@router.delete("/{upload_id}")
async def delete_upload(
    upload_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete an upload record (admin only)."""
    result = db.query(Upload).filter(Upload.id == upload_id).delete()
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    db.commit()
    
    # TODO: Also delete from storage
    
    return {"success": True}


# ============================================================================
# Portal Project-Scoped Endpoints
# ============================================================================

@router.get("/project/{project_id}", response_model=List[UploadResponse])
async def get_project_uploads(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get uploads for a specific project (client portal)."""
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.client_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    uploads = db.query(Upload).filter(
        Upload.project_id == project_id
    ).order_by(Upload.uploaded_at.desc()).all()
    
    return uploads


@router.post("/project/{project_id}", response_model=UploadResponse)
async def upload_to_project(
    project_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a file to a specific project (client portal)."""
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.client_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create upload directory if it doesn't exist
    upload_dir = f"uploads/{current_user.id}/{project_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = f"{upload_dir}/{file.filename}"
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create upload record
    new_upload = Upload(
        client_id=current_user.id,
        project_id=project_id,
        original_filename=file.filename,
        storage_path=file_path,
        content_type=file.content_type,
        size_bytes=len(content),
        status="processing",
    )
    
    db.add(new_upload)
    db.commit()
    db.refresh(new_upload)
    
    return new_upload
