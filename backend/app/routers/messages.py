from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.user import User, Profile
from ..models.message import Message
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/messages", tags=["messages"])


class MessageCreate(BaseModel):
    user_id: UUID
    from_name: Optional[str] = "Mullen Analytics"
    subject: str
    body: str


class MessageResponse(BaseModel):
    id: UUID
    user_id: UUID
    from_name: Optional[str] = None
    subject: str
    body: str
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class MessageUpdate(BaseModel):
    read_at: Optional[datetime] = None


@router.get("/", response_model=List[MessageResponse])
async def get_my_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's messages."""
    messages = db.query(Message).filter(
        Message.user_id == current_user.id
    ).order_by(Message.created_at.desc()).all()
    
    return messages


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count of unread messages."""
    count = db.query(Message).filter(
        Message.user_id == current_user.id,
        Message.read_at.is_(None)
    ).count()
    
    return {"count": count}


@router.patch("/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: UUID,
    updates: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a message (mark as read)."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.user_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if updates.read_at is not None:
        message.read_at = updates.read_at
    
    db.commit()
    db.refresh(message)
    
    return message


@router.post("/mark-read")
async def mark_messages_read(
    message_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark multiple messages as read."""
    now = datetime.utcnow()
    
    db.query(Message).filter(
        Message.id.in_(message_ids),
        Message.user_id == current_user.id
    ).update({"read_at": now}, synchronize_session=False)
    
    db.commit()
    
    return {"success": True, "marked_count": len(message_ids)}


@router.delete("/{message_id}")
async def delete_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a message."""
    result = db.query(Message).filter(
        Message.id == message_id,
        Message.user_id == current_user.id
    ).delete()
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    db.commit()
    
    return {"success": True}


@router.post("/delete-bulk")
async def delete_messages_bulk(
    message_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete multiple messages."""
    result = db.query(Message).filter(
        Message.id.in_(message_ids),
        Message.user_id == current_user.id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"success": True, "deleted_count": result}


# Admin endpoints
@router.get("/admin", response_model=List[MessageResponse])
async def get_all_messages(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all messages (admin only)."""
    messages = db.query(Message).order_by(Message.created_at.desc()).limit(100).all()
    return messages


@router.post("/admin", response_model=MessageResponse)
async def create_message_admin(
    message: MessageCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a message for a user (admin only)."""
    new_message = Message(
        user_id=message.user_id,
        from_name=message.from_name,
        subject=message.subject,
        body=message.body,
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return new_message


@router.post("/", response_model=MessageResponse)
async def create_message(
    message: MessageCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a message for a user (admin only)."""
    new_message = Message(
        user_id=message.user_id,
        from_name=message.from_name,
        subject=message.subject,
        body=message.body,
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return new_message


@router.get("/admin/user/{user_id}", response_model=List[MessageResponse])
async def get_user_messages(
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get messages for a specific user (admin only)."""
    messages = db.query(Message).filter(
        Message.user_id == user_id
    ).order_by(Message.created_at.desc()).all()
    
    return messages
