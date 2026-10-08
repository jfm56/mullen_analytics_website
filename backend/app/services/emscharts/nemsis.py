"""NEMSIS v3 parser — extracts OPERATIONAL fields only (no PHI) from an EMSDataSet.

Namespace-agnostic (matches by local element name), tolerant of version differences.
`parse_records` raises xml.etree.ElementTree.ParseError on malformed XML so the
pipeline can count the whole file as a validation failure.
"""
import csv
import hashlib
import io
import xml.etree.ElementTree as ET  # tostring only (serializing an already-parsed tree is safe)
from datetime import datetime

from defusedxml.ElementTree import fromstring as _safe_fromstring  # XXE / billion-laughs safe
from defusedxml.common import DefusedXmlException

# NEMSIS eTimes element -> normalized field (operational timestamps).
_TIME_MAP = {
    "eTimes.01": "psap_call_at",
    "eTimes.03": "unit_notified_at",
    "eTimes.05": "enroute_at",
    "eTimes.06": "arrived_scene_at",
    "eTimes.07": "arrived_patient_at",
    "eTimes.09": "left_scene_at",
    "eTimes.11": "arrived_dest_at",
    "eTimes.13": "back_in_service_at",
}

_DT_FORMATS = ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M")


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]  # strip "{namespace}"


def _dt(s):
    if not s:
        return None
    s = s.strip()
    # handle +00:00 offset by trimming to naive
    if len(s) >= 25 and (s[-6] in "+-"):
        s = s[:19]
    for fmt in _DT_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _f(s):
    try:
        return float(s) if s not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _call_type(raw: str) -> str:
    r = (raw or "").lower()
    if "interfacility" in r or "transfer" in r or "2205009" in r or "ift" in r:
        return "ift"
    if "emergency" in r or "911" in r or "2205001" in r or "2205003" in r:
        return "emergency"
    return "other"


def parse_records(xml_bytes):
    """Return a list of per-eRecord operational dicts. Each dict has a
    `source_record_id` (NEMSIS eRecord.01) or an `_error` marker if that id is
    missing. Raises ParseError on malformed OR unsafe (XXE/entity-expansion) XML."""
    try:
        root = _safe_fromstring(xml_bytes)
    except DefusedXmlException as exc:  # blocked attack -> treat as a parse/validation failure
        raise ET.ParseError(f"blocked unsafe XML: {type(exc).__name__}") from exc
    out = []
    for rec in root.iter():
        if _local(rec.tag) != "eRecord":
            continue
        texts = {}
        for el in rec.iter():
            if el.text and el.text.strip():
                texts.setdefault(_local(el.tag), el.text.strip())
        rid = texts.get("eRecord.01")
        if not rid:
            out.append({"_error": "missing eRecord.01 (no dedup key)"})
            continue
        row = {
            "source_record_id": rid,
            "response_number": texts.get("eResponse.03"),
            # Incident/CAD grouping element is export-specific (confirm per agency);
            # we check candidate tags. Null => treated as its own single-unit incident.
            "incident_number": texts.get("eCad.01") or texts.get("eResponse.04"),
            "unit_id": texts.get("eUnit.02") or texts.get("eResponse.14") or texts.get("eResponse.13"),
            "disposition": texts.get("eDisposition.12") or texts.get("eDisposition.01"),
            "call_type": _call_type(texts.get("eResponse.05") or texts.get("eResponse.23") or ""),
            "scene_lat": _f(texts.get("eScene.17")),
            "scene_lng": _f(texts.get("eScene.18")),
        }
        for nem, field in _TIME_MAP.items():
            row[field] = _dt(texts.get(nem))
        row["content_hash"] = hashlib.sha256(ET.tostring(rec)).hexdigest()
        out.append(row)
    return out


def parse_csv_records(csv_bytes):
    """Parse a delimited EMS export into the same operational record contract.

    CSV is intentionally conservative: fields must use NEMSIS names or the
    documented normalized aliases. Unknown columns are ignored, and rows that
    lack the required dedup/timestamp fields are returned with an error marker
    so the reconciliation run reports them instead of silently inventing data.
    """
    text = csv_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text), strict=True)
    if not reader.fieldnames:
        raise csv.Error("CSV has no header")

    normalized = {
        "".join(ch.lower() for ch in str(name).strip() if ch.isalnum()): name
        for name in reader.fieldnames if name
    }

    def value(row, *names):
        for name in names:
            source = normalized.get("".join(ch.lower() for ch in name if ch.isalnum()))
            if source is not None:
                raw = row.get(source)
                if raw is not None and str(raw).strip():
                    return str(raw).strip()
        return None

    out = []
    for row in reader:
        # DictReader stores surplus fields under a None key. Treat those rows
        # as malformed instead of dropping the extra values silently.
        if None in row:
            out.append({"_error": "malformed CSV row (extra fields)"})
            continue
        rid = value(row, "eRecord.01", "source_record_id", "record_id", "record id")
        timestamps = {
            field: _dt(value(row, nemsis_name, field))
            for nemsis_name, field in _TIME_MAP.items()
        }
        if not rid:
            out.append({"_error": "missing eRecord.01/source_record_id (no dedup key)"})
            continue
        record = {
            "source_record_id": rid,
            "response_number": value(row, "eResponse.03", "response_number"),
            "incident_number": value(row, "eCad.01", "eResponse.04", "incident_number"),
            "unit_id": value(row, "eUnit.02", "eResponse.14", "eResponse.13", "unit_id"),
            "disposition": value(row, "eDisposition.12", "eDisposition.01", "disposition"),
            "call_type": _call_type(value(row, "eResponse.05", "eResponse.23", "call_type") or ""),
            "scene_lat": _f(value(row, "eScene.17", "scene_lat", "latitude")),
            "scene_lng": _f(value(row, "eScene.18", "scene_lng", "longitude")),
            **timestamps,
        }
        record["content_hash"] = hashlib.sha256(
            "|".join(str(row.get(name) or "") for name in reader.fieldnames).encode("utf-8")
        ).hexdigest()
        out.append(record)
    return out


def validate(row) -> bool:
    """Minimum fields for an incident to enter analytics: a dedup id and the core
    response timestamps needed for turnout/travel/response. Deny-by-default."""
    if not row.get("source_record_id"):
        return False
    # need unit-notified + en route + arrived-scene to compute the core intervals
    return bool(row.get("unit_notified_at") and row.get("enroute_at") and row.get("arrived_scene_at"))
