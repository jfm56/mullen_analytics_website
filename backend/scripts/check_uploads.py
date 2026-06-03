import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app.models.data_upload, app.models
from app.database import SessionLocal
from app.models.data_upload import DataUpload, EMSDatasetGroup

db = SessionLocal()
uploads = db.query(DataUpload).order_by(DataUpload.created_at.desc()).all()
print(f"Total uploads: {len(uploads)}")
for u in uploads:
    grp = str(u.dataset_group_id)[:8] if u.dataset_group_id else "none"
    print(f"  status={u.upload_status:<10} year={u.reporting_year}  group={grp}  file={u.original_filename}")

groups = db.query(EMSDatasetGroup).all()
print(f"\nDataset groups: {len(groups)}")
for g in groups:
    print(f"  {g.name}")
db.close()
