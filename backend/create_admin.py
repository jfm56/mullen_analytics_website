"""
One-shot script: create an admin user in the local dev database.
Usage: python create_admin.py [email] [password]
Defaults to admin@mullen.local / admin123
"""
import sys
import os

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mullen_analytics")

from app.database import SessionLocal
from app.services.auth import hash_password, create_user_with_profile

email    = sys.argv[1] if len(sys.argv) > 1 else "admin@mullen.local"
password = sys.argv[2] if len(sys.argv) > 2 else "admin123"

db = SessionLocal()
try:
    user = create_user_with_profile(db, email, password, role="admin", full_name="Admin")
    db.commit()
    print(f"✓ Admin user created: {email}")
except Exception as e:
    db.rollback()
    print(f"✗ Error: {e}")
finally:
    db.close()
