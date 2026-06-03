"""Remove all @test.com users created by the pytest suite from the local DB."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    count = conn.execute(text("SELECT COUNT(*) FROM users WHERE email LIKE '%@test.com'")).scalar()
    print(f"Test users found: {count}")

TEST_IDS = "(SELECT id FROM users WHERE email LIKE '%@test.com')"
UPLOAD_IDS = f"(SELECT id FROM data_uploads WHERE client_id IN {TEST_IDS})"
PROJECT_IDS = f"(SELECT id FROM projects WHERE client_id IN {TEST_IDS})"

steps = [
    # data_upload children (FK col is data_upload_id)
    f"DELETE FROM data_cleaning_results WHERE data_upload_id IN {UPLOAD_IDS}",
    f"DELETE FROM ems_dashboard_metrics WHERE data_upload_id IN {UPLOAD_IDS}",
    f"DELETE FROM data_profiles WHERE data_upload_id IN {UPLOAD_IDS}",
    f"DELETE FROM analytics_column_settings WHERE data_upload_id IN {UPLOAD_IDS}",
    f"DELETE FROM ems_column_mappings WHERE data_upload_id IN {UPLOAD_IDS}",
    # project children
    f"DELETE FROM invoices WHERE project_id IN {PROJECT_IDS}",
    f"DELETE FROM documents WHERE project_id IN {PROJECT_IDS}",
    # data_uploads also has uploaded_by_user_id FK
    f"DELETE FROM data_uploads WHERE client_id IN {TEST_IDS} OR uploaded_by_user_id IN {TEST_IDS}",
    f"DELETE FROM projects WHERE client_id IN {TEST_IDS}",
    f"DELETE FROM invoices WHERE client_id IN {TEST_IDS}",
    f"DELETE FROM documents WHERE client_id IN {TEST_IDS}",
    f"DELETE FROM sessions WHERE user_id IN {TEST_IDS}",
    f"DELETE FROM password_reset_tokens WHERE user_id IN {TEST_IDS}",
    f"DELETE FROM impersonation_logs WHERE client_id IN {TEST_IDS} OR admin_id IN {TEST_IDS}",
    f"DELETE FROM audit_logs WHERE user_id IN {TEST_IDS}",
    f"DELETE FROM users WHERE email LIKE '%@test.com'",
]

for sql in steps:
    try:
        with engine.begin() as conn:
            r = conn.execute(text(sql))
            print(f"  {r.rowcount} rows deleted")
    except Exception as e:
        print(f"  SKIP ({e.__class__.__name__}): {sql[:70]}...")

with engine.connect() as conn:
    remaining = conn.execute(text("SELECT COUNT(*) FROM profiles")).scalar()
    print(f"Remaining profiles: {remaining}")

print("Done.")
