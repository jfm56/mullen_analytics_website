import uuid
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from ..models.agency import AuditLog

logger = logging.getLogger(__name__)


def log_action(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    agency_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Persist an audit log entry and return it."""
    try:
        entry = AuditLog(
            agency_id=uuid.UUID(agency_id) if agency_id else None,
            user_id=uuid.UUID(user_id)   if user_id   else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as exc:
        logger.error("Failed to write audit log [%s]: %s", action, exc)
        db.rollback()
        raise
