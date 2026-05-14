from app.database import SessionLocal
from app.models.user import User, Profile

db = SessionLocal()
users = db.query(User).all()
if not users:
    print("No users found in database.")
else:
    for u in users:
        profile = db.query(Profile).filter_by(user_id=u.id).first()
        role = profile.role if profile else "no-profile"
        print(f"email={u.email}  role={role}")
db.close()
