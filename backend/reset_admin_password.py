"""Reset a local account's password. Run it yourself, interactively:

    cd F:/Projects/mullen_analytics_website/backend
    python reset_admin_password.py                       # resets admin@mullenanalytics.com
    python reset_admin_password.py someone@example.com   # or another account

You type the new password at the prompt (hidden input) — it is hashed with the app's
own bcrypt hasher and written straight to the local DB. The password is never printed
or stored anywhere in plain text.
"""
import getpass
import re
import sys

import psycopg2

sys.path.insert(0, ".")
from app.services.auth import hash_password  # noqa: E402

email = sys.argv[1] if len(sys.argv) > 1 else "admin@mullenanalytics.com"
url = [l.split("=", 1)[1].strip().strip('"').strip("'")
       for l in open(".env", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]

pw1 = getpass.getpass(f"New password for {email}: ")
pw2 = getpass.getpass("Confirm new password: ")
if not pw1 or pw1 != pw2:
    print("Passwords empty or did not match — aborted."); sys.exit(1)

conn = psycopg2.connect(re.sub(r"^postgresql\+\w+://", "postgresql://", url))
cur = conn.cursor()
cur.execute("update users set password_hash=%s where email=%s", (hash_password(pw1), email))
if cur.rowcount == 0:
    conn.rollback()
    print(f"No user {email!r} found — nothing changed.")
else:
    conn.commit()
    print(f"Password updated for {email} ({cur.rowcount} row). Log in at http://localhost:3000.")
conn.close()
