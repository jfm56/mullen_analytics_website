"""EMSCS QA — Trauma #33-38 tests. Applicability, deterministic documentation (#33-36),
oxygen-if-required (#37, shared), spinal motion restriction (#38, applicability-first).
Synthetic charts only."""
from app.services.emscs_qa import specialty, review, applicability
from app.services.emscs_qa.chart_data import QaChartData, Vitals, AddAction


def _spec(rs, n):
    return next(r for r in rs if r.number == n)


def _trauma(**kw):
    base = dict(external_ref="TR", transported=True, primary_impression="MVC with injuries",
                chief_complaint="motor vehicle collision", significant_mechanism=True)
    base.update(kw)
    return QaChartData(**base)


def _cat(c):
    return specialty.evaluate_category("Trauma", c)


# ───────── applicability ─────────
def test_trauma_applicable_on_mvc():
    assert "Trauma" in applicability.evaluate_applicability(_trauma()).activations


def test_trauma_not_applicable_without_evidence():
    c = QaChartData(external_ref="X", transported=True, primary_impression="Chest pain", chief_complaint="chest pain")
    assert "Trauma" not in applicability.evaluate_applicability(c).activations


# ───────── #33-36 documentation ─────────
def test_trauma_doc_elements_met_and_not_met():
    rs = _cat(_trauma(hpi_elements={"injuries": True}))
    assert _spec(rs, 33).verdict == specialty.PASS       # injuries documented
    assert _spec(rs, 34).verdict == specialty.FAIL       # injury date/time missing
    assert _spec(rs, 35).verdict == specialty.PASS       # significant_mechanism assessed


def test_trauma_36_pain_from_vitals():
    assert _spec(_cat(_trauma(vitals=[Vitals(time="09:00", pain=6)])), 36).verdict == specialty.PASS


def test_trauma_35_mechanism_not_documented():
    assert _spec(_cat(_trauma(significant_mechanism=None)), 35).verdict == specialty.FAIL


# ───────── #37 oxygen if required ─────────
def test_trauma_37_na_when_not_required():
    assert _spec(_cat(_trauma(vitals=[Vitals(time="09:00", spo2=98)])), 37).verdict == specialty.NA


def test_trauma_37_fail_when_hypoxic_untreated():
    assert _spec(_cat(_trauma(vitals=[Vitals(time="09:00", spo2=88)])), 37).verdict == specialty.FAIL


def test_trauma_37_pass_when_treated():
    c = _trauma(vitals=[Vitals(time="09:00", spo2=88)], add_actions=[AddAction(kind="procedure", name="Oxygen NRB")])
    assert _spec(_cat(c), 37).verdict == specialty.PASS


def test_trauma_37_human_when_spo2_undocumented():
    assert _spec(_cat(_trauma()), 37).verdict == specialty.HUMAN


# ───────── #38 spinal motion restriction (applicability-first) ─────────
def test_trauma_38_na_when_not_indicated():
    c = QaChartData(external_ref="TR2", transported=True, primary_impression="Minor finger laceration",
                    chief_complaint="laceration")       # trauma applicable, but no spinal indication
    assert _spec(specialty.evaluate_category("Trauma", c), 38).verdict == specialty.NA


def test_trauma_38_pass_when_applied():
    c = _trauma(add_actions=[AddAction(kind="procedure", name="C-collar + backboard")])
    assert _spec(_cat(c), 38).verdict == specialty.PASS


def test_trauma_38_fail_when_indicated_not_applied():
    assert _spec(_cat(_trauma()), 38).verdict == specialty.FAIL    # significant mechanism, no SMR documented


def test_trauma_38_human_when_smr_cleared():
    assert _spec(_cat(_trauma(structured_fields={"spinal_cleared": True})), 38).verdict == specialty.HUMAN


# ───────── orchestration ─────────
def test_trauma_implemented_and_evaluated_with_applicability_reason():
    assert specialty.is_implemented("Trauma")
    rev = review.build_automated_review(_trauma(hpi_elements={"injuries": True}))
    r33 = _spec(rev.indicator_results, 33)
    assert r33.verdict == specialty.PASS
    assert any((e or {}).get("field") == "applicability_reason" for e in (r33.evidence or []))
