"""EMSCS QA Review Engine v1 — API (feature-flagged, synthetic-only).

Mounts only when EMSCS_QA_V1_ENABLED. Dual-mode auth so the module works in staging
(Cognito membership + QA capability) and in local/session dev (authenticated admin
operator) — never an unauthenticated path. Every endpoint is agency-scoped; the
service layer filters by agency_id (defense beyond RLS). No endpoint exposes PHI.
"""
from __future__ import annotations
import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from ..config import get_settings
from ..database import get_db
from ..security_rls import set_agency_context, set_user_context
from ..services.emscs_qa import review_service as svc, seed, export
from ..services.emscs_qa.chart_data import QaChartData

router = APIRouter(prefix="/v1", tags=["emscs-qa"])   # mounted under /api -> /api/v1/...


def _flag():
    if not get_settings().emscs_qa_v1_enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "EMSCS QA module not enabled")


class QaCtx:
    def __init__(self, db, agency_id, actor_user_id, can_review, is_admin):
        self.db = db
        self.agency_id = agency_id
        self.actor_user_id = actor_user_id
        self.can_review = can_review
        self.is_admin = is_admin


async def qa_access(agency_id: UUID, request: Request, db: DBSession = Depends(get_db)) -> QaCtx:
    """Authorize a QA request for `agency_id` in whichever auth mode is active."""
    _flag()
    settings = get_settings()
    if settings.auth_mode == "cognito":
        from ..auth.deps import get_auth, require_membership
        ctx = get_auth(request, db)
        membership = require_membership(agency_id, ctx, db)   # checks membership, sets agency ctx
        can_review = bool(membership.can_review) or ctx.is_platform_admin
        is_admin = bool(membership.is_agency_admin) or ctx.is_platform_admin
        if not (can_review or is_admin):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Requires QA reviewer or agency admin")
        return QaCtx(db, agency_id, ctx.user.id, can_review, is_admin)
    # local / session mode: an authenticated operator (admin) acts over the synthetic agency
    from .auth import get_current_user
    user = await get_current_user(request, db)
    set_user_context(db, user.id)
    set_agency_context(db, agency_id)
    return QaCtx(db, agency_id, user.id, True, True)


# ───────────────────────── module info (no agency) ─────────────────────────
@router.get("/qa/health")
def qa_health():
    return {"enabled": bool(get_settings().emscs_qa_v1_enabled), "module": "emscs_qa_v1"}


@router.get("/qa/library")
def qa_library():
    _flag()
    s = seed.load_seed()
    return {"domains": s["domains"], "scoring_config": s["scoring_config"],
            "indicators": s["indicators"], "lists": s.get("lists", {}),
            "references": s.get("references", [])}


# Synthetic demo charts (no PHI) for the local Review View demo / screenshots.
_DEMO_CHARTS = [
    {"external_ref": "DEMO-001", "transported": True, "age_years": 71,
     "primary_impression": "Cardiac arrest, post ROSC", "chief_complaint": "Witnessed collapse after a fall",
     "final_acuity": "Emergent (Yellow)", "disposition": "Transported",
     "vitals": [{"time": "01:48", "sbp": 87, "dbp": 50, "bp_method": "auto", "spo2": None, "pain": 0, "gcs": 3}],
     "securement_text": "all appropriate straps", "signatures": {"patient": True, "crew": True},
     "receiving_staff_named": False, "assessment_documented": True,
     "narrative_only_interventions": ["NPA attempt", "LUCAS application"],
     "add_actions": [{"kind": "procedure", "name": "CPR"}, {"kind": "procedure", "name": "LUCAS"}],
     "outcome": {"rosc": True, "condition": "Improved"},
     "structured_fields": {"airway": {"charted": "i-gel", "narrative": "ALS intubation"},
                           "compressions_at_destination": True, "pulse": "absent", "cap_refill_sec": 1}},
    {"external_ref": "DEMO-002", "transported": True, "age_years": 9,
     "primary_impression": "Isolated extremity injury", "chief_complaint": "Fall playing football",
     "final_acuity": "Lower acuity (Green)", "disposition": "Transported", "transport_mode": "lights and sirens",
     "vitals": [{"time": "19:30", "sbp": 110, "dbp": 70, "bp_method": "manual", "spo2": 99, "pain": 10},
                {"time": "19:45", "sbp": 112, "dbp": 72, "bp_method": "auto", "spo2": None, "pain": None}],
     "securement_straps": 4, "signatures": {"guardian": True, "receiving": True, "crew": True},
     "receiving_staff_named": True, "assessment_documented": True, "consent_signed": False,
     "add_actions": [{"kind": "procedure", "name": "Splint"}],
     "structured_fields": {"weight_kg": 12.5, "location": {"charted": "General/Global", "narrative": "left wrist"}}},
    {"external_ref": "DEMO-003", "transported": False, "age_years": 54,
     "primary_impression": "Hypoglycemia, treated", "chief_complaint": "Altered mental status",
     "disposition": "Patient Refused Care", "assessment_documented": True,
     "vitals": [{"time": "08:10", "sbp": 138, "dbp": 86, "bp_method": "manual", "spo2": 98, "pain": 0}],
     "add_actions": [{"kind": "procedure", "name": "Blood glucose (glucometer)"}],
     "structured_fields": {}},
]


