"""Generate the EMSCS QA Milestone 2 specialty validation report.

Two evidence sources, kept strictly separate:

  A. Acceptance on synthetic cases with KNOWN ground truth (the six local-review
     cases). These are designed inputs, so agreement here means "the engine behaves
     to specification", NOT a generalization accuracy estimate.

  B. Alignment against the de-identified WNY workbook fixture (examples only). The
     fixture carries the workbook reviewer's Met/Not-Met per specialty indicator but
     intentionally OMITS the structured chart content, so the engine is NOT re-run on
     those 60 real charts. We report real-world prevalence + definition alignment, and
     the counts are small (Albuterol n=2) — not a validated accuracy claim.

Run:  python -m scripts.emscs_specialty_validation_report
Writes: docs/emscs-qa-milestone-2-validation-report.md  (non-PHI)
"""
from __future__ import annotations
import json
from collections import Counter
from pathlib import Path

from app.services.emscs_qa import review, seed, specialty, synthetic_cases as sc

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "emscs_wny_fixtures.json"
OUT = ROOT / "docs" / "emscs-qa-milestone-2-validation-report.md"

SPECIALTY_NUMS = list(range(16, 28)) + list(range(63, 81))  # Cardiac/STEMI #16-27 + Med/Alb/Refusal #63-80

# Designed ground truth for the six synthetic cases (verdict per specialty indicator +
# expected finding severities). Agreement vs this = acceptance to specification.
GROUND_TRUTH = {
    "clean":     {"activations": {"Refusal"},
                  "verdicts": {75: "pass", 76: "pass", 77: "pass", 78: "pass", 79: "pass", 80: "pass"},
                  "findings": {}},
    "minor_doc": {"activations": {"Refusal"},
                  "verdicts": {75: "fail", 76: "pass", 77: "pass", 78: "pass", 79: "pass", 80: "pass"},
                  "findings": {75: "Minor"}},
    "major":     {"activations": {"Refusal"},
                  "verdicts": {75: "pass", 76: "pass", 77: "pass", 78: "fail", 79: "pass", 80: "pass"},
                  "findings": {78: "Major"}},
    "critical":  {"activations": {"Refusal", "Trauma"},
                  "verdicts": {75: "pass", 76: "pass", 77: "pass", 78: "fail", 79: "pass", 80: "pass"},
                  "findings": {78: "Critical"}},
    "multi":     {"activations": {"Medication", "Albuterol"},
                  "verdicts": {63: "pass", 64: "pass", 65: "pass", 66: "pass", 67: "na", 68: "human_review_required",
                               69: "pass", 70: "pass", 71: "pass", 72: "fail", 73: "pass", 74: "pass"},
                  "findings": {72: "HUMAN_REVIEW_REQUIRED"}},
    "ambiguous": {"activations": {"Refusal"},
                  "verdicts": {75: "pass", 76: "pass", 77: "human_review_required", 78: "pass", 79: "pass", 80: "fail"},
                  "findings": {80: "Major"}},
}


