"""DB-backed human-review / override / audit service tests + application-layer
tenant isolation. Synthetic data only. Importing the QA models here registers them
with Base so the session-scoped create_test_tables fixture creates the QA tables."""
import uuid

import pytest

from app.models import emscs_qa  # noqa: F401 — register QA tables with Base
from app.models.agency import Agency
from app.models.user import User
from app.services.auth import hash_password
from app.services.emscs_qa import review_service as svc, scoring, seed
from app.services.emscs_qa.chart_data import QaChartData, Vitals, AddAction

pytestmark = pytest.mark.usefixtures("create_test_tables")


def _agency(db, slug):
    a = Agency(agency_name=slug, slug=slug)
    db.add(a)
    db.flush()
    return a.id


def _user(db, email):
    u = User(email=email, password_hash=hash_password("x"))
    db.add(u)
    db.flush()
    return u.id


@pytest.fixture()
def tenants(db):
    return {"A": _agency(db, f"qa-a-{uuid.uuid4().hex[:6]}"),
            "B": _agency(db, f"qa-b-{uuid.uuid4().hex[:6]}"),
            "rev_a": _user(db, f"a-{uuid.uuid4().hex[:6]}@t.test"),
            "rev_b": _user(db, f"b-{uuid.uuid4().hex[:6]}@t.test")}


def _chart(ref="SYNTH-A1"):
    # transported chart that fails a few deterministic indicators + has a conflict
    return QaChartData(
        external_ref=ref, transported=True, age_years=70,
        primary_impression="Chest pain",
        vitals=[Vitals(sbp=120, bp_method="auto", pain=0)],  # 1 set, no manual -> #3 fail
        securement_text="all straps",                         # #7 fail (no count)
        signatures={"patient": True, "crew": True},           # #10 fail (no receiving)
        structured_fields={"airway": {"charted": "i-gel", "narrative": "ALS intubation"}},  # #11 conflict
        add_actions=[AddAction(kind="medication", name="Aspirin")],
    )


def test_create_persists_automated_and_audits(db, tenants):
    s = svc.create_review(db, tenants["A"], _chart(), actor_user_id=tenants["rev_a"])
    detail = svc.get_review_detail(db, tenants["A"], s.id)
    assert len(detail["indicator_reviews"]) >= 12
    assert all(ir.human_result is None for ir in detail["indicator_reviews"])  # automated only, no human yet
    assert detail["findings"], "expected automated findings"
    assert all(f.evidence for f in detail["findings"] if f.finding_type != "commendation")
    # audit event for creation exists
    events = db.query(emscs_qa.QaAuditEvent).filter_by(agency_id=tenants["A"], session_id=s.id).all()
    assert any(e.action == "auto_review_created" for e in events)


def test_accept_and_override_keep_automated_immutable(db, tenants):
    s = svc.create_review(db, tenants["A"], _chart(), actor_user_id=tenants["rev_a"])
    irs = svc.get_review_detail(db, tenants["A"], s.id)["indicator_reviews"]
    ir = next(i for i in irs if i.indicator_number == 3)      # #3 auto fail
    auto_before = dict(ir.automated_result)
    svc.override_indicator(db, tenants["A"], tenants["rev_a"], ir.id, "pass", "manual BP was documented on the monitor strip")
    db.refresh(ir)
    assert ir.automated_result == auto_before                 # automated NEVER overwritten
    assert ir.human_result["verdict"] == "pass" and ir.overridden
    # accept a different indicator
    ir5 = next(i for i in irs if i.indicator_number == 5)
    svc.accept_indicator(db, tenants["A"], tenants["rev_a"], ir5.id)
    db.refresh(ir5)
    assert ir5.human_result["verdict"] == ir5.automated_result["verdict"]


def test_override_requires_reason(db, tenants):
    s = svc.create_review(db, tenants["A"], _chart(), actor_user_id=tenants["rev_a"])
    ir = svc.get_review_detail(db, tenants["A"], s.id)["indicator_reviews"][0]
    with pytest.raises(svc.QaReviewError):
        svc.override_indicator(db, tenants["A"], tenants["rev_a"], ir.id, "fail", "")


