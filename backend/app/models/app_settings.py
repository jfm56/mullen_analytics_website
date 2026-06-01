from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from ..database import Base


class AppSetting(Base):
    """Platform-wide configurable settings stored as key-value pairs."""

    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True, default="general")
    value_type = Column(String(50), default="string")  # string | boolean | integer | float | json
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False)
    is_sensitive = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