@router.post("/qa/demo/seed")
async def demo_seed(request: Request, db: DBSession = Depends(get_db)):
    """Local-dev only: seed a synthetic demo agency + reviews for the Review View.
    Disabled in Cognito/staging mode. No PHI; synthetic charts only."""
    _flag()
    if get_settings().auth_mode == "cognito":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "demo seed is local-dev only")
    from .auth import get_current_user
    from ..models.agency import Agency
    user = await get_current_user(request, db)
    agency = db.query(Agency).filter(Agency.slug == "emscs-qa-demo").first()
    if agency is None:
        agency = Agency(agency_name="EMSCS QA Demo (synthetic)", slug="emscs-qa-demo")
        db.add(agency)
        db.flush()
    set_user_context(db, user.id)
    set_agency_context(db, agency.id)
    existing = {s.chart_id for s in svc.list_sessions(db, agency.id)}
    created = []
    if not existing:
        for cd in _DEMO_CHARTS:
            s = svc.create_review(db, agency.id, QaChartData(**cd), actor_user_id=user.id)
            created.append(str(s.id))
    db.commit()
    return {"agency_id": str(agency.id), "created_sessions": created}


# ───────────────────────── request bodies ─────────────────────────
class ReviewCreate(BaseModel):
    chart: dict

class OverrideResult(BaseModel):
    verdict: str
    reason: str

class NoteBody(BaseModel):
    note: str

class SeverityOverride(BaseModel):
    severity: str
    reason: str

class DismissBody(BaseModel):
    reason: str

class ManualFinding(BaseModel):
    description: str
    severity: str
    indicator_number: int | None = None
    evidence: list | None = None

class DomainScores(BaseModel):
    scores: list[float]


def _detail_json(d):
    s = d["session"]
    chart = d.get("chart")
    return {
        "session": {"id": str(s.id), "status": s.status, "scoring_version": s.scoring_version,
                    "domain_scores": s.domain_scores, "review_notes": s.review_notes,
                    "approved_at": s.approved_at.isoformat() if s.approved_at else None},
        "chart": None if not chart else {"external_ref": chart.external_ref, "status": chart.status,
                                         "chart_data": chart.chart_data},
        "indicator_reviews": [
            {"id": str(ir.id), "number": ir.indicator_number, "applicable": ir.applicable,
             "automated": ir.automated_result, "human": ir.human_result, "overridden": ir.overridden,
             "override_reason": ir.override_reason} for ir in d["indicator_reviews"]],
        "findings": [
            {"id": str(f.id), "indicator_number": f.indicator_number, "type": f.finding_type,
             "description": f.description, "evidence": f.evidence, "origin": f.origin, "status": f.status,
             "automated_severity": f.automated_severity, "human_severity": f.human_severity,
             "final_severity": f.final_severity(), "severity_requires_human": f.severity_requires_human,
             "severity_confidence": f.severity_confidence, "severity_modifiers": f.severity_modifiers,
             "severity_rationale": f.severity_rationale, "acknowledged": f.acknowledged,
             "dismissed_reason": f.dismissed_reason} for f in d["findings"]],
        "score": None if not d["score"] else {
            "automated_indicator_compliance": d["score"].automated_indicator_compliance,
            "approved_quality_score": d["score"].approved_quality_score,
            "approved_indicator_compliance": d["score"].approved_indicator_compliance,
            "approved_composite_score": d["score"].approved_composite_score,
            "approved_tier": d["score"].approved_tier,
            "approved_domain_scores": d["score"].approved_domain_scores},
    }


