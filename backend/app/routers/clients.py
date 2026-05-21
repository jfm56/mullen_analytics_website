"""
Clients router — convenience endpoints that scope resources by client_id in the URL.

These complement the existing /api/projects/* endpoints with the spec URL pattern:
  GET  /api/clients/{client_id}/projects
  POST /api/clients/{client_id}/projects
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

from ..database import get_db
from ..models.project import Project
from ..models.user import User, Profile
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/clients", tags=["clients"])


# ============================================================================
# Shared schema (mirrors ProjectCreate / ProjectResponse)
# ============================================================================

class ClientProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    phase: Optional[str] = "discovery"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    contract_value: Optional[Decimal] = 0
    budget_cents: Optional[int] = None


class ClientProjectResponse(BaseModel):
    id: UUID
    client_id: UUID
    name: str
    description: Optional[str] = None
    status: str
    phase: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    contract_value: Optional[Decimal] = None
    budget_cents: Optional[int] = None
    archived_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    document_count: int = 0
    invoice_count: int = 0

    class Config:
        from_attributes = True


# ============================================================================
# GET /api/clients/{client_id}/projects
# ============================================================================

@router.get("/{client_id}/projects", response_model=List[ClientProjectResponse])
async def list_client_projects(
    client_id: UUID,
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List projects for a client.
    - Admin: can list any client's projects.
    - Client: can only list their OWN projects (client_id must match their user id).
    """
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    is_admin = profile and profile.role == "admin"

    if not is_admin and str(current_user.id) != str(client_id):
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Project).filter(Project.client_id == client_id)
    if not include_archived:
        query = query.filter(Project.archived_at.is_(None))

    projects = query.order_by(Project.created_at.desc()).all()

    result = []
    for p in projects:
        data = ClientProjectResponse.model_validate(p)
        data.document_count = len(p.documents) if p.documents else 0
        data.invoice_count = len(p.invoices) if p.invoices else 0
        result.append(data)
    return result


# ============================================================================
# POST /api/clients/{client_id}/projects
# ============================================================================

@router.post("/{client_id}/projects", response_model=ClientProjectResponse)
async def create_client_project(
    client_id: UUID,
    project_data: ClientProjectCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a project for a client (admin only)."""
    project = Project(
        client_id=client_id,
        name=project_data.name,
        description=project_data.description,
        status=project_data.status,
        phase=project_data.phase,
        start_date=project_data.start_date,
        deadline=project_data.deadline or project_data.end_date,
        end_date=project_data.end_date or project_data.deadline,
        contract_value=project_data.contract_value,
        budget_cents=project_data.budget_cents,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    result = ClientProjectResponse.model_validate(project)
    result.document_count = 0
    result.invoice_count = 0
    return result
