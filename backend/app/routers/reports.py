from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.document import Document
from ..models.project import Project
from ..models.user import User
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/reports", tags=["reports"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class ReportCreate(BaseModel):
    client_id: UUID
    project_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    original_filename: str
    storage_path: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = 0
    generated_by: Optional[str] = "report_generator"


class ReportResponse(BaseModel):
    id: UUID
    client_id: UUID
    project_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    original_filename: str
    storage_path: str
    content_type: Optional[str] = None
    size_bytes: int = 0
    document_type: str = "report"
    visibility: str = "client_visible"
    generated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    report_data: ReportCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Create a new report document (admin only).
    This endpoint is used by the report generator to store generated reports.
    """
    # Verify project belongs to client if project_id provided
    if report_data.project_id:
        project = db.query(Project).filter(
            Project.id == report_data.project_id,
            Project.client_id == report_data.client_id
        ).first()
        if not project:
            raise HTTPException(status_code=400, detail="Project not found or doesn't belong to client")
    
    document = Document(
        client_id=report_data.client_id,
        project_id=report_data.project_id,
        uploaded_by=admin.id,
        title=report_data.title,
        description=report_data.description,
        original_filename=report_data.original_filename,
        storage_path=report_data.storage_path,
        content_type=report_data.content_type,
        size_bytes=report_data.size_bytes,
        category="report",
        document_type="report",
        visibility="client_visible",
        generated_by=report_data.generated_by or "report_generator",
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document


@router.get("/client/{client_id}", response_model=List[ReportResponse])
async def list_client_reports(
    client_id: UUID,
    project_id: Optional[UUID] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all reports for a specific client (admin only)."""
    query = db.query(Document).filter(
        Document.client_id == client_id,
        Document.document_type == "report",
        Document.archived_at.is_(None)
    )
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    reports = query.order_by(Document.created_at.desc()).all()
    return reports


# ============================================================================
# Client Endpoints (for portal)
# ============================================================================

@router.get("/my", response_model=List[ReportResponse])
async def get_my_reports(
    project_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's reports (client portal)."""
    query = db.query(Document).filter(
        Document.client_id == current_user.id,
        Document.document_type == "report",
        Document.visibility == "client_visible",
        Document.archived_at.is_(None)
    )
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    reports = query.order_by(Document.created_at.desc()).all()
    return reports