# ───────────────────────── sessions / reviews ─────────────────────────
@router.get("/agencies/{agency_id}/qa/sessions")
def list_sessions(agency_id: UUID, ctx: QaCtx = Depends(qa_access)):
    from ..models.emscs_qa import QaScore, QaChart
    out = []
    for s in svc.list_sessions(ctx.db, ctx.agency_id):
        score = ctx.db.query(QaScore).filter(QaScore.agency_id == ctx.agency_id,
                                             QaScore.session_id == s.id).first()
        chart = ctx.db.query(QaChart).filter(QaChart.agency_id == ctx.agency_id,
                                             QaChart.id == s.chart_id).first()
        out.append({"id": str(s.id), "status": s.status,
                    "external_ref": chart.external_ref if chart else None,
                    "approved_tier": getattr(score, "approved_tier", None),
                    "approved_composite": getattr(score, "approved_composite_score", None)})
    return {"sessions": out}


@router.get("/agencies/{agency_id}/qa/sessions/{session_id}")
def session_detail(agency_id: UUID, session_id: UUID, ctx: QaCtx = Depends(qa_access)):
    return _detail_json(svc.get_review_detail(ctx.db, ctx.agency_id, session_id))


@router.post("/agencies/{agency_id}/qa/reviews", status_code=201)
def create_review(agency_id: UUID, body: ReviewCreate, ctx: QaCtx = Depends(qa_access)):
    try:
        chart = QaChartData(**body.chart)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"invalid chart: {exc}")
    s = svc.create_review(ctx.db, ctx.agency_id, chart, actor_user_id=ctx.actor_user_id)
    ctx.db.commit()
    return {"session_id": str(s.id)}


def _guard(fn, *a, **k):
    try:
        return fn(*a, **k)
    except svc.QaReviewError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))


@router.post("/agencies/{agency_id}/qa/indicators/{ir_id}/accept")
def accept_indicator(agency_id: UUID, ir_id: UUID, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.accept_indicator, ctx.db, ctx.agency_id, ctx.actor_user_id, ir_id); ctx.db.commit()
    return {"ok": True}


@router.post("/agencies/{agency_id}/qa/indicators/{ir_id}/override")
def override_indicator(agency_id: UUID, ir_id: UUID, body: OverrideResult, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.override_indicator, ctx.db, ctx.agency_id, ctx.actor_user_id, ir_id, body.verdict, body.reason)
    ctx.db.commit(); return {"ok": True}


@router.post("/agencies/{agency_id}/qa/indicators/{ir_id}/note")
def indicator_note(agency_id: UUID, ir_id: UUID, body: NoteBody, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.edit_indicator_note, ctx.db, ctx.agency_id, ctx.actor_user_id, ir_id, body.note)
    ctx.db.commit(); return {"ok": True}


@router.post("/agencies/{agency_id}/qa/findings/{fid}/severity")
def set_severity(agency_id: UUID, fid: UUID, body: SeverityOverride, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.override_severity, ctx.db, ctx.agency_id, ctx.actor_user_id, fid, body.severity, body.reason)
    ctx.db.commit(); return {"ok": True}


@router.post("/agencies/{agency_id}/qa/findings/{fid}/dismiss")
def dismiss_finding(agency_id: UUID, fid: UUID, body: DismissBody, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.dismiss_finding, ctx.db, ctx.agency_id, ctx.actor_user_id, fid, body.reason)
    ctx.db.commit(); return {"ok": True}


@router.post("/agencies/{agency_id}/qa/findings/{fid}/acknowledge")
def acknowledge_finding(agency_id: UUID, fid: UUID, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.acknowledge_critical, ctx.db, ctx.agency_id, ctx.actor_user_id, fid); ctx.db.commit()
    return {"ok": True}


