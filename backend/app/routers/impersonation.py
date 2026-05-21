from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.impersonation import ImpersonationLog
from ..models.user import User, Profile
from .auth import get_current_user, require_admin, get_session_token
from ..config import get_settings

settings = get_settings()
router = APIRouter(prefix="/impersonation", tags=["impersonation"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class ImpersonationStart(BaseModel):
    client_id: UUID


class ImpersonationLogEntry(BaseModel):
    action: str
    page_path: Optional[str] = None
    action_details: Optional[dict] = None


class ImpersonationLogResponse(BaseModel):
    id: UUID
    admin_id: UUID
    client_id: UUID
    action: str
    page_path: Optional[str] = None
    action_details: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ImpersonationSession(BaseModel):
    active: bool
    client_id: Optional[UUID] = None
    client_email: Optional[str] = None
    client_name: Optional[str] = None
    started_at: Optional[datetime] = None


# ============================================================================
# Impersonation Cookie Management
# ============================================================================

IMPERSONATION_COOKIE_NAME = "ma_impersonate"


def set_impersonation_cookie(response: Response, client_id: str):
    """Set impersonation cookie."""
    response.set_cookie(
        key=IMPERSONATION_COOKIE_NAME,
        value=client_id,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=3600,  # 1 hour max impersonation session
        path="/",
    )


def clear_impersonation_cookie(response: Response):
    """Clear impersonation cookie."""
    response.delete_cookie(
        key=IMPERSONATION_COOKIE_NAME,
        path="/",
    )


def get_impersonation_client_id(request: Request) -> Optional[str]:
    """Get impersonated client ID from cookie."""
    return request.cookies.get(IMPERSONATION_COOKIE_NAME)


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.post("/start")
async def start_impersonation(
    data: ImpersonationStart,
    request: Request,
    response: Response,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Start impersonating a client (admin only)."""
    # Verify client exists
    client_profile = db.query(Profile).filter(Profile.id == data.client_id).first()
    
    if not client_profile:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client_profile.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot impersonate another admin")
    
    # Log impersonation start
    log_entry = ImpersonationLog(
        admin_id=admin.id,
        client_id=data.client_id,
        action="start_session",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log_entry)
    db.commit()
    
    # Set impersonation cookie
    set_impersonation_cookie(response, str(data.client_id))
    
    return {
        "success": True,
        "message": f"Now viewing portal as {client_profile.email}",
        "client": {
            "id": str(client_profile.id),
            "email": client_profile.email,
            "full_name": client_profile.full_name,
            "company": client_profile.company,
        }
    }


@router.post("/end")
async def end_impersonation(
    request: Request,
    response: Response,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """End impersonation session (admin only)."""
    client_id = get_impersonation_client_id(request)
    
    if client_id:
        # Log impersonation end
        log_entry = ImpersonationLog(
            admin_id=admin.id,
            client_id=UUID(client_id),
            action="end_session",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(log_entry)
        db.commit()
    
    # Clear impersonation cookie
    clear_impersonation_cookie(response)
    
    return {"success": True, "message": "Impersonation session ended"}


@router.get("/status", response_model=ImpersonationSession)
async def get_impersonation_status(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get current impersonation status (admin only)."""
    client_id = get_impersonation_client_id(request)
    
    if not client_id:
        return ImpersonationSession(active=False)
    
    client_profile = db.query(Profile).filter(Profile.id == UUID(client_id)).first()
    
    if not client_profile:
        return ImpersonationSession(active=False)
    
    # Get the most recent start_session log
    last_start = db.query(ImpersonationLog).filter(
        ImpersonationLog.admin_id == admin.id,
        ImpersonationLog.client_id == UUID(client_id),
        ImpersonationLog.action == "start_session"
    ).order_by(ImpersonationLog.created_at.desc()).first()
    
    return ImpersonationSession(
        active=True,
        client_id=UUID(client_id),
        client_email=client_profile.email,
        client_name=client_profile.full_name,
        started_at=last_start.created_at if last_start else None,
    )


@router.post("/log")
async def log_impersonation_action(
    data: ImpersonationLogEntry,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Log an action during impersonation (admin only)."""
    client_id = get_impersonation_client_id(request)
    
    if not client_id:
        raise HTTPException(status_code=400, detail="No active impersonation session")
    
    log_entry = ImpersonationLog(
        admin_id=admin.id,
        client_id=UUID(client_id),
        action=data.action,
        page_path=data.page_path,
        action_details=data.action_details,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log_entry)
    db.commit()
    
    return {"success": True}


@router.get("/logs", response_model=List[ImpersonationLogResponse])
async def get_impersonation_logs(
    client_id: Optional[UUID] = None,
    admin_id: Optional[UUID] = None,
    limit: int = 100,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get impersonation logs (admin only)."""
    query = db.query(ImpersonationLog)
    
    if client_id:
        query = query.filter(ImpersonationLog.client_id == client_id)
    if admin_id:
        query = query.filter(ImpersonationLog.admin_id == admin_id)
    
    logs = query.order_by(ImpersonationLog.created_at.desc()).limit(limit).all()
    return logs


@router.get("/logs/client/{client_id}", response_model=List[ImpersonationLogResponse])
async def get_client_impersonation_logs(
    client_id: UUID,
    limit: int = 50,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get impersonation logs for a specific client (admin only)."""
    logs = db.query(ImpersonationLog).filter(
        ImpersonationLog.client_id == client_id
    ).order_by(ImpersonationLog.created_at.desc()).limit(limit).all()
    
    return logs
