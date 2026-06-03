"""
Dataset Groups router — multi-year EMSCharts upload management.

Admin routes:
  GET  /api/datasets                           — list all groups
  POST /api/datasets                           — create group
  GET  /api/datasets/{id}                      — detail + uploads
  PATCH /api/datasets/{id}                     — update group
  DELETE /api/datasets/{id}                    — archive group
  GET  /api/datasets/{id}/dashboard            — full YoY dashboard payload
  GET  /api/datasets/{id}/compare              — compare two years
  GET  /api/datasets/{id}/coverage             — uploaded/missing years

Client routes (own groups only):
  GET  /api/datasets/portal                    — client's groups
  GET  /api/datasets/{id}/portal               — client group detail
  GET  /api/datasets/{id}/portal/dashboard     — client YoY dashboard
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.data_upload import DataUpload, EMSDatasetGroup
from ..models.user import Profile, User
from ..services.ems_year_over_year_service import (
    compare_years,
    get_dataset_years,
    get_multi_year_dashboard,
    get_yearly_metrics,
)
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/datasets", tags=["datasets"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DatasetGroupCreate(BaseModel):
    client_id: UUID
    name: str
    description: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    source_system: Optional[str] = "emscharts"


class DatasetGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    status: Optional[str] = None


class AssignUploadToGroup(BaseModel):
    upload_id: UUID
    reporting_year: int
    upload_type: Optional[str] = "yearly_csv"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _group_or_404(group_id: UUID, db: Session) -> EMSDatasetGroup:
    g = db.query(EMSDatasetGroup).filter(EMSDatasetGroup.id == group_id).first()
    if not g:
        raise HTTPException(404, detail="Dataset group not found")
    return g


def _serialize_group(g: EMSDatasetGroup, db: Session) -> dict:
    uploads = db.query(DataUpload).filter(DataUpload.dataset_group_id == g.id).all()
    uploaded_years = sorted({u.reporting_year for u in uploads if u.reporting_year})
    cleaned_years  = sorted({u.reporting_year for u in uploads
                              if u.reporting_year and u.upload_status == "CLEANED"})
    start = g.start_year or (min(uploaded_years) if uploaded_years else None)
    end   = g.end_year   or (max(uploaded_years) if uploaded_years else None)
    missing = [y for y in range(start, end + 1) if y not in uploaded_years] if start and end else []
    client_profile = db.query(Profile).filter(Profile.id == g.client_id).first()
    return {
        "id":             str(g.id),
        "client_id":      str(g.client_id),
        "client_name":    client_profile.full_name or client_profile.email if client_profile else None,
        "name":           g.name,
        "description":    g.description,
        "start_year":     start,
        "end_year":       end,
        "source_system":  g.source_system,
        "status":         g.status,
        "upload_count":   len(uploads),
        "uploaded_years": uploaded_years,
        "cleaned_years":  cleaned_years,
        "missing_years":  missing,
        "created_at":     g.created_at.isoformat() if g.created_at else None,
        "updated_at":     g.updated_at.isoformat() if g.updated_at else None,
    }


def _serialize_upload(u: DataUpload) -> dict:
    return {
        "id":                   str(u.id),
        "original_filename":    u.original_filename,
        "reporting_year":       u.reporting_year,
        "reporting_period_start": u.reporting_period_start.isoformat() if u.reporting_period_start else None,
        "reporting_period_end":   u.reporting_period_end.isoformat()   if u.reporting_period_end   else None,
        "upload_type":          u.upload_type,
        "upload_status":        u.upload_status,
        "source_system":        u.source_system,
        "row_count_original":   u.row_count_original,
        "row_count_cleaned":    u.row_count_cleaned,
        "file_size":            u.file_size,
        "notes":                u.notes,
        "created_at":           u.created_at.isoformat() if u.created_at else None,
    }


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------

@router.get("")
async def list_dataset_groups(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    groups = (
        db.query(EMSDatasetGroup)
        .filter(EMSDatasetGroup.status != "deleted")
        .order_by(EMSDatasetGroup.created_at.desc())
        .all()
    )
    return [_serialize_group(g, db) for g in groups]


@router.post("")
async def create_dataset_group(
    payload: DatasetGroupCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    group = EMSDatasetGroup(
        client_id=payload.client_id,
        name=payload.name,
        description=payload.description,
        start_year=payload.start_year,
        end_year=payload.end_year,
        source_system=payload.source_system or "emscharts",
        created_by=admin.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return _serialize_group(group, db)


@router.get("/portal")
async def list_portal_dataset_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    groups = (
        db.query(EMSDatasetGroup)
        .filter(
            EMSDatasetGroup.client_id == current_user.id,
            EMSDatasetGroup.status == "active",
        )
        .order_by(EMSDatasetGroup.created_at.desc())
        .all()
    )
    return [_serialize_group(g, db) for g in groups]


@router.get("/{group_id}")
async def get_dataset_group(
    group_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    g = _group_or_404(group_id, db)
    base = _serialize_group(g, db)
    uploads = (
        db.query(DataUpload)
        .filter(DataUpload.dataset_group_id == group_id)
        .order_by(DataUpload.reporting_year.asc().nullsfirst())
        .all()
    )
    base["uploads"] = [_serialize_upload(u) for u in uploads]
    return base


@router.patch("/{group_id}")
async def update_dataset_group(
    group_id: UUID,
    payload: DatasetGroupUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    g = _group_or_404(group_id, db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(g, field, val)
    g.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(g)
    return _serialize_group(g, db)


@router.delete("/{group_id}")
async def archive_dataset_group(
    group_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    g = _group_or_404(group_id, db)
    g.status = "archived"
    g.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}


@router.post("/{group_id}/assign-upload")
async def assign_upload_to_group(
    group_id: UUID,
    payload: AssignUploadToGroup,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _group_or_404(group_id, db)
    upload = db.query(DataUpload).filter(DataUpload.id == payload.upload_id).first()
    if not upload:
        raise HTTPException(404, detail="Upload not found")

    # Duplicate year check
    existing = (
        db.query(DataUpload)
        .filter(
            DataUpload.dataset_group_id == group_id,
            DataUpload.reporting_year == payload.reporting_year,
            DataUpload.id != payload.upload_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            409,
            detail=f"A {payload.reporting_year} upload already exists in this dataset group. "
                   "Unassign the existing one first or use replace=true.",
        )

    upload.dataset_group_id = group_id
    upload.reporting_year   = payload.reporting_year
    upload.upload_type      = payload.upload_type or "yearly_csv"
    if payload.reporting_year:
        upload.reporting_period_start = datetime(payload.reporting_year, 1, 1)
        upload.reporting_period_end   = datetime(payload.reporting_year, 12, 31)
    upload.updated_at = datetime.utcnow()
    db.commit()
    return _serialize_upload(upload)


@router.get("/{group_id}/coverage")
async def get_coverage(
    group_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _group_or_404(group_id, db)
    return get_dataset_years(group_id, db)


@router.get("/{group_id}/dashboard")
async def get_yoy_dashboard(
    group_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _group_or_404(group_id, db)
    return get_multi_year_dashboard(group_id, db)


@router.get("/{group_id}/compare")
async def compare_dataset_years(
    group_id: UUID,
    year_a: int = Query(...),
    year_b: int = Query(...),
    year_c: Optional[int] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _group_or_404(group_id, db)
    return compare_years(group_id, year_a, year_b, db, year_c)


# ---------------------------------------------------------------------------
# Client portal routes
# ---------------------------------------------------------------------------

@router.get("/{group_id}/portal")
async def get_portal_dataset_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = _group_or_404(group_id, db)
    if str(g.client_id) != str(current_user.id):
        profile = db.query(Profile).filter(Profile.id == current_user.id).first()
        if not profile or profile.role != "admin":
            raise HTTPException(403, detail="Access denied")
    base = _serialize_group(g, db)
    uploads = (
        db.query(DataUpload)
        .filter(DataUpload.dataset_group_id == group_id)
        .order_by(DataUpload.reporting_year)
        .all()
    )
    # Strip file_path from client view
    base["uploads"] = [
        {k: v for k, v in _serialize_upload(u).items()}
        for u in uploads
    ]
    return base


@router.get("/{group_id}/portal/dashboard")
async def get_portal_yoy_dashboard(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = _group_or_404(group_id, db)
    if str(g.client_id) != str(current_user.id):
        profile = db.query(Profile).filter(Profile.id == current_user.id).first()
        if not profile or profile.role != "admin":
            raise HTTPException(403, detail="Access denied")
    return get_multi_year_dashboard(group_id, db)
