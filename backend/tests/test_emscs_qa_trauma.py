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


# ───────── #38 SMR per NJ §6.0 Spinal Assessment (mechanism ≠ mandatory SMR) ─────────
def test_trauma_38_na_when_no_mechanism():
    c = QaChartData(external_ref="TR2", transported=True, primary_impression="Minor finger laceration",
                    chief_complaint="laceration")       # trauma applicable, but no spinal-injury mechanism
    assert _spec(specialty.evaluate_category("Trauma", c), 38).verdict == specialty.NA


def test_trauma_38_mechanism_alone_routes_human():
    # NEGATIVE-for-auto-SMR: significant mechanism alone, no documented spinal assessment → HUMAN (not FAIL)
    assert _spec(_cat(_trauma()), 38).verdict == specialty.HUMAN


def test_trauma_38_positive_assessment_applied_met():                  # positive
    c = _trauma(neuro_deficit=True, add_actions=[AddAction(kind="procedure", name="C-collar + backboard")])
    assert _spec(_cat(c), 38).verdict == specialty.PASS


def test_trauma_38_positive_assessment_not_applied_not_met():          # negative
    c = _trauma(midline_spinal_tenderness=True)
    assert _spec(_cat(c), 38).verdict == specialty.FAIL


def test_trauma_38_documented_negative_assessment_na():                # negative assessment → not required
    c = _trauma(spinal_assessment_documented=True)
    assert _spec(_cat(c), 38).verdict == specialty.NA


def test_trauma_38_isolated_penetrating_na():
    c = QaChartData(external_ref="GSW", transported=True, primary_impression="Isolated gunshot wound to leg",
                    chief_complaint="gsw", penetrating_trauma=True)
    assert _spec(specialty.evaluate_category("Trauma", c), 38).verdict == specialty.NA


def test_trauma_38_applied_met():
    c = _trauma(add_actions=[AddAction(kind="procedure", name="C-collar + backboard")])
    assert _spec(_cat(c), 38).verdict == specialty.PASS


# ───────── #37 oxygen NJ thresholds (COPD + 92-93% gray zone → human) ─────────
def test_trauma_37_copd_routes_human():
    c = _trauma(history="COPD", vitals=[Vitals(time="09:00", spo2=90)])
    assert _spec(_cat(c), 37).verdict == specialty.HUMAN


def test_trauma_37_gray_zone_93_routes_human():
    c = _trauma(vitals=[Vitals(time="09:00", spo2=93)])        # <94 (NJ) but >=92 (CQI) → ambiguous
    assert _spec(_cat(c), 37).verdict == specialty.HUMAN


# ───────── orchestration ─────────
def test_trauma_implemented_and_evaluated_with_applicability_reason():
    assert specialty.is_implemented("Trauma")
    rev = review.build_automated_review(_trauma(hpi_elements={"injuries": True}))
    r33 = _spec(rev.indicator_results, 33)
    assert r33.verdict == specialty.PASS
    assert any((e or {}).get("field") == "applicability_reason" for e in (r33.evidence or []))
