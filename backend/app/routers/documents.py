from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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

router = APIRouter(prefix="/documents", tags=["documents"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class DocumentCreate(BaseModel):
    client_id: UUID
    project_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    original_filename: str
    storage_path: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = 0
    category: Optional[str] = None
    document_type: Optional[str] = "deliverable"
    visibility: Optional[str] = "client_visible"
    generated_by: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[UUID] = None
    category: Optional[str] = None
    document_type: Optional[str] = None
    visibility: Optional[str] = None


class DocumentResponse(BaseModel):
    id: UUID
    client_id: UUID
    project_id: Optional[UUID] = None
    uploaded_by: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    original_filename: str
    storage_path: str
    content_type: Optional[str] = None
    size_bytes: int = 0
    category: Optional[str] = None
    document_type: str = "deliverable"
    visibility: str = "client_visible"
    generated_by: Optional[str] = None
    archived_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.get("/", response_model=List[DocumentResponse])
async def list_all_documents(
    client_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    document_type: Optional[str] = None,
    visibility: Optional[str] = None,
    include_archived: bool = False,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all documents with optional filters (admin only)."""
    query = db.query(Document)
    
    if client_id:
        query = query.filter(Document.client_id == client_id)
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if visibility:
        query = query.filter(Document.visibility == visibility)
    if not include_archived:
        query = query.filter(Document.archived_at.is_(None))
    
    documents = query.order_by(Document.created_at.desc()).all()
    return documents


@router.get("/client/{client_id}", response_model=List[DocumentResponse])
async def list_client_documents(
    client_id: UUID,
    project_id: Optional[UUID] = None,
    include_archived: bool = False,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all documents for a specific client (admin only)."""
    query = db.query(Document).filter(Document.client_id == client_id)
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if not include_archived:
        query = query.filter(Document.archived_at.is_(None))
    
    documents = query.order_by(Document.created_at.desc()).all()
    return documents


@router.post("/", response_model=DocumentResponse)
async def create_document(
    document_data: DocumentCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new document record (admin only)."""
    document = Document(
        client_id=document_data.client_id,
        project_id=document_data.project_id,
        uploaded_by=admin.id,
        title=document_data.title,
        description=document_data.description,
        original_filename=document_data.original_filename,
        storage_path=document_data.storage_path,
        content_type=document_data.content_type,
        size_bytes=document_data.size_bytes,
        category=document_data.category,
        document_type=document_data.document_type,
        visibility=document_data.visibility,
        generated_by=document_data.generated_by,
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a specific document (admin only)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: UUID,
    updates: DocumentUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a document (admin only)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)
    
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    
    return document


@router.delete("/{document_id}")
async def archive_document(
    document_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Archive a document (soft delete, admin only)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document.archived_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "message": "Document archived"}


@router.post("/{document_id}/restore")
async def restore_document(
    document_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Restore an archived document (admin only)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document.archived_at = None
    db.commit()
    
    return {"success": True, "message": "Document restored"}


@router.delete("/{document_id}/permanent")
async def delete_document_permanently(
    document_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete a document (admin only). Use with caution."""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # TODO: Also delete from storage (S3, etc.)
    
    db.delete(document)
    db.commit()
    
    return {"success": True, "message": "Document permanently deleted"}


# ============================================================================
# Client Endpoints (for portal)
# ============================================================================

@router.get("/my/documents", response_model=List[DocumentResponse])
async def get_my_documents(
    project_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's visible documents (client portal)."""
    query = db.query(Document).filter(
        Document.client_id == current_user.id,
        Document.visibility == "client_visible",
        Document.archived_at.is_(None)
    )
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    documents = query.order_by(Document.created_at.desc()).all()
    return documents


@router.get("/my/documents/{document_id}", response_model=DocumentResponse)
async def get_my_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific document for current user (client portal)."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.client_id == current_user.id,
        Document.visibility == "client_visible",
        Document.archived_at.is_(None)
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@router.get("/project/{project_id}", response_model=List[DocumentResponse])
async def get_project_documents(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get documents for a specific project (client portal)."""
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.client_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    documents = db.query(Document).filter(
        Document.project_id == project_id,
        Document.visibility == "client_visible",
        Document.archived_at.is_(None)
    ).order_by(Document.created_at.desc()).all()
    
    return documents
