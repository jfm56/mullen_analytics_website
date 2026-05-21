"""
Payments router — Stripe Checkout + webhook handling.

Design principles:
- NEVER store card numbers, bank details, or raw payment credentials.
- Store only: payment_url (hosted link), stripe_invoice_id, and status.
- Webhook validates Stripe signature before processing.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

import stripe

from ..database import get_db
from ..config import get_settings
from ..models.invoice import Invoice
from ..models.user import User
from ..services.audit import log_action
from .auth import get_current_user, require_admin

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(tags=["payments"])


def _get_stripe():
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY in .env",
        )
    stripe.api_key = settings.stripe_secret_key
    return stripe


# ============================================================================
# Admin: Create Stripe Payment Link for an invoice
# ============================================================================

@router.post("/api/invoices/{invoice_id}/create-payment-link")
async def create_payment_link(
    invoice_id: UUID,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Create a Stripe Checkout Session for an invoice and store the hosted URL.
    Only the URL is stored — no card or banking data is ever written locally.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.amount_due <= 0:
        raise HTTPException(status_code=400, detail="Invoice amount must be greater than zero")

    _get_stripe()

    amount_cents = invoice.amount_due  # already in cents
    description = invoice.description or f"Invoice {invoice.number or str(invoice.id)}"
    success_url = f"{settings.app_url}/portal/invoices?paid=1"
    cancel_url  = f"{settings.app_url}/portal/invoices?cancelled=1"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": invoice.currency.lower(),
                    "product_data": {"name": description},
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"invoice_id": str(invoice.id)},
        )
    except stripe.StripeError as exc:
        logger.error("Stripe error creating session: %s", exc)
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc.user_message}")

    invoice.hosted_invoice_url = session.url
    invoice.stripe_invoice_id = session.id
    invoice.type = "stripe"
    if invoice.status == "pending":
        invoice.status = "sent"
    db.commit()

    log_action(
        db,
        action="payment_link_created",
        user_id=str(admin.id),
        resource_type="invoice",
        resource_id=str(invoice.id),
        details={"stripe_session_id": session.id},
        ip_address=request.client.host if request.client else None,
    )

    return {
        "success": True,
        "payment_url": session.url,
        "stripe_session_id": session.id,
    }


# ============================================================================
# Admin: Store a manual payment URL (QuickBooks link, bank transfer, etc.)
# ============================================================================

@router.post("/api/invoices/{invoice_id}/set-payment-url")
async def set_manual_payment_url(
    invoice_id: UUID,
    request: Request,
    payment_url: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Store an external payment URL (QuickBooks, wire instructions page, etc.)."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.hosted_invoice_url = payment_url
    invoice.type = "quickbooks"
    if invoice.status == "pending":
        invoice.status = "sent"
    db.commit()

    return {"success": True, "payment_url": payment_url}


# ============================================================================
# Stripe Webhook — validates signature, updates invoice status
# ============================================================================

@router.post("/api/payments/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """
    Receive Stripe webhook events.
    Validates HMAC signature before processing — rejects unsigned payloads.
    Never stores card or banking information.
    """
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    payload = await request.body()

    try:
        stripe.api_key = settings.stripe_secret_key
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook parse error: {exc}")

    event_type = event["type"]
    logger.info("Stripe webhook received: %s", event_type)

    if event_type == "checkout.session.completed":
        session_obj = event["data"]["object"]
        invoice_id = session_obj.get("metadata", {}).get("invoice_id")
        if invoice_id:
            invoice = db.query(Invoice).filter(
                Invoice.id == invoice_id
            ).first()
            if invoice:
                from datetime import datetime
                invoice.status = "paid"
                invoice.paid_at = datetime.utcnow()
                db.commit()
                log_action(
                    db,
                    action="invoice_paid",
                    resource_type="invoice",
                    resource_id=str(invoice.id),
                    details={
                        "stripe_session_id": session_obj.get("id"),
                        "payment_status": session_obj.get("payment_status"),
                    },
                )

    elif event_type == "checkout.session.expired":
        session_obj = event["data"]["object"]
        invoice_id = session_obj.get("metadata", {}).get("invoice_id")
        if invoice_id:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if invoice and invoice.status == "sent":
                invoice.status = "pending"
                db.commit()

    return {"received": True, "type": event_type}
