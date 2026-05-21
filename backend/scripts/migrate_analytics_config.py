"""
DB migration: add analytics_config column to the agencies table.

Run once after deploying the model change:
    cd backend
    python scripts/migrate_analytics_config.py
"""
import os
import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, text
from app.config import get_settings

settings = get_settings()
engine   = create_engine(settings.database_url)

ALTER_SQL = """
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT NULL;
"""

def main() -> None:
    with engine.begin() as conn:
        conn.execute(text(ALTER_SQL))
    print("✓ agencies.analytics_config column added (or already existed).")

if __name__ == "__main__":
    main()
