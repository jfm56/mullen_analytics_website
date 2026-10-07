"""EMSCS QA Milestone 2 R1 — specialty CQI tests (Refusal #75-80, Medication #63-68,
Albuterol #69-74). Synthetic charts only. Human-override/RLS/Super-Admin-visibility/
synthetic-isolation are category-agnostic and covered by the existing suites; 60/60
scoring parity is unchanged (test_emscs_qa_parity.py)."""
from app.services.emscs_qa import specialty, review
from app.services.emscs_qa.chart_data import QaChartData, Vitals, AddAction, Refusal


def _spec(results, num):
    return next(r for r in results if r.number == num)


# ───────────────────────── Refusal #75-80 ─────────────────────────
def _refusal_clean(**kw):
    base = dict(external_ref="REF", disposition="Patient Refused Care", age_years=40,
                vitals=[Vitals(time="10:00", sbp=130, dbp=80, rr=16, spo2=98, pain=0)],
                refusal=Refusal(matrix_complete=True, checkboxes_complete=True, signed_patient=True,
                                capacity_documented=True, aox=4, risks_explained=True,
                                care_transport_explained=True, return_precautions=True,
                                influence_documented="denies alcohol/drugs"))
    base.update(kw)
    return QaChartData(**base)


def test_refusal_clean_all_pass():
    rs = specialty.evaluate_category("Refusal", _refusal_clean())
    assert all(_spec(rs, n).verdict == specialty.PASS for n in (75, 76, 77, 78, 79, 80))


def test_refusal_missing_signature_fail_75():
    c = _refusal_clean(); c.refusal.signed_patient = False
    assert _spec(specialty.evaluate_category("Refusal", c), 75).verdict == specialty.FAIL


def test_refusal_no_vitals_fail_78():
    c = _refusal_clean(); c.vitals = []
    assert _spec(specialty.evaluate_category("Refusal", c), 78).verdict == specialty.FAIL


def test_refusal_capacity_ambiguous_routes_human_77():
    c = _refusal_clean(); c.altered_mental_status = True
    assert _spec(specialty.evaluate_category("Refusal", c), 77).verdict == specialty.HUMAN


def test_refusal_possible_ingestion_influence_80():
    c = _refusal_clean(); c.possible_ingestion = True; c.refusal.influence_documented = None
    assert _spec(specialty.evaluate_category("Refusal", c), 80).verdict == specialty.FAIL


# ───────────────────────── Medication #63-68 ─────────────────────────
def _med_clean(**kw):
    base = dict(external_ref="MED", transported=True, als_on_scene=True,
                add_actions=[AddAction(kind="medication", name="Aspirin", performed_by="Medic 1", route="PO",
                                       dose="324", dose_unit="mg", response_documented=True,
                                       reassessed_after=True, indication="chest pain", time="10:05")],
                vitals=[Vitals(time="10:10", sbp=120, rr=16, spo2=97)])
    base.update(kw)
    return QaChartData(**base)


def test_med_clean():
    rs = specialty.evaluate_category("Medication", _med_clean())
    for n in (63, 64, 65, 66, 67):
        assert _spec(rs, n).verdict in (specialty.PASS, specialty.NA)
    assert _spec(rs, 68).verdict == specialty.HUMAN   # dose appropriateness -> clinical review


def test_med_missing_performer_63():
    c = _med_clean(); c.add_actions[0].performed_by = None
    assert _spec(specialty.evaluate_category("Medication", c), 63).verdict == specialty.FAIL


def test_med_incomplete_detail_65():
    c = _med_clean(); c.add_actions[0].dose_unit = None
    assert _spec(specialty.evaluate_category("Medication", c), 65).verdict == specialty.FAIL


def test_med_no_als_request_67():
    c = _med_clean(); c.als_on_scene = False; c.als_requested = False
    assert _spec(specialty.evaluate_category("Medication", c), 67).verdict == specialty.FAIL


def test_med_no_reassessment_66():
    c = _med_clean(); c.add_actions[0].reassessed_after = None; c.vitals = []  # no post set either
    assert _spec(specialty.evaluate_category("Medication", c), 66).verdict == specialty.FAIL


# ───────────────────────── Albuterol #69-74 (timeline) ─────────────────────────
def _alb(doses, history="asthma", pre=True, post=True):
    acts = [AddAction(kind="medication", name="Albuterol", route="neb", dose="2.5", dose_unit="mg",
                      response_documented=r, performed_by="Medic", indication="wheezing", time=t)
            for (t, r) in doses]
    v = []
    if pre:
        v.append(Vitals(time="09:00", rr=28, spo2=89))
    if post:
        v.append(Vitals(time="09:20", rr=20, spo2=95))
    return QaChartData(external_ref="ALB", transported=True, history=history,
                       primary_impression="Respiratory distress", add_actions=acts, vitals=v)


