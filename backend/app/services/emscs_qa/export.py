"""EMSCS-compatible Excel export.

Builds a workbook matching the source structure: 12 sheets, Chart Log score VALUES
(from the deterministic engine) with the Dashboard aggregates reproduced as live
formulas, the Scoring Rubric / Indicator Library / References / Lists from the
non-PHI seed, and the Result/Severity dropdowns reproduced as data validations.

`build_workbook(bundle)` is pure (no DB) so it can be driven from the de-identified
fixture in tests. `gather_bundle_from_db` builds the same bundle from persisted,
agency-scoped review data for the live export. Raw source PHI is never embedded.
"""
from __future__ import annotations
from typing import Optional

import openpyxl
from openpyxl.worksheet.datavalidation import DataValidation

from . import seed

SHEET_ORDER = ["Dashboard", "Instructions", "Chart Log", "Indicator Review", "Findings",
               "Crew Feedback", "Provider Summary", "Agency Trends", "Scoring Rubric",
               "Indicator Library", "References", "Lists"]

CHART_LOG_HEADERS = ["Review ID", "PRID", "Incident #", "Date of Service", "Unit",
                     "Primary Caregiver", "Crew 2", "ALS Unit", "Dispatched As", "Chief Complaint",
                     "Primary Impression", "Protocol(s) Applied", "Age", "Sex", "Disposition",
                     "Final Acuity (as charted)", "Reviewer", "Review Date"]  # then 8 domains + outputs


def _domain_names():
    return [d["name"] for d in sorted(seed.domains(), key=lambda d: d["order"])]


