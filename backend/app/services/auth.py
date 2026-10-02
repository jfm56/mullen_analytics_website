from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.user import (
    User, Profile, Session as UserSession, PasswordResetToken,
    EmailVerificationToken,
)

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def generate_session_token() -> str:
    """Generate a secure random session token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash a token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(
    db: Session,
    user_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    mfa_passed: bool = True,
) -> tuple[UserSession, str]:
    """Create a new session for a user. Returns (session, raw_token).

    mfa_passed defaults True (users without TOTP are fully authenticated on
    login). The login route passes False when the user has TOTP enabled, so the
    session is pending until a code is verified via /auth/mfa/verify.
    """
    raw_token = generate_session_token()
    token_hash = hash_token(raw_token)

    expires_at = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    session = UserSession(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
        mfa_passed=mfa_passed,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session, raw_token


def validate_session(db: Session, token: str) -> Optional[User]:
    """Validate a session token and return the user if valid."""
    token_hash = hash_token(token)

    session = db.query(UserSession).filter(
        UserSession.token_hash == token_hash,
        UserSession.expires_at > datetime.utcnow()
    ).first()

    if not session:
        return None

    return db.query(User).filter(User.id == session.user_id).first()


def get_session_row(db: Session, token: str) -> Optional[UserSession]:
    """Return the live (unexpired) session row for a token, or None."""
    token_hash = hash_token(token)
    return db.query(UserSession).filter(
        UserSession.token_hash == token_hash,
        UserSession.expires_at > datetime.utcnow(),
    ).first()


def mark_session_mfa_passed(db: Session, token: str) -> bool:
    """Flip the current session's mfa_passed to True after a verified challenge."""
    session = get_session_row(db, token)
    if not session:
        return False
    session.mfa_passed = True
    db.commit()
    return True


def delete_session(db: Session, token: str) -> bool:
    """Delete a session (logout)."""
    token_hash = hash_token(token)
    
    result = db.query(UserSession).filter(
        UserSession.token_hash == token_hash
    ).delete()
    
    db.commit()
    return result > 0


def delete_all_user_sessions(db: Session, user_id: str) -> int:
    """Delete all sessions for a user."""
    result = db.query(UserSession).filter(
        UserSession.user_id == user_id
    ).delete()
    
    db.commit()
    return result


def create_password_reset_token(db: Session, user_id: str) -> str:
    """Create a password reset token. Returns the raw token."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    
    expires_at = datetime.utcnow() + timedelta(hours=settings.password_reset_expire_hours)
    
    reset_token = PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    
    db.add(reset_token)
    db.commit()
    
    return raw_token


def validate_password_reset_token(db: Session, token: str) -> Optional[PasswordResetToken]:
    """Validate a password reset token."""
    token_hash = hash_token(token)
    
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.expires_at > datetime.utcnow(),
        PasswordResetToken.used_at.is_(None)
    ).first()
    
    return reset_token


def use_password_reset_token(db: Session, token: str, new_password: str) -> Optional[User]:
    """Use a password reset token to change password."""
    reset_token = validate_password_reset_token(db, token)
    
    if not reset_token:
        return None
    
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    
    if not user:
        return None
    
    # Update password
    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.utcnow()
    
    # Mark token as used
    reset_token.used_at = datetime.utcnow()
    
    # Delete all existing sessions (force re-login)
    delete_all_user_sessions(db, str(user.id))
    
    db.commit()
    db.refresh(user)
    
    return user


def create_email_verification_token(db: Session, user_id: str) -> str:
    """Create an email verification token. Returns the raw token."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)

    expires_at = datetime.utcnow() + timedelta(hours=settings.email_verification_expire_hours)

    verification_token = EmailVerificationToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    db.add(verification_token)
    db.commit()

    return raw_token


def validate_email_verification_token(db: Session, token: str) -> Optional[EmailVerificationToken]:
    """Validate an email verification token (unexpired and unused)."""
    token_hash = hash_token(token)

    return db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash,
        EmailVerificationToken.expires_at > datetime.utcnow(),
        EmailVerificationToken.used_at.is_(None),
    ).first()


def use_email_verification_token(db: Session, token: str) -> Optional[User]:
    """Consume an email verification token and mark the user's email confirmed.

    Returns the User on success, or None if the token is invalid/expired/used.
    Idempotent-friendly: if the user is already confirmed, still succeeds.
    """
    verification_token = validate_email_verification_token(db, token)

    if not verification_token:
        return None

    user = db.query(User).filter(User.id == verification_token.user_id).first()

    if not user:
        return None

    user.email_confirmed = True
    user.updated_at = datetime.utcnow()
    verification_token.used_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user by email and password."""
    user = db.query(User).filter(User.email == email.lower()).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    # Update last sign in
    user.last_sign_in_at = datetime.utcnow()
    db.commit()
    
    return user


def get_user_profile(db: Session, user_id: str) -> Optional[Profile]:
    """Get user profile by user ID."""
    return db.query(Profile).filter(Profile.id == user_id).first()


def create_user_with_profile(
    db: Session,
    email: str,
    password: str,
    full_name: Optional[str] = None,
    company: Optional[str] = None,
    role: str = "client",
    email_confirmed: bool = False,
) -> User:
    """Create a new user with profile.

    email_confirmed defaults to False so public self-serve signups must verify.
    Admin-created/invited users (and seed/admin scripts) pass True since a human
    has already vouched for the address.
    """
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        email_confirmed=email_confirmed,
    )
    
    db.add(user)
    db.flush()  # Get the user ID
    
    profile = Profile(
        id=user.id,
        email=email.lower(),
        role=role,
        full_name=full_name,
        company=company,
    )
    
    db.add(profile)
    db.commit()
    db.refresh(user)
    
    return user
