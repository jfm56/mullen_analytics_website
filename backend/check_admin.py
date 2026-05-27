import os
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mullen_analytics")

from app.database import SessionLocal
from app.models.user import User, Profile
from app.services.auth import verify_password

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "admin@mullenanalytics.com").first()
    if not user:
        print("ERROR: admin user NOT found in DB")
    else:
        profile = db.query(Profile).filter(Profile.id == user.id).first()
        print(f"User found: id={user.id}, email={user.email}")
        print(f"Profile role: {profile.role if profile else 'NO PROFILE'}")
        print(f"password_hash present: {bool(user.password_hash)}")
        ok = verify_password("admin123", user.password_hash)
        print(f"verify_password('admin123', hash) = {ok}")
finally:
    db.close()
