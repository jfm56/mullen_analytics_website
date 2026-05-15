import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import get_settings
from ..models.agency import Agency, AgencyFile, AgencyMembership
from ..models.user import User
from ..schemas.agency import AgencyFileResponse
from ..services.audit import log_action
from ..services.storage import create_agency_folders, delete_agency_file, get_raw_upload_path
from ..services.auth import get_user_profile
from ..services.pipeline.inspect_columns import inspect as inspect_columns
from .auth import get_current_user

router = APIRouter(prefix="/agencies", tags=["agency-files"])
settings = get_settings()

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".pdf", ".json", ".parquet", ".txt"}
MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
VALID_FILE_TYPES = [
    "dispatch", "staffing", "termination",
    "payroll", "mutual_aid", "population", "other",
]


def _assert_access(db: Session, agency_id: str, user: User) -> Agency:
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    membership = db.query(AgencyMembership).filter(
        AgencyMembership.agency_id == agency_id,
        AgencyMembership.user_id == user.id,
    ).first()
    profile = get_user_profile(db, str(user.id))
    if not membership and (not profile or profile.role != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    return agency


@router.post("/{agency_id}/files", response_model=AgencyFileResponse, status_code=201)
async def upload_file(
    agency_id: str,
    request: Request,
    file: UploadFile = File(...),
    file_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agency = _assert_access(db, agency_id, current_user)

    if file_type not in VALID_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file_type. Must be one of: {', '.join(VALID_FILE_TYPES)}",
        )

    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 500 MB limit")

    if not agency.storage_path:
        try:
            path = create_agency_folders(str(agency.id), settings.data_storage_root)
            agency.storage_path = path
            db.commit()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Storage folder error: {exc}") from exc

    stored_name = f"{uuid.uuid4().hex[:8]}_{original_name}"
    upload_path  = get_raw_upload_path(str(agency.id), settings.data_storage_root, stored_name)

    try:
        Path(upload_path).parent.mkdir(parents=True, exist_ok=True)
        with open(upload_path, "wb") as fh:
            fh.write(content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {exc}") from exc

    record = AgencyFile(
        agency_id=uuid.UUID(agency_id),
        uploaded_by=current_user.id,
        original_filename=original_name,
        stored_filename=stored_name,
        file_type=file_type,
        mime_type=file.content_type,
        file_size_bytes=len(content),
        upload_path=upload_path,
        status="uploaded",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    log_action(
        db,
        action="file_uploaded",
        user_id=str(current_user.id),
        agency_id=agency_id,
        resource_type="agency_file",
        resource_id=str(record.id),
        details={
            "original_filename": original_name,
            "file_type": file_type,
            "file_size_bytes": len(content),
        },
        ip_address=request.client.host if request.client else None,
    )
    return record


@router.get("/{agency_id}/files", response_model=List[AgencyFileResponse])
async def list_files(
    agency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_access(db, agency_id, current_user)
    return (
        db.query(AgencyFile)
        .filter(AgencyFile.agency_id == agency_id)
        .order_by(AgencyFile.created_at.desc())
        .all()
    )


@router.get("/{agency_id}/files/{file_id}", response_model=AgencyFileResponse)
async def get_file(
    agency_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_access(db, agency_id, current_user)
    record = db.query(AgencyFile).filter(
        AgencyFile.id == file_id,
        AgencyFile.agency_id == agency_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    return record


@router.get("/{agency_id}/files/{file_id}/inspect")
async def inspect_file(
    agency_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return column metadata for a CSV/XLSX file so the frontend can render a column picker."""
    _assert_access(db, agency_id, current_user)
    record = db.query(AgencyFile).filter(
        AgencyFile.id == file_id,
        AgencyFile.agency_id == agency_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    from pathlib import Path as _Path
    ext = _Path(record.upload_path).suffix.lower()
    if ext not in (".csv", ".xlsx", ".xls"):
        raise HTTPException(
            status_code=422,
            detail=f"Column inspection only supported for CSV/XLSX files (got {ext}).",
        )
    try:
        return inspect_columns(record.upload_path)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        raise HTTPException(status_code=500, detail=f"Failed to inspect file: {exc}") from exc


class FileTypeUpdate(BaseModel):
    file_type: str


@router.patch("/{agency_id}/files/{file_id}", response_model=AgencyFileResponse)
async def reclassify_file(
    agency_id: str,
    file_id: str,
    body: FileTypeUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reclassify the file_type of an uploaded file (e.g. staffing → other for payroll reports)."""
    _assert_access(db, agency_id, current_user)

    if body.file_type not in VALID_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file_type. Must be one of: {', '.join(VALID_FILE_TYPES)}",
        )

    record = db.query(AgencyFile).filter(
        AgencyFile.id        == file_id,
        AgencyFile.agency_id == agency_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    old_type = record.file_type
    record.file_type = body.file_type
    db.commit()
    db.refresh(record)

    log_action(
        db,
        action="file_reclassified",
        user_id=str(current_user.id),
        agency_id=agency_id,
        resource_type="agency_file",
        resource_id=file_id,
        details={"original_filename": record.original_filename,
                 "old_file_type": old_type, "new_file_type": body.file_type},
        ip_address=request.client.host if request.client else None,
    )
    return record


@router.delete("/{agency_id}/files/{file_id}")
async def delete_file(
    agency_id: str,
    file_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_access(db, agency_id, current_user)
    record = db.query(AgencyFile).filter(
        AgencyFile.id == file_id,
        AgencyFile.agency_id == agency_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    delete_agency_file(record.upload_path)

    log_action(
        db,
        action="file_deleted",
        user_id=str(current_user.id),
        agency_id=agency_id,
        resource_type="agency_file",
        resource_id=file_id,
        details={"original_filename": record.original_filename},
        ip_address=request.client.host if request.client else None,
    )
    db.delete(record)
    db.commit()
    return {"success": True, "message": f"File '{record.original_filename}' deleted"}
