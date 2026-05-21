from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

from ..database import get_db
from ..models.project import Project
from ..models.user import User
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/projects", tags=["projects"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

PROJECT_STATUSES = {"PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED",
                    "active", "completed", "on_hold", "archived"}  # accept both cases


class ProjectCreate(BaseModel):
    client_id: UUID
    name: str
    description: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    phase: Optional[str] = "discovery"
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    end_date: Optional[datetime] = None
    contract_value: Optional[Decimal] = 0
    budget_cents: Optional[int] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = "dashboard"
    tableau_open_url: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    phase: Optional[str] = None
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    end_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    contract_value: Optional[Decimal] = None
    budget_cents: Optional[int] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = None
    tableau_open_url: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    client_id: UUID
    name: str
    description: Optional[str] = None
    status: str
    phase: str
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    end_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    contract_value: Optional[Decimal] = None
    budget_cents: Optional[int] = None
    tableau_embed_html: Optional[str] = None
    tableau_embed_type: Optional[str] = None
    tableau_open_url: Optional[str] = None
    archived_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProjectWithStats(ProjectResponse):
    document_count: int = 0
    upload_count: int = 0
    task_count: int = 0
    invoice_count: int = 0


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.get("/", response_model=List[ProjectResponse])
async def list_all_projects(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all projects (admin only)."""
    projects = db.query(Project).filter(
        Project.archived_at.is_(None)
    ).order_by(Project.created_at.desc()).all()
    return projects


@router.get("/client/{client_id}", response_model=List[ProjectWithStats])
async def list_client_projects(
    client_id: UUID,
    include_archived: bool = False,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all projects for a specific client (admin only)."""
    query = db.query(Project).filter(Project.client_id == client_id)
    
    if not include_archived:
        query = query.filter(Project.archived_at.is_(None))
    
    projects = query.order_by(Project.created_at.desc()).all()
    
    # Add stats for each project
    result = []
    for project in projects:
        project_dict = ProjectWithStats.model_validate(project)
        project_dict.document_count = len(project.documents) if project.documents else 0
        project_dict.upload_count = len(project.uploads) if project.uploads else 0
        project_dict.task_count = len(project.tasks) if project.tasks else 0
        project_dict.invoice_count = len(project.invoices) if project.invoices else 0
        result.append(project_dict)
    
    return result


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new project (admin only)."""
    project = Project(
        client_id=project_data.client_id,
        name=project_data.name,
        description=project_data.description,
        status=project_data.status,
        phase=project_data.phase,
        start_date=project_data.start_date,
        deadline=project_data.deadline or project_data.end_date,
        end_date=project_data.end_date or project_data.deadline,
        contract_value=project_data.contract_value,
        budget_cents=project_data.budget_cents,
        tableau_embed_html=project_data.tableau_embed_html,
        tableau_embed_type=project_data.tableau_embed_type,
        tableau_open_url=project_data.tableau_open_url,
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return project


@router.get("/{project_id}", response_model=ProjectWithStats)
async def get_project(
    project_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a specific project (admin only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = ProjectWithStats.model_validate(project)
    result.document_count = len(project.documents) if project.documents else 0
    result.upload_count = len(project.uploads) if project.uploads else 0
    result.task_count = len(project.tasks) if project.tasks else 0
    result.invoice_count = len(project.invoices) if project.invoices else 0
    
    return result


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    updates: ProjectUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a project (admin only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    # Keep deadline and end_date in sync
    if "end_date" in update_data and "deadline" not in update_data:
        update_data["deadline"] = update_data["end_date"]
    if "deadline" in update_data and "end_date" not in update_data:
        update_data["end_date"] = update_data["deadline"]
    for field, value in update_data.items():
        if hasattr(project, field):
            setattr(project, field, value)
    
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    
    return project


@router.delete("/{project_id}")
async def archive_project(
    project_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Archive a project (soft delete, admin only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.archived_at = datetime.utcnow()
    project.status = "archived"
    db.commit()
    
    return {"success": True, "message": "Project archived"}


@router.post("/{project_id}/restore")
async def restore_project(
    project_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Restore an archived project (admin only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.archived_at = None
    project.status = "active"
    db.commit()
    
    return {"success": True, "message": "Project restored"}


# ============================================================================
# Client Endpoints (for portal)
# ============================================================================

@router.get("/my/projects", response_model=List[ProjectResponse])
async def get_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's projects (client portal)."""
    projects = db.query(Project).filter(
        Project.client_id == current_user.id,
        Project.archived_at.is_(None),
        Project.status != "archived"
    ).order_by(Project.created_at.desc()).all()
    
    return projects


@router.get("/my/projects/{project_id}", response_model=ProjectWithStats)
async def get_my_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific project for current user (client portal)."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.client_id == current_user.id,
        Project.archived_at.is_(None)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = ProjectWithStats.model_validate(project)
    result.document_count = len([d for d in project.documents if d.visibility == "client_visible" and not d.archived_at]) if project.documents else 0
    result.upload_count = len(project.uploads) if project.uploads else 0
    result.task_count = len(project.tasks) if project.tasks else 0
    result.invoice_count = len(project.invoices) if project.invoices else 0
    
    return result


# ============================================================================
# Report Generator Endpoint
# ============================================================================

class ReportGenerateResponse(BaseModel):
    success: bool
    message: str
    document_id: Optional[UUID] = None


@router.post("/{project_id}/generate-report", response_model=ReportGenerateResponse)
async def generate_project_report(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an AI report for a project (client portal)."""
    from ..models.document import Document
    
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.client_id == current_user.id,
        Project.archived_at.is_(None)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get project-scoped data for report generation
    project_uploads = project.uploads if project.uploads else []
    project_documents = [d for d in project.documents if d.visibility == "client_visible"] if project.documents else []
    
    # TODO: Integrate with your actual report generator here
    # For now, create a placeholder document
    # In production, this would:
    # 1. Gather all project uploads and documents
    # 2. Extract text and analyze images
    # 3. Generate report using AI
    # 4. Save as PDF and create document record
    
    report_doc = Document(
        client_id=current_user.id,
        project_id=project_id,
        title=f"Generated Report - {project.name}",
        description=f"AI-generated report for project {project.name}",
        original_filename=f"report_{project.name.lower().replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.pdf",
        storage_path=f"reports/{current_user.id}/{project_id}/generated_report.pdf",
        content_type="application/pdf",
        document_type="report",
        visibility="client_visible",
        generated_by="report_generator",
    )
    
    db.add(report_doc)
    db.commit()
    db.refresh(report_doc)
    
    return ReportGenerateResponse(
        success=True,
        message="Report generated successfully",
        document_id=report_doc.id
    )


# ============================================================================
# Admin: project-scoped document and invoice lists
# ============================================================================

@router.get("/{project_id}/documents")
async def list_project_documents(
    project_id: UUID,
    include_archived: bool = False,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all documents for a project (admin only)."""
    from ..models.document import Document

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(Document).filter(Document.project_id == project_id)
    if not include_archived:
        query = query.filter(Document.archived_at.is_(None))
    return query.order_by(Document.created_at.desc()).all()


@router.get("/{project_id}/invoices")
async def list_project_invoices(
    project_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all invoices for a project (admin only)."""
    from ..models.invoice import Invoice

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(Invoice).filter(
        Invoice.project_id == project_id,
        Invoice.archived_at.is_(None),
    ).order_by(Invoice.created_at.desc()).all()