def _run_synthetic():
    rows, agg = [], {"ind_total": 0, "ind_agree": 0, "fp": 0, "fn": 0, "human": 0,
                     "find_expected": 0, "find_got": 0, "find_match": 0, "sev_match": 0,
                     "appl_total": 0, "appl_agree": 0}
    for key, label, chart, note in sc.all_cases():
        rev = review.build_automated_review(chart)
        gt = GROUND_TRUTH[key]
        verdicts = {r.number: r.verdict for r in rev.indicator_results}
        got_find = {f["indicator_number"]: f["severity_proposed"] for f in rev.findings}

        # applicability (specialty categories only)
        got_cats = {c for c in rev.activations if c != "General"}
        appl_ok = got_cats == gt["activations"]
        agg["appl_total"] += 1
        agg["appl_agree"] += int(appl_ok)

        # per-indicator Met/Not-Met agreement + FP/FN + human-review
        ind_agree = ind_total = 0
        for num, exp in gt["verdicts"].items():
            got = verdicts.get(num)
            ind_total += 1
            ind_agree += int(got == exp)
            if got == "human_review_required":
                agg["human"] += 1
            if got == "fail" and exp in ("pass", "na"):
                agg["fp"] += 1
            if got in ("pass", "na") and exp == "fail":
                agg["fn"] += 1
        agg["ind_total"] += ind_total
        agg["ind_agree"] += ind_agree

        # findings + severity agreement
        exp_find = gt["findings"]
        find_match = sum(1 for n in exp_find if n in got_find)
        sev_match = sum(1 for n, s in exp_find.items() if got_find.get(n) == s)
        agg["find_expected"] += len(exp_find)
        agg["find_got"] += len(got_find)
        agg["find_match"] += find_match
        agg["sev_match"] += sev_match

        find_str = ", ".join(f"#{n} {s}" for n, s in sorted(got_find.items())) or "— none —"
        rows.append((label, note, sorted(got_cats), f"{ind_agree}/{ind_total}", find_str,
                     "✓" if appl_ok and ind_agree == ind_total else "·"))
    return rows, agg


def _workbook_alignment():
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    charts = data["charts"]
    lib = data["indicator_library"]
    per = {}  # num -> Counter of Met/Not Met/NA
    for ch in charts:
        for it in ch["indicators"]:
            if it["num"] in SPECIALTY_NUMS:
                per.setdefault(it["num"], Counter())[it.get("status_cached") or it.get("result")] += 1
    rows = []
    for num in SPECIALTY_NUMS:
        if num not in per:
            continue
        c = per[num]
        cat = (lib.get(str(num)) or {}).get("category", "?")
        impl = specialty.is_implemented(cat)
        proto = seed.protocol(num)
        pv = f'{proto.get("protocol_name","?")} {proto.get("version","")}'.strip() if proto else "—"
        rows.append((num, cat, "auto" if impl else "—", sum(c.values()),
                     c.get("Met", 0), c.get("Not Met", 0), c.get("NA", 0), pv))
    return rows, len(charts)


