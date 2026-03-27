from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.invoice import Invoice
from ..models.user import User, Profile
from ..services.quickbooks import quickbooks_service
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/quickbooks", tags=["quickbooks"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class QuickBooksStatus(BaseModel):
    configured: bool
    connected: bool
    realm_id: Optional[str] = None
    last_sync: Optional[datetime] = None


class SyncRequest(BaseModel):
    client_id: UUID


class CustomerMapping(BaseModel):
    client_id: UUID
    quickbooks_customer_id: str


class InvoiceSyncResult(BaseModel):
    synced: int
    created: int
    updated: int
    errors: List[str] = []


# ============================================================================
# OAuth Endpoints
# ============================================================================

@router.get("/auth/url")
async def get_auth_url(
    admin: User = Depends(require_admin),
):
    """Get QuickBooks OAuth authorization URL (admin only)."""
    if not quickbooks_service.is_configured():
        raise HTTPException(
            status_code=400,
            detail="QuickBooks credentials not configured. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET."
        )
    
    return {"auth_url": quickbooks_service.get_auth_url()}


@router.get("/auth/callback")
async def oauth_callback(
    code: str,
    state: str,
    realmId: str,
    db: Session = Depends(get_db),
):
    """
    OAuth callback endpoint.
    QuickBooks redirects here after user authorizes the app.
    """
    try:
        # Exchange code for tokens
        tokens = await quickbooks_service.exchange_code_for_tokens(code)
        
        # Store tokens securely (in production, encrypt and store in DB)
        # For now, just return success
        
        return RedirectResponse(url="/admin?quickbooks=connected")
    except NotImplementedError:
        # Scaffolding - redirect with message
        return RedirectResponse(url="/admin?quickbooks=not_implemented")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Status Endpoints
# ============================================================================

@router.get("/status", response_model=QuickBooksStatus)
async def get_status(
    admin: User = Depends(require_admin),
):
    """Get QuickBooks integration status (admin only)."""
    return QuickBooksStatus(
        configured=quickbooks_service.is_configured(),
        connected=quickbooks_service.access_token is not None,
        realm_id=quickbooks_service.realm_id,
        last_sync=None,  # TODO: Track last sync time
    )


# ============================================================================
# Sync Endpoints
# ============================================================================

@router.post("/sync/invoices", response_model=InvoiceSyncResult)
async def sync_invoices(
    request: SyncRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Sync invoices from QuickBooks for a specific client (admin only).
    
    This will:
    1. Find the client's QuickBooks customer ID
    2. Fetch all invoices for that customer
    3. Create or update local invoice records
    4. Store payment links
    """
    if not quickbooks_service.is_configured():
        raise HTTPException(status_code=400, detail="QuickBooks not configured")
    
    # Get client profile
    profile = db.query(Profile).filter(Profile.id == request.client_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # TODO: Store QuickBooks customer ID mapping in profile or separate table
    # For now, return scaffolding response
    
    return InvoiceSyncResult(
        synced=0,
        created=0,
        updated=0,
        errors=["QuickBooks sync not fully implemented. This is scaffolding."]
    )


@router.post("/sync/all-invoices", response_model=InvoiceSyncResult)
async def sync_all_invoices(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Sync all invoices from QuickBooks (admin only).
    
    This will fetch all invoices and match them to clients based on
    QuickBooks customer ID mappings.
    """
    if not quickbooks_service.is_configured():
        raise HTTPException(status_code=400, detail="QuickBooks not configured")
    
    # TODO: Implement full sync
    
    return InvoiceSyncResult(
        synced=0,
        created=0,
        updated=0,
        errors=["QuickBooks sync not fully implemented. This is scaffolding."]
    )


@router.post("/map-customer")
async def map_customer(
    mapping: CustomerMapping,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Map a local client to a QuickBooks customer (admin only).
    
    This creates the association needed for invoice syncing.
    """
    # Verify client exists
    profile = db.query(Profile).filter(Profile.id == mapping.client_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # TODO: Store mapping (could add quickbooks_customer_id to Profile model
    # or create a separate mapping table)
    
    return {
        "success": True,
        "message": f"Mapped client {mapping.client_id} to QuickBooks customer {mapping.quickbooks_customer_id}",
        "note": "Customer mapping storage not fully implemented. This is scaffolding."
    }


@router.get("/customers")
async def list_quickbooks_customers(
    admin: User = Depends(require_admin),
):
    """
    List all customers from QuickBooks (admin only).
    
    Use this to find customer IDs for mapping.
    """
    if not quickbooks_service.is_configured():
        raise HTTPException(status_code=400, detail="QuickBooks not configured")
    
    try:
        customers = await quickbooks_service.get_customers()
        return {"customers": customers}
    except NotImplementedError:
        return {
            "customers": [],
            "message": "QuickBooks customer fetching not implemented. This is scaffolding."
        }


@router.get("/invoices/{client_id}")
async def get_quickbooks_invoices(
    client_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get QuickBooks invoices for a specific client (admin only).
    
    Returns both local synced invoices and can fetch fresh from QuickBooks.
    """
    # Get local QuickBooks invoices
    local_invoices = db.query(Invoice).filter(
        Invoice.client_id == client_id,
        Invoice.type == "quickbooks"
    ).order_by(Invoice.created_at.desc()).all()
    
    return {
        "local_invoices": [
            {
                "id": str(inv.id),
                "number": inv.number,
                "amount_due": inv.amount_due,
                "status": inv.status,
                "quickbooks_invoice_id": inv.quickbooks_invoice_id,
                "quickbooks_payment_url": inv.quickbooks_payment_url,
                "synced_at": inv.quickbooks_synced_at,
            }
            for inv in local_invoices
        ],
        "message": "To fetch fresh invoices from QuickBooks, use the sync endpoint."
    }
