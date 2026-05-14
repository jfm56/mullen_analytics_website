"""
Incidents API router.

GET /api/agencies/{agency_id}/pipeline/runs/{run_id}/incidents
  Returns the compact incident-level JSON written by incidents_export.
  The browser fetches this once and does all filtering client-side.
"""
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.agency import Agency, AgencyMembership, PipelineRun
from ..models.user import User
from ..services.auth import get_user_profile
from .auth import get_current_user

router = APIRouter(prefix="/agencies", tags=["incidents"])


def _assert_access(db: Session, agency_id: str, user: User) -> Agency:
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    membership = db.query(AgencyMembership).filter(
        AgencyMembership.agency_id == agency_id,
        AgencyMembership.user_id   == user.id,
    ).first()
    profile = get_user_profile(db, str(user.id))
    if not membership and (not profile or profile.role != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    return agency


@router.get("/{agency_id}/pipeline/runs/{run_id}/incidents")
async def get_incidents(
    agency_id: str,
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the compact incident-level dataset for the interactive dashboard.
    Returns 404 if the run has not completed or was produced before the
    incidents export was added to the pipeline.
    """
    _assert_access(db, agency_id, current_user)

    run = db.query(PipelineRun).filter(
        PipelineRun.id        == run_id,
        PipelineRun.agency_id == agency_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    if run.status != "completed" or not run.output_path:
        raise HTTPException(status_code=404, detail="Run not yet completed")

    incidents_path = Path(run.output_path) / "incidents_compact.json"
    if not incidents_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Incidents file not found. Re-run the pipeline to generate it.",
        )

    return FileResponse(
        path=str(incidents_path),
        media_type="application/json",
        filename="incidents_compact.json",
    )