def test_albuterol_clean_single():
    rs = specialty.evaluate_category("Albuterol", _alb([("09:05", True)]))
    assert _spec(rs, 69).verdict == specialty.PASS
    assert _spec(rs, 70).verdict == specialty.PASS
    assert _spec(rs, 71).verdict == specialty.PASS
    assert _spec(rs, 72).verdict == specialty.NA        # single dose
    assert _spec(rs, 73).verdict == specialty.PASS
    assert _spec(rs, 74).verdict == specialty.PASS


def test_albuterol_late_repeat_fail_72():
    rs = specialty.evaluate_category("Albuterol", _alb([("09:05", True), ("09:08", True)]))  # 3 min apart
    assert _spec(rs, 72).verdict == specialty.FAIL      # "given but late"


def test_albuterol_given_no_response_fail_74():
    rs = specialty.evaluate_category("Albuterol", _alb([("09:05", False)]))
    assert _spec(rs, 74).verdict == specialty.FAIL      # "given but response not documented"


def test_albuterol_no_pre_vitals_fail_70():
    rs = specialty.evaluate_category("Albuterol", _alb([("09:05", True)], pre=False))
    assert _spec(rs, 70).verdict == specialty.FAIL


def test_albuterol_no_copd_asthma_fail_69():
    rs = specialty.evaluate_category("Albuterol", _alb([("09:05", True)], history="hypertension"))
    assert _spec(rs, 69).verdict == specialty.FAIL


# ───────────────────────── severity (context-driven) ─────────────────────────
def test_refusal_documentation_gap_minor():
    c = _refusal_clean(); c.refusal.signed_patient = False      # #75 doc gap
    f = next(f for f in review.build_automated_review(c).findings if f["indicator_number"] == 75)
    assert f["severity_proposed"] == "Minor" and not f["severity_requires_human"]


def test_refusal_clinical_gap_major():
    c = _refusal_clean(); c.vitals = []                         # #78 clinical-safety gap
    f = next(f for f in review.build_automated_review(c).findings if f["indicator_number"] == 78)
    assert f["severity_proposed"] == "Major" and f["severity_requires_human"]


def test_refusal_high_risk_context_critical():
    c = _refusal_clean(); c.vitals = []; c.age_years = 8; c.significant_mechanism = True
    f = next(f for f in review.build_automated_review(c).findings if f["indicator_number"] == 78)
    assert f["severity_proposed"] == "Critical" and f["severity_requires_human"]


def test_refusal_possible_abuse_high_priority_human():
    c = _refusal_clean(); c.vitals = []; c.possible_abuse = True
    f = next(f for f in review.build_automated_review(c).findings if f["category"] == "Refusal")
    assert f["severity_proposed"] == "HUMAN_REVIEW_REQUIRED" and f["severity_high_priority"]


def test_med_als_gap_is_major_not_auto_critical():
    # #67 is a PROTOCOL/ALS-escalation gap on a geriatric chart with NORMAL vitals — the
    # drug WAS given, so it must NOT be mislabeled a treatment omission and auto-escalated
    # to Critical. Proposed Major + require_human (a reviewer may escalate with the full chart).
    c = _med_clean(); c.als_on_scene = False; c.als_requested = False; c.age_years = 72
    f = next(f for f in review.build_automated_review(c).findings if f["indicator_number"] == 67)
    assert f["severity_proposed"] == "Major" and f["severity_requires_human"]


# ───────────────────────── orchestration / cross-category ─────────────────────────
def test_implemented_specialty_is_evaluated_not_stubbed():
    rev = review.build_automated_review(_refusal_clean())
    assert _spec(rev.indicator_results, 78).verdict == specialty.PASS   # evaluated, not HUMAN stub
    assert "Refusal" in rev.activations


def test_unimplemented_specialty_still_human():
    c = QaChartData(external_ref="TRAUMA", transported=True, primary_impression="Fall injury", chief_complaint="fall")
    rev = review.build_automated_review(c)
    r33 = next((r for r in rev.indicator_results if r.number == 33), None)
    assert r33 is not None and r33.verdict == specialty.HUMAN      # Trauma not yet automated


def test_cross_category_activation_albuterol_and_medication():
    rev = review.build_automated_review(_alb([("09:05", True)]))
    assert "Albuterol" in rev.activations and "Medication" in rev.activations
    nums = {r.number for r in rev.indicator_results}
    assert 71 in nums and 63 in nums                              # both specialty sets evaluated
    assert _spec(rev.indicator_results, 71).verdict != specialty.HUMAN
