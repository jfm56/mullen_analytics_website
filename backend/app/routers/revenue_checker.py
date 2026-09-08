"""
Public Business Revenue Checker lead capture.

The /revenue-checker page runs its analysis entirely in the browser; when a
visitor asks for help, this stores the submission as an inbound Lead
(source = revenue_checker) so it surfaces in the admin Leads view, and emails a
heads-up. No auth — rate-limited by IP.
"""
import asyncio
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.lead import Lead
from ..services.email import send_email
from ..services.signup_guard import check_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/revenue-checker", tags=["revenue-checker"])

_NOTIFY_TO = os.getenv("ADMIN_EMAIL") or os.getenv("CONTACT_EMAIL") or "jmullen@mullenanalytics.com"


_TOOLS = {
    "revenue_checker": "Inbound - revenue checker",
    "profit_calculator": "Inbound - profit calculator",
}


class RevenueCheckerLead(BaseModel):
    name: Optional[str] = None
    email: str
    company: Optional[str] = None
    message: Optional[str] = None
    revenue_summary: Optional[str] = None   # optional text snapshot of their numbers + analysis
    tool: Optional[str] = None              # which free tool this came from


@router.post("/lead")
async def submit_revenue_lead(payload: RevenueCheckerLead, request: Request, db: Session = Depends(get_db)):
    """Public: capture a revenue-checker help request as an inbound Lead."""
    email = (payload.email or "").strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="A valid email is required.")

    ip = request.client.host if request.client else None
    if not check_rate_limit(f"revlead:{ip}", max_calls=5, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many submissions — please try again later.")

    company = (payload.company or "").strip() or (payload.name or "").strip() or "Unknown business"
    parts = []
    if (payload.message or "").strip():
        parts.append(payload.message.strip())
    if (payload.revenue_summary or "").strip():
        parts.append("--- Revenue snapshot (from the checker) ---\n" + payload.revenue_summary.strip())
    need = "\n\n".join(parts) or None

    tool = (payload.tool or "revenue_checker").strip().lower()
    signal = _TOOLS.get(tool, "Inbound - tool")
    source = tool if tool in _TOOLS else "revenue_checker"

    lead = Lead(
        company=company[:300],
        contact_name=(payload.name or None),
        contact_email=email[:320],
        vertical="smb",
        source=source,
        signal=signal,
        need_summary=need,
        status="researched",
        score=80,   # warm inbound: sorts to the top of the admin leads list
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    async def _notify():
        try:
            body = (need or "(no message)").replace("<", "&lt;").replace(">", "&gt;")
            html = (
                f"<p><strong>New Revenue Checker lead</strong></p>"
                f"<p><strong>{company}</strong><br/>{(payload.name or '')} &middot; {email}</p>"
                f"<pre style='white-space:pre-wrap;font-family:inherit'>{body[:6000]}</pre>"
            )
            await asyncio.wait_for(
                send_email(_NOTIFY_TO, f"Revenue Checker lead: {company}", html), timeout=10.0
            )
        except Exception as exc:  # noqa: BLE001
            logger.info("revenue-checker notify email skipped: %s", exc)

    asyncio.create_task(_notify())
    return {"ok": True, "lead_id": str(lead.id)}
