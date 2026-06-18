"""
Error / issue log — captures application errors so an admin can see, from one
place, what's breaking for users (IT support view).

Two sources:
  • "server" — unhandled exceptions caught by the global handler in main.py
    (status 500s), with the endpoint, the user who hit it, and a stacktrace.
  • "client" — front-end JavaScript errors reported by the browser via
    POST /api/errors/client.

User-*reported* issues live separately in the Feedback model (client_feedback);
the admin Errors view surfaces both.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class ErrorLog(Base):
    __tablename__ = "error_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    source = Column(String(20), default="server", index=True)   # server | client
    level = Column(String(20), default="error")                  # error | warning
    error_type = Column(String(150), nullable=True)
    message = Column(Text, nullable=False)
    path = Column(String(500), nullable=True)                    # request endpoint or page route
    method = Column(String(10), nullable=True)
    status_code = Column(Integer, nullable=True)
    stacktrace = Column(Text, nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    resolved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
