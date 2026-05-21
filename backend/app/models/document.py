from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


class Document(Base):
    """Admin-uploaded documents for clients"""
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # File info
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    original_filename = Column(String(500), nullable=False)
    storage_path = Column(Text, nullable=False)
    content_type = Column(String(255), nullable=True)
    size_bytes = Column(Integer, default=0)
    
    # Metadata
    category = Column(String(100), nullable=True)  # report, contract, deliverable, etc.
    document_type = Column(String(50), default="deliverable")  # proposal, contract, invoice, report, deliverable, data, other
    visibility = Column(String(50), default="client_visible")  # admin_only, internal, client_visible
    generated_by = Column(String(100), nullable=True)  # report_generator, manual, etc.
    
    # Soft delete
    archived_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="documents")