@router.post("/agencies/{agency_id}/qa/sessions/{sid}/findings")
def manual_finding(agency_id: UUID, sid: UUID, body: ManualFinding, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.add_manual_finding, ctx.db, ctx.agency_id, ctx.actor_user_id, sid, body.description,
           body.severity, body.indicator_number, body.evidence)
    ctx.db.commit(); return {"ok": True}


@router.post("/agencies/{agency_id}/qa/sessions/{sid}/note")
def session_note(agency_id: UUID, sid: UUID, body: NoteBody, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.add_reviewer_note, ctx.db, ctx.agency_id, ctx.actor_user_id, sid, body.note)
    ctx.db.commit(); return {"ok": True}


@router.post("/agencies/{agency_id}/qa/sessions/{sid}/domain-scores")
def domain_scores(agency_id: UUID, sid: UUID, body: DomainScores, ctx: QaCtx = Depends(qa_access)):
    _guard(svc.set_domain_scores, ctx.db, ctx.agency_id, ctx.actor_user_id, sid, body.scores)
    ctx.db.commit(); return {"ok": True}


@router.post("/agencies/{agency_id}/qa/sessions/{sid}/approve")
def approve(agency_id: UUID, sid: UUID, ctx: QaCtx = Depends(qa_access)):
    score = _guard(svc.approve_session, ctx.db, ctx.agency_id, ctx.actor_user_id, sid)
    ctx.db.commit()
    return {"approved_composite": score.approved_composite_score, "approved_tier": score.approved_tier}


@router.get("/agencies/{agency_id}/qa/audit")
def audit(agency_id: UUID, ctx: QaCtx = Depends(qa_access)):
    from ..models.emscs_qa import QaAuditEvent
    rows = (ctx.db.query(QaAuditEvent).filter(QaAuditEvent.agency_id == ctx.agency_id)
            .order_by(QaAuditEvent.at.desc()).limit(500).all())
    return {"events": [{"action": e.action, "actor": str(e.actor_user_id) if e.actor_user_id else None,
                        "at": e.at.isoformat() if e.at else None, "session_id": str(e.session_id) if e.session_id else None,
                        "before": e.before, "after": e.after, "detail": e.detail} for e in rows]}


@router.get("/agencies/{agency_id}/qa/export")
def export_workbook(agency_id: UUID, ctx: QaCtx = Depends(qa_access)):
    bundle = _bundle_from_db(ctx.db, ctx.agency_id)
    wb = export.build_workbook(bundle)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=emscs-qa-export.xlsx"})


def _bundle_from_db(db, agency_id) -> dict:
    """Assemble an export bundle from persisted, agency-scoped review data."""
    charts = []
    agg = {"Critical": 0, "Major": 0, "Minor": 0, "Commendation": 0}
    for s in svc.list_sessions(db, agency_id):
        d = svc.get_review_detail(db, agency_id, s.id)
        sc = d["score"]
        inds = [{"num": ir.indicator_number, "result": (ir.human_result or ir.automated_result or {}).get("verdict"),
                 "status": (ir.human_result or {}).get("verdict"), "note": (ir.human_result or {}).get("note")}
                for ir in d["indicator_reviews"]]
        finds = []
        for f in d["findings"]:
            if f.status == "dismissed":
                continue
            sev = f.final_severity()
            finds.append({"severity": sev, "description": f.description})
            if sev in agg:
                agg[sev] += 1
        charts.append({"review_id": str(s.chart_id)[:8], "domain_scores": s.domain_scores,
                       "quality_score": getattr(sc, "approved_quality_score", None),
                       "indicator_compliance": getattr(sc, "approved_indicator_compliance", None),
                       "composite": getattr(sc, "approved_composite_score", None),
                       "tier": getattr(sc, "approved_tier", None),
                       "major_critical": agg["Major"] + agg["Critical"], "commendation": agg["Commendation"],
                       "indicators": inds, "findings": finds})
    return {"agency_name": "EMSCS QA Export (synthetic)", "charts": charts, "aggregates": agg}
