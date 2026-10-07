"""Deterministic EMSCS QA engine tests — applicability, CQI #1-12, consistency,
severity. Synthetic charts only (no PHI, no DB, no feature flag)."""
from app.services.emscs_qa import applicability, indicators, consistency, severity, review
from app.services.emscs_qa.chart_data import QaChartData, Vitals, AddAction


def chart(**kw):
    kw.setdefault("external_ref", "SYNTH-1")
    return QaChartData(**kw)


def _verdict(results, num):
    return next(r for r in results if r.number == num)


# ───────── applicability ─────────
def test_general_always_applies():
    r = applicability.evaluate_applicability(chart())
    nums = r.applicable_numbers()
    assert all(n in nums for n in range(1, 13))
    assert r.activations["General"] == "always"


def test_specialty_multiple_categories_activate_with_reason():
    c = chart(primary_impression="Cardiac arrest, post ROSC",
              chief_complaint="Witnessed fall",
              add_actions=[AddAction(kind="medication", name="Albuterol")])
    r = applicability.evaluate_applicability(c)
    assert "Cardiac Arrest" in r.activations
    assert "Trauma" in r.activations
    assert "Medication" in r.activations
    assert "Albuterol" in r.activations
    # reasons are recorded and non-empty
    assert all(r.activations[cat] for cat in ("Cardiac Arrest", "Trauma", "Albuterol"))
    # specialty indicator numbers are now applicable (e.g., Cardiac Arrest 28-32)
    assert 28 in r.applicable_numbers()


def test_no_specialty_when_no_trigger():
    r = applicability.evaluate_applicability(chart(primary_impression="General weakness"))
    assert set(r.activations) == {"General"}


# ───────── CQI #1-12 ─────────
def test_cqi3_vitals():
    transported = dict(transported=True)
    one = chart(**transported, vitals=[Vitals(sbp=120, dbp=80, bp_method="manual")])
    assert _verdict(indicators.evaluate_general(one), 3).verdict == indicators.FAIL
    auto = chart(**transported, vitals=[Vitals(sbp=120, bp_method="auto"), Vitals(sbp=118, bp_method="auto")])
    assert _verdict(indicators.evaluate_general(auto), 3).verdict == indicators.FAIL
    ok = chart(**transported, vitals=[Vitals(sbp=120, bp_method="manual"), Vitals(sbp=118, bp_method="auto")])
    assert _verdict(indicators.evaluate_general(ok), 3).verdict == indicators.PASS
    refusal = chart(disposition="Patient Refused Care")
    assert _verdict(indicators.evaluate_general(refusal), 3).verdict == indicators.NA


def test_cqi5_pain():
    has = chart(vitals=[Vitals(sbp=120, pain=0)])
    assert _verdict(indicators.evaluate_general(has), 5).verdict == indicators.PASS
    none = chart(vitals=[Vitals(sbp=120, pain=None)])
    assert _verdict(indicators.evaluate_general(none), 5).verdict == indicators.FAIL


def test_cqi7_straps():
    ok = chart(transported=True, securement_straps=3)
    assert _verdict(indicators.evaluate_general(ok), 7).verdict == indicators.PASS
    bad = chart(transported=True, securement_text="all appropriate straps")
    assert _verdict(indicators.evaluate_general(bad), 7).verdict == indicators.FAIL


def test_cqi8_free_typed():
    bad = chart(narrative_only_interventions=["NPA attempt"])
    assert _verdict(indicators.evaluate_general(bad), 8).verdict == indicators.FAIL
    ok = chart(add_actions=[AddAction(kind="procedure", name="NPA")])
    assert _verdict(indicators.evaluate_general(ok), 8).verdict == indicators.PASS


def test_cqi9_deviation():
    nofile = chart(protocol_deviation=True, special_report_filed=False)
    assert _verdict(indicators.evaluate_general(nofile), 9).verdict == indicators.FAIL
    filed = chart(protocol_deviation=True, special_report_filed=True)
    assert _verdict(indicators.evaluate_general(filed), 9).verdict == indicators.PASS
    none = chart()
    assert _verdict(indicators.evaluate_general(none), 9).verdict == indicators.NA


def test_cqi10_signatures():
    miss = chart(transported=True, signatures={"patient": True, "crew": True})
    assert _verdict(indicators.evaluate_general(miss), 10).verdict == indicators.FAIL
    ok = chart(transported=True, signatures={"patient": True, "receiving": True, "crew": True})
    assert _verdict(indicators.evaluate_general(ok), 10).verdict == indicators.PASS


