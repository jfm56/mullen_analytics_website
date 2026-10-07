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
from ...services.emscs_qa import seed as qa_seed, specialty as qa_specialty


def _agency_class(db):
    """agency_id (str) -> classification, for synthetic/production separation."""
    return {str(a.id): a.data_classification for a in db.query(Agency).all()}


def _num_to_category() -> dict:
    """indicator number -> category (General | Refusal | Medication | ...), from the non-PHI seed."""
    try:
        return {n: lib["category"] for n, lib in qa_seed.indicator_by_number().items()}
    except Exception:  # noqa: BLE001  (seed always present; defensive)
        return {}


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


def _ir_metrics(reviewed) -> dict:
    """AUTO-vs-HUMAN validation metrics for a set of reviewed indicator rows."""
    def av(ir): return (ir.automated_result or {}).get("verdict")
    def hv(ir): return (ir.human_result or {}).get("verdict")
    n = len(reviewed)
    agree = sum(1 for ir in reviewed if av(ir) == hv(ir))
    overridden = sum(1 for ir in reviewed if ir.overridden)
    fp = sum(1 for ir in reviewed if av(ir) == "fail" and hv(ir) in ("pass", "na"))
    fn = sum(1 for ir in reviewed if av(ir) in ("pass", "na") and hv(ir) == "fail")
    auto_fail = sum(1 for ir in reviewed if av(ir) == "fail")
    human_fail = sum(1 for ir in reviewed if hv(ir) == "fail")
    return {
        "reviewed_indicators": n,
        "indicator_agreement": round(agree / n, 4) if n else None,
        "override_rate": round(overridden / n, 4) if n else None,
        "false_positive_rate": round(fp / auto_fail, 4) if auto_fail else None,
        "false_negative_rate": round(fn / human_fail, 4) if human_fail else None,
    }


def qa_validation(db, *, agency_id=None, classification=None, limit=200,
                  category=None, indicator=None, reviewer=None, severity=None, decision=None) -> dict:
    """Per-decision AUTO vs HUMAN + validation metrics, overall and per specialty category.

    Filters (all optional, combine): agency_id, classification (synthetic/trial/production),
    category (General|Refusal|Medication|Albuterol|...), indicator (number), reviewer (user id),
    severity (final severity of the decision's finding, where one exists), decision
    (agree|disagree|override|human_review). No retraining is ever performed — monitoring only.
    """
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

    num2cat = _num_to_category()
    def av(ir): return (ir.automated_result or {}).get("verdict")
    def hv(ir): return (ir.human_result or {}).get("verdict")
    def cat(num): return num2cat.get(num, "General")
    # severity of the finding (if any) tied to an indicator review, for the severity filter.
    sev_by_ir = {}
    for f in findings:
        if getattr(f, "indicator_number", None) is not None:
            sev_by_ir[(f.session_id, f.indicator_number)] = f.final_severity()

    # human-review-required rate is computed over ALL automated rows (not just human-decided).
    hrr = sum(1 for ir in irs if av(ir) == "human_review_required")

    reviewed_all = [ir for ir in irs if hv(ir)]

    # Apply the UI filters to the reviewed decision list.
    def keep(ir):
        if category and cat(ir.indicator_number) != category:
            return False
        if indicator is not None and ir.indicator_number != indicator:
            return False
        if reviewer and str(ir.reviewed_by or "") != str(reviewer):
            return False
        if severity and sev_by_ir.get((ir.session_id, ir.indicator_number)) != severity:
            return False
        if decision == "agree" and av(ir) != hv(ir):
            return False
        if decision == "disagree" and av(ir) == hv(ir):
            return False
        if decision == "override" and not ir.overridden:
            return False
        if decision == "human_review" and av(ir) != "human_review_required":
            return False
        return True

    reviewed = [ir for ir in reviewed_all if keep(ir)]
    metrics = _ir_metrics(reviewed)
    metrics["human_review_required_count"] = hrr

    # finding-level precision / severity agreement (over the filtered category where given)
    def fcat(f): return cat(getattr(f, "indicator_number", None)) if getattr(f, "indicator_number", None) else None
    fsel = [f for f in findings if (not category or fcat(f) == category)
            and (not severity or f.final_severity() == severity)]
    crit_human = [f for f in fsel if f.human_severity == "Critical"]
    crit_recall = (sum(1 for f in crit_human if f.automated_severity == "Critical") / len(crit_human)) if crit_human else None
    auto_findings = [f for f in fsel if f.origin == "automated"]
    precision = (sum(1 for f in auto_findings if f.status != "dismissed") / len(auto_findings)) if auto_findings else None
    sev_pairs = [f for f in fsel if f.human_severity and f.automated_severity]
    sev_agree = (sum(1 for f in sev_pairs if f.human_severity == f.automated_severity) / len(sev_pairs)) if sev_pairs else None
    metrics.update({
        "critical_recall": round(crit_recall, 4) if crit_recall is not None else None,
        "finding_precision": round(precision, 4) if precision is not None else None,
        "severity_agreement": round(sev_agree, 4) if sev_agree is not None else None,
    })

    # Per-category breakdown (specialty metrics). Flags which categories are AUTOMATED in
    # the current release vs still human-only, so small-N specialty cells are read correctly.
    by_category = []
    cats = sorted({cat(ir.indicator_number) for ir in reviewed_all})
    for c in cats:
        rows = [ir for ir in reviewed_all if cat(ir.indicator_number) == c]
        cm = _ir_metrics(rows)
        cm["category"] = c
        cm["specialty"] = c != "General"
        cm["automated_in_release"] = (c == "General") or qa_specialty.is_implemented(c)
        cm["human_review_required"] = sum(1 for ir in irs if cat(ir.indicator_number) == c and av(ir) == "human_review_required")
        by_category.append(cm)

    decisions = []
    for ir in reviewed[:limit]:
        key = (ir.session_id, ir.indicator_number)
        decisions.append({
            "indicator": ir.indicator_number, "category": cat(ir.indicator_number),
            "classification": (ir.automated_result or {}).get("classification"),
            "auto": av(ir), "human": hv(ir), "overridden": ir.overridden,
            "override_reason": ir.override_reason, "agree": av(ir) == hv(ir),
            "severity": sev_by_ir.get(key),
            "evidence": (ir.automated_result or {}).get("evidence"),
            "reviewer": str(ir.reviewed_by) if ir.reviewed_by else None,
        })

    # Filter options for the console dropdowns (from the unfiltered session scope).
    available = {
        "categories": sorted({cat(ir.indicator_number) for ir in irs}),
        "indicators": sorted({ir.indicator_number for ir in irs}),
        "reviewers": sorted({str(ir.reviewed_by) for ir in reviewed_all if ir.reviewed_by}),
        "severities": sorted({v for v in sev_by_ir.values() if v}),
        "decisions": ["agree", "disagree", "override", "human_review"],
        "implemented_specialty": list(qa_specialty.IMPLEMENTED_CATEGORIES),
    }

    return {
        "available": True,
        "metrics": metrics,
        "by_category": by_category,
        "decisions": decisions,
        "filters_applied": {"agency_id": str(agency_id) if agency_id else None,
                            "classification": classification, "category": category,
                            "indicator": indicator, "reviewer": str(reviewer) if reviewer else None,
                            "severity": severity, "decision": decision},
        "available_filters": available,
        "note": "Monitoring/validation only — no automatic retraining of rules or models. "
                "Specialty categories are small-N; agreement cells are indicative, not validated accuracy.",
    }
