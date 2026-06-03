import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app.models.data_upload, app.models
from app.database import SessionLocal
from app.models.data_upload import DataUpload, EMSDashboardMetrics

db = SessionLocal()
uploads = db.query(DataUpload).filter(DataUpload.upload_status == 'CLEANED').all()
for u in uploads:
    m = db.query(EMSDashboardMetrics).filter(EMSDashboardMetrics.upload == u.id).first()
    print(f"\n=== {u.original_filename} ===")
    if m:
        d = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        for k, v in d.items():
            if v is not None and k not in ('id', 'upload_id', 'created_at', 'updated_at'):
                print(f"  {k}: {v}")
    else:
        print("  NO METRICS FOUND")
db.close()
