from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from ..database import Base


class Feedback(Base):
    """Client-submitted recommendations and issues from the portal."""
    __tablename__ = "client_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    # "recommendation" | "issue"
    type = Column(String(20), nullable=False, default="recommendation")
    title = Column(String(300), nullable=False)
    body = Column(Text, nullable=False)
    # "open" | "in_review" | "planned" | "resolved" | "declined"
    status = Column(String(20), nullable=False, default="open", index=True)
    admin_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
