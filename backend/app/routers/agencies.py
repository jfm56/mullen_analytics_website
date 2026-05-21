import logging
import re
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import get_settings
from ..models.agency import Agency, AgencyMembership
from ..models.user import User
from ..schemas.agency import AgencyCreate, AgencyUpdate, AgencyResponse, AgencyMembershipResponse
from ..services.storage import create_agency_folders
from ..services.audit import log_action
from .auth import get_current_user, require_admin
from ..services.auth import get_user_profile

router = APIRouter(prefix="/agencies", tags=["agencies"])
settings = get_settings()


# ------------------------------------------------------------------ helpers
def _make_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:80]


def _unique_slug(db: Session, base: str) -> str:
    slug, n = base, 1
    while db.query(Agency).filter(Agency.slug == slug).first():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _assert_member_or_admin(db: Session, agency_id: str, user: User) -> Agency:
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


# ------------------------------------------------------------------ routes
@router.post("", response_model=AgencyResponse, status_code=201)
async def create_agency(
    data: AgencyCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slug = _unique_slug(db, _make_slug(data.agency_name))

    agency = Agency(
        agency_name=data.agency_name,
        slug=slug,
        subscription_tier=data.subscription_tier,
        contact_email=data.contact_email,
        contact_name=data.contact_name,
        agency_type=data.agency_type,
        state=data.state,
        status="active",
    )
    db.add(agency)
    db.flush()

    try:
        storage_path = create_agency_folders(str(agency.id), settings.data_storage_root)
        agency.storage_path = storage_path
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logging.getLogger(__name__).warning("Could not create storage folder: %s", exc)

    db.add(AgencyMembership(agency_id=agency.id, user_id=current_user.id, role="owner"))
    db.commit()
    db.refresh(agency)

    log_action(
        db,
        action="agency_created",
        user_id=str(current_user.id),
        agency_id=str(agency.id),
        resource_type="agency",
        resource_id=str(agency.id),
        details={"agency_name": agency.agency_name, "slug": slug},
        ip_address=request.client.host if request.client else None,
    )
    return agency


@router.get("/me", response_model=List[AgencyResponse])
async def get_my_agencies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = db.query(AgencyMembership).filter(
        AgencyMembership.user_id == current_user.id
    ).all()
    ids = [m.agency_id for m in memberships]
    if not ids:
        return []
    return db.query(Agency).filter(Agency.id.in_(ids)).all()


@router.get("", response_model=List[AgencyResponse])
async def list_agencies(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(Agency).order_by(Agency.created_at.desc()).all()


@router.get("/{agency_id}", response_model=AgencyResponse)
async def get_agency(
    agency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _assert_member_or_admin(db, agency_id, current_user)


@router.patch("/{agency_id}", response_model=AgencyResponse)
async def update_agency(
    agency_id: str,
    data: AgencyUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agency = _assert_member_or_admin(db, agency_id, current_user)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(agency, field, value)
    db.commit()
    db.refresh(agency)
    log_action(db, "agency_updated", str(current_user.id), agency_id,
               "agency", agency_id,
               data.model_dump(exclude_none=True),
               request.client.host if request.client else None)
    return agency


@router.get("/{agency_id}/members", response_model=List[AgencyMembershipResponse])
async def list_members(
    agency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_member_or_admin(db, agency_id, current_user)
    return db.query(AgencyMembership).filter(AgencyMembership.agency_id == agency_id).all()