def build_workbook(bundle: dict) -> openpyxl.Workbook:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    cfg = seed.scoring_config()
    sd = seed.load_seed()
    charts = bundle.get("charts", [])

    # ── Chart Log ──
    ws = wb.create_sheet("Chart Log")
    ws["A1"] = "Chart Log"
    weights = [d["weight"] for d in sorted(seed.domains(), key=lambda d: d["order"])]
    for i, w in enumerate(weights):
        ws.cell(row=3, column=19 + i, value=w)       # S3:Z3 weights
    headers = CHART_LOG_HEADERS + _domain_names() + \
        ["Quality Score", "Indicator Compliance", "Composite", "Rank", "Tier",
         "Major / Critical Findings", "Commendations", "Feedback Status", "Reviewer Summary"]
    for c, h in enumerate(headers, start=1):
        ws.cell(row=4, column=c, value=h)
    for ri, ch in enumerate(charts, start=5):
        ws.cell(row=ri, column=1, value=ch["review_id"])
        ws.cell(row=ri, column=2, value=ch.get("provider"))
        for i, s in enumerate(ch.get("domain_scores") or []):
            ws.cell(row=ri, column=19 + i, value=s)
        ws.cell(row=ri, column=27, value=ch.get("quality_score"))
        ws.cell(row=ri, column=28, value=ch.get("indicator_compliance"))
        ws.cell(row=ri, column=29, value=ch.get("composite"))
        ws.cell(row=ri, column=31, value=ch.get("tier"))
        ws.cell(row=ri, column=32, value=ch.get("major_critical"))
        ws.cell(row=ri, column=33, value=ch.get("commendation"))
    n = len(charts)

    # ── Indicator Review ──
    wi = wb.create_sheet("Indicator Review")
    wi["A1"] = "Indicator Review"
    for c, h in enumerate(["Review ID", "PRID", "Indicator #", "Category", "Indicator",
                           "Result (Y/N/NA)", "Status", "QA Flag / Reviewer Note"], start=1):
        wi.cell(row=4, column=c, value=h)
    r = 5
    for ch in charts:
        for ind in ch.get("indicators", []):
            wi.cell(row=r, column=1, value=ch["review_id"])
            wi.cell(row=r, column=2, value=ch.get("provider"))
            wi.cell(row=r, column=3, value=ind.get("num"))
            wi.cell(row=r, column=4, value=ind.get("category"))
            wi.cell(row=r, column=5, value=ind.get("indicator"))
            wi.cell(row=r, column=6, value=ind.get("result"))
            wi.cell(row=r, column=7, value=ind.get("status"))
            wi.cell(row=r, column=8, value=ind.get("note"))
            r += 1
    ind_rows = r - 5
    dv_result = DataValidation(type="list", formula1='"Y,N,NA"', allow_blank=True)
    wi.add_data_validation(dv_result)
    dv_result.add(f"F5:F{max(r, 5)}")

    # ── Findings ──
    wf = wb.create_sheet("Findings")
    wf["A1"] = "Findings and Crew Feedback"
    for c, h in enumerate(["Review ID", "PRID", "Primary Caregiver", "Crew 2", "Domain",
                           "Severity", "Finding", "Recommendation / Education Point", "Reference"], start=1):
        wf.cell(row=4, column=c, value=h)
    r = 5
    for ch in charts:
        for fnd in ch.get("findings", []):
            wf.cell(row=r, column=1, value=ch["review_id"])
            wf.cell(row=r, column=2, value=ch.get("provider"))
            wf.cell(row=r, column=5, value=fnd.get("domain"))
            wf.cell(row=r, column=6, value=fnd.get("severity"))
            wf.cell(row=r, column=7, value=fnd.get("description"))
            wf.cell(row=r, column=8, value=fnd.get("recommendation"))
            wf.cell(row=r, column=9, value=fnd.get("reference"))
            r += 1
    find_rows = r - 5
    sev_values = ",".join(sd["lists"].get("Severity", ["Critical", "Major", "Minor", "Commendation"]))
    dv_sev = DataValidation(type="list", formula1=f'"{sev_values}"', allow_blank=True)
    wf.add_data_validation(dv_sev)
    dv_sev.add(f"F5:F{max(r, 5)}")

    # ── Crew Feedback ──
    wc = wb.create_sheet("Crew Feedback")
    wc["A1"] = "Crew Feedback"
    for c, h in enumerate(["PRID", "Provider", "Charts", "Major/Critical", "Commendations",
                           "Feedback Status", "Summary"], start=1):
        wc.cell(row=4, column=c, value=h)
    for ri, cf in enumerate(bundle.get("crew_feedback", []), start=5):
        for c, key in enumerate(["provider", "name", "charts", "major_critical", "commendations",
                                 "status", "summary"], start=1):
            wc.cell(row=ri, column=c, value=cf.get(key))

    # ── Provider Summary ──
    wps = wb.create_sheet("Provider Summary")
    wps["A1"] = "Provider Summary"
    for c, h in enumerate(["PRID", "Charts", "Avg Composite", "Major/Critical", "Commendations"], start=1):
        wps.cell(row=4, column=c, value=h)
    for ri, ps in enumerate(bundle.get("provider_summary", []), start=5):
        for c, key in enumerate(["provider", "charts", "avg_composite", "major_critical", "commendations"], start=1):
            wps.cell(row=ri, column=c, value=ps.get(key))

    # ── Agency Trends ──
    wat = wb.create_sheet("Agency Trends")
    wat["A1"] = "Agency Trends"
    wat["A4"] = "Metric"
    wat["B4"] = "Value"
    agg = bundle.get("aggregates", {})
    for ri, (k, v) in enumerate(agg.items(), start=5):
        wat.cell(row=ri, column=1, value=k)
        wat.cell(row=ri, column=2, value=v)

    # ── Scoring Rubric (values from seed) ──
    wsr = wb.create_sheet("Scoring Rubric")
    wsr["A1"] = "Scoring Rubric"
    wsr["A4"] = "Domain Weights"
    wsr.append([]) if False else None
    wsr["A5"], wsr["B5"], wsr["C5"] = "#", "Domain", "Weight (points)"
    for i, d in enumerate(sorted(seed.domains(), key=lambda d: d["order"]), start=6):
        wsr.cell(row=i, column=1, value=d["order"])
        wsr.cell(row=i, column=2, value=d["name"])
        wsr.cell(row=i, column=3, value=d["weight"])
    wsr["B26"], wsr["C26"] = "Parameter", "Value"
    wsr["B27"], wsr["C27"] = "Quality Score weight", cfg["quality_weight"]
    wsr["B28"], wsr["C28"] = "Indicator Compliance weight", cfg["compliance_weight"]
    for i, t in enumerate([t for t in cfg["tiers"] if t["min"] is not None], start=29):
        wsr.cell(row=i, column=2, value=f"{t['name']} at or above")
        wsr.cell(row=i, column=3, value=t["min"])

    # ── Indicator Library (from seed) ──
    wl = wb.create_sheet("Indicator Library")
    wl["A1"] = "EMSCS CQI Indicator Library"
    for c, h in enumerate(["#", "Category", "Indicator", "Compliant Answer"], start=1):
        wl.cell(row=4, column=c, value=h)
    for ri, ind in enumerate(sd["indicators"], start=5):
        wl.cell(row=ri, column=1, value=ind["number"])
        wl.cell(row=ri, column=2, value=ind["category"])
        wl.cell(row=ri, column=3, value=ind["indicator"])
        wl.cell(row=ri, column=4, value=ind["compliant_answer"])

    # ── References (from seed) ──
    wref = wb.create_sheet("References")
    wref["A1"] = "References"
    for c, h in enumerate(["Source", "Section", "Used For"], start=1):
        wref.cell(row=4, column=c, value=h)
    for ri, ref in enumerate(sd.get("references", []), start=5):
        wref.cell(row=ri, column=1, value=ref["source"])
        wref.cell(row=ri, column=2, value=ref["section"])
        wref.cell(row=ri, column=3, value=ref["used_for"])

    # ── Lists (dropdown sources from seed) ──
    wlst = wb.create_sheet("Lists")
    listcols = list(sd.get("lists", {}).items())
    for c, (name, _vals) in enumerate(listcols, start=1):
        wlst.cell(row=1, column=c, value=name)
    for c, (_name, vals) in enumerate(listcols, start=1):
        for ri, v in enumerate(vals, start=2):
            wlst.cell(row=ri, column=c, value=v)

    # ── Instructions ──
    wins = wb.create_sheet("Instructions")
    wins["A1"] = "How to Use This Workbook"
    wins["A2"] = ("Generated by the Mullen Analytics EMSCS QA module from application data. "
                  "Chart Log holds per-chart scores; the Dashboard aggregates recalculate on open.")

    # ── Dashboard (aggregates as live formulas referencing the sheets) ──
    wd = wb.create_sheet("Dashboard")
    wd["A1"] = bundle.get("agency_name", "EMS Chart Quality Review")
    wd["A4"], wd["B4"] = "Review Summary", ""
    last = 4 + n
    wd["A5"], wd["B5"] = "Charts reviewed", f"=COUNTA('Chart Log'!A5:A{last})"
    wd["A6"], wd["B6"] = "Average Quality Score", f"=IFERROR(AVERAGE('Chart Log'!AA5:AA{last}),\"\")"
    wd["A7"], wd["B7"] = "Average Indicator Compliance", f"=IFERROR(AVERAGE('Chart Log'!AB5:AB{last}),\"\")"
    wd["A8"], wd["B8"] = "Average Composite Score", f"=IFERROR(AVERAGE('Chart Log'!AC5:AC{last}),\"\")"
    wd["D4"] = "Tier Distribution"
    for i, t in enumerate([t["name"] for t in cfg["tiers"]], start=5):
        wd.cell(row=i, column=4, value=t)
        wd.cell(row=i, column=5, value=f"=COUNTIF('Chart Log'!AE5:AE{last},D{i})")
    wd["D10"] = "Findings by Severity"
    find_last = 4 + max(find_rows, 1)
    for i, sev in enumerate(["Critical", "Major", "Minor", "Commendation"], start=11):
        wd.cell(row=i, column=4, value=sev)
        wd.cell(row=i, column=5, value=f"=COUNTIF(Findings!F5:F{find_last},D{i})")

    # order the sheets
    wb._sheets.sort(key=lambda s: SHEET_ORDER.index(s.title) if s.title in SHEET_ORDER else 99)
    wb._metadata = {"chart_rows": n, "indicator_rows": ind_rows, "finding_rows": find_rows}
    return wb


