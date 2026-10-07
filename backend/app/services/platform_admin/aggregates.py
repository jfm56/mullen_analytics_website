"""Cross-agency aggregates for the SUPER_ADMIN platform views.

Run with platform context set (set_platform_context) so the authenticated platform
clause in RLS exposes all agencies. Data is classified synthetic | trial | production;
synthetic/trial are reported separately and excluded from production client metrics.
QA tables are flag-gated — queries degrade to zeros when the tables are absent. Non-PHI
(counts/ids/verdicts/severity labels only — never chart content)."""
from __future__ import annotations
from collections import Counter

from sqlalchemy import func
from sqlalchemy.exc import ProgrammingError, OperationalError

from ...models.agency import Agency, AuditLog
from ...models.user import User


def _agency_class(db):
    """agency_id (str) -> classification, for synthetic/production separation."""
    return {str(a.id): a.data_classification for a in db.query(Agency).all()}


def _qa_models():
    try:
        from ...models import emscs_qa as m
        return m
    except Exception:  # noqa: BLE001
        return None


def platform_overview(db) -> dict:
    agencies = db.query(Agency).all()
    cls = Counter(a.data_classification for a in agencies)
    users = db.query(User).count()
    super_admins = db.query(User).filter(User.platform_role == "super_admin").count()

    qa = {"reviews": 0, "pending": 0, "critical_open": 0, "major": 0}
    m = _qa_models()
    if m is not None:
        try:
            qa["reviews"] = db.query(m.QaReviewSession).count()
            qa["pending"] = db.query(m.QaReviewSession).filter(m.QaReviewSession.status != "approved").count()
            open_f = db.query(m.QaFinding).filter(m.QaFinding.status != "dismissed").all()
            qa["critical_open"] = sum(1 for f in open_f if f.final_severity() == "Critical" and not f.acknowledged)
            qa["major"] = sum(1 for f in open_f if f.final_severity() == "Major")
        except (ProgrammingError, OperationalError):
            db.rollback()

    # recent imports (uploads) + failures — best-effort from the EMS upload tables.
    imports = {"recent": 0, "failed": 0}
    try:
        from ...models.data_upload import DataUpload
        imports["recent"] = db.query(DataUpload).count()
        imports["failed"] = db.query(DataUpload).filter(DataUpload.status == "failed").count()
    except Exception:  # noqa: BLE001
        db.rollback()

    recent_admin = []
    try:
        for e in (db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()):
            recent_admin.append({"action": e.action, "agency_id": str(e.agency_id) if e.agency_id else None,
                                 "at": e.created_at.isoformat() if e.created_at else None})
    except Exception:  # noqa: BLE001
        db.rollback()

    return {
        "agencies": {"total": len(agencies), "by_classification": dict(cls)},
        "users": {"total": users, "super_admins": super_admins},
        "qa": qa,
        "imports": imports,
        "recent_admin_activity": recent_admin,
    }


def _filtered_sessions(db, m, classification=None, agency_id=None):
    q = db.query(m.QaReviewSession)
    if agency_id:
        q = q.filter(m.QaReviewSession.agency_id == agency_id)
    if classification:
        cls = _agency_class(db)
        ids = [aid for aid, c in cls.items() if c == classification]
        q = q.filter(m.QaReviewSession.agency_id.in_(ids))
    return q


def qa_monitor(db, *, agency_id=None, classification=None, status=None) -> dict:
    m = _qa_models()
    if m is None:
        return {"available": False}
    try:
        sessions = _filtered_sessions(db, m, classification, agency_id)
        if status:
            sessions = sessions.filter(m.QaReviewSession.status == status)
        sessions = sessions.all()
        sids = [s.id for s in sessions]
        findings = db.query(m.QaFinding).filter(m.QaFinding.session_id.in_(sids)).all() if sids else []
        irs = db.query(m.QaIndicatorReview).filter(m.QaIndicatorReview.session_id.in_(sids)).all() if sids else []
    except (ProgrammingError, OperationalError):
        db.rollback()
        return {"available": False}

    sev = Counter(f.final_severity() for f in findings if f.status != "dismissed")
    failed_cqi = Counter(ir.indicator_number for ir in irs
                         if (ir.human_result or ir.automated_result or {}).get("verdict") in ("fail", "Not Met"))
    reviewed = [ir for ir in irs if (ir.human_result or {}).get("verdict")]
    overridden = sum(1 for ir in reviewed if ir.overridden)
    agree = sum(1 for ir in reviewed
                if (ir.human_result or {}).get("verdict") == (ir.automated_result or {}).get("verdict"))
    sev_pairs = [f for f in findings if f.human_severity and f.automated_severity]
    sev_agree = sum(1 for f in sev_pairs if f.human_severity == f.automated_severity)

    return {
        "available": True,
        "total_reviews": len(sessions),
        "pending": sum(1 for s in sessions if s.status != "approved"),
        "findings": {"Critical": sev.get("Critical", 0), "Major": sev.get("Major", 0),
                     "Minor": sev.get("Minor", 0), "Commendation": sev.get("Commendation", 0)},
        "most_failed_cqi": [{"indicator": n, "count": c} for n, c in failed_cqi.most_common(10)],
        "override_rate": round(overridden / len(reviewed), 4) if reviewed else None,
        "auto_human_agreement": round(agree / len(reviewed), 4) if reviewed else None,
        "severity_agreement": round(sev_agree / len(sev_pairs), 4) if sev_pairs else None,
        "findings_requiring_human_severity": sum(1 for f in findings if f.severity_requires_human),
    }


