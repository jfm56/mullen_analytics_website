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
    EmailVerificationConfirm, EmailVerificationResponse,
    ResendVerificationResponse,
)
from ..services.auth import (
    authenticate_user, create_session, validate_session,
    delete_session, get_user_profile, create_user_with_profile,
    create_password_reset_token, use_password_reset_token,
    create_email_verification_token, use_email_verification_token,
)
from ..services.email import send_password_reset_email, send_verification_email
from ..services.signup_guard import check_rate_limit, is_disposable_email
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
        user=UserResponse(id=user.id, email=user.email, email_confirmed=user.email_confirmed),
    )


@router.post("/register", response_model=RegisterResponse)
async def register(
    data: RegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public self-serve signup: create an agency account on a 14-day trial with
    the chosen plan, auto-login, send an email-verification link, and queue paid
    tiers for admin activation.

    The account is created unverified (email_confirmed=False). The trial is
    immediately usable (they can log in and explore), but data uploads are gated
    on verification (see require_verified_email / the upload endpoint) to limit
    spam/abuse from fake or typo'd addresses.
    """
    from ..services.plans import is_valid_plan, TRIAL_DAYS

    ip_address = request.client.host if request.client else None

    # Basic abuse guards (best-effort first line of defense; the real gate is
    # email verification before uploads). 6 signups / hour / IP.
    if not check_rate_limit(f"register:{ip_address}", max_calls=6, window_seconds=3600):
        raise HTTPException(
            status_code=429,
            detail="Too many sign-up attempts from your network. Please try again later.",
        )

    email = (data.email or "").strip().lower()
    if is_disposable_email(email):
        raise HTTPException(
            status_code=400,
            detail="Please sign up with a permanent work email address.",
        )
    if len((data.password or "")) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    plan = data.plan if is_valid_plan(data.plan) else "free_trial"

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists — try logging in.")

    # Unverified by default — a verification email is sent below.
    user = create_user_with_profile(
        db, email=email, password=data.password,
        full_name=data.full_name, company=data.company, role="client",
        email_confirmed=False,
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
        profile.upload_enabled = True   # trial is functional once email is verified
        profile.last_login = now
        db.commit()

    _, raw_token = create_session(db, str(user.id), ip_address, request.headers.get("user-agent"))
    set_session_cookie(response, raw_token)

    # Send the verification email (non-blocking; never let email break signup).
    verify_token = create_email_verification_token(db, str(user.id))
    email_to = user.email
    full_name = data.full_name

    async def _send_verification():
        try:
            await asyncio.wait_for(
                send_verification_email(to_email=email_to, full_name=full_name, verify_token=verify_token),
                timeout=10.0,
            )
        except Exception as e:
            print(f"[Email] Verification email failed (non-blocking): {e}")

    asyncio.create_task(_send_verification())

    try:
        log_action(db, action="signup", user_id=str(user.id),
                   details={"plan": plan, "company": data.company}, ip_address=ip_address)
    except Exception:
        pass

    requires_activation = plan != "free_trial"
    base_msg = (
        "Welcome! Your 14-day trial is ready."
        if not requires_activation
        else "Welcome! Your 14-day trial is ready — our team will reach out to activate your plan."
    )
    return RegisterResponse(
        success=True,
        message=f"{base_msg} We've emailed a link to {user.email} — please verify your email to start uploading data.",
        user=UserResponse(id=user.id, email=user.email, email_confirmed=user.email_confirmed),
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
        user=UserResponse(id=user.id, email=user.email, email_confirmed=user.email_confirmed),
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


def _do_verify_email(db: Session, token: str) -> EmailVerificationResponse:
    """Shared logic for the GET/POST verify-email endpoints."""
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or missing verification token.")

    user = use_email_verification_token(db, token)
    if user:
        return EmailVerificationResponse(
            success=True,
            message="Your email has been verified. You're all set!",
        )

    # The token wasn't valid as a fresh token. Distinguish "already verified"
    # (link clicked twice) from a genuinely bad/expired token so a re-click is
    # not shown as an error.
    from ..services.auth import hash_token
    from ..models.user import EmailVerificationToken

    existing = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == hash_token(token)
    ).first()
    if existing:
        u = db.query(User).filter(User.id == existing.user_id).first()
        if u and u.email_confirmed:
            return EmailVerificationResponse(
                success=True,
                message="Your email is already verified.",
                already_verified=True,
            )

    raise HTTPException(
        status_code=400,
        detail="This verification link is invalid or has expired. Please request a new one.",
    )


@router.post("/verify-email", response_model=EmailVerificationResponse)
async def verify_email(
    data: EmailVerificationConfirm,
    db: Session = Depends(get_db),
):
    """Verify an email address using the token from the verification email."""
    return _do_verify_email(db, data.token)


@router.get("/verify-email", response_model=EmailVerificationResponse)
async def verify_email_get(
    token: str,
    db: Session = Depends(get_db),
):
    """Verify an email address via a direct GET link (token as a query param)."""
    return _do_verify_email(db, token)


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


async def require_admin_or_upstream(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Admin gate for endpoints ALSO served by the on-prem instance (visitor
    analytics, leads, outreach). Identical to require_admin for a session that lives
    in THIS backend's DB. On the on-prem box the admin's session lives in the CLOUD
    DB instead, so when local validation fails and settings.upstream_auth_url is
    configured, the cookie is validated against the cloud backend and a confirmed
    admin is accepted. Upstream is unset on the cloud + local-dev backends, so this
    behaves exactly like require_admin there."""
    token = get_session_token(request)
    if token:
        user = validate_session(db, token)
        if user:
            profile = get_user_profile(db, str(user.id))
            if profile and profile.role == "admin":
                return user

    from ..services import upstream_auth
    ident = upstream_auth.verify_admin(request.headers.get("cookie", ""))
    if ident:
        email = (ident.get("email") or "").lower()
        if email:
            local = db.query(User).filter(User.email == email).first()
            if local:
                return local
        # Data-only on-prem DB with no local user row: return a detached admin User
        # so read endpoints work. id is None — write paths needing a real FK (e.g.
        # outreach send / approved_by) still require the admin to exist locally.
        return User(email=email or "admin@upstream")

    raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-send the email-verification link for the signed-in user (banner button)."""
    if current_user.email_confirmed:
        return ResendVerificationResponse(success=True, message="Your email is already verified.")

    # Rate-limit resends per user (3 / hour) to avoid inbox flooding.
    if not check_rate_limit(f"resend:{current_user.id}", max_calls=3, window_seconds=3600):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please check your inbox or try again in a bit.",
        )

    verify_token = create_email_verification_token(db, str(current_user.id))
    profile = get_user_profile(db, str(current_user.id))
    full_name = profile.full_name if profile else None
    email_to = current_user.email

    async def _send():
        try:
            await asyncio.wait_for(
                send_verification_email(to_email=email_to, full_name=full_name, verify_token=verify_token),
                timeout=10.0,
            )
        except Exception as e:
            print(f"[Email] Resend verification email failed (non-blocking): {e}")

    asyncio.create_task(_send())

    return ResendVerificationResponse(
        success=True,
        message=f"We've sent a new verification link to {email_to}.",
    )
