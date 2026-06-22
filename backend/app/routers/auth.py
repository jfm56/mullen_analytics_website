from fastapi import APIRouter, Depends, HTTPException, Response, Request, Cookie
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import asyncio

from ..database import get_db
from ..config import get_settings
from ..schemas.auth import (
    LoginRequest, LoginResponse, LogoutResponse,
    FullSessionResponse, UserResponse, ProfileResponse,
    PasswordResetRequest, PasswordResetResponse,
    PasswordResetConfirm,
    RegisterRequest, RegisterResponse,
)
from ..services.auth import (
    authenticate_user, create_session, validate_session,
    delete_session, get_user_profile, create_user_with_profile,
    create_password_reset_token, use_password_reset_token,
)
from ..services.email import send_password_reset_email
from ..services.audit import log_action
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
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user = authenticate_user(db, login_data.email, login_data.password)

    if not user:
        # Audit the failed attempt (never let auditing break auth).
        try:
            log_action(db, action="login_failed",
                       details={"email": login_data.email}, ip_address=ip_address)
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create session
    session, raw_token = create_session(
        db, str(user.id), ip_address, user_agent
    )

    # Update last login on profile
    profile = get_user_profile(db, str(user.id))
    if profile:
        profile.last_login = datetime.utcnow()
        db.commit()

    try:
        log_action(db, action="login", user_id=str(user.id), ip_address=ip_address)
    except Exception:
        pass

    # Set cookie
    set_session_cookie(response, raw_token)
    
    return LoginResponse(
        success=True,
        message="Login successful",
        user=UserResponse(id=user.id, email=user.email),
    )


@router.post("/register", response_model=RegisterResponse)
async def register(
    data: RegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public self-serve signup: create an agency account on a 14-day trial with
    the chosen plan, auto-login, and queue paid tiers for admin activation."""
    from ..services.plans import is_valid_plan, TRIAL_DAYS

    email = (data.email or "").strip().lower()
    if len((data.password or "")) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    plan = data.plan if is_valid_plan(data.plan) else "free_trial"

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists — try logging in.")

    user = create_user_with_profile(
        db, email=email, password=data.password,
        full_name=data.full_name, company=data.company, role="client",
    )

    now = datetime.utcnow()
    profile = get_user_profile(db, str(user.id))
    if profile:
        profile.plan = plan
        # Free trial is immediately active; paid tiers trial now + await admin activation/billing.
        profile.plan_status = "trialing" if plan == "free_trial" else "pending"
        profile.trial_ends_at = now + timedelta(days=TRIAL_DAYS)
        profile.plan_selected_at = now
        profile.client_status = "trial"
        profile.upload_enabled = True   # trial is functional — they can upload + analyze
        profile.last_login = now
        db.commit()

    ip_address = request.client.host if request.client else None
    _, raw_token = create_session(db, str(user.id), ip_address, request.headers.get("user-agent"))
    set_session_cookie(response, raw_token)

    try:
        log_action(db, action="signup", user_id=str(user.id),
                   details={"plan": plan, "company": data.company}, ip_address=ip_address)
    except Exception:
        pass

    requires_activation = plan != "free_trial"
    return RegisterResponse(
        success=True,
        message=(
            "Welcome! Your 14-day trial is ready."
            if not requires_activation
            else "Welcome! Your 14-day trial is ready — our team will reach out to activate your plan."
        ),
        user=UserResponse(id=user.id, email=user.email),
        plan=plan,
        plan_status=(profile.plan_status if profile else None),
        requires_activation=requires_activation,
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
        try:
            u = validate_session(db, token)
            if u:
                log_action(db, action="logout", user_id=str(u.id),
                           ip_address=(request.client.host if request.client else None))
        except Exception:
            pass
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

    profile = db.query(Profile).filter_by(id=user.id).first()
    full_name = profile.full_name if profile else None
    email_to = data.email

    async def _send_reset():
        try:
            await asyncio.wait_for(
                send_password_reset_email(to_email=email_to, full_name=full_name, reset_token=raw_token),
                timeout=10.0,
            )
        except Exception as e:
            print(f"[Email] Password reset email failed (non-blocking): {e}")

    asyncio.create_task(_send_reset())
    
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
