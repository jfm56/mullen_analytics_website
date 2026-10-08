"""EMSCS Excel export tests: validate the generated workbook's structure, values,
counts, formulas and dropdowns; and compare against the SOURCE workbook structure
(skipped where the source file is absent, e.g. CI). No source PHI is embedded."""
import json
import os
from pathlib import Path

import openpyxl
import pytest

from app.services.emscs_qa import export, seed

FIXTURE = Path(__file__).parent / "fixtures" / "emscs_wny_fixtures.json"
SOURCE = Path(os.path.expanduser(r"~/Downloads/EMSCS - WNY Chart Review September 2026.xlsx"))
EXPECTED_SHEETS = ["Dashboard", "Instructions", "Chart Log", "Indicator Review", "Findings",
                   "Crew Feedback", "Provider Summary", "Agency Trends", "Scoring Rubric",
                   "Indicator Library", "References", "Lists"]


def _fixture():
    with open(FIXTURE, encoding="utf-8") as f:
        return json.load(f)


def _built():
    return export.build_workbook(export.bundle_from_fixture(_fixture()))


def _col_a_rows(ws, start=5):
    n = 0
    for r in range(start, ws.max_row + 1):
        if ws.cell(row=r, column=1).value not in (None, ""):
            n += 1
    return n


def test_all_12_sheets_in_order():
    wb = _built()
    assert wb.sheetnames == EXPECTED_SHEETS


def test_chart_log_rows_scores_and_tier():
    fx = _fixture()
    wb = _built()
    ws = wb["Chart Log"]
    assert _col_a_rows(ws) == len(fx["charts"]) == 60
    # spot-check first chart's scores/tier match the fixture expected (= workbook)
    ch0 = fx["charts"][0]
    assert ws.cell(row=5, column=1).value == ch0["review_id"]
    assert ws.cell(row=5, column=27).value == float(ch0["expected"]["quality_score"])
    assert ws.cell(row=5, column=31).value == ch0["expected"]["tier"]


def test_indicator_review_and_findings_row_counts():
    fx = _fixture()
    wb = _built()
    exp_ind = sum(len(c["indicators"]) for c in fx["charts"])
    exp_find = sum(len(c["finding_severities"]) for c in fx["charts"])
    assert _col_a_rows(wb["Indicator Review"]) == exp_ind
    assert _col_a_rows(wb["Findings"]) == exp_find == 252


def test_finding_severity_totals_match_dashboard():
    wb = _built()
    wf = wb["Findings"]
    totals = {"Critical": 0, "Major": 0, "Minor": 0, "Commendation": 0}
    for r in range(5, wf.max_row + 1):
        v = wf.cell(row=r, column=6).value
        if v in totals:
            totals[v] += 1
    assert totals == {"Critical": 9, "Major": 102, "Minor": 99, "Commendation": 42}


def test_indicator_library_84_and_rubric_values():
    wb = _built()
    wl = wb["Indicator Library"]
    assert _col_a_rows(wl) == 84
    wsr = wb["Scoring Rubric"]
    assert wsr["C27"].value == 0.7 and wsr["C28"].value == 0.3 and wsr["C29"].value == 90.0


def test_dashboard_uses_formulas():
    wb = _built()
    wd = wb["Dashboard"]
    assert str(wd["B5"].value).startswith("=COUNTA")
    assert str(wd["B8"].value).startswith("=IFERROR(AVERAGE")
    assert str(wd["E11"].value).startswith("=COUNTIF")   # Critical count formula


def test_dropdown_validations_present():
    wb = _built()
    wi = wb["Indicator Review"]
    wf = wb["Findings"]
    assert any("Y,N,NA" in str(dv.formula1) for dv in wi.data_validations.dataValidation)
    assert any("Critical" in str(dv.formula1) for dv in wf.data_validations.dataValidation)


@pytest.mark.skipif(not SOURCE.exists(), reason="source workbook not present (expected in CI)")
def test_generated_matches_source_structure():
    src = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    wb = _built()
    # same sheet names
    assert set(wb.sheetnames) == set(src.sheetnames)
    # same indicator library size
    assert _col_a_rows(wb["Indicator Library"]) == sum(
        1 for r in range(5, src["Indicator Library"].max_row + 1)
        if src["Indicator Library"].cell(row=r, column=1).value is not None)
    # same Lists severity config
    gen_sev = seed.load_seed()["lists"]["Severity"]
    assert gen_sev == ["Critical", "Major", "Minor", "Commendation"]
    src.close()
