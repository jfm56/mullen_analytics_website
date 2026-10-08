"""Pure parser contract tests for XML and normalized CSV ingest payloads."""

from app.services.emscharts.nemsis import parse_csv_records, validate


def test_csv_parser_returns_normalized_operational_record():
    payload = (
        "eRecord.01,eResponse.03,eTimes.03,eTimes.05,eTimes.06,eResponse.05,eUnit.02\n"
        "PCR-1,R-1,2026-01-01T10:00:00Z,2026-01-01T10:02:00Z,"
        "2026-01-01T10:10:00Z,911,Medic 1\n"
    ).encode()

    records = parse_csv_records(payload)

    assert len(records) == 1
    assert records[0]["source_record_id"] == "PCR-1"
    assert records[0]["call_type"] == "emergency"
    assert records[0]["unit_id"] == "Medic 1"
    assert validate(records[0]) is True


def test_csv_parser_marks_rows_without_dedup_key_as_rejected():
    payload = (
        "eResponse.03,eTimes.03,eTimes.05,eTimes.06\n"
        "R-1,2026-01-01T10:00:00Z,2026-01-01T10:02:00Z,2026-01-01T10:10:00Z\n"
    ).encode()

    records = parse_csv_records(payload)

    assert records == [{"_error": "missing eRecord.01/source_record_id (no dedup key)"}]


def test_csv_parser_marks_rows_with_extra_fields_as_rejected():
    payload = (
        "eRecord.01,eTimes.03,eTimes.05,eTimes.06\n"
        "PCR-1,2026-01-01T10:00:00Z,2026-01-01T10:02:00Z,"
        "2026-01-01T10:10:00Z,unexpected\n"
    ).encode()

    assert parse_csv_records(payload) == [{"_error": "malformed CSV row (extra fields)"}]
