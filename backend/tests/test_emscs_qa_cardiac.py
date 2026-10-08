"""EMSCS QA — Cardiac/STEMI #16-27 tests. Applicability, deterministic documentation
(#16-23), protocol oxygen (#24), clinical-judgment (#25 → human), pain-management timeline
(#26), ASA/NTG protocol (#27), orchestration + cross-category. Synthetic charts only."""
from app.services.emscs_qa import specialty, review, applicability
from app.services.emscs_qa.chart_data import QaChartData, Vitals, AddAction


def _spec(rs, n):
    return next(r for r in rs if r.number == n)


def _cardiac(**kw):
    base = dict(external_ref="CARD", transported=True, primary_impression="Chest pain",
                chief_complaint="chest pain")
    base.update(kw)
    return QaChartData(**base)


def _cat(c):
    return specialty.evaluate_category("Cardiac/STEMI", c)


# ───────── applicability ─────────
def test_cardiac_applicable_on_chest_pain():
    assert "Cardiac/STEMI" in applicability.evaluate_applicability(_cardiac()).activations


def test_cardiac_not_applicable_without_evidence():
    c = QaChartData(external_ref="X", transported=True, primary_impression="Ankle injury", chief_complaint="ankle")
    assert "Cardiac/STEMI" not in applicability.evaluate_applicability(c).activations


def test_cardiac_arrest_is_excluded():
    c = QaChartData(external_ref="ARR", primary_impression="Cardiac arrest, post-ROSC")
    assert "Cardiac/STEMI" not in applicability.evaluate_applicability(c).activations


# ───────── #16-23 documentation elements ─────────
def test_cardiac_doc_elements_met_and_not_met():
    rs = _cat(_cardiac(hpi_elements={"onset": True, "pain_type": True}))
    assert _spec(rs, 16).verdict == specialty.PASS      # onset present
    assert _spec(rs, 18).verdict == specialty.PASS      # pain type present
    assert _spec(rs, 23).verdict == specialty.FAIL      # gastric distress absent
    assert _spec(rs, 19).verdict == specialty.FAIL      # duration absent


# ───────── #24 oxygen by perfusion ─────────
def test_cardiac_24_na_when_not_indicated():
    assert _spec(_cat(_cardiac(vitals=[Vitals(time="10:00", spo2=98)])), 24).verdict == specialty.NA


def test_cardiac_24_fail_when_hypoxic_untreated():
    assert _spec(_cat(_cardiac(vitals=[Vitals(time="10:00", spo2=88)])), 24).verdict == specialty.FAIL


def test_cardiac_24_pass_when_oxygen_given():
    c = _cardiac(vitals=[Vitals(time="10:00", spo2=88)], add_actions=[AddAction(kind="procedure", name="Oxygen NRB 15L")])
    assert _spec(_cat(c), 24).verdict == specialty.PASS


# ───────── #25 clinical judgment ─────────
def test_cardiac_25_treatment_per_protocol_routes_human():
    assert _spec(_cat(_cardiac()), 25).verdict == specialty.HUMAN


# ───────── #26 pain-management timeline ─────────
def test_cardiac_26_na_without_pain_management():
    assert _spec(_cat(_cardiac()), 26).verdict == specialty.NA


def test_cardiac_26_fail_single_no_reassessment():
    c = _cardiac(add_actions=[AddAction(kind="medication", name="Nitroglycerin", time="10:05")],
                 vitals=[Vitals(time="10:00", pain=8)])
    assert _spec(_cat(c), 26).verdict == specialty.FAIL


def test_cardiac_26_pass_with_reassessment():
    c = _cardiac(add_actions=[AddAction(kind="medication", name="Nitroglycerin", time="10:05")],
                 vitals=[Vitals(time="10:00", pain=8), Vitals(time="10:12", pain=3)])
    assert _spec(_cat(c), 26).verdict == specialty.PASS


# ───────── #27 ASA/NTG ─────────
def test_cardiac_27_pass_when_given():
    assert _spec(_cat(_cardiac(add_actions=[AddAction(kind="medication", name="Aspirin 324mg")])), 27).verdict == specialty.PASS


def test_cardiac_27_pass_when_reason_documented():
    c = _cardiac(asa_ntg_not_given_reason="patient took own ASA; NTG held for hypotension")
    assert _spec(_cat(c), 27).verdict == specialty.PASS


def test_cardiac_27_fail_when_neither_given_nor_explained():
    assert _spec(_cat(_cardiac()), 27).verdict == specialty.FAIL


# ───────── orchestration + cross-category ─────────
def test_cardiac_is_implemented_and_evaluated_with_applicability_reason():
    assert specialty.is_implemented("Cardiac/STEMI")
    rev = review.build_automated_review(_cardiac(hpi_elements={"onset": True}))
    r16 = _spec(rev.indicator_results, 16)
    assert r16.verdict == specialty.PASS
    assert any((e or {}).get("field") == "applicability_reason" for e in (r16.evidence or []))


def test_cardiac_plus_medication_both_activate():
    c = _cardiac(add_actions=[AddAction(kind="medication", name="Aspirin", performed_by="Medic 1",
                                        route="PO", dose="324", dose_unit="mg", indication="chest pain")])
    act = applicability.evaluate_applicability(c).activations
    assert "Cardiac/STEMI" in act and "Medication" in act
