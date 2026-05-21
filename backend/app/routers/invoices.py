from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.user import User, Profile
from ..models.invoice import Invoice
from ..models.project import Project
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/invoices", tags=["invoices"])


class InvoiceCreate(BaseModel):
    client_id: UUID
    number: Optional[str] = None
    description: Optional[str] = None
    amount_due: int = 0
    currency: str = "USD"
    status: str = "pending"
    type: str = "uploaded"
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class InvoiceUpdate(BaseModel):
    number: Optional[str] = None
    description: Optional[str] = None
    amount_due: Optional[int] = None
    status: Optional[str] = None
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None


class InvoiceResponse(BaseModel):
    id: UUID
    client_id: UUID
    number: Optional[str] = None
    description: Optional[str] = None
    amount_due: int = 0
    currency: str = "USD"
    status: str = "pending"
    type: str = "uploaded"
    stripe_invoice_id: Optional[str] = None
    hosted_invoice_url: Optional[str] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    original_filename: Optional[str] = None
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[InvoiceResponse])
async def get_my_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's invoices."""
    invoices = db.query(Invoice).filter(
        Invoice.client_id == current_user.id
    ).order_by(Invoice.created_at.desc()).all()
    
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific invoice."""
    # Check if admin or own invoice
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Only allow access to own invoices unless admin
    if str(invoice.client_id) != str(current_user.id) and (not profile or profile.role != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return invoice


# Admin endpoints
@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice: InvoiceCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create an invoice (admin only)."""
    new_invoice = Invoice(
        client_id=invoice.client_id,
        number=invoice.number,
        description=invoice.description,
        amount_due=invoice.amount_due,
        currency=invoice.currency,
        status=invoice.status,
        type=invoice.type,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
    )
    
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    
    return new_invoice


@router.get("/admin/client/{client_id}", response_model=List[InvoiceResponse])
async def get_client_invoices_admin(
    client_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get invoices for a specific client (admin only)."""
    invoices = db.query(Invoice).filter(
        Invoice.client_id == client_id
    ).order_by(Invoice.created_at.desc()).all()
    
    return invoices


@router.get("/client/{client_id}", response_model=List[InvoiceResponse])
async def get_client_invoices(
    client_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get invoices for a specific client (admin only)."""
    invoices = db.query(Invoice).filter(
        Invoice.client_id == client_id
    ).order_by(Invoice.created_at.desc()).all()
    
    return invoices


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    updates: InvoiceUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update an invoice (admin only)."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)
    
    invoice.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete an invoice (admin only)."""
    result = db.query(Invoice).filter(Invoice.id == invoice_id).delete()
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.commit()
    
    return {"success": True}


# ============================================================================
# Portal Project-Scoped Endpoints
# ============================================================================

@router.get("/project/{project_id}", response_model=List[InvoiceResponse])
async def get_project_invoices(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get invoices for a specific project (client portal)."""
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.client_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    invoices = db.query(Invoice).filter(
        Invoice.project_id == project_id
    ).order_by(Invoice.created_at.desc()).all()
    
    return invoices
