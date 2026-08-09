"""
Lead outreach API. Admin endpoints draft/edit/send (draft-for-review, human-gated
in services/leadgen/outreach.py) + a PUBLIC one-click unsubscribe that adds the
recipient to the suppression list (CAN-SPAM).
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.lead import Lead, OutreachMessage
from ..models.user import User
from ..services.leadgen import outreach
from .auth import require_admin_or_upstream

router = APIRouter(tags=["outreach"])


def _msg_dict(m: OutreachMessage) -> dict:
    return {
        "id": str(m.id),
        "lead_id": str(m.lead_id),
        "subject": m.subject,
        "body_text": m.body_text,
        "status": m.status,
        "sent_at": m.sent_at.isoformat() if m.sent_at else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.post("/admin/leads/{lead_id}/outreach/draft")
def draft(lead_id: str, current_user: User = Depends(require_admin_or_upstream), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return outreach.draft_outreach(db, lead)


@router.get("/admin/leads/{lead_id}/outreach")
def list_outreach(lead_id: str, current_user: User = Depends(require_admin_or_upstream), db: Session = Depends(get_db)):
    rows = (
        db.query(OutreachMessage)
        .filter(OutreachMessage.lead_id == lead_id)
        .order_by(OutreachMessage.created_at.desc())
        .all()
    )
    return {"messages": [_msg_dict(m) for m in rows]}


class OutreachEdit(BaseModel):
    subject: Optional[str] = None
    body_text: Optional[str] = None


@router.patch("/admin/outreach/{message_id}")
def edit(message_id: str, body: OutreachEdit,
         current_user: User = Depends(require_admin_or_upstream), db: Session = Depends(get_db)):
    m = db.query(OutreachMessage).filter(OutreachMessage.id == message_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Message not found")
    if m.status == "sent":
        raise HTTPException(status_code=400, detail="Message already sent")
    if body.subject is not None:
        m.subject = body.subject[:500]
    if body.body_text is not None:
        m.body_text = body.body_text
    db.commit()
    return {"ok": True}


@router.post("/admin/outreach/{message_id}/send")
def send(message_id: str, current_user: User = Depends(require_admin_or_upstream), db: Session = Depends(get_db)):
    """Explicit admin send of one reviewed draft (never automatic)."""
    return outreach.send_outreach(db, message_id, current_user.id)


@router.post("/admin/leads/{lead_id}/suppress")
def suppress(lead_id: str, current_user: User = Depends(require_admin_or_upstream), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead or not lead.contact_email:
        raise HTTPException(status_code=400, detail="Lead has no email address")
    outreach.add_suppression(db, lead.contact_email, "manual")
    return {"ok": True}


@router.get("/outreach/unsubscribe", response_class=HTMLResponse)
def unsubscribe(token: str, db: Session = Depends(get_db)):
    """Public one-click unsubscribe (CAN-SPAM). Adds the recipient to suppression."""
    email = outreach.verify_unsubscribe(token)
    if not email:
        return HTMLResponse("<h2 style='font-family:Arial'>Invalid or expired unsubscribe link.</h2>", status_code=400)
    outreach.add_suppression(db, email, "unsubscribe")
    return HTMLResponse(
        "<div style='font-family:Arial,sans-serif;max-width:520px;margin:60px auto;text-align:center'>"
        "<h2>You're unsubscribed</h2>"
        f"<p><strong>{email}</strong> has been removed. You will not receive further outreach "
        "from Mullen Analytics &amp; Data Solutions.</p></div>"
    )