def test_severity_override_dismiss_and_manual(db, tenants):
    s = svc.create_review(db, tenants["A"], _chart(), actor_user_id=tenants["rev_a"])
    findings = svc.get_review_detail(db, tenants["A"], s.id)["findings"]
    f = findings[0]
    auto_sev = f.automated_severity
    svc.override_severity(db, tenants["A"], tenants["rev_a"], f.id, "Major", "clinically significant on this chart")
    db.refresh(f)
    assert f.automated_severity == auto_sev and f.human_severity == "Major"    # proposal kept
    with pytest.raises(svc.QaReviewError):
        svc.dismiss_finding(db, tenants["A"], tenants["rev_a"], findings[1].id, "")
    svc.dismiss_finding(db, tenants["A"], tenants["rev_a"], findings[1].id, "documented elsewhere in the PCR")
    db.refresh(findings[1])
    assert findings[1].status == "dismissed"
    mf = svc.add_manual_finding(db, tenants["A"], tenants["rev_a"], s.id,
                                "Narrative omits last-known-well time", "Minor")
    assert mf.origin == "human" and mf.human_severity == "Minor"


def test_approve_blocks_until_critical_ack_and_recomputes_scores(db, tenants):
    s = svc.create_review(db, tenants["A"], _chart(), actor_user_id=tenants["rev_a"])
    detail = svc.get_review_detail(db, tenants["A"], s.id)
    # make one finding Critical
    f = detail["findings"][0]
    svc.override_severity(db, tenants["A"], tenants["rev_a"], f.id, "Critical", "airway documentation conflict is critical here")
    # resolve every indicator (accept automated or set explicit for human_review ones)
    for ir in detail["indicator_reviews"]:
        if (ir.automated_result or {}).get("verdict") == "human_review_required":
            svc.override_indicator(db, tenants["A"], tenants["rev_a"], ir.id, "na", "not applicable to this chart")
        else:
            svc.accept_indicator(db, tenants["A"], tenants["rev_a"], ir.id)
    svc.set_domain_scores(db, tenants["A"], tenants["rev_a"], s.id, [3, 3, 4, 2, 2, 3, 3, 4])
    with pytest.raises(svc.QaReviewError):
        svc.approve_session(db, tenants["A"], tenants["rev_a"], s.id)   # Critical not acknowledged
    svc.acknowledge_critical(db, tenants["A"], tenants["rev_a"], f.id)
    score = svc.approve_session(db, tenants["A"], tenants["rev_a"], s.id)
    # deterministic recompute matches the scoring engine
    cfg = seed.scoring_config()
    weights = [d["weight"] for d in sorted(seed.domains(), key=lambda d: d["order"])]
    assert score.approved_quality_score == scoring.quality_score([3, 3, 4, 2, 2, 3, 3, 4], weights)
    assert score.approved_tier is not None
    assert score.automated_quality_score is None               # automated side never fabricated/overwritten
    db.refresh(s)
    assert s.status == "approved"


# ───────── application-layer tenant isolation (no frontend filtering) ─────────
def test_agency_b_cannot_read_or_mutate_agency_a_review(db, tenants):
    s = svc.create_review(db, tenants["A"], _chart("A-ISO"), actor_user_id=tenants["rev_a"])
    ir = svc.get_review_detail(db, tenants["A"], s.id)["indicator_reviews"][0]
    # B cannot read A's session by id (URL/API manipulation)
    with pytest.raises(svc.QaReviewError):
        svc.get_review_detail(db, tenants["B"], s.id)
    # B cannot mutate A's indicator/finding by id
    with pytest.raises(svc.QaReviewError):
        svc.override_indicator(db, tenants["B"], tenants["rev_b"], ir.id, "pass", "cross-tenant attempt")
    with pytest.raises(svc.QaReviewError):
        svc.approve_session(db, tenants["B"], tenants["rev_b"], s.id)
    # B's session list does not include A's session
    assert s.id not in [x.id for x in svc.list_sessions(db, tenants["B"])]
    assert s.id in [x.id for x in svc.list_sessions(db, tenants["A"])]


def test_all_qa_rows_carry_agency_ownership(db, tenants):
    s = svc.create_review(db, tenants["A"], _chart("A-OWN"), actor_user_id=tenants["rev_a"])
    d = svc.get_review_detail(db, tenants["A"], s.id)
    assert d["session"].agency_id == tenants["A"]
    assert all(ir.agency_id == tenants["A"] for ir in d["indicator_reviews"])
    assert all(f.agency_id == tenants["A"] for f in d["findings"])
    assert d["score"].agency_id == tenants["A"]
