from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


class Upload(Base):
    """Client uploads table - matches existing Supabase uploads table"""
    __tablename__ = "uploads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True)
    
    # File info
    original_filename = Column(String(500), nullable=False)
    storage_path = Column(Text, nullable=False)  # S3/GCS path
    content_type = Column(String(255), nullable=True)
    size_bytes = Column(Integer, default=0)
    
    # Status
    status = Column(String(50), default="pending")  # pending, processing, done, error
    
    # Dashboard refresh workflow
    refresh_status = Column(String(50), default="none")  # none, pending, processing, completed, failed
    refresh_started_at = Column(DateTime, nullable=True)
    refresh_completed_at = Column(DateTime, nullable=True)
    refresh_error = Column(Text, nullable=True)
    
    # Metadata
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="uploads")
