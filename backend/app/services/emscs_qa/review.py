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
from . import seed, severity

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

    # Specialty indicators that are applicable -> applicable but NOT auto-judged in v1.
    general_nums = set(seed.general_numbers())
    lib = seed.indicator_by_number()
    for ai in appl.indicators:
        if ai.number in general_nums:
            continue
        results.append(ind.IndicatorResult(
            number=ai.number, classification=ind.Classification.HUMAN_REVIEW,
            verdict=ind.HUMAN, rationale=f"Specialty indicator ({ai.category}) applicable — "
            f"awaiting human review (no automated specialty judgment in v1).",
            evidence=[{"field": "applicability_reason", "value": ai.reason}]))

    # Findings: General failures + consistency conflicts, each with a severity PROPOSAL.
    findings = []
    for r in results:
        if r.number in general_nums and r.verdict == ind.FAIL:
            finding = {"kind": "consistency_conflict" if r.number == 11 else "indicator_fail",
                       "indicator_number": r.number, "classification": r.classification.value,
                       "domain": _DOMAIN_HINT.get(r.number, ""), "rationale": r.rationale,
                       "evidence": r.evidence}
            prop = severity.propose_severity(chart, finding)
            findings.append({
                "indicator_number": r.number,
                "kind": finding["kind"],
                "description": r.rationale,
                "evidence": r.evidence,
                "severity_proposed": prop.proposed,
                "severity_requires_human": prop.require_human,
                "severity_confidence": prop.confidence,
                "severity_modifiers": prop.modifiers,
                "severity_rationale": prop.rationale,
            })

    counts = {
        "applicable_indicators": len(results),
        "general_pass": sum(1 for r in results if r.number in general_nums and r.verdict == ind.PASS),
        "general_fail": sum(1 for r in results if r.number in general_nums and r.verdict == ind.FAIL),
        "general_na": sum(1 for r in results if r.number in general_nums and r.verdict == ind.NA),
        "general_human": sum(1 for r in results if r.number in general_nums and r.verdict == ind.HUMAN),
        "specialty_applicable": sum(1 for r in results if r.number not in general_nums),
        "findings": len(findings),
        "findings_requiring_human_severity": sum(1 for f in findings if f["severity_requires_human"]),
    }
    return AutomatedReview(chart.external_ref, appl.activations, results, findings, counts)
