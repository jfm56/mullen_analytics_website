"""Synthetic EMSCS QA demo charts — NON-PHI, dev/test/local-review only.

Six hand-built cases spanning the review spectrum (clean → ambiguous) used by the
local-review seeder and the specialty validation report. Every value here is
fabricated; nothing is derived from, or traceable to, the real WNY workbook. These
are illustrative inputs with KNOWN ground truth, so the engine's behavior can be
shown deterministically in the Agency QA Review, EMSCS Review View, Super Admin QA
Monitor and Super Admin Validation Console. They are examples — not a validation
sample large enough to claim accuracy from.
"""
from __future__ import annotations

from .chart_data import QaChartData, Vitals, AddAction, Refusal

_CLEAN_REFUSAL = dict(
    matrix_complete=True, checkboxes_complete=True, signed_patient=True, signed_witness=True,
    capacity_documented=True, aox=4, risks_explained=True, care_transport_explained=True,
    return_precautions=True, influence_documented="denies alcohol/drugs; no signs of impairment",
)


def case_clean():
    """1 — Clean compliant refusal. All Refusal indicators pass; no findings."""
    return QaChartData(
        external_ref="SYN-01-CLEAN", disposition="Patient Refused Care", age_years=45,
        primary_impression="Lift assist; no complaint, declined transport",
        hpi_narrative="45 y/o, no complaint after lift assist, A&Ox4, declined transport after risks explained.",
        vitals=[Vitals(time="14:00", sbp=128, dbp=78, rr=16, spo2=99, hr=74, pain=0, bp_method="manual"),
                Vitals(time="14:10", sbp=126, dbp=76, rr=16, spo2=99, hr=72, pain=0, bp_method="auto")],
        refusal=Refusal(**_CLEAN_REFUSAL),
    )


def case_minor_doc():
    """2 — Minor documentation failure: refusal matrix unsigned (doc gap, not clinical)."""
    rf = dict(_CLEAN_REFUSAL); rf.update(signed_patient=False, signed_witness=False)
    return QaChartData(
        external_ref="SYN-02-MINORDOC", disposition="Patient Refused Care", age_years=52,
        primary_impression="Lift assist; refused further care",
        hpi_narrative="52 y/o, uninjured after lift assist, A&Ox4, declined evaluation.",
        vitals=[Vitals(time="08:30", sbp=134, dbp=82, rr=16, spo2=98, hr=70, pain=0),
                Vitals(time="08:40", sbp=132, dbp=80, rr=16, spo2=98, hr=72, pain=0)],
        refusal=Refusal(**rf),
    )


def case_major():
    """3 — Major failure: routine adult refusal with NO vitals obtained (clinical-safety gap)."""
    rf = dict(_CLEAN_REFUSAL)
    return QaChartData(
        external_ref="SYN-03-MAJOR", disposition="Patient Refused Care", age_years=50,
        primary_impression="Headache; refused transport",
        hpi_narrative="50 y/o with headache, declined transport. No vital signs recorded.",
        vitals=[],
        refusal=Refusal(**rf),
    )


def case_critical():
    """4 — Critical refusal: pediatric + significant mechanism + NO vitals (high-risk path)."""
    rf = dict(_CLEAN_REFUSAL); rf.update(guardian_involved=True)
    return QaChartData(
        external_ref="SYN-04-CRITICAL", disposition="Patient Refused Care (guardian)", age_years=8,
        primary_impression="Restrained child, MVC rollover; guardian declined transport",
        hpi_narrative="8 y/o restrained passenger in rollover MVC; guardian declined transport.",
        significant_mechanism=True, head_injury=False,
        vitals=[],
        refusal=Refusal(**rf),
    )


def case_multi_category():
    """5 — Multi-category: respiratory distress with albuterol → activates Albuterol AND
    Medication. Correctly documented except a repeat dose <5 min apart (timeline Major)."""
    alb = dict(kind="medication", name="Albuterol", route="neb", dose="2.5", dose_unit="mg",
               performed_by="Medic 7", indication="wheezing / respiratory distress",
               response_documented=True, reassessed_after=True)
    return QaChartData(
        external_ref="SYN-05-MULTI", transported=True, age_years=61,
        history="asthma, COPD", primary_impression="Respiratory distress",
        hpi_narrative="61 y/o asthma/COPD with wheezing and hypoxia; albuterol administered.",
        add_actions=[AddAction(**alb, time="09:05"), AddAction(**alb, time="09:08")],
        vitals=[Vitals(time="09:00", sbp=138, dbp=84, rr=28, spo2=89, hr=120, pain=0, bp_method="manual"),
                Vitals(time="09:15", sbp=132, dbp=80, rr=20, spo2=96, hr=100, pain=0, bp_method="auto")],
        als_on_scene=True,
        signatures={"patient": True, "receiving": True, "crew": True}, securement_straps=3,
    )


def case_ambiguous():
    """6 — Ambiguous: refusal with AMS / possible ingestion → capacity routes to HUMAN
    REVIEW REQUIRED; sobriety not documented (clinical gap)."""
    rf = dict(_CLEAN_REFUSAL); rf.update(aox=3, influence_documented=None)
    return QaChartData(
        external_ref="SYN-06-AMBIGUOUS", disposition="Patient Refused Care", age_years=30,
        primary_impression="Found down, now ambulatory; possible intoxication; refused transport",
        hpi_narrative="30 y/o, slurred speech and unsteady gait, possible ETOH; declined transport.",
        altered_mental_status=True, possible_ingestion=True,
        vitals=[Vitals(time="22:00", sbp=118, dbp=70, rr=18, spo2=97, hr=96, pain=0)],
        refusal=Refusal(**rf),
    )


# (key, label, builder, one-line expectation for the local-review report)
CASES = [
    ("clean", "Clean compliant", case_clean, "Refusal #75-80 all Met; no findings."),
    ("minor_doc", "Minor documentation failure", case_minor_doc, "#75 unsigned → Minor (documentation)."),
    ("major", "Major failure", case_major, "#78 no vitals on refusal → Major, human confirm."),
    ("critical", "Critical refusal", case_critical, "#78 + pediatric + significant mechanism → Critical."),
    ("multi", "Multi-category", case_multi_category, "Albuterol + Medication; #72 repeat <5 min → human review (abnormal SpO2)."),
    ("ambiguous", "Ambiguous", case_ambiguous, "#77 capacity (AMS/ingestion) → HUMAN REVIEW REQUIRED."),
]


def all_cases():
    """[(key, label, chart, note)] — fresh chart instances."""
    return [(k, lbl, build(), note) for (k, lbl, build, note) in CASES]
