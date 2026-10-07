"""Seed the six Milestone-2 specialty synthetic cases into the local synthetic agency,
then drive realistic human-review decisions so every view has meaningful data:

  Agency QA Review · EMSCS Review View · Super Admin QA Monitor · Validation Console.

NON-PHI, synthetic only, local/dev only. Idempotent: cases already present (by chart
external_ref) are skipped. Requires EMSCS_QA_V1_ENABLED=true and the local DB.

Run:  EMSCS_QA_V1_ENABLED=true python -m scripts.seed_emscs_qa_demo_m2
"""
from __future__ import annotations

from app.database import SessionLocal
from app.models.agency import Agency
from app.models.user import User
from app.models.emscs_qa import QaChart
from app.services.emscs_qa import review_service as svc, synthetic_cases as sc

AGENCY_SLUG = "emscs-qa-demo"
ACTOR_EMAIL = "qa-demo@mullenanalytics.com"

# Per-case recipe. explicit: indicator# -> (verdict, reason) for a deliberate human
# decision (disagreement/override or resolving a human-review stub). The rest are
# accepted (agreement) or, for human_review_required stubs, resolved with a default.
RECIPES = {
    "clean": dict(approve=True, domains=[4, 4, 4, 3, 4, 3, 4, 4], explicit={
        1: ("pass", "Narrative reviewed; complete and internally consistent."),
        2: ("pass", "HPI reviewed; complete."),
    }),
    "minor_doc": dict(approve=True, domains=[3, 3, 4, 3, 3, 3, 3, 4], explicit={
        1: ("pass", "Narrative reviewed; acceptable."), 2: ("pass", "HPI reviewed; acceptable."),
        75: ("pass", "Patient signature captured on the supplemental page; treated as Met."),
    }, dismiss={75: "Signature present on supplemental page — automated proposal not upheld."}),
    "major": dict(approve=True, domains=[3, 2, 3, 2, 2, 3, 3, 3], explicit={
        1: ("pass", "Narrative reviewed."), 2: ("pass", "HPI reviewed."),
    }, accept_sev=[78]),
    "critical": dict(approve=False, accept_sev=[78], note="left PENDING with an unacknowledged Critical"),
    "multi": dict(approve=False, explicit={
        68: ("na", "Dose appropriateness confirmed against protocol — no deficiency."),
    }, override_sev={72: ("Major", "Repeat albuterol interval is clinically significant here; graded Major.")},
        note="left PENDING; severity override recorded"),
    "ambiguous": dict(approve=False, explicit={
        77: ("fail", "Capacity not adequately established given possible intoxication."),
    }, accept_sev=[80], note="left PENDING; capacity decided by reviewer"),
}

DEFAULT_STUB = ("na", "Specialty category not automated in this release — manually reviewed, no deficiency identified.")


def _find_detail(db, ag, sid):
    return svc.get_review_detail(db, ag, sid)


def _resolve_indicators(db, ag, actor, sid, explicit, resolve_all):
    detail = _find_detail(db, ag, sid)
    for ir in detail["indicator_reviews"]:
        num = ir.indicator_number
        av = (ir.automated_result or {}).get("verdict")
        if num in explicit:
            verdict, reason = explicit[num]
            if verdict == av and av != "human_review_required":
                svc.accept_indicator(db, ag, actor, ir.id)
            else:
                svc.override_indicator(db, ag, actor, ir.id, verdict, reason)
        elif not resolve_all:
            # pending cases: only touch non-human, agreed indicators so there is AUTO-vs-HUMAN data
            if av in ("pass", "fail", "na"):
                svc.accept_indicator(db, ag, actor, ir.id)
        elif av == "human_review_required":
            svc.override_indicator(db, ag, actor, ir.id, *DEFAULT_STUB)
        else:
            svc.accept_indicator(db, ag, actor, ir.id)


def _finding_by_indicator(detail, num):
    return next((f for f in detail["findings"] if f.indicator_number == num and f.status != "dismissed"), None)


def seed():
    db = SessionLocal()
    try:
        ag = db.query(Agency).filter(Agency.slug == AGENCY_SLUG).first()
        if ag is None:
            raise SystemExit(f"synthetic agency '{AGENCY_SLUG}' not found — run the M1 demo seeder first")
        actor = db.query(User).filter(User.email == ACTOR_EMAIL).first()
        if actor is None:
            raise SystemExit(f"actor '{ACTOR_EMAIL}' not found")
        ag_id, actor_id = ag.id, actor.id

        existing = {c.external_ref for c in db.query(QaChart).filter(QaChart.agency_id == ag_id).all()}
        created, skipped = [], []

        for key, label, chart, note in sc.all_cases():
            if chart.external_ref in existing:
                skipped.append(chart.external_ref)
                continue
            rec = RECIPES[key]
            session = svc.create_review(db, ag_id, chart, actor_user_id=actor_id)
            sid = session.id

            _resolve_indicators(db, ag_id, actor_id, sid, rec.get("explicit", {}), rec["approve"])

            detail = _find_detail(db, ag_id, sid)
            # dismiss (false-positive demo)
            for num, reason in rec.get("dismiss", {}).items():
                f = _finding_by_indicator(detail, num)
                if f:
                    svc.dismiss_finding(db, ag_id, actor_id, f.id, reason)
            # accept severity (agreement)
            for num in rec.get("accept_sev", []):
                f = _finding_by_indicator(detail, num)
                if f:
                    svc.accept_severity(db, ag_id, actor_id, f.id)
            # override severity (disagreement)
            for num, (sev, reason) in rec.get("override_sev", {}).items():
                f = _finding_by_indicator(detail, num)
                if f:
                    svc.override_severity(db, ag_id, actor_id, f.id, sev, reason)

            if rec["approve"]:
                svc.set_domain_scores(db, ag_id, actor_id, sid, rec["domains"])
                # acknowledge any critical before approving
                for f in _find_detail(db, ag_id, sid)["findings"]:
                    if f.status != "dismissed" and f.final_severity() == "Critical" and not f.acknowledged:
                        svc.acknowledge_critical(db, ag_id, actor_id, f.id)
                score = svc.approve_session(db, ag_id, actor_id, sid)
                created.append(f"{chart.external_ref} [{label}] APPROVED tier={score.approved_tier}")
            else:
                created.append(f"{chart.external_ref} [{label}] {rec.get('note','pending')}")
            db.commit()

        print("created:")
        for c in created:
            print("  +", c)
        if skipped:
            print("skipped (already present):", ", ".join(sorted(skipped)))
    finally:
        db.close()


if __name__ == "__main__":
    seed()