def qa_validation(db, *, agency_id=None, classification=None, limit=200) -> dict:
    """Per-decision AUTO vs HUMAN + validation metrics. No retraining is performed."""
    m = _qa_models()
    if m is None:
        return {"available": False}
    try:
        sessions = _filtered_sessions(db, m, classification, agency_id).all()
        sids = [s.id for s in sessions]
        irs = db.query(m.QaIndicatorReview).filter(m.QaIndicatorReview.session_id.in_(sids)).all() if sids else []
        findings = db.query(m.QaFinding).filter(m.QaFinding.session_id.in_(sids)).all() if sids else []
    except (ProgrammingError, OperationalError):
        db.rollback()
        return {"available": False}

    reviewed = [ir for ir in irs if (ir.human_result or {}).get("verdict")]
    def av(ir): return (ir.automated_result or {}).get("verdict")
    def hv(ir): return (ir.human_result or {}).get("verdict")
    agree = sum(1 for ir in reviewed if av(ir) == hv(ir))
    overridden = sum(1 for ir in reviewed if ir.overridden)
    # FP = auto FAIL but human not-fail; FN = auto not-fail but human FAIL (where measurable)
    fp = sum(1 for ir in reviewed if av(ir) == "fail" and hv(ir) in ("pass", "na"))
    fn = sum(1 for ir in reviewed if av(ir) in ("pass", "na") and hv(ir) == "fail")
    auto_fail = sum(1 for ir in reviewed if av(ir) == "fail")
    human_fail = sum(1 for ir in reviewed if hv(ir) == "fail")
    hrr = sum(1 for ir in irs if av(ir) == "human_review_required")

    # Critical recall / finding precision (human decision is ground truth)
    crit_human = [f for f in findings if f.human_severity == "Critical"]
    crit_recall = (sum(1 for f in crit_human if f.automated_severity == "Critical") / len(crit_human)) if crit_human else None
    auto_findings = [f for f in findings if f.origin == "automated"]
    precision = (sum(1 for f in auto_findings if f.status != "dismissed") / len(auto_findings)) if auto_findings else None
    sev_pairs = [f for f in findings if f.human_severity and f.automated_severity]
    sev_agree = (sum(1 for f in sev_pairs if f.human_severity == f.automated_severity) / len(sev_pairs)) if sev_pairs else None

    decisions = []
    for ir in reviewed[:limit]:
        decisions.append({
            "indicator": ir.indicator_number, "classification": (ir.automated_result or {}).get("classification"),
            "auto": av(ir), "human": hv(ir), "overridden": ir.overridden,
            "override_reason": ir.override_reason, "agree": av(ir) == hv(ir),
            "evidence": (ir.automated_result or {}).get("evidence"), "reviewer": str(ir.reviewed_by) if ir.reviewed_by else None,
        })

    return {
        "available": True,
        "metrics": {
            "indicator_agreement": round(agree / len(reviewed), 4) if reviewed else None,
            "override_rate": round(overridden / len(reviewed), 4) if reviewed else None,
            "false_positive_rate": round(fp / auto_fail, 4) if auto_fail else None,
            "false_negative_rate": round(fn / human_fail, 4) if human_fail else None,
            "critical_recall": round(crit_recall, 4) if crit_recall is not None else None,
            "finding_precision": round(precision, 4) if precision is not None else None,
            "severity_agreement": round(sev_agree, 4) if sev_agree is not None else None,
            "human_review_required_count": hrr,
            "reviewed_indicators": len(reviewed),
        },
        "decisions": decisions,
        "note": "Monitoring/validation only — no automatic retraining of rules or models.",
    }
