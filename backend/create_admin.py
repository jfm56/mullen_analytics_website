"""
One-shot script: create an admin user in the local dev database.
Usage: python create_admin.py [email] [password]
Prompts for a unique password when it is not supplied.
"""
import sys
import os
from getpass import getpass

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mullen_analytics")

from app.database import SessionLocal
from app.models import data_upload  # noqa: F401 – registers DataUpload with mapper
from app.services.auth import hash_password, create_user_with_profile

email = sys.argv[1] if len(sys.argv) > 1 else "admin@mullenanalytics.com"
password = sys.argv[2] if len(sys.argv) > 2 else getpass(
    "New local administrator password (14+ characters): "
)
if len(password) < 14:
    raise SystemExit("Administrator password must contain at least 14 characters")

db = SessionLocal()
try:
    user = create_user_with_profile(db, email, password, role="admin", full_name="Admin", email_confirmed=True)
    db.commit()
    print(f"✓ Admin user created: {email}")
except Exception as e:
    db.rollback()
    print(f"✗ Error: {e}")
finally:
    db.close()
