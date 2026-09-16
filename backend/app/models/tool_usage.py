"""
Usage records for the public marketing tools (Revenue Checker, Profit Calculator).

Full capture: the inputs a visitor entered and the results they were shown, so the
owner can see how the tools are used and improve them. No identity is stored
unless the visitor also submits the message form — then `lead_id` links to that
Lead. IP is never stored (used only for rate-limiting). The tool pages disclose
this; see the privacy notice on each tool.
"""
import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class ToolUsage(Base):
    __tablename__ = "tool_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool = Column(String(50), nullable=False, index=True)   # revenue_checker | profit_calculator
    inputs = Column(JSON, nullable=True)                    # raw figures the visitor entered
    results = Column(JSON, nullable=True)                   # what the tool computed / showed
    anon_id = Column(String(64), nullable=True, index=True) # random client id (localStorage), groups repeat uses
    referrer = Column(String(500), nullable=True)
    lead_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # set if they also submitted the message form
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
