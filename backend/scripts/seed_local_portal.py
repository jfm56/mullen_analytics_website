"""
Local seed script — creates test admin + client users for local development.

Usage:
    cd backend
    python scripts/seed_local_portal.py

SAFETY: Only runs when ENVIRONMENT=local (or DATABASE_URL points to a local DB).
        Will NOT run against production.
"""
import os
import sys
import uuid
from pathlib import Path

# Allow running from backend/ or project root
sys.path.insert(0, str(Path(__file__).parent.parent))

ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

SAFE_LOCAL_PATTERNS = ["localhost", "127.0.0.1", "mullen_analytics\n"]

def is_safe():
    if ENVIRONMENT == "local":
        return True
    if any(p in DATABASE_URL for p in ["localhost", "127.0.0.1"]):
        return True
    return False

if not is_safe():
    print("ERROR: This script only runs against a local database.")
    print(f"  ENVIRONMENT = {ENVIRONMENT}")
    print(f"  DATABASE_URL = {DATABASE_URL[:40]}...")
    print("Set ENVIRONMENT=local or use a localhost DATABASE_URL.")
    sys.exit(1)

print("=" * 60)
print("Seeding local portal database…")
print(f"  DATABASE_URL: {DATABASE_URL[:50] or '(using default)'}")
print("=" * 60)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/mullen_analytics"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Import models
from app.database import Base
from app.models.user import User, Profile

Base.metadata.create_all(bind=engine)

def upsert_user(email, password, full_name, role, company=None):
    email = email.lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=pwd_context.hash(password),
            email_confirmed=True,
        )
        db.add(user)
        db.flush()
        print(f"  Created user: {email}")
    else:
        user.password_hash = pwd_context.hash(password)
        print(f"  Updated user: {email}")

    profile = db.query(Profile).filter(Profile.id == user.id).first()
    if not profile:
        profile = Profile(
            id=user.id,
            email=email,
            full_name=full_name,
            role=role,
            company=company,
            client_status="active",
        )
        db.add(profile)
        print(f"  Created profile: {full_name} ({role})")
    else:
        profile.full_name = full_name
        profile.role = role
        if company:
            profile.company = company
        print(f"  Updated profile: {full_name} ({role})")

    return user

# Seed admin
upsert_user(
    email="admin@mullenanalytics.com",
    password="admin123",
    full_name="Jim Mullen",
    role="admin",
    company="Mullen Analytics",
)

# Seed test client
upsert_user(
    email="client@testems.com",
    password="client123",
    full_name="Test Client",
    role="client",
    company="Test EMS Agency",
)

db.commit()
db.close()

print()
print("Seed complete.")
print()
print("Login credentials:")
print("  Admin:  admin@mullenanalytics.com / admin123")
print("  Client: client@testems.com / client123")
print()
print("Frontend: http://localhost:3000/admin/login")
print("API docs: http://localhost:8001/docs")