def main():
    syn_rows, agg = _run_synthetic()
    wb_rows, n_charts = _workbook_alignment()
    ruleset = seed.ruleset_version()

    def pct(a, b):
        return f"{(100.0 * a / b):.0f}%" if b else "—"

    L = []
    L.append("# EMSCS QA — Milestone 2 (Specialty CQI) Validation Report")
    L.append("")
    L.append(f"Ruleset version: `{ruleset}` · Implemented categories: "
             f"{', '.join(specialty.IMPLEMENTED_CATEGORIES)} (indicators #63-80).")
    L.append("")
    L.append("> Scope note: this release automates **Cardiac/STEMI #16-27, Refusal #75-80, "
             "Medication #63-68, Albuterol #69-74**. All other specialty categories remain "
             "human-review stubs. The engine proposes; a human approves. No AI computes a score.")
    L.append("")
    L.append("> **Corrections applied (2026-10-08):** (1) **#77 capacity** — A&Ox/orientation is "
             "supporting evidence only and can never AUTO-MET; AUTO MET requires explicit "
             "capacity-specific documentation; AMS / intoxication / possible ingestion / "
             "insufficient documentation route to HUMAN REVIEW REQUIRED; incapacity is never "
             "auto-inferred. (2) **#71 albuterol** — applicability is established before "
             "Met/Not-Met: no evidence → N/A; evidence albuterol was given/indicated but the "
             "Add Action is missing → Not Met; a structured Add Action → normal #69-74 evaluation.")
    L.append("")
    L.append("## A. Acceptance on synthetic cases (known ground truth)")
    L.append("")
    L.append("Six designed cases with known-correct outcomes. Agreement here demonstrates the "
             "engine behaves **to specification** — it is an acceptance check, not a "
             "generalization-accuracy estimate (the inputs were authored to produce these results).")
    L.append("")
    L.append("| Case | Expected behavior | Categories activated | Met/Not-Met agree | Engine findings | OK |")
    L.append("|---|---|---|---|---|---|")
    for (label, note, cats, agr, find, ok) in syn_rows:
        L.append(f"| {label} | {note} | {', '.join(cats)} | {agr} | {find} | {ok} |")
    L.append("")
    L.append("**Aggregate over the six cases**")
    L.append("")
    L.append(f"- Applicability agreement: **{pct(agg['appl_agree'], agg['appl_total'])}** "
             f"({agg['appl_agree']}/{agg['appl_total']} cases)")
    L.append(f"- Indicator Met/Not-Met agreement: **{pct(agg['ind_agree'], agg['ind_total'])}** "
             f"({agg['ind_agree']}/{agg['ind_total']} indicators)")
    L.append(f"- Finding detection: expected {agg['find_expected']}, produced {agg['find_got']}, "
             f"matched **{agg['find_match']}/{agg['find_expected']}**")
    L.append(f"- Severity-proposal agreement (on expected findings): "
             f"**{agg['sev_match']}/{agg['find_expected']}**")
    L.append(f"- False positives: **{agg['fp']}** · False negatives: **{agg['fn']}**")
    L.append(f"- Routed to HUMAN REVIEW REQUIRED: **{agg['human']}** specialty indicator(s) "
             f"(e.g., capacity under AMS/ingestion, clinical dose appropriateness)")
    L.append("")
    L.append("## B. Alignment with the WNY workbook (examples only)")
    L.append("")
    L.append(f"Source: de-identified fixture of the WNY September 2026 chart review "
             f"(n={n_charts} charts). The fixture carries the workbook reviewer's Met/Not-Met "
             f"per specialty indicator but **omits the structured chart content**, so the engine "
             f"is **not** re-run against these charts. The table reports real-world prevalence and "
             f"confirms each automated indicator maps to a defined evaluator + versioned protocol.")
    L.append("")
    L.append("| # | Category | Auto | Scored (n) | Met | Not Met | NA | Protocol (versioned) |")
    L.append("|---|---|---|---|---|---|---|---|")
    for (num, cat, auto, tot, met, nm, na, pv) in wb_rows:
        L.append(f"| {num} | {cat} | {auto} | {tot} | {met} | {nm} | {na} | {pv} |")
    L.append("")
    L.append("**Small-count caveat.** Albuterol appears on only ~2 charts and several specialty "
             "cells are single-digit. These counts characterize prevalence and confirm indicator "
             "definitions; they are **not** sufficient to claim statistical accuracy, and nothing "
             "here is used to train or tune the engine.")
    L.append("")
    L.append("## C. Known clinical ambiguities (deliberately routed to humans)")
    L.append("")
    for line in [
        "Decision-making capacity when AMS or possible ingestion is present (#77) — never auto-judged.",
        "Medication dose appropriateness vs protocol (#68) — clinical confirmation required.",
        "Possible abuse / mandatory-reporting — always high-priority HUMAN REVIEW REQUIRED, never auto-scored.",
        "Severity of a clinical-safety refusal gap — proposed (Major/Critical) but flagged require_human.",
        "Albuterol 'given but response not documented' vs 'response poor' — engine detects the "
        "documentation gap (#74); clinical interpretation is the reviewer's.",
    ]:
        L.append(f"- {line}")
    L.append("")
    L.append("## D. Method / integrity statement")
    L.append("")
    for line in [
        "AI/engine proposes indicator verdicts and severities; it does **not** compute the QA score "
        "(scoring stays deterministic — 60/60 workbook parity unchanged).",
        "Automated proposals are stored separately from human decisions and are never overwritten.",
        "Protocol requirements come from the versioned store (`protocol_rules.json`), not from prompts.",
        "The workbook is used for examples/definition alignment only — never for training or tuning.",
    ]:
        L.append(f"- {line}")
    L.append("")
    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size} bytes)")
    print(f"synthetic: appl {agg['appl_agree']}/{agg['appl_total']}, "
          f"ind {agg['ind_agree']}/{agg['ind_total']}, fp {agg['fp']}, fn {agg['fn']}, human {agg['human']}")


if __name__ == "__main__":
    main()
