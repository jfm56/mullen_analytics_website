from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.upload import Upload
from ..models.project import Project
from ..models.user import User
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/dashboard-refresh", tags=["dashboard-refresh"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class RefreshRequest(BaseModel):
    upload_id: UUID


class RefreshStatus(BaseModel):
    upload_id: UUID
    refresh_status: str
    refresh_started_at: Optional[datetime] = None
    refresh_completed_at: Optional[datetime] = None
    refresh_error: Optional[str] = None
    
    class Config:
        from_attributes = True


class RefreshQueueItem(BaseModel):
    upload_id: UUID
    client_id: UUID
    project_id: Optional[UUID] = None
    original_filename: str
    refresh_status: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Background Task for Dashboard Refresh
# ============================================================================

# ============================================================================
# Admin Endpoints
# ============================================================================

@router.post("/trigger")
async def trigger_refresh(
    request: RefreshRequest,
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Manually trigger a dashboard refresh for an upload (admin only)."""
    upload = db.query(Upload).filter(Upload.id == request.upload_id).first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    if upload.refresh_status == "processing":
        raise HTTPException(status_code=400, detail="Refresh already in progress")
    
    # This legacy adapter does not perform a real refresh. Do not change upload
    # state or promise success until a processing implementation is connected.
    raise HTTPException(status_code=501, detail="Legacy dashboard refresh is not configured")


@router.get("/queue", response_model=List[RefreshQueueItem])
async def get_refresh_queue(
    status: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get the dashboard refresh queue (admin only)."""
    query = db.query(Upload).filter(
        Upload.refresh_status.in_(["pending", "processing"])
    )
    
    if status:
        query = query.filter(Upload.refresh_status == status)
    
    uploads = query.order_by(Upload.uploaded_at.desc()).all()
    return uploads


@router.get("/status/{upload_id}", response_model=RefreshStatus)
async def get_refresh_status(
    upload_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get refresh status for a specific upload (admin only)."""
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    return RefreshStatus(
        upload_id=upload.id,
        refresh_status=upload.refresh_status or "none",
        refresh_started_at=upload.refresh_started_at,
        refresh_completed_at=upload.refresh_completed_at,
        refresh_error=upload.refresh_error,
    )


@router.post("/retry/{upload_id}")
async def retry_refresh(
    upload_id: UUID,
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retry a failed dashboard refresh (admin only)."""
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    if upload.refresh_status not in ["failed", "none"]:
        raise HTTPException(status_code=400, detail="Can only retry failed or unprocessed uploads")
    
    raise HTTPException(status_code=501, detail="Legacy dashboard refresh is not configured")


# ============================================================================
# Client Endpoints (for portal)
# ============================================================================

@router.get("/my/status", response_model=List[RefreshStatus])
async def get_my_refresh_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get refresh status for current user's recent uploads (client portal)."""
    uploads = db.query(Upload).filter(
        Upload.client_id == current_user.id
    ).order_by(Upload.uploaded_at.desc()).limit(10).all()
    
    return [
        RefreshStatus(
            upload_id=u.id,
            refresh_status=u.refresh_status or "none",
            refresh_started_at=u.refresh_started_at,
            refresh_completed_at=u.refresh_completed_at,
            refresh_error=u.refresh_error,
        )
        for u in uploads
    ]
