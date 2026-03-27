from fastapi import APIRouter, Depends, HTTPException, Response, Request, Cookie
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..config import get_settings
from ..schemas.auth import (
    LoginRequest, LoginResponse, LogoutResponse,
    FullSessionResponse, UserResponse, ProfileResponse,
    PasswordResetRequest, PasswordResetResponse,
    PasswordResetConfirm,
)
from ..services.auth import (
    authenticate_user, create_session, validate_session,
    delete_session, get_user_profile,
    create_password_reset_token, use_password_reset_token,
)
from ..models.user import User, Profile

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def set_session_cookie(response: Response, token: str):
    """Set the session cookie on the response."""
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=settings.session_cookie_httponly,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def clear_session_cookie(response: Response):
    """Clear the session cookie."""
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
    )


def get_session_token(request: Request) -> Optional[str]:
    """Extract session token from cookie."""
    return request.cookies.get(settings.session_cookie_name)


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate user and create session with HTTP-only cookie."""
    user = authenticate_user(db, login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get client info for session
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Create session
    session, raw_token = create_session(
        db, str(user.id), ip_address, user_agent
    )
    
    # Update last login on profile
    profile = get_user_profile(db, str(user.id))
    if profile:
        profile.last_login = datetime.utcnow()
        db.commit()
    
    # Set cookie
    set_session_cookie(response, raw_token)
    
    return LoginResponse(
        success=True,
        message="Login successful",
        user=UserResponse(id=user.id, email=user.email),
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Logout user and clear session."""
    token = get_session_token(request)
    
    if token:
        delete_session(db, token)
    
    clear_session_cookie(response)
    
    return LogoutResponse(success=True, message="Logged out successfully")


@router.get("/session", response_model=FullSessionResponse)
async def get_session(
    request: Request,
    db: Session = Depends(get_db),
):
    """Get current session and user info. Supports impersonation for admins."""
    token = get_session_token(request)
    
    if not token:
        return FullSessionResponse(authenticated=False)
    
    user = validate_session(db, token)
    
    if not user:
        return FullSessionResponse(authenticated=False)
    
    profile = get_user_profile(db, str(user.id))
    
    # Check for impersonation cookie (admin viewing as client)
    impersonation_client_id = request.cookies.get("ma_impersonate")
    
    if impersonation_client_id and profile and profile.role == "admin":
        # Admin is impersonating a client - return client's profile
        client_profile = get_user_profile(db, impersonation_client_id)
        if client_profile:
            return FullSessionResponse(
                authenticated=True,
                user=UserResponse(id=client_profile.id, email=client_profile.email),
                profile=ProfileResponse.model_validate(client_profile),
                impersonating=True,
                admin_user=UserResponse(id=user.id, email=user.email),
            )
    
    return FullSessionResponse(
        authenticated=True,
        user=UserResponse(id=user.id, email=user.email),
        profile=ProfileResponse.model_validate(profile) if profile else None,
    )


@router.post("/request-password-reset", response_model=PasswordResetResponse)
async def request_password_reset(
    data: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset email."""
    from ..models.user import User
    
    user = db.query(User).filter(User.email == data.email.lower()).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return PasswordResetResponse(
            success=True,
            message="If an account exists with this email, a reset link has been sent."
        )
    
    # Create reset token
    raw_token = create_password_reset_token(db, str(user.id))
    
    # TODO: Send email with reset link
    # For now, log the token (remove in production)
    reset_url = f"{settings.app_url}/portal/reset-password?token={raw_token}"
    print(f"Password reset URL for {data.email}: {reset_url}")
    
    return PasswordResetResponse(
        success=True,
        message="If an account exists with this email, a reset link has been sent."
    )


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    data: PasswordResetConfirm,
    response: Response,
    db: Session = Depends(get_db),
):
    """Reset password using token."""
    user = use_password_reset_token(db, data.token, data.new_password)
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Clear any existing session cookies
    clear_session_cookie(response)
    
    return PasswordResetResponse(
        success=True,
        message="Password reset successfully. Please log in with your new password."
    )


# Dependency for protected routes
async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Dependency to get current authenticated user."""
    token = get_session_token(request)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = validate_session(db, token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    
    return user


async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Dependency to optionally get current user (doesn't raise if not authenticated)."""
    token = get_session_token(request)
    
    if not token:
        return None
    
    return validate_session(db, token)


async def require_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Dependency to require admin role."""
    profile = get_user_profile(db, str(current_user.id))
    
    if not profile or profile.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return current_user
