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

async def process_dashboard_refresh(upload_id: UUID, db: Session):
    """
    Background task to process dashboard refresh.
    This is a placeholder - implement your actual refresh logic here.
    
    Typical workflow:
    1. Read the uploaded file from storage
    2. Process/transform the data
    3. Update the data source (database, data warehouse, etc.)
    4. Trigger Tableau/dashboard refresh if needed
    5. Update the upload status
    """
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        return
    
    try:
        # Mark as processing
        upload.refresh_status = "processing"
        upload.refresh_started_at = datetime.utcnow()
        db.commit()
        
        # TODO: Implement actual refresh logic here
        # For now, we'll simulate a successful refresh
        
        # Example steps:
        # 1. Download file from storage_path
        # 2. Parse and validate data
        # 3. Load into data warehouse/database
        # 4. Trigger Tableau extract refresh via REST API
        
        # Mark as completed
        upload.refresh_status = "completed"
        upload.refresh_completed_at = datetime.utcnow()
        upload.status = "done"
        upload.processed_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        upload.refresh_status = "failed"
        upload.refresh_error = str(e)
        upload.refresh_completed_at = datetime.utcnow()
        db.commit()


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
    
    # Queue the refresh
    upload.refresh_status = "pending"
    db.commit()
    
    # Add to background tasks
    background_tasks.add_task(process_dashboard_refresh, request.upload_id, db)
    
    return {"success": True, "message": "Dashboard refresh queued"}


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
    
    # Reset and queue
    upload.refresh_status = "pending"
    upload.refresh_error = None
    db.commit()
    
    background_tasks.add_task(process_dashboard_refresh, upload_id, db)
    
    return {"success": True, "message": "Dashboard refresh retry queued"}


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