def test_cqi1_and_2_route_to_human():
    res = indicators.evaluate_general(chart())
    assert _verdict(res, 1).verdict == indicators.HUMAN
    assert _verdict(res, 2).verdict == indicators.HUMAN


# ───────── consistency (CQI #11) ─────────
def test_consistency_paired_field_returns_both_sides():
    c = chart(structured_fields={"airway": {"charted": "i-gel", "narrative": "ALS intubation"}})
    conflicts = consistency.find_conflicts(c)
    assert conflicts, "expected a conflict"
    label, a, b = conflicts[0]
    assert a["value"] != b["value"]
    assert a["source"] and b["source"]
    # and CQI #11 fails with both pieces of evidence
    r11 = _verdict(indicators.evaluate_general(c), 11)
    assert r11.verdict == indicators.FAIL
    assert r11.evidence and "evidence_a" in r11.evidence[0] and "evidence_b" in r11.evidence[0]


def test_consistency_rosc_vs_compressions():
    c = chart(outcome={"rosc": True}, structured_fields={"compressions_at_destination": True})
    labels = [k for (k, a, b) in consistency.find_conflicts(c)]
    assert any("ROSC" in k for k in labels)


def test_consistency_weight_for_age():
    c = chart(age_years=9, structured_fields={"weight_kg": 12.5})
    labels = [k for (k, a, b) in consistency.find_conflicts(c)]
    assert any("Weight" in k for k in labels)


def test_consistency_clean_passes():
    assert _verdict(indicators.evaluate_general(chart()), 11).verdict == indicators.PASS


# ───────── severity ─────────
def test_severity_commendation():
    p = severity.propose_severity(chart(), {"kind": "commendation"})
    assert p.proposed == severity.COMMENDATION and not p.require_human


def test_severity_doc_only_is_minor():
    c = chart(age_years=40, disposition="Transported", vitals=[Vitals(sbp=120, spo2=98)])
    p = severity.propose_severity(c, {"kind": "indicator_fail", "indicator_number": 2,
                                      "domain": "Administrative & Billing"})
    assert p.proposed == severity.MINOR and not p.require_human and p.confidence == "high"


def test_severity_same_failure_escalates_with_context():
    # Same indicator failure, different charts -> different severity (context-driven).
    base_finding = {"kind": "indicator_fail", "indicator_number": 3, "treatment_omission": "no repeat albuterol",
                    "als_indicated": True}
    peds_abnormal = chart(age_years=5, vitals=[Vitals(sbp=80, spo2=88)])
    p1 = severity.propose_severity(peds_abnormal, base_finding)
    assert p1.proposed == severity.CRITICAL and p1.require_human
    mods = {m["modifier"] for m in p1.modifiers}
    assert "patient_vulnerability" in mods and "abnormal_findings" in mods and "treatment_omission" in mods


def test_severity_conflict_flags_credibility_and_requires_human():
    p = severity.propose_severity(chart(age_years=40), {"kind": "consistency_conflict", "indicator_number": 11})
    assert p.require_human
    assert any(m["modifier"] == "documentation_credibility" for m in p.modifiers)


# ───────── review orchestration ─────────
def test_build_automated_review():
    c = chart(primary_impression="Cardiac arrest, post ROSC", transported=True,
              narrative_only_interventions=["NPA attempt"],
              signatures={"patient": True, "crew": True},
              vitals=[Vitals(sbp=80, spo2=88, bp_method="manual")],
              age_years=70)
    rev = review.build_automated_review(c)
    assert "Cardiac Arrest" in rev.activations and "General" in rev.activations
    # specialty indicators applicable but routed to human (no auto specialty judgment)
    specialty = [r for r in rev.indicator_results if r.number >= 28 and r.number <= 32]
    assert specialty and all(r.verdict == indicators.HUMAN for r in specialty)
    # findings exist with severity proposals, and at least one requires human severity
    assert rev.findings and all("severity_proposed" in f for f in rev.findings)
    assert rev.counts["findings"] == len(rev.findings)
    # #8 free-typed intervention produced a finding
    assert any(f["indicator_number"] == 8 for f in rev.findings)
    # serializable
    assert rev.to_dict()["external_ref"] == "SYNTH-1"
