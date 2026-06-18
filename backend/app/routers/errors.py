"""
Client-side error reporting. The browser posts uncaught JS errors here so they
land in the same error_logs table the admin Errors view reads. Authenticated so
every report is attributed to the user who hit it.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.error_log import ErrorLog
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/errors", tags=["errors"])


class ClientErrorReport(BaseModel):
    message: str
    path: Optional[str] = None
    stack: Optional[str] = None
    level: Optional[str] = "error"
    error_type: Optional[str] = None


@router.post("/client")
async def report_client_error(
    data: ClientErrorReport,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a front-end error for the current user (IT visibility)."""
    entry = ErrorLog(
        user_id=current_user.id,
        source="client",
        level=(data.level or "error")[:20],
        error_type=(data.error_type or "ClientError")[:150],
        message=(data.message or "")[:2000],
        path=(data.path or "")[:500] or None,
        stacktrace=(data.stack or "")[:8000] or None,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.add(entry)
    db.commit()
    return {"success": True}
