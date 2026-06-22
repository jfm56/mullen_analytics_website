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
from pydantic import BaseModel

from ..database import get_db
from ..config import get_settings
from ..models.invoice import Invoice
from ..models.user import User, Profile
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


def _price_for_plan(slug):
    return {
        "starter": settings.stripe_price_starter,
        "professional": settings.stripe_price_professional,
        "enterprise": settings.stripe_price_enterprise,
    }.get(slug or "") or None


def _activate_subscription(db, user_id, plan, customer=None, subscription=None):
    """Webhook handler: flip a member's plan to active once Stripe confirms the subscription."""
    prof = db.query(Profile).filter(Profile.id == user_id).first()
    if not prof:
        return
    if plan:
        prof.plan = plan
    prof.plan_status = "active"
    prof.client_status = "active"
    if customer:
        prof.stripe_customer_id = customer
    if subscription:
        prof.stripe_subscription_id = subscription
    db.commit()
    try:
        log_action(db, action="subscription_activated", user_id=str(user_id), details={"plan": plan})
    except Exception:
        pass


def _set_subscription_status(db, sub_obj, status):
    """Sync a plan's status from a Stripe subscription event (by sub id, then metadata)."""
    if not status:
        return
    sub_id = sub_obj.get("id")
    meta = sub_obj.get("metadata", {}) or {}
    prof = None
    if sub_id:
        prof = db.query(Profile).filter(Profile.stripe_subscription_id == sub_id).first()
    if not prof and meta.get("user_id"):
        prof = db.query(Profile).filter(Profile.id == meta["user_id"]).first()
    if not prof:
        return
    prof.plan_status = status
    if status == "canceled":
        prof.client_status = "churned"
    db.commit()


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
# Self-serve subscription billing — plan checkout
# ============================================================================

class CheckoutRequest(BaseModel):
    plan: Optional[str] = None


@router.get("/api/billing/config")
async def billing_config():
    """Whether self-serve subscription billing is live (Stripe key + ≥1 price set)."""
    enabled = bool(settings.stripe_secret_key) and any(
        (settings.stripe_price_starter, settings.stripe_price_professional, settings.stripe_price_enterprise)
    )
    return {
        "enabled": enabled,
        "publishable_key": settings.stripe_publishable_key or None,
        "priced_plans": [s for s in ("starter", "professional", "enterprise") if _price_for_plan(s)],
    }


@router.post("/api/billing/checkout")
async def create_subscription_checkout(
    data: CheckoutRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe subscription Checkout Session for the current user's plan.
    The webhook activates the plan on payment; no card data touches our servers."""
    _get_stripe()
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    plan = (data.plan or profile.plan or "").strip()
    if not plan or plan == "free_trial":
        raise HTTPException(status_code=400, detail="Choose a paid plan to subscribe.")
    price_id = _price_for_plan(plan)
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Subscription billing isn't set up for the {plan} plan yet.")

    try:
        kwargs = dict(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.app_url}/portal/dashboard?subscribed=1",
            cancel_url=f"{settings.app_url}/portal/settings?billing=cancelled",
            metadata={"user_id": str(current_user.id), "plan": plan},
            subscription_data={"metadata": {"user_id": str(current_user.id), "plan": plan}},
        )
        if profile.stripe_customer_id:
            kwargs["customer"] = profile.stripe_customer_id
        else:
            kwargs["customer_email"] = current_user.email
        session = stripe.checkout.Session.create(**kwargs)
    except stripe.StripeError as exc:
        logger.error("Stripe subscription session error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Stripe error: {getattr(exc, 'user_message', None) or str(exc)}")

    try:
        log_action(db, action="subscription_checkout_started", user_id=str(current_user.id),
                   details={"plan": plan, "stripe_session_id": session.id},
                   ip_address=request.client.host if request.client else None)
    except Exception:
        pass
    return {"checkout_url": session.url, "stripe_session_id": session.id}


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
        meta = session_obj.get("metadata", {}) or {}
        invoice_id = meta.get("invoice_id")
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
        elif meta.get("user_id") and session_obj.get("mode") == "subscription":
            # Self-serve plan subscription completed → activate the member's plan.
            _activate_subscription(
                db, meta["user_id"], meta.get("plan"),
                customer=session_obj.get("customer"),
                subscription=session_obj.get("subscription"),
            )

    elif event_type == "customer.subscription.deleted":
        _set_subscription_status(db, event["data"]["object"], "canceled")

    elif event_type == "customer.subscription.updated":
        sub = event["data"]["object"]
        _status = {
            "active": "active", "trialing": "active", "past_due": "past_due",
            "unpaid": "past_due", "canceled": "canceled",
        }.get(sub.get("status"))
        _set_subscription_status(db, sub, _status)

    elif event_type == "checkout.session.expired":
        session_obj = event["data"]["object"]
        invoice_id = session_obj.get("metadata", {}).get("invoice_id")
        if invoice_id:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if invoice and invoice.status == "sent":
                invoice.status = "pending"
                db.commit()

    return {"received": True, "type": event_type}
