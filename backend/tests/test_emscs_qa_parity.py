"""EMSCS QA scoring PARITY test — Workbook -> Application.

Proves the deterministic application engine reproduces the EMSCS workbook's
existing calculations, using the DE-IDENTIFIED fixture derived from the
"EMSCS - WNY Chart Review September 2026" workbook (no PHI/PII — scores, Y/N/NA
results, severity labels and expected outputs only).

Pure computation: no DB, no network, no feature flag — runs in CI always.
Run as a script to (re)generate docs/emscs-qa-parity-report.md.
"""
import json
import os
from pathlib import Path

import pytest

from app.services.emscs_qa import scoring

FIXTURE = Path(__file__).parent / "fixtures" / "emscs_wny_fixtures.json"
TOL = 1e-6

# Workbook 'Dashboard' reference aggregates (the values Chuck sees in the workbook).
DASHBOARD = {
    "charts": 60,
    "severity_totals": {"Critical": 9, "Major": 102, "Minor": 99, "Commendation": 42},
    "avg_quality_score": 53.15,
    "avg_indicator_compliance": 0.615647167409013,
    "avg_composite": 55.6744150222704,
    "overall_indicator_compliance": 0.6375,
    "tier_distribution": {"Exemplary": 0, "Meets Standard": 0,
                          "Needs Improvement": 6, "Focused Review": 54},
}


def _load():
    with open(FIXTURE, encoding="utf-8") as f:
        return json.load(f)


def _num(v):
    return None if v in (None, "") else float(v)


def run_parity():
    """Compute app scores for every chart and diff against the workbook's cached
    values. Returns (per_chart rows, aggregate dict)."""
    data = _load()
    lib = {int(k): v for k, v in data["indicator_library"].items()}
    rows = []
    all_statuses = []
    tier_dist = {"Exemplary": 0, "Meets Standard": 0, "Needs Improvement": 0, "Focused Review": 0}
    sev_tot = {"Critical": 0, "Major": 0, "Minor": 0, "Commendation": 0}

    for ch in data["charts"]:
        # derive indicator statuses from (result, compliant_answer) — the app's logic
        statuses = []
        status_mismatches = []
        for ind in ch["indicators"]:
            compliant = lib.get(ind["num"], {}).get("compliant_answer")
            st = scoring.indicator_status(ind["result"], compliant)
            statuses.append(st)
            if ind.get("status_cached") not in (None, "") and st != ind["status_cached"]:
                status_mismatches.append((ind["num"], ind["result"], st, ind["status_cached"]))
        all_statuses.extend(statuses)

        s = scoring.score_chart(ch["domain_scores"], statuses, ch["finding_severities"])
        exp = ch["expected"]
        row = {
            "review_id": ch["review_id"],
            "qs": (s.quality_score, _num(exp["quality_score"])),
            "ic": (s.indicator_compliance, _num(exp["indicator_compliance"])),
            "comp": (s.composite, _num(exp["composite"])),
            "tier": (s.tier, exp["tier"]),
            "maj_crit": (s.major_critical, _num(exp["major_critical"])),
            "commend": (s.commendation, _num(exp["commendation"])),
            "status_mismatches": status_mismatches,
        }
        rows.append(row)
        if s.tier in tier_dist:
            tier_dist[s.tier] += 1
        for k in sev_tot:
            sev_tot[k] += getattr(s, k.lower())

    qss = [r["qs"][0] for r in rows if r["qs"][0] is not None]
    ics = [r["ic"][0] for r in rows if r["ic"][0] is not None]
    comps = [r["comp"][0] for r in rows if r["comp"][0] is not None]
    overall_met = sum(1 for s in all_statuses if s == "Met")
    overall_den = overall_met + sum(1 for s in all_statuses if s == "Not Met")
    agg = {
        "charts": len(rows),
        "avg_quality_score": sum(qss) / len(qss) if qss else None,
        "avg_indicator_compliance": sum(ics) / len(ics) if ics else None,
        "avg_composite": sum(comps) / len(comps) if comps else None,
        "overall_indicator_compliance": overall_met / overall_den if overall_den else None,
        "severity_totals": sev_tot,
        "tier_distribution": tier_dist,
    }
    return rows, agg


# ───────────────────────── assertions (CI gate) ─────────────────────────
def _close(a, b, tol=TOL):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return abs(a - b) <= tol


def test_per_chart_parity():
    rows, _ = run_parity()
    assert len(rows) == 60
    failures = []
    for r in rows:
        for key in ("qs", "ic", "comp", "maj_crit", "commend"):
            got, exp = r[key]
            if not _close(got, exp):
                failures.append(f"{r['review_id']} {key}: app={got} workbook={exp}")
        if r["tier"][0] != r["tier"][1]:
            failures.append(f"{r['review_id']} tier: app={r['tier'][0]} workbook={r['tier'][1]}")
    assert not failures, "Per-chart parity mismatches:\n" + "\n".join(failures)


def test_indicator_status_parity():
    rows, _ = run_parity()
    mm = [m for r in rows for m in r["status_mismatches"]]
    assert not mm, f"Indicator status mismatches (num,result,app,workbook): {mm[:20]}"


