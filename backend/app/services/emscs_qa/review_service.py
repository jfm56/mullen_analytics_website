"""DB-backed human review / override / audit service for EMSCS QA.

Invariants:
- The AUTOMATED proposal is immutable. Human decisions are stored in separate
  columns (qa_indicator_reviews.human_result, qa_findings.human_severity/status,
  qa_scores.approved_*) and NEVER overwrite the automated columns.
- Every read and write is scoped to the caller's agency_id (tenant isolation at the
  application layer, independent of — and in addition to — DB RLS). Mutations load
  the target row filtered by agency_id and raise if it is not the caller's.
- Every action writes a qa_audit_events row: actor, agency, session, target,
  before, after, reason.
- Overrides/dismissals require a reason. Critical findings must be explicitly
  acknowledged before a session can be approved. No AI computes a score; approval
  recomputes the deterministic scores from the human-approved inputs.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional

from ...security_rls import set_agency_context, set_user_context
from ...models.emscs_qa import (
    QaChart, QaReviewSession, QaIndicatorReview, QaFinding, QaScore, QaAuditEvent,
)
from . import scoring, seed
from .chart_data import QaChartData
from .review import build_automated_review

SEVERITIES = ("Critical", "Major", "Minor", "Commendation")
VALID_VERDICTS = ("pass", "fail", "na")


class QaReviewError(Exception):
    """Authorization or precondition failure in the review workflow."""


def _ctx(db, agency_id, actor_user_id=None):
    if actor_user_id:
        set_user_context(db, actor_user_id)
    set_agency_context(db, agency_id)


def _audit(db, agency_id, session_id, actor, action, before=None, after=None, detail=None):
    db.add(QaAuditEvent(agency_id=agency_id, session_id=session_id, actor_user_id=actor,
                        action=action, before=before, after=after, detail=detail or {}))


def _get(db, model, agency_id, row_id):
    row = db.query(model).filter(model.id == row_id, model.agency_id == agency_id).first()
    if row is None:
        raise QaReviewError(f"{model.__name__} {row_id} not found for this agency")
    return row


# ───────────────────────── create (persist automated proposal) ─────────────────────────
def create_review(db, agency_id, chart: QaChartData, actor_user_id=None,
                  scoring_version: Optional[str] = None) -> QaReviewSession:
    _ctx(db, agency_id, actor_user_id)
    sv = scoring_version or seed.scoring_config().get("scoring_version", "unset")

    qc = (db.query(QaChart)
          .filter(QaChart.agency_id == agency_id, QaChart.external_ref == chart.external_ref).first())
    if qc is None:
        qc = QaChart(agency_id=agency_id, external_ref=chart.external_ref,
                     source="synthetic", is_synthetic=True, chart_data=chart.model_dump(), status="in_review")
        db.add(qc)
        db.flush()

    auto = build_automated_review(chart)
    session = QaReviewSession(agency_id=agency_id, chart_id=qc.id, scoring_version=sv,
                              status="auto_generated", engine_version="v1", automated_at=datetime.utcnow())
    db.add(session)
    db.flush()

    for r in auto.indicator_results:
        db.add(QaIndicatorReview(
            agency_id=agency_id, session_id=session.id, indicator_number=r.number, applicable=True,
            automated_result={"verdict": r.verdict, "classification": r.classification.value,
                              "rationale": r.rationale, "evidence": r.evidence},
            human_result=None))

    for f in auto.findings:
        if f["kind"] != "commendation" and not f.get("evidence"):
            raise QaReviewError(f"negative automated finding (indicator {f['indicator_number']}) has no evidence")
        db.add(QaFinding(
            agency_id=agency_id, session_id=session.id, indicator_number=f["indicator_number"],
            finding_type=f["kind"], description=f["description"], evidence=f["evidence"],
            automated_severity=f["severity_proposed"], severity_requires_human=f["severity_requires_human"],
            severity_confidence=f["severity_confidence"], severity_modifiers=f["severity_modifiers"],
            severity_rationale=f["severity_rationale"], origin="automated", status="open"))

    # Automated indicator-compliance proposal (Quality/Composite/Tier need the human domain ratings).
    statuses = []
    for r in auto.indicator_results:
        if r.number in set(seed.general_numbers()):
            statuses.append({"pass": "Met", "fail": "Not Met", "na": "NA"}.get(r.verdict))
    db.add(QaScore(agency_id=agency_id, session_id=session.id, scoring_version=sv,
                   automated_indicator_compliance=scoring.indicator_compliance(statuses)))

    _audit(db, agency_id, session.id, actor_user_id, "auto_review_created",
           after={"indicators": len(auto.indicator_results), "findings": len(auto.findings),
                  "activations": list(auto.activations)})
    db.flush()
    return session


# ───────────────────────── indicator actions ─────────────────────────
def accept_indicator(db, agency_id, actor, indicator_review_id):
    _ctx(db, agency_id, actor)
    ir = _get(db, QaIndicatorReview, agency_id, indicator_review_id)
    auto = ir.automated_result or {}
    if auto.get("verdict") == "human_review_required":
        raise QaReviewError("cannot accept a HUMAN_REVIEW_REQUIRED proposal; set an explicit result")
    ir.human_result = {"verdict": auto.get("verdict"), "source": "accepted_automated"}
    ir.overridden = False
    ir.reviewed_by = actor
    ir.reviewed_at = datetime.utcnow()
    _audit(db, agency_id, ir.session_id, actor, "indicator_accepted",
           before={"indicator": ir.indicator_number, "automated": auto.get("verdict")},
           after={"human": ir.human_result["verdict"]})
    db.flush()
    return ir


def override_indicator(db, agency_id, actor, indicator_review_id, new_verdict, reason):
    _ctx(db, agency_id, actor)
    if new_verdict not in VALID_VERDICTS:
        raise QaReviewError(f"invalid verdict {new_verdict!r}")
    if not (reason or "").strip():
        raise QaReviewError("an override reason is required")
    ir = _get(db, QaIndicatorReview, agency_id, indicator_review_id)
    before = {"indicator": ir.indicator_number, "automated": (ir.automated_result or {}).get("verdict"),
              "prior_human": (ir.human_result or {}).get("verdict")}
    ir.human_result = {"verdict": new_verdict, "source": "override"}
    ir.overridden = True
    ir.override_reason = reason
    ir.reviewed_by = actor
    ir.reviewed_at = datetime.utcnow()
    _audit(db, agency_id, ir.session_id, actor, "indicator_overridden",
           before=before, after={"human": new_verdict}, detail={"reason": reason})
    db.flush()
    return ir


def edit_indicator_note(db, agency_id, actor, indicator_review_id, note):
    _ctx(db, agency_id, actor)
    ir = _get(db, QaIndicatorReview, agency_id, indicator_review_id)
    hr = dict(ir.human_result or {})
    before = hr.get("note")
    hr["note"] = note
    ir.human_result = hr
    ir.reviewed_by = actor
    ir.reviewed_at = datetime.utcnow()
    _audit(db, agency_id, ir.session_id, actor, "indicator_note_edited",
           before={"note": before}, after={"note": note})
    db.flush()
    return ir


# ───────────────────────── finding actions ─────────────────────────
def accept_severity(db, agency_id, actor, finding_id):
    _ctx(db, agency_id, actor)
    f = _get(db, QaFinding, agency_id, finding_id)
    if f.automated_severity in (None, "HUMAN_REVIEW_REQUIRED"):
        raise QaReviewError("no confident automated severity to accept; set one explicitly")
    before = {"human_severity": f.human_severity}
    f.human_severity = f.automated_severity
    f.status = "accepted"
    f.resolved_by = actor
    f.resolved_at = datetime.utcnow()
    _audit(db, agency_id, f.session_id, actor, "severity_accepted",
           before=before, after={"human_severity": f.human_severity},
           detail={"finding": str(f.id), "indicator": f.indicator_number})
    db.flush()
    return f


def override_severity(db, agency_id, actor, finding_id, new_severity, reason):
    _ctx(db, agency_id, actor)
    if new_severity not in SEVERITIES:
        raise QaReviewError(f"invalid severity {new_severity!r}")
    if not (reason or "").strip():
        raise QaReviewError("a severity override reason is required")
    f = _get(db, QaFinding, agency_id, finding_id)
    before = {"automated_severity": f.automated_severity, "prior_human": f.human_severity}
    f.human_severity = new_severity
    f.severity_override_reason = reason
    f.status = "accepted"
    f.resolved_by = actor
    f.resolved_at = datetime.utcnow()
    _audit(db, agency_id, f.session_id, actor, "severity_overridden",
           before=before, after={"human_severity": new_severity}, detail={"reason": reason, "finding": str(f.id)})
    db.flush()
    return f


def dismiss_finding(db, agency_id, actor, finding_id, reason):
    _ctx(db, agency_id, actor)
    if not (reason or "").strip():
        raise QaReviewError("a dismissal reason is required")
    f = _get(db, QaFinding, agency_id, finding_id)
    before = {"status": f.status}
    f.status = "dismissed"
    f.dismissed_reason = reason
    f.resolved_by = actor
    f.resolved_at = datetime.utcnow()
    _audit(db, agency_id, f.session_id, actor, "finding_dismissed",
           before=before, after={"status": "dismissed"}, detail={"reason": reason, "finding": str(f.id)})
    db.flush()
    return f


def add_manual_finding(db, agency_id, actor, session_id, description, severity,
                       indicator_number=None, evidence=None, reason=None):
    _ctx(db, agency_id, actor)
    if severity not in SEVERITIES:
        raise QaReviewError(f"invalid severity {severity!r}")
    if not (description or "").strip():
        raise QaReviewError("a finding description is required")
    session = _get(db, QaReviewSession, agency_id, session_id)
    f = QaFinding(agency_id=agency_id, session_id=session.id, indicator_number=indicator_number,
                  finding_type="manual", description=description, evidence=evidence or [],
                  automated_severity=None, human_severity=severity, origin="human", status="accepted",
                  resolved_by=actor, resolved_at=datetime.utcnow())
    db.add(f)
    db.flush()
    _audit(db, agency_id, session.id, actor, "manual_finding_added",
           after={"severity": severity, "description": description}, detail={"reason": reason, "finding": str(f.id)})
    db.flush()
    return f


def add_reviewer_note(db, agency_id, actor, session_id, note):
    _ctx(db, agency_id, actor)
    session = _get(db, QaReviewSession, agency_id, session_id)
    before = session.review_notes
    session.review_notes = ((session.review_notes + "\n") if session.review_notes else "") + note
    _audit(db, agency_id, session.id, actor, "reviewer_note_added",
           before={"notes": before}, after={"note": note})
    db.flush()
    return session


def acknowledge_critical(db, agency_id, actor, finding_id):
    _ctx(db, agency_id, actor)
    f = _get(db, QaFinding, agency_id, finding_id)
    if f.final_severity() != "Critical":
        raise QaReviewError("only Critical findings require acknowledgment")
    f.acknowledged = True
    f.acknowledged_by = actor
    f.acknowledged_at = datetime.utcnow()
    _audit(db, agency_id, f.session_id, actor, "critical_acknowledged",
           after={"finding": str(f.id), "indicator": f.indicator_number})
    db.flush()
    return f


def set_domain_scores(db, agency_id, actor, session_id, scores):
    _ctx(db, agency_id, actor)
    if not isinstance(scores, (list, tuple)) or len(scores) != 8:
        raise QaReviewError("exactly 8 domain scores (0-5) are required")
    if any((s is None or s < 0 or s > 5) for s in scores):
        raise QaReviewError("domain scores must be 0-5")
    session = _get(db, QaReviewSession, agency_id, session_id)
    before = session.domain_scores
    session.domain_scores = list(scores)
    if session.status == "auto_generated":
        session.status = "pending_human"
    session.reviewer_user_id = actor
    _audit(db, agency_id, session.id, actor, "domain_scores_set",
           before={"domain_scores": before}, after={"domain_scores": list(scores)})
    db.flush()
    return session


# ───────────────────────── approval (recompute deterministic scores) ─────────────────────────
def approve_session(db, agency_id, actor, session_id) -> QaScore:
    _ctx(db, agency_id, actor)
    session = _get(db, QaReviewSession, agency_id, session_id)
    irs = db.query(QaIndicatorReview).filter(QaIndicatorReview.agency_id == agency_id,
                                             QaIndicatorReview.session_id == session_id).all()
    findings = db.query(QaFinding).filter(QaFinding.agency_id == agency_id,
                                          QaFinding.session_id == session_id).all()

    # Preconditions
    if not session.domain_scores or len(session.domain_scores) != 8:
        raise QaReviewError("cannot approve: the 8 domain scores have not been entered")
    unresolved = [ir.indicator_number for ir in irs if not (ir.human_result or {}).get("verdict")]
    if unresolved:
        raise QaReviewError(f"cannot approve: indicators awaiting a human result: {sorted(unresolved)}")
    unack = [str(f.id) for f in findings if f.status != "dismissed" and f.final_severity() == "Critical"
             and not f.acknowledged]
    if unack:
        raise QaReviewError(f"cannot approve: {len(unack)} Critical finding(s) not acknowledged")

    cfg = seed.scoring_config()
    doms = sorted(seed.domains(), key=lambda d: d["order"])
    weights = [d["weight"] for d in doms]
    tiers = [(t["name"], t["min"]) for t in cfg["tiers"]]

    statuses = [{"pass": "Met", "fail": "Not Met", "na": "NA"}.get((ir.human_result or {}).get("verdict"))
                for ir in irs]
    qs = scoring.quality_score(session.domain_scores, weights)
    ic = scoring.indicator_compliance(statuses)
    comp = scoring.composite_score(qs, ic, cfg["quality_weight"], cfg["compliance_weight"])
    tier = scoring.tier(comp, tiers)
    sev_list = [f.final_severity() for f in findings if f.status != "dismissed"
                and f.final_severity() in SEVERITIES]
    counts = scoring.severity_counts(sev_list)

    score = db.query(QaScore).filter(QaScore.agency_id == agency_id,
                                     QaScore.session_id == session_id).first()
    if score is None:
        score = QaScore(agency_id=agency_id, session_id=session_id, scoring_version=session.scoring_version)
        db.add(score)
    # NEVER overwrite automated_*; write only approved_*.
    score.approved_quality_score = qs
    score.approved_indicator_compliance = ic
    score.approved_composite_score = comp
    score.approved_tier = tier
    score.approved_domain_scores = session.domain_scores
    score.approved_at = datetime.utcnow()

    session.status = "approved"
    session.approved_at = datetime.utcnow()
    session.reviewer_user_id = actor

    _audit(db, agency_id, session.id, actor, "session_approved",
           after={"quality_score": qs, "indicator_compliance": ic, "composite": comp, "tier": tier,
                  "counts": counts})
    db.flush()
    return score


# ───────────────────────── reads (agency-scoped) ─────────────────────────
def list_sessions(db, agency_id):
    _ctx(db, agency_id)
    return (db.query(QaReviewSession).filter(QaReviewSession.agency_id == agency_id)
            .order_by(QaReviewSession.created_at.desc()).all())


def get_review_detail(db, agency_id, session_id) -> dict:
    _ctx(db, agency_id)
    session = _get(db, QaReviewSession, agency_id, session_id)
    irs = db.query(QaIndicatorReview).filter(QaIndicatorReview.agency_id == agency_id,
                                             QaIndicatorReview.session_id == session_id).all()
    findings = db.query(QaFinding).filter(QaFinding.agency_id == agency_id,
                                          QaFinding.session_id == session_id).all()
    score = db.query(QaScore).filter(QaScore.agency_id == agency_id,
                                     QaScore.session_id == session_id).first()
    chart = db.query(QaChart).filter(QaChart.agency_id == agency_id,
                                     QaChart.id == session.chart_id).first()
    return {"session": session, "chart": chart, "indicator_reviews": irs,
            "findings": findings, "score": score}
