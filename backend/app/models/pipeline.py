from sqlalchemy import Column, String, DateTime, Text, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from ..database import Base


class RevenuePipeline(Base):
    """Revenue pipeline table - matches existing Supabase revenue_pipeline table"""
    __tablename__ = "revenue_pipeline"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    # Deal info
    deal_name = Column(String(500), nullable=False)
    company_name = Column(String(255), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    
    # Pipeline stage
    stage = Column(String(100), default="lead")  # lead, qualified, proposal, negotiation, closed_won, closed_lost
    probability = Column(Float, default=0)  # 0-100
    
    # Value
    deal_value = Column(Float, default=0)
    currency = Column(String(10), default="USD")
    
    # Dates
    expected_close_date = Column(DateTime, nullable=True)
    actual_close_date = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