def test_aggregate_parity_matches_dashboard():
    _, agg = run_parity()
    assert agg["charts"] == DASHBOARD["charts"]
    assert agg["severity_totals"] == DASHBOARD["severity_totals"]
    assert agg["tier_distribution"] == DASHBOARD["tier_distribution"]
    assert _close(round(agg["avg_quality_score"], 2), DASHBOARD["avg_quality_score"], 0.01)
    assert _close(agg["avg_indicator_compliance"], DASHBOARD["avg_indicator_compliance"], 1e-6)
    assert _close(agg["avg_composite"], DASHBOARD["avg_composite"], 1e-6)
    assert _close(agg["overall_indicator_compliance"], DASHBOARD["overall_indicator_compliance"], 1e-6)


# ───────────────────────── report generator ─────────────────────────
def generate_report() -> str:
    rows, agg = run_parity()

    def diff(got, exp):
        if got is None and exp is None:
            return "0"
        if got is None or exp is None:
            return "MISSING"
        return f"{got - exp:+.6g}"

    lines = []
    lines.append("# EMSCS QA Scoring Parity Report — Workbook → Application\n")
    lines.append("Source: *EMSCS - WNY Chart Review September 2026* (de-identified fixture). "
                 "Application engine: `app/services/emscs_qa/scoring.py` (deterministic; no AI). "
                 "Formulas mirror the workbook cells exactly; **no formula was altered to force parity**.\n")
    # overall verdict
    nfail = 0
    for r in rows:
        for key in ("qs", "ic", "comp", "maj_crit", "commend"):
            if not _close(*r[key]):
                nfail += 1
        if r["tier"][0] != r["tier"][1]:
            nfail += 1
    status_mm = sum(len(r["status_mismatches"]) for r in rows)
    lines.append(f"## Verdict: {'✅ FULL PARITY' if nfail == 0 and status_mm == 0 else '❌ ' + str(nfail) + ' mismatches'}\n")
    lines.append(f"- Charts compared: **{len(rows)}** · per-field mismatches: **{nfail}** · "
                 f"indicator-status mismatches: **{status_mm}**\n")

    # aggregate table
    lines.append("## Aggregate parity (vs workbook Dashboard)\n")
    lines.append("| Metric | Workbook | Application | Diff |")
    lines.append("|---|---|---|---|")
    A, D = agg, DASHBOARD
    lines.append(f"| Charts reviewed | {D['charts']} | {A['charts']} | {A['charts']-D['charts']} |")
    lines.append(f"| Avg Quality Score | {D['avg_quality_score']} | {A['avg_quality_score']:.2f} | {diff(round(A['avg_quality_score'],2), D['avg_quality_score'])} |")
    lines.append(f"| Avg Indicator Compliance | {D['avg_indicator_compliance']:.6f} | {A['avg_indicator_compliance']:.6f} | {diff(A['avg_indicator_compliance'], D['avg_indicator_compliance'])} |")
    lines.append(f"| Avg Composite | {D['avg_composite']:.6f} | {A['avg_composite']:.6f} | {diff(A['avg_composite'], D['avg_composite'])} |")
    lines.append(f"| Overall Indicator Compliance (all rows) | {D['overall_indicator_compliance']} | {A['overall_indicator_compliance']:.4f} | {diff(A['overall_indicator_compliance'], D['overall_indicator_compliance'])} |")
    for sev in ("Critical", "Major", "Minor", "Commendation"):
        lines.append(f"| Findings — {sev} | {D['severity_totals'][sev]} | {A['severity_totals'][sev]} | {A['severity_totals'][sev]-D['severity_totals'][sev]} |")
    for t in ("Exemplary", "Meets Standard", "Needs Improvement", "Focused Review"):
        lines.append(f"| Tier — {t} | {D['tier_distribution'][t]} | {A['tier_distribution'][t]} | {A['tier_distribution'][t]-D['tier_distribution'][t]} |")

    # per-chart table
    lines.append("\n## Per-chart parity (Workbook → Application → Diff)\n")
    lines.append("| Chart | QS wb | QS app | IC wb | IC app | Comp wb | Comp app | Tier wb | Tier app | Maj+Crit wb/app | Commend wb/app | OK |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        ok = (all(_close(*r[k]) for k in ("qs", "ic", "comp", "maj_crit", "commend"))
              and r["tier"][0] == r["tier"][1] and not r["status_mismatches"])
        def f(x):
            return "" if x is None else (f"{x:.4g}" if isinstance(x, float) else str(x))
        lines.append("| {rid} | {qw} | {qa} | {iw} | {ia} | {cw} | {ca} | {tw} | {ta} | {mcw}/{mca} | {cmw}/{cma} | {ok} |".format(
            rid=r["review_id"], qw=f(r["qs"][1]), qa=f(r["qs"][0]), iw=f(r["ic"][1]), ia=f(r["ic"][0]),
            cw=f(r["comp"][1]), ca=f(r["comp"][0]), tw=r["tier"][1], ta=r["tier"][0],
            mcw=f(r["maj_crit"][1]), mca=f(r["maj_crit"][0]), cmw=f(r["commend"][1]), cma=f(r["commend"][0]),
            ok="✅" if ok else "❌"))
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    report = generate_report()
    out = Path(__file__).resolve().parents[2] / "docs" / "emscs-qa-parity-report.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print("wrote", out)
    _, agg = run_parity()
    print("charts:", agg["charts"], "| severity:", agg["severity_totals"], "| tiers:", agg["tier_distribution"])
