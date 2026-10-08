"""Seed the admin user into the production database."""
import os
import uuid
from getpass import getpass

import psycopg2
import bcrypt

url = os.environ.get("DATABASE_URL", "")
if not url:
    raise SystemExit("Set DATABASE_URL env var first")

conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

# Inspect users table columns
cur.execute(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name = 'users' ORDER BY ordinal_position"
)
cols = [r[0] for r in cur.fetchall()]
print("users columns:", cols)

admin_id = str(uuid.uuid4())
admin_email = os.environ.get("SEED_ADMIN_EMAIL", "admin@mullenanalytics.com").strip().lower()
admin_password = os.environ.get("SEED_ADMIN_PASSWORD") or getpass(
    "New administrator password (14+ characters): "
)
if len(admin_password) < 14:
    raise SystemExit("Administrator password must contain at least 14 characters")
pw_hash = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt()).decode()

# Build insert based on available columns
if "role" in cols:
    cur.execute(
        "INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at) "
        "VALUES (%s, %s, %s, %s, true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING",
        (admin_id, admin_email, pw_hash, "admin"),
    )
else:
    cur.execute(
        "INSERT INTO users (id, email, password_hash, is_active, created_at, updated_at) "
        "VALUES (%s, %s, %s, true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING",
        (admin_id, admin_email, pw_hash),
    )

# Check if user was inserted or already existed
cur.execute("SELECT id FROM users WHERE email = %s", (admin_email,))
row = cur.fetchone()
real_admin_id = row[0] if row else admin_id

# Inspect profiles columns
cur.execute(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name = 'profiles' ORDER BY ordinal_position"
)
pcols = [r[0] for r in cur.fetchall()]
print("profiles columns:", pcols)

if "user_id" in pcols:
    col, val = "user_id", real_admin_id
else:
    col, val = "email", admin_email

if "role" in pcols:
    cur.execute(
        f"INSERT INTO profiles (id, {col}, full_name, role, created_at, updated_at) "
        f"VALUES (%s, %s, %s, %s, NOW(), NOW()) ON CONFLICT DO NOTHING",
        (real_admin_id, val, "Admin User", "admin"),
    )
else:
    cur.execute(
        f"INSERT INTO profiles (id, {col}, full_name, created_at, updated_at) "
        f"VALUES (%s, %s, %s, NOW(), NOW()) ON CONFLICT DO NOTHING",
        (real_admin_id, val, "Admin User"),
    )

conn.close()
print("Admin user seeded:", real_admin_id)
