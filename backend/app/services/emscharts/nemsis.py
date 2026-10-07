"""NEMSIS v3 parser — extracts OPERATIONAL fields only (no PHI) from an EMSDataSet.

Namespace-agnostic (matches by local element name), tolerant of version differences.
`parse_records` raises xml.etree.ElementTree.ParseError on malformed XML so the
pipeline can count the whole file as a validation failure.
"""
import hashlib
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


def validate(row) -> bool:
    """Minimum fields for an incident to enter analytics: a dedup id and the core
    response timestamps needed for turnout/travel/response. Deny-by-default."""
    if not row.get("source_record_id"):
        return False
    # need unit-notified + en route + arrived-scene to compute the core intervals
    return bool(row.get("unit_notified_at") and row.get("enroute_at") and row.get("arrived_scene_at"))