def bundle_from_fixture(fixture: dict) -> dict:
    """Build an export bundle from the de-identified parity fixture (no PHI)."""
    lib = {int(k): v for k, v in fixture["indicator_library"].items()}
    sev_by_domain = {}  # fixture has no finding domain/text; synthesize minimal non-PHI rows
    charts = []
    agg = {"Critical": 0, "Major": 0, "Minor": 0, "Commendation": 0}
    for ch in fixture["charts"]:
        exp = ch["expected"]
        findings = []
        for sev in ch.get("finding_severities", []):
            findings.append({"domain": "", "severity": sev, "description": "", "recommendation": "", "reference": ""})
            if sev in agg:
                agg[sev] += 1
        inds = [{"num": i["num"], "category": lib.get(i["num"], {}).get("category"),
                 "indicator": "", "result": i.get("result"), "status": i.get("status_cached"), "note": ""}
                for i in ch.get("indicators", [])]
        charts.append({
            "review_id": ch["review_id"], "provider": ch.get("provider"),
            "domain_scores": ch.get("domain_scores"),
            "quality_score": _num(exp.get("quality_score")), "indicator_compliance": _num(exp.get("indicator_compliance")),
            "composite": _num(exp.get("composite")), "tier": exp.get("tier"),
            "major_critical": _num(exp.get("major_critical")), "commendation": _num(exp.get("commendation")),
            "indicators": inds, "findings": findings,
        })
    return {"agency_name": "EMSCS QA Export (synthetic/de-identified)", "charts": charts, "aggregates": agg}


def _num(v):
    return None if v in (None, "") else float(v)
