import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    r = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
    for row in r:
        print(row[0])
