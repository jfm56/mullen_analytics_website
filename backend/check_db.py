"""Check production DB table schemas."""
import os
import psycopg2

url = os.environ.get("DATABASE_URL", "")
if not url:
    raise SystemExit("Set DATABASE_URL env var first")

conn = psycopg2.connect(url)
cur = conn.cursor()

for table in ["users", "sessions", "profiles", "password_reset_tokens"]:
    cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = %s ORDER BY ordinal_position",
        (table,),
    )
    cols = [r[0] for r in cur.fetchall()]
    print(f"{table}: {cols}")

conn.close()
