"""
Admin lead-discovery API (admin-gated). Lists discovered leads, runs discovery
on demand, and updates a lead's status. Outreach (draft/approve/send) is added
in Phase 4.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.lead import Lead
from ..models.user import User
from ..services.leadgen import discover as lead_discover
from ..services.leadgen import llm as lead_llm
from ..services.leadgen import websearch as lead_search
from .auth import require_admin

router = APIRouter(prefix="/admin/leads", tags=["admin-leads"])


def _to_dict(l: Lead) -> dict:
    return {
        "id": str(l.id),
        "company": l.company,
        "contact_name": l.contact_name,
        "contact_email": l.contact_email,
        "contact_role": l.contact_role,
        "website": l.website,
        "vertical": l.vertical,
        "source": l.source,
        "source_url": l.source_url,
        "need_summary": l.need_summary,
        "signal": l.signal,
        "status": l.status,
        "score": l.score,
        "discovered_at": l.discovered_at.isoformat() if l.discovered_at else None,
    }


@router.get("")
def list_leads(
    status: Optional[str] = None,
    vertical: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Lead)
    if status:
        q = q.filter(Lead.status == status)
    if vertical:
        q = q.filter(Lead.vertical == vertical)
    rows = q.order_by(Lead.score.desc(), Lead.discovered_at.desc()).limit(max(1, min(int(limit), 500))).all()
    return {
        "total": db.query(Lead).count(),
        "ready": bool(lead_search.available() and lead_llm.available()),
        "leads": [_to_dict(l) for l in rows],
    }


@router.post("/discover")
def discover(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Run a discovery pass now (used by the admin 'Discover' button)."""
    return lead_discover.run_discovery(db)


class StatusUpdate(BaseModel):
    status: str


@router.patch("/{lead_id}")
def update_lead(
    lead_id: str,
    body: StatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = (body.status or "researched")[:30]
    db.commit()
    return {"ok": True}
