from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


class Project(Base):
    """Projects table - one client can have many projects"""
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Project info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active")  # active, completed, on_hold, archived
    phase = Column(String(50), default="discovery")  # discovery, planning, execution, review, completed
    
    # Timeline
    start_date = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Financials
    contract_value = Column(Numeric(12, 2), default=0)
    budget_cents = Column(Integer, nullable=True)

    # end_date per spec (deadline already exists for backward compat)
    end_date = Column(DateTime, nullable=True)
    
    # Dashboard embed (per-project dashboards)
    tableau_embed_html = Column(Text, nullable=True)
    tableau_embed_type = Column(String(50), default="dashboard")
    tableau_open_url = Column(Text, nullable=True)
    
    # Soft delete
    archived_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("User", foreign_keys=[client_id])
    documents = relationship("Document", back_populates="project")
    uploads = relationship("Upload", back_populates="project")
    invoices = relationship("Invoice", back_populates="project")
    tasks = relationship("EnhancedTask", back_populates="project")
    data_uploads = relationship("DataUpload", back_populates="project")
