"""Deterministic EMSCS QA scoring — exact reproduction of the workbook formulas.

Every function documents the workbook cell it mirrors (EMSCS - WNY Chart Review
September 2026.xlsx). NO AI computes a score; this is pure application logic. The
clinical content (domain weights, composite weights, tier thresholds, indicator
compliant-answers) is CONFIG passed in — seeded from the workbook — not hardcoded
clinical judgement.

Workbook references:
  Chart Log!AA  Quality Score        = IF(COUNT(S:Z)<8,"",SUMPRODUCT(S:Z,$S$3:$Z$3)/5)
  Chart Log!AB  Indicator Compliance = COUNTIFS(IndRev met)/(COUNTIFS met + COUNTIFS not met)
  Chart Log!AC  Composite            = QS*Rubric!C27 + IC*100*Rubric!C28       (C27=0.7, C28=0.3)
  Chart Log!AE  Tier                 = >=C29 Exemplary / >=C30 Meets / >=C31 Needs / else Focused
  Chart Log!AF  Major/Critical count = COUNTIFS(Findings Major)+COUNTIFS(Findings Critical)
  Chart Log!AG  Commendations        = COUNTIFS(Findings Commendation)
  Ind Review!G  Status               = IF(F="","",IF(F="NA","NA",IF(F=compliant,"Met","Not Met")))
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Sequence

# Default rubric constants taken from the workbook 'Scoring Rubric' sheet. These
# are CONFIG (seed values), overridable from the seeded qa_scoring_config.
DEFAULT_WEIGHTS = (15, 15, 20, 10, 15, 10, 10, 5)      # 8 domains, sum = 100
DEFAULT_QUALITY_WEIGHT = 0.7                            # Rubric!C27
DEFAULT_COMPLIANCE_WEIGHT = 0.3                         # Rubric!C28
DEFAULT_TIERS = (("Exemplary", 90.0), ("Meets Standard", 80.0),
                 ("Needs Improvement", 70.0), ("Focused Review", None))  # Rubric!C29-C31
SEVERITIES = ("Critical", "Major", "Minor", "Commendation")


def indicator_status(result, compliant_answer) -> Optional[str]:
    """Mirror Indicator Review!G. Returns 'Met' | 'Not Met' | 'NA' | None(blank)."""
    if result is None:
        return None
    r = str(result).strip()
    if r == "":
        return None
    if r.upper() == "NA":
        return "NA"
    if compliant_answer is None:
        return None
    return "Met" if r.upper() == str(compliant_answer).strip().upper() else "Not Met"


def quality_score(domain_scores: Sequence[Optional[float]],
                  weights: Sequence[float] = DEFAULT_WEIGHTS) -> Optional[float]:
    """Mirror Chart Log!AA. Requires all 8 domains present (COUNT(S:Z)==8)."""
    if len(domain_scores) != len(weights):
        return None
    if any(s is None for s in domain_scores):
        return None
    return sum(float(s) * float(w) for s, w in zip(domain_scores, weights)) / 5.0


def indicator_compliance(statuses: Sequence[Optional[str]]) -> Optional[float]:
    """Mirror Chart Log!AB. Met / (Met + Not Met); NA and blanks excluded.
    Returns None when the denominator is 0 (workbook shows '')."""
    met = sum(1 for s in statuses if s == "Met")
    not_met = sum(1 for s in statuses if s == "Not Met")
    denom = met + not_met
    if denom == 0:
        return None
    return met / denom


def composite_score(qs: Optional[float], ic: Optional[float],
                    quality_weight: float = DEFAULT_QUALITY_WEIGHT,
                    compliance_weight: float = DEFAULT_COMPLIANCE_WEIGHT) -> Optional[float]:
    """Mirror Chart Log!AC. Both inputs required (workbook: IF(OR(AA="",AB=""),"")...)."""
    if qs is None or ic is None:
        return None
    return qs * quality_weight + ic * 100.0 * compliance_weight


def tier(composite: Optional[float], tiers: Sequence = DEFAULT_TIERS) -> Optional[str]:
    """Mirror Chart Log!AE. Descending thresholds; final tier has threshold None."""
    if composite is None:
        return None
    for name, threshold in tiers:
        if threshold is None or composite >= threshold:
            return name
    return tiers[-1][0]


def severity_counts(severities: Sequence[str]) -> dict:
    """Per-chart counts by severity (from the Findings sheet, col F)."""
    counts = {s: 0 for s in SEVERITIES}
    for s in severities:
        key = str(s).strip()
        if key in counts:
            counts[key] += 1
    return counts


def major_critical_count(severities: Sequence[str]) -> int:
    """Mirror Chart Log!AF = Major + Critical."""
    c = severity_counts(severities)
    return c["Major"] + c["Critical"]


def commendation_count(severities: Sequence[str]) -> int:
    """Mirror Chart Log!AG."""
    return severity_counts(severities)["Commendation"]


@dataclass
class ChartScore:
    """Full deterministic score bundle for one chart."""
    quality_score: Optional[float]
    indicator_compliance: Optional[float]
    composite: Optional[float]
    tier: Optional[str]
    critical: int
    major: int
    minor: int
    commendation: int
    major_critical: int


def score_chart(domain_scores: Sequence[Optional[float]],
                indicator_statuses: Sequence[Optional[str]],
                severities: Sequence[str],
                weights: Sequence[float] = DEFAULT_WEIGHTS,
                quality_weight: float = DEFAULT_QUALITY_WEIGHT,
                compliance_weight: float = DEFAULT_COMPLIANCE_WEIGHT,
                tiers: Sequence = DEFAULT_TIERS) -> ChartScore:
    """Compute the full EMSCS score bundle for one chart, deterministically."""
    qs = quality_score(domain_scores, weights)
    ic = indicator_compliance(indicator_statuses)
    comp = composite_score(qs, ic, quality_weight, compliance_weight)
    sev = severity_counts(severities)
    return ChartScore(
        quality_score=qs, indicator_compliance=ic, composite=comp, tier=tier(comp, tiers),
        critical=sev["Critical"], major=sev["Major"], minor=sev["Minor"],
        commendation=sev["Commendation"], major_critical=sev["Major"] + sev["Critical"],
    )
