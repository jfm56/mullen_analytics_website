"""
Unit tests for Phase 2 pipeline modules:
  - columns resolver
  - validator
  - call_volume
  - response_times
  - report generator
"""
import csv
import json
import os
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from app.services.pipeline.columns import normalize_cols, resolve, resolve_many
from app.services.pipeline import (
    validator, call_volume, response_times,
    staffing, unit_performance, municipality, forecasting, report,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_csv(rows: list[dict], path: str) -> None:
    if not rows:
        return
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def _sample_dispatch_rows(n: int = 20) -> list[dict]:
    """Generate deterministic dispatch rows spanning Jan–Apr 2024."""
    rows = []
    for i in range(n):
        month  = (i % 4) + 1
        day    = (i % 28) + 1
        hour   = i % 24
        prio   = ["P1", "P2", "P3"][i % 3]
        itype  = ["Cardiac Arrest", "MVA", "Fall", "Chest Pain", "Breathing"][i % 5]
        unit   = f"MED-{(i % 3) + 1}"
        # call_date, dispatch ~2 min later, en_route ~3 min, on_scene ~8 min
        base   = f"2024-{month:02d}-{day:02d} {hour:02d}:00:00"
        dsp    = f"2024-{month:02d}-{day:02d} {hour:02d}:02:00"
        enr    = f"2024-{month:02d}-{day:02d} {hour:02d}:03:00"
        ons    = f"2024-{month:02d}-{day:02d} {hour:02d}:08:00"
        clr    = f"2024-{month:02d}-{day:02d} {hour:02d}:28:00"
        rows.append({
            "incident_number": f"INC-{i+1:04d}",
            "call_date":        base,
            "dispatch_time":    dsp,
            "en_route_time":    enr,
            "on_scene_time":    ons,
            "clear_time":       clr,
            "incident_type":    itype,
            "priority":         prio,
            "unit_id":          unit,
            "address":          f"{100 + i} Main St",
        })
    return rows


# ---------------------------------------------------------------------------
# columns module
# ---------------------------------------------------------------------------

class TestColumns:
    def test_normalize_cols_lowercase(self):
        df = pd.DataFrame(columns=["Incident Number", "Call Date", "Unit ID"])
        out = normalize_cols(df)
        assert list(out.columns) == ["incident_number", "call_date", "unit_id"]

    def test_normalize_cols_spaces_to_underscores(self):
        df = pd.DataFrame(columns=["Call Date Time"])
        out = normalize_cols(df)
        assert out.columns[0] == "call_date_time"

    def test_resolve_exact_match(self):
        df = pd.DataFrame(columns=["incident_number", "call_date"])
        assert resolve(df, "incident_number") == "incident_number"

    def test_resolve_alias(self):
        df = pd.DataFrame(columns=["alarm_date", "unit"])
        assert resolve(df, "call_date") == "alarm_date"
        assert resolve(df, "unit_id") == "unit"

    def test_resolve_missing_returns_none(self):
        df = pd.DataFrame(columns=["foo", "bar"])
        assert resolve(df, "incident_number") is None

    def test_resolve_many(self):
        df = pd.DataFrame(columns=["incident_number", "call_date", "unit_id"])
        result = resolve_many(df, ["incident_number", "call_date", "unit_id"])
        assert all(v is not None for v in result.values())


# ---------------------------------------------------------------------------
# validator module
# ---------------------------------------------------------------------------

class TestValidator:
    def test_valid_dispatch_file(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(), path)
        record = {"id": "abc", "original_filename": "dispatch.csv", "file_type": "dispatch", "upload_path": path}
        result = validator.validate_file(record)
        assert result["passed"] is True
        assert result["rows"] == 20
        assert result["missing_required"] == []

    def test_missing_required_column(self, tmp_path):
        path = str(tmp_path / "bad.csv")
        rows = [{"foo": 1, "bar": 2}]
        _write_csv(rows, path)
        record = {"id": "xyz", "original_filename": "bad.csv", "file_type": "dispatch", "upload_path": path}
        result = validator.validate_file(record)
        assert result["passed"] is False
        assert len(result["missing_required"]) > 0

    def test_empty_file(self, tmp_path):
        path = str(tmp_path / "empty.csv")
        _write_csv([{"incident_number": "x", "call_date": "y"}], path)
        # Re-write as header-only
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("incident_number,call_date,incident_type,unit_id\n")
        record = {"id": "e", "original_filename": "empty.csv", "file_type": "dispatch", "upload_path": path}
        result = validator.validate_file(record)
        assert result["rows"] == 0
        assert result["passed"] is False

    def test_run_writes_json(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(), path)
        files = [{"id": "1", "original_filename": "dispatch.csv", "file_type": "dispatch", "upload_path": path}]
        summary = validator.run(files, str(tmp_path / "out"))
        assert (tmp_path / "out" / "validation_report.json").exists()
        assert summary["files_validated"] == 1
        assert summary["files_passed"] == 1


# ---------------------------------------------------------------------------
# call_volume module
# ---------------------------------------------------------------------------

class TestCallVolume:
    def test_total_calls(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        rows = _sample_dispatch_rows(20)
        _write_csv(rows, path)
        files = [{"upload_path": path, "file_type": "dispatch"}]
        summary = call_volume.run(files, str(tmp_path / "out"))
        assert summary["total_calls"] == 20

    def test_by_incident_type(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        files = [{"upload_path": path}]
        summary = call_volume.run(files, str(tmp_path / "out"))
        assert len(summary.get("by_incident_type", {})) > 0

    def test_by_unit(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        files = [{"upload_path": path}]
        summary = call_volume.run(files, str(tmp_path / "out"))
        assert "MED-1" in summary.get("by_unit", {})

    def test_date_range(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        files = [{"upload_path": path}]
        summary = call_volume.run(files, str(tmp_path / "out"))
        assert summary["date_range"]["start"] is not None
        assert summary["date_range"]["end"]   is not None

    def test_output_json_written(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(5), path)
        call_volume.run([{"upload_path": path}], str(tmp_path / "out"))
        assert (tmp_path / "out" / "call_volume_summary.json").exists()

    def test_no_files_returns_error(self, tmp_path):
        summary = call_volume.run([], str(tmp_path / "out"))
        assert "error" in summary

    def test_by_month_keys(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        summary = call_volume.run([{"upload_path": path}], str(tmp_path / "out"))
        assert len(summary.get("by_month", {})) >= 4  # Jan–Apr


# ---------------------------------------------------------------------------
# response_times module
# ---------------------------------------------------------------------------

class TestResponseTimes:
    def test_total_response_stats(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        files = [{"upload_path": path}]
        summary = response_times.run(files, str(tmp_path / "out"))
        tr = summary.get("total_response", {})
        assert tr.get("count") == 20
        # call_date 00:00, on_scene 00:08 → 480s total response
        assert tr.get("median") == pytest.approx(480.0, abs=1.0)

    def test_call_processing_time(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        summary = response_times.run([{"upload_path": path}], str(tmp_path / "out"))
        cp = summary.get("call_processing", {})
        # dispatch is 2 min after call_date → 120s
        assert cp.get("median") == pytest.approx(120.0, abs=1.0)

    def test_turnout_time(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        summary = response_times.run([{"upload_path": path}], str(tmp_path / "out"))
        to = summary.get("turnout", {})
        # en_route is 1 min after dispatch → 60s
        assert to.get("median") == pytest.approx(60.0, abs=1.0)

    def test_nfpa_computed(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        summary = response_times.run([{"upload_path": path}], str(tmp_path / "out"))
        nfpa = summary.get("nfpa_1710", {})
        assert nfpa.get("pct_within_target") is not None
        # 480s > 360s, so 0% within target → non-compliant
        assert nfpa.get("compliant") is False

    def test_output_json_written(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(5), path)
        response_times.run([{"upload_path": path}], str(tmp_path / "out"))
        assert (tmp_path / "out" / "response_times_summary.json").exists()

    def test_by_priority(self, tmp_path):
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        summary = response_times.run([{"upload_path": path}], str(tmp_path / "out"))
        assert len(summary.get("by_priority", {})) > 0


# ---------------------------------------------------------------------------
# staffing module
# ---------------------------------------------------------------------------

class TestStaffing:
    def _staffing_rows(self, n: int = 30) -> list:
        rows = []
        for i in range(n):
            rows.append({
                "employee_id": f"EMP-{i % 10 + 1:03d}",
                "name":        f"Staff {i % 10 + 1}",
                "shift":       ["Day", "Night", "Evening"][i % 3],
                "position":    ["Paramedic", "EMT", "Lieutenant"][i % 3],
                "date":        f"2024-{(i % 4) + 1:02d}-{(i % 28) + 1:02d}",
                "hours":       12 if i % 5 != 0 else 16,  # every 5th is OT
            })
        return rows

    def test_unique_employees(self, tmp_path):
        path = str(tmp_path / "staffing.csv")
        _write_csv(self._staffing_rows(30), path)
        files = [{"upload_path": path}]
        summary = staffing.run(files, str(tmp_path / "out"))
        assert summary["unique_employees"] == 10

    def test_by_shift(self, tmp_path):
        path = str(tmp_path / "staffing.csv")
        _write_csv(self._staffing_rows(30), path)
        summary = staffing.run([{"upload_path": path}], str(tmp_path / "out"))
        assert "Day" in summary["by_shift"]
        assert "Night" in summary["by_shift"]

    def test_by_position(self, tmp_path):
        path = str(tmp_path / "staffing.csv")
        _write_csv(self._staffing_rows(30), path)
        summary = staffing.run([{"upload_path": path}], str(tmp_path / "out"))
        assert "Paramedic" in summary["by_position"]

    def test_overtime_detected(self, tmp_path):
        path = str(tmp_path / "staffing.csv")
        _write_csv(self._staffing_rows(30), path)
        summary = staffing.run([{"upload_path": path}], str(tmp_path / "out"))
        # 6 out of 30 rows have 16h hours (i % 5 == 0)
        assert summary["overtime_records"] == 6
        assert summary["overtime_pct"] == pytest.approx(20.0, abs=0.1)

    def test_output_json_written(self, tmp_path):
        path = str(tmp_path / "staffing.csv")
        _write_csv(self._staffing_rows(10), path)
        staffing.run([{"upload_path": path}], str(tmp_path / "out"))
        assert (tmp_path / "out" / "staffing_summary.json").exists()

    def test_no_files_returns_error(self, tmp_path):
        summary = staffing.run([], str(tmp_path / "out"))
        assert "error" in summary


# ---------------------------------------------------------------------------
# unit_performance module
# ---------------------------------------------------------------------------

class TestUnitPerformance:
    def test_units_detected(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        result = unit_performance.run([{"upload_path": path}], str(tmp_path / "out"))
        assert result["total_units"] == 3  # MED-1, MED-2, MED-3

    def test_per_unit_call_count(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        result = unit_performance.run([{"upload_path": path}], str(tmp_path / "out"))
        totals = sum(v["calls"] for v in result["units"].values())
        assert totals == 20

    def test_response_median_present(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        result = unit_performance.run([{"upload_path": path}], str(tmp_path / "out"))
        for stats in result["units"].values():
            assert "response_median" in stats

    def test_nfpa_compliance_per_unit(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        result = unit_performance.run([{"upload_path": path}], str(tmp_path / "out"))
        for stats in result["units"].values():
            assert "nfpa_compliance_pct" in stats
            assert 0.0 <= stats["nfpa_compliance_pct"] <= 100.0

    def test_flagged_units_present(self, tmp_path):
        path = str(tmp_path / "d.csv")
        # 480s total response > 360s → all units should be flagged
        _write_csv(_sample_dispatch_rows(20), path)
        result = unit_performance.run([{"upload_path": path}], str(tmp_path / "out"))
        assert isinstance(result["flagged_units"], list)
        assert len(result["flagged_units"]) == 3  # all 3 units fail

    def test_utilisation_hours(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_dispatch_rows(20), path)
        result = unit_performance.run([{"upload_path": path}], str(tmp_path / "out"))
        for stats in result["units"].values():
            assert stats.get("utilisation_hours", 0) >= 0

    def test_output_json_written(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_dispatch_rows(5), path)
        unit_performance.run([{"upload_path": path}], str(tmp_path / "out"))
        assert (tmp_path / "out" / "unit_performance_summary.json").exists()

    def test_no_files_returns_error(self, tmp_path):
        result = unit_performance.run([], str(tmp_path / "out"))
        assert "error" in result


# ---------------------------------------------------------------------------
# municipality module
# ---------------------------------------------------------------------------

def _sample_muni_rows(n: int = 30) -> list:
    """Dispatch rows with municipality column across 3 areas."""
    rows = _sample_dispatch_rows(n)
    munis = ["Northville", "Southgate", "Eastport"]
    for i, row in enumerate(rows):
        row["municipality"] = munis[i % 3]
        # Make Eastport have very slow responses: override on_scene_time to +12 min
        if row["municipality"] == "Eastport":
            base_dt = row["call_date"][:16]  # "2024-MM-DD HH:MM"
            hour    = int(base_dt[11:13])
            row["on_scene_time"] = f"{base_dt[:11]}{(hour):02d}:20:00"
    return rows

class TestMunicipality:
    def test_municipalities_detected(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_muni_rows(30), path)
        result = municipality.run([{"upload_path": path}], str(tmp_path / "out"))
        assert result["total_municipalities"] == 3

    def test_call_counts_sum(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_muni_rows(30), path)
        result = municipality.run([{"upload_path": path}], str(tmp_path / "out"))
        total = sum(v["calls"] for v in result["municipalities"].values())
        assert total == 30

    def test_response_stats_per_muni(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_muni_rows(30), path)
        result = municipality.run([{"upload_path": path}], str(tmp_path / "out"))
        for stats in result["municipalities"].values():
            assert "response_median" in stats
            assert "nfpa_compliance_pct" in stats

    def test_flagged_slow_municipality(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_muni_rows(30), path)
        result = municipality.run([{"upload_path": path}], str(tmp_path / "out"))
        # Eastport has 20-min response → should be flagged
        assert "Eastport" in result["flagged_municipalities"]

    def test_highest_volume_list(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_muni_rows(30), path)
        result = municipality.run([{"upload_path": path}], str(tmp_path / "out"))
        assert len(result["highest_volume"]) >= 1

    def test_output_json_written(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_muni_rows(10), path)
        municipality.run([{"upload_path": path}], str(tmp_path / "out"))
        assert (tmp_path / "out" / "municipality_summary.json").exists()

    def test_no_files_returns_error(self, tmp_path):
        result = municipality.run([], str(tmp_path / "out"))
        assert "error" in result

    def test_no_municipality_column_returns_error(self, tmp_path):
        path = str(tmp_path / "d.csv")
        _write_csv(_sample_dispatch_rows(5), path)  # no municipality col
        result = municipality.run([{"upload_path": path}], str(tmp_path / "out"))
        assert "error" in result


# ---------------------------------------------------------------------------
# forecasting module
# ---------------------------------------------------------------------------

class TestForecasting:
    def _large_dispatch(self, tmp_path, n: int = 60) -> str:
        """Generate dispatch rows across 5 months for meaningful trend fitting."""
        path = str(tmp_path / "dispatch_fc.csv")
        rows = []
        for i in range(n):
            month = (i % 5) + 1
            day   = (i % 28) + 1
            hour  = i % 24
            rows.append({
                "incident_number": f"INC-{i:04d}",
                "call_date":       f"2024-{month:02d}-{day:02d} {hour:02d}:00:00",
                "dispatch_time":   f"2024-{month:02d}-{day:02d} {hour:02d}:02:00",
                "en_route_time":   f"2024-{month:02d}-{day:02d} {hour:02d}:03:00",
                "on_scene_time":   f"2024-{month:02d}-{day:02d} {hour:02d}:08:00",
                "clear_time":      f"2024-{month:02d}-{day:02d} {hour:02d}:28:00",
                "incident_type":   "EMS",
                "priority":        "P1",
                "unit_id":         "MED-1",
            })
        _write_csv(rows, path)
        return path

    def test_forecast_produces_12_months(self, tmp_path):
        path = self._large_dispatch(tmp_path)
        summary = forecasting.run([{"upload_path": path}], str(tmp_path / "out"))
        fcast = summary["call_volume_forecast"]
        assert len(fcast["forecast_months"]) == 12
        assert len(fcast["forecast_values"]) == 12

    def test_forecast_values_non_negative(self, tmp_path):
        path = self._large_dispatch(tmp_path)
        summary = forecasting.run([{"upload_path": path}], str(tmp_path / "out"))
        fcast = summary["call_volume_forecast"]
        assert all(v >= 0 for v in fcast["forecast_values"])
        assert all(v >= 0 for v in fcast["forecast_lower"])

    def test_trend_direction_present(self, tmp_path):
        path = self._large_dispatch(tmp_path)
        summary = forecasting.run([{"upload_path": path}], str(tmp_path / "out"))
        fcast = summary["call_volume_forecast"]
        assert fcast["trend_direction"] in ("increasing", "decreasing", "stable")

    def test_historical_matches_input(self, tmp_path):
        path = self._large_dispatch(tmp_path, n=60)
        summary = forecasting.run([{"upload_path": path}], str(tmp_path / "out"))
        historical = summary["call_volume_forecast"]["historical"]
        assert sum(historical.values()) == 60

    def test_output_json_written(self, tmp_path):
        path = self._large_dispatch(tmp_path)
        forecasting.run([{"upload_path": path}], str(tmp_path / "out"))
        assert (tmp_path / "out" / "forecasting_summary.json").exists()

    def test_no_dispatch_files_returns_error(self, tmp_path):
        summary = forecasting.run([], str(tmp_path / "out"))
        assert "error" in summary["call_volume_forecast"]

    def test_attrition_low_risk_default(self, tmp_path):
        path = self._large_dispatch(tmp_path)
        summary = forecasting.run([{"upload_path": path}], str(tmp_path / "out"))
        assert summary["attrition_risk"]["risk_level"] in ("low", "medium", "high")

    def test_attrition_high_risk_with_signals(self, tmp_path):
        path = self._large_dispatch(tmp_path)
        high_ot_staffing = {
            "overtime_pct": 35.0,
            "staffing_gaps": ["2024-01-01"] * 15,
            "unique_employees": 8,
        }
        summary = forecasting.run(
            [{"upload_path": path}],
            str(tmp_path / "out"),
            staffing_summary=high_ot_staffing,
        )
        assert summary["attrition_risk"]["risk_level"] == "high"
        assert len(summary["attrition_risk"]["indicators"]) >= 2

    def test_insufficient_data_returns_error(self, tmp_path):
        # Only 1 month of data — below threshold of 3
        rows = [{"incident_number": "INC-1", "call_date": "2024-01-15 10:00:00",
                 "incident_type": "EMS", "priority": "P1", "unit_id": "MED-1"}]
        path = str(tmp_path / "tiny.csv")
        _write_csv(rows, path)
        summary = forecasting.run([{"upload_path": path}], str(tmp_path / "out"))
        assert "error" in summary["call_volume_forecast"]


# ---------------------------------------------------------------------------
# report module
# ---------------------------------------------------------------------------

class TestReport:
    def _make_modules(self, tmp_path) -> tuple:
        path = str(tmp_path / "dispatch.csv")
        _write_csv(_sample_dispatch_rows(10), path)
        files = [{"id": "1", "original_filename": "dispatch.csv", "file_type": "dispatch", "upload_path": path}]
        val_result = validator.run(files, str(tmp_path / "out"))
        cv_result  = call_volume.run(files, str(tmp_path / "out"))
        rt_result  = response_times.run(files, str(tmp_path / "out"))
        return val_result, cv_result, rt_result

    def test_report_written(self, tmp_path):
        val_r, cv_r, rt_r = self._make_modules(tmp_path)
        out = str(tmp_path / "report_out")
        report.build(
            agency_id="test-agency",
            agency_name="Test EMS",
            subscription_tier="essential",
            validation=val_r,
            call_volume=cv_r,
            response_times=rt_r,
            output_dir=out,
        )
        rpt_path = Path(out) / "executive_report.json"
        assert rpt_path.exists()
        with open(rpt_path, encoding="utf-8") as fh:
            data = json.load(fh)
        assert data["agency_id"] == "test-agency"
        assert data["schema_version"] == "1.0"

    def test_key_metrics_present(self, tmp_path):
        val_r, cv_r, rt_r = self._make_modules(tmp_path)
        result = report.build(
            agency_id="test-agency",
            agency_name="Test EMS",
            subscription_tier="essential",
            validation=val_r,
            call_volume=cv_r,
            response_times=rt_r,
            output_dir=str(tmp_path / "report_out"),
        )
        m = result["key_metrics"]
        assert m["total_calls"] == 10
        assert m["avg_total_response_fmt"] != "—"

    def test_highlights_generated(self, tmp_path):
        val_r, cv_r, rt_r = self._make_modules(tmp_path)
        result = report.build(
            agency_id="a", agency_name="EMS",
            subscription_tier="essential",
            validation=val_r, call_volume=cv_r, response_times=rt_r,
            output_dir=str(tmp_path / "report_out"),
        )
        assert len(result["highlights"]) > 0
