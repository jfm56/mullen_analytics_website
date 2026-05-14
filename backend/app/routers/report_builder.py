"""
Report Builder API router.

GET  /api/agencies/{agency_id}/pipeline/runs/{run_id}/report-builder/sections
     → Lists all section types with metadata + computed summary from the run's report

POST /api/agencies/{agency_id}/pipeline/runs/{run_id}/report-builder/draft
     → Calls Anthropic to draft descriptive text for one section
     Body: {"section_id": str}

POST /api/agencies/{agency_id}/pipeline/runs/{run_id}/report-builder/export-pdf
     → Assembles and returns a downloadable PDF
     Body: {"title": str, "date_range": str, "sections": [{"heading": str, "text": str}]}
"""
import json
import math
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.agency import Agency, AgencyMembership, PipelineRun
from ..models.user import User
from ..services.auth import get_user_profile
from ..services.report_builder.draft import draft_section, is_drafting_available
from ..services.report_builder.pdf import build_pdf, is_pdf_available
from ..services.report_builder.sections import compute_section, get_section_meta
from .auth import get_current_user

router = APIRouter(prefix="/agencies", tags=["report-builder"])


# ── Auth helper (shared pattern) ──────────────────────────────────────────────

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


def _load_report(run: PipelineRun) -> dict:
    if run.status != "completed" or not run.output_path:
        raise HTTPException(status_code=404, detail="Run not yet completed")
    report_path = Path(run.output_path) / "executive_report.json"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")

    def _sanitize(obj: Any) -> Any:
        if isinstance(obj, float):
            return None if (math.isnan(obj) or math.isinf(obj)) else obj
        if isinstance(obj, dict):
            return {k: _sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_sanitize(v) for v in obj]
        return obj

    with open(report_path, encoding="utf-8") as fh:
        return _sanitize(json.load(fh))


def _get_run(db: Session, agency_id: str, run_id: str) -> PipelineRun:
    run = db.query(PipelineRun).filter(
        PipelineRun.id == run_id,
        PipelineRun.agency_id == agency_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    return run


# ── Request / response schemas ────────────────────────────────────────────────

class DraftRequest(BaseModel):
    section_id: str


class ExportSection(BaseModel):
    heading: str
    text: str


class ExportRequest(BaseModel):
    title: str
    date_range: Optional[str] = ""
    sections: List[ExportSection]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{agency_id}/pipeline/runs/{run_id}/report-builder/sections")
async def list_sections(
    agency_id: str,
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return all section types with metadata.
    Enabled sections also include a computed summary from the pipeline report.
    """
    agency = _assert_access(db, agency_id, current_user)
    run    = _get_run(db, agency_id, run_id)
    report = _load_report(run)

    metas = get_section_meta()
    result = []
    for meta in metas:
        item = dict(meta)
        if meta["enabled"]:
            try:
                item["summary"] = compute_section(meta["id"], report)
            except Exception:
                item["summary"] = None
        result.append(item)

    return {
        "agency_name":       report.get("agency_name", ""),
        "date_range_start":  report.get("key_metrics", {}).get("date_range_start"),
        "date_range_end":    report.get("key_metrics", {}).get("date_range_end"),
        "drafting_available": is_drafting_available(),
        "pdf_available":     is_pdf_available(),
        "sections":          result,
    }


@router.post("/{agency_id}/pipeline/runs/{run_id}/report-builder/draft")
async def draft_section_text(
    agency_id: str,
    run_id: str,
    body: DraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Draft 2-4 descriptive sentences for a section using Claude.
    Requires ANTHROPIC_API_KEY to be set.
    """
    _assert_access(db, agency_id, current_user)
    run    = _get_run(db, agency_id, run_id)
    report = _load_report(run)

    summary = compute_section(body.section_id, report)
    if summary is None:
        raise HTTPException(
            status_code=400,
            detail=f"Section '{body.section_id}' is disabled or unavailable for this run."
        )

    if not is_drafting_available():
        raise HTTPException(
            status_code=503,
            detail="LLM drafting unavailable — set ANTHROPIC_API_KEY in backend/.env"
        )

    try:
        draft = await draft_section(body.section_id, summary)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    return {"draft": draft, "section_id": body.section_id}


@router.post("/{agency_id}/pipeline/runs/{run_id}/report-builder/export-pdf")
async def export_pdf(
    agency_id: str,
    run_id: str,
    body: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate and return a PDF from the assembled report sections.
    Requires fpdf2 to be installed.
    """
    agency = _assert_access(db, agency_id, current_user)
    run    = _get_run(db, agency_id, run_id)
    report = _load_report(run)

    if not is_pdf_available():
        raise HTTPException(
            status_code=503,
            detail="PDF export unavailable — run: pip install fpdf2"
        )

    agency_name = report.get("agency_name") or agency.name or "Agency"
    date_range  = body.date_range or (
        f"{report.get('key_metrics', {}).get('date_range_start', '')} – "
        f"{report.get('key_metrics', {}).get('date_range_end', '')}"
    )

    try:
        pdf_bytes = build_pdf(
            title=body.title,
            agency_name=agency_name,
            date_range=date_range,
            sections=[s.model_dump() for s in body.sections],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {exc}") from exc

    filename = body.title.replace(" ", "_")[:60] + ".pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
