"""Add dataset group columns to data_uploads table."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.models.data_upload  # noqa – registers all models
import app.models              # noqa

from app.database import engine
from sqlalchemy import text

MIGRATIONS = [
    "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS upload_type VARCHAR(50) DEFAULT 'yearly_csv'",
    "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS dataset_group_id UUID REFERENCES ems_dataset_groups(id) ON DELETE SET NULL",
    "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_year INTEGER",
    "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_period_start TIMESTAMP",
    "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_period_end TIMESTAMP",
    "CREATE INDEX IF NOT EXISTS ix_data_uploads_dataset_group_id ON data_uploads(dataset_group_id)",
    "CREATE INDEX IF NOT EXISTS ix_data_uploads_reporting_year ON data_uploads(reporting_year)",
]

with engine.connect() as conn:
    for sql in MIGRATIONS:
        conn.execute(text(sql))
        print("OK:", sql[:70])
    conn.commit()

print("\nMigration complete.")
