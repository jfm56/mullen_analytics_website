"""
Pipeline API router.

POST   /api/agencies/{agency_id}/pipeline/run   — trigger a new run
GET    /api/agencies/{agency_id}/pipeline/runs  — list runs for an agency
GET    /api/agencies/{agency_id}/pipeline/runs/{run_id}  — get run detail
GET    /api/agencies/{agency_id}/pipeline/runs/{run_id}/report — get report JSON
"""
import json
import math
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models.agency import Agency, AgencyMembership, PipelineRun
from ..models.user import User
from ..schemas.agency import PipelineRunResponse
from ..services.audit import log_action
from ..services.auth import get_user_profile
from ..services.pipeline import runner
from .auth import get_current_user

router   = APIRouter(prefix="/agencies", tags=["pipeline"])
settings = get_settings()


class PipelineRunRequest(BaseModel):
    column_map: Dict[str, str] = {}


def _sanitize(obj: Any) -> Any:
    """Replace NaN/Inf floats with None so FastAPI can JSON-serialise the response."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


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


@router.post("/{agency_id}/pipeline/run", response_model=PipelineRunResponse, status_code=202)
async def trigger_pipeline(
    agency_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    body: PipelineRunRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agency = _assert_access(db, agency_id, current_user)

    active = db.query(PipelineRun).filter(
        PipelineRun.agency_id == agency_id,
        PipelineRun.status.in_(["queued", "running"]),
    ).first()
    if active:
        raise HTTPException(
            status_code=409,
            detail="A pipeline run is already in progress for this agency.",
        )

    run = PipelineRun(
        agency_id=uuid.UUID(agency_id),
        status="queued",
        triggered_by=current_user.id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    run_id = str(run.id)

    log_action(
        db,
        action="pipeline_triggered",
        user_id=str(current_user.id),
        agency_id=agency_id,
        resource_type="pipeline_run",
        resource_id=run_id,
        ip_address=request.client.host if request.client else None,
    )

    background_tasks.add_task(
        runner.execute,
        db=db,
        run_id=run_id,
        agency_id=agency_id,
        agency_name=agency.agency_name,
        subscription_tier=agency.subscription_tier,
        storage_root=settings.data_storage_root,
        triggered_by=str(current_user.id),
        column_map=(body.column_map if body else {}),
    )

    return run


@router.get("/{agency_id}/pipeline/runs", response_model=List[PipelineRunResponse])
async def list_runs(
    agency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_access(db, agency_id, current_user)
    return (
        db.query(PipelineRun)
        .filter(PipelineRun.agency_id == agency_id)
        .order_by(PipelineRun.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/{agency_id}/pipeline/runs/{run_id}", response_model=PipelineRunResponse)
async def get_run(
    agency_id: str,
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_access(db, agency_id, current_user)
    run = db.query(PipelineRun).filter(
        PipelineRun.id        == run_id,
        PipelineRun.agency_id == agency_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    return run


@router.get("/{agency_id}/pipeline/runs/{run_id}/report")
async def get_report(
    agency_id: str,
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_access(db, agency_id, current_user)
    run = db.query(PipelineRun).filter(
        PipelineRun.id        == run_id,
        PipelineRun.agency_id == agency_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    if run.status != "completed" or not run.report_path:
        raise HTTPException(status_code=404, detail="Report not yet available")
    try:
        with open(run.report_path, "r", encoding="utf-8") as fh:
            return _sanitize(json.load(fh))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report file missing on disk") from None


@router.get("/{agency_id}/pipeline/trends")
async def get_trends(
    agency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Return key metrics from every completed run, ordered oldest→newest.
    Used by the dashboard to render trend sparklines.
    """
    _assert_access(db, agency_id, current_user)
    runs = (
        db.query(PipelineRun)
        .filter(
            PipelineRun.agency_id == agency_id,
            PipelineRun.status    == "completed",
            PipelineRun.report_path.isnot(None),
        )
        .order_by(PipelineRun.created_at.asc())
        .limit(20)
        .all()
    )

    points: List[Dict[str, Any]] = []
    for run in runs:
        try:
            with open(run.report_path, "r", encoding="utf-8") as fh:
                report = json.load(fh)
        except (FileNotFoundError, json.JSONDecodeError):
            continue

        km = report.get("key_metrics", {})
        nfpa = report.get("modules", {}).get("response_times", {}).get("nfpa_1710", {})
        points.append({
            "run_id":        str(run.id),
            "completed_at":  run.completed_at.isoformat() if run.completed_at else None,
            "total_calls":   km.get("total_calls"),
            "avg_response":  km.get("avg_total_response"),
            "nfpa_pct":      nfpa.get("within_target_pct"),
            "nfpa_compliant": nfpa.get("compliant"),
        })

    return {"agency_id": agency_id, "points": points}
