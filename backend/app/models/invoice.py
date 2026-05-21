from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


class Invoice(Base):
    """Invoices table - matches existing Supabase invoices table"""
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True)
    
    # Invoice details
    number = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    amount_due = Column(Integer, default=0)  # In cents
    currency = Column(String(10), default="USD")
    status = Column(String(50), default="pending")  # pending, paid, overdue, cancelled, draft
    
    # Type and source
    type = Column(String(50), default="uploaded")  # 'uploaded', 'stripe', 'quickbooks'
    stripe_invoice_id = Column(String(255), nullable=True)
    hosted_invoice_url = Column(Text, nullable=True)
    
    # QuickBooks integration
    quickbooks_invoice_id = Column(String(255), nullable=True, index=True)
    quickbooks_customer_id = Column(String(255), nullable=True)
    quickbooks_payment_url = Column(Text, nullable=True)
    quickbooks_synced_at = Column(DateTime, nullable=True)
    
    # File (for uploaded invoices)
    file_path = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    original_filename = Column(String(255), nullable=True)
    
    # Soft delete
    archived_at = Column(DateTime, nullable=True)
    
    # Dates
    invoice_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="invoices")
