from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, field_validator
from datetime import datetime

from ..database import get_db
from ..models.user import User, Profile
from ..models.feedback import Feedback
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/feedback", tags=["feedback"])

VALID_TYPES = {"recommendation", "issue"}
VALID_STATUSES = {"open", "in_review", "planned", "resolved", "declined"}


class FeedbackCreate(BaseModel):
    type: str
    title: str
    body: str

    @field_validator("type")
    @classmethod
    def _type_ok(cls, v):
        if v not in VALID_TYPES:
            raise ValueError("type must be 'recommendation' or 'issue'")
        return v

    @field_validator("title", "body")
    @classmethod
    def _not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class FeedbackResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    body: str
    status: str
    admin_response: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeedbackAdminResponse(FeedbackResponse):
    client_name: Optional[str] = None
    client_email: Optional[str] = None


class FeedbackStatusUpdate(BaseModel):
    status: Optional[str] = None
    admin_response: Optional[str] = None

    @field_validator("status")
    @classmethod
    def _status_ok(cls, v):
        if v is not None and v not in VALID_STATUSES:
            raise ValueError("invalid status")
        return v


# ── Client endpoints ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[FeedbackResponse])
async def list_my_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current client's recommendations and issues."""
    return (
        db.query(Feedback)
        .filter(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )


@router.post("/", response_model=FeedbackResponse)
async def create_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a recommendation or issue."""
    item = Feedback(
        user_id=current_user.id,
        type=payload.type,
        title=payload.title,
        body=payload.body,
        status="open",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{feedback_id}")
async def delete_my_feedback(
    feedback_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete one of the current client's own submissions."""
    result = (
        db.query(Feedback)
        .filter(Feedback.id == feedback_id, Feedback.user_id == current_user.id)
        .delete()
    )
    if result == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    db.commit()
    return {"success": True}


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin", response_model=List[FeedbackAdminResponse])
async def list_all_feedback(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all client feedback (admin only), with the submitting client's name."""
    rows = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(500).all()
    user_ids = {r.user_id for r in rows}
    profiles = (
        {p.id: p for p in db.query(Profile).filter(Profile.id.in_(user_ids)).all()}
        if user_ids else {}
    )
    users = (
        {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}
        if user_ids else {}
    )
    out: List[FeedbackAdminResponse] = []
    for r in rows:
        prof = profiles.get(r.user_id)
        usr = users.get(r.user_id)
        out.append(FeedbackAdminResponse(
            id=r.id, user_id=r.user_id, type=r.type, title=r.title, body=r.body,
            status=r.status, admin_response=r.admin_response,
            created_at=r.created_at, updated_at=r.updated_at,
            client_name=(prof.full_name if prof else None) or (usr.email if usr else None),
            client_email=usr.email if usr else None,
        ))
    return out


@router.patch("/admin/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: UUID,
    updates: FeedbackStatusUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update status and/or add an admin response (admin only)."""
    item = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
    if updates.status is not None:
        item.status = updates.status
    if updates.admin_response is not None:
        item.admin_response = updates.admin_response
    db.commit()
    db.refresh(item)
    return item
