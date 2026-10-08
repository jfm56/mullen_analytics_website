"""Automated review orchestration — ties the engines into one review proposal.

Given a synthetic chart it produces: applicability (general + activated specialty,
with reasons), per-indicator automated verdicts (General #1-12 evaluated; specialty
indicators marked applicable + HUMAN_REVIEW_REQUIRED — no auto specialty judgment in
v1), and findings (from failures + conflicts) each with evidence + a severity
PROPOSAL. Everything here is an automated RECOMMENDATION; a human reviewer approves
or overrides, and the human decision is stored separately (see the DB/service layer).
No score is computed by AI — scoring stays in scoring.py.
"""
from __future__ import annotations
from dataclasses import dataclass, field

from .applicability import evaluate_applicability
from .chart_data import QaChartData
from . import indicators as ind
from . import seed, severity, specialty

# indicator -> a domain/context hint for the severity engine's legal/safety check
_DOMAIN_HINT = {
    1: "Documentation Integrity", 2: "HPI & Narrative", 3: "Vitals & Reassessment",
    4: "Assessment", 5: "Vitals & Reassessment", 6: "Safety, Securement & Transfer",
    7: "Safety, Securement & Transfer", 8: "Documentation Integrity",
    9: "Protocol Adherence", 10: "Administrative & Billing (signature/consent/legal)",
    11: "Documentation Integrity", 12: "Operational Decisions",
}


@dataclass
class AutomatedReview:
    external_ref: str
    activations: dict                         # category -> reason
    indicator_results: list                   # list[IndicatorResult] (general) + specialty stubs
    findings: list = field(default_factory=list)   # [{indicator_number, kind, description, evidence, severity}]
    counts: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "external_ref": self.external_ref,
            "activations": self.activations,
            "indicator_results": [
                {"number": r.number, "classification": r.classification.value,
                 "verdict": r.verdict, "rationale": r.rationale, "evidence": r.evidence}
                for r in self.indicator_results],
            "findings": self.findings,
            "counts": self.counts,
        }


def build_automated_review(chart: QaChartData) -> AutomatedReview:
    appl = evaluate_applicability(chart)
    results = list(ind.evaluate_general(chart))     # #1-12 automated verdicts

    # Specialty: activated categories are evaluated when IMPLEMENTED (M2 release 1 =
    # Refusal/Medication/Albuterol); not-yet-implemented categories route to human review.
    general_nums = set(seed.general_numbers())
    lib = seed.indicator_by_number()
    cat_nums = seed.category_indicator_numbers()
    cat_by_num = {n: lib[n]["category"] for n in lib}
    for category, reason in appl.activations.items():
        if category == "General":
            continue
        if specialty.is_implemented(category):
            for r in specialty.evaluate_category(category, chart):
                r.evidence = (r.evidence or []) + [{"field": "applicability_reason", "value": reason}]
                results.append(r)
        else:
            for num in sorted(cat_nums.get(category, [])):
                results.append(ind.IndicatorResult(
                    number=num, classification=ind.Classification.HUMAN_REVIEW, verdict=ind.HUMAN,
                    rationale=f"Specialty indicator ({category}) applicable — not yet automated; human review.",
                    evidence=[{"field": "applicability_reason", "value": reason}]))

    # Findings: every FAIL (general + implemented specialty) + consistency conflicts, each
    # with a severity PROPOSAL (clinical/refusal context handled by the severity engine).
    findings = []
    for r in results:
        if r.verdict != ind.FAIL:
            continue
        category = cat_by_num.get(r.number, "")
        # Clinical-safety gap vs documentation gap (nature of the gap, not a fixed
        # indicator->severity map): refusal vitals/capacity/sobriety are clinical safety;
        # medication reassessment (#66) and the ALS-escalation requirement (#67) are too.
        # #67 is a PROTOCOL gap (the drug WAS given) — the severity engine derives a
        # protocol_requirement modifier from its PROTOCOL_RULE classification; we do NOT
        # mislabel it as a treatment omission (that would wrongly auto-escalate to Critical).
        clinical_safety_gap = (r.number in (77, 78, 80)
                               or (category == "Medication" and r.number in (66, 67))
                               or (category == "Cardiac/STEMI" and r.number in (24, 27))
                               or (category == "Trauma" and r.number in (37, 38)))
        finding = {"kind": "consistency_conflict" if r.number == 11 else "indicator_fail",
                   "indicator_number": r.number, "classification": r.classification.value,
                   "category": category, "domain": _DOMAIN_HINT.get(r.number, category),
                   "rationale": r.rationale, "evidence": r.evidence,
                   "clinical_safety_gap": clinical_safety_gap,
                   "significant_mechanism": bool(getattr(chart, "significant_mechanism", None)),
                   "possible_abuse": bool(getattr(chart, "possible_abuse", None))}
        prop = severity.propose_severity(chart, finding)
        findings.append({
            "indicator_number": r.number, "category": category, "kind": finding["kind"],
            "description": r.rationale, "evidence": r.evidence,
            "severity_proposed": prop.proposed, "severity_requires_human": prop.require_human,
            "severity_confidence": prop.confidence, "severity_modifiers": prop.modifiers,
            "severity_rationale": prop.rationale, "severity_high_priority": prop.high_priority,
        })

    specialty_nums = [r.number for r in results if r.number not in general_nums]
    counts = {
        "applicable_indicators": len(results),
        "general_pass": sum(1 for r in results if r.number in general_nums and r.verdict == ind.PASS),
        "general_fail": sum(1 for r in results if r.number in general_nums and r.verdict == ind.FAIL),
        "general_na": sum(1 for r in results if r.number in general_nums and r.verdict == ind.NA),
        "general_human": sum(1 for r in results if r.number in general_nums and r.verdict == ind.HUMAN),
        "specialty_applicable": len(specialty_nums),
        "specialty_fail": sum(1 for r in results if r.number not in general_nums and r.verdict == ind.FAIL),
        "specialty_human": sum(1 for r in results if r.number not in general_nums and r.verdict == ind.HUMAN),
        "findings": len(findings),
        "findings_requiring_human_severity": sum(1 for f in findings if f["severity_requires_human"]),
        "high_priority_findings": sum(1 for f in findings if f.get("severity_high_priority")),
    }
    return AutomatedReview(chart.external_ref, appl.activations, results, findings, counts)
