"""Phase 3 — PHI-safe logging tests. Proves representative PHI does not reach log output,
and documents the honest limitation (free-text names are not pattern-detectable)."""
import io
import logging

import pytest

from app.phi_redaction import redact_phi, PhiRedactingFilter, safe_extra, SAFE_LOG_KEYS


# ───────────────────────── required PHI matrix (Priority 4) ─────────────────────────
@pytest.mark.parametrize("label,text,leak", [
    ("dob",        "dob 03/14/1980",                         "03/14/1980"),
    ("phone",      "call 716-555-0199 now",                  "716-555-0199"),
    ("email",      "contact jane.doe@hospital.org",          "jane.doe@hospital.org"),
    ("ssn",        "ssn 123-45-6789",                        "123-45-6789"),
    ("address",    "found at 42 Elm Street unresponsive",    "42 Elm Street"),
    ("mrn",        "record mrn=00123456789 pulled",          "00123456789"),
    ("ssn_nodash", "id 123456789 flagged",                   "123456789"),
])
def test_phi_matrix_identifiers_scrubbed(label, text, leak):
    assert leak not in redact_phi(text), f"{label} leaked"


def test_request_body_with_phi_scrubbed():
    body = '{"patient_name":"x","dob":"03/14/1980","ssn":"123-45-6789","phone":"716-555-0199"}'
    out = redact_phi(body)
    for leak in ("03/14/1980", "123-45-6789", "716-555-0199"):
        assert leak not in out


def test_safe_extra_drops_non_whitelisted_and_redacts():
    extra = safe_extra(agency_id="ag-1", incident_id="inc-9",
                       patient_name="John Smith",            # NOT whitelisted → dropped
                       note="ssn 123-45-6789")                # NOT whitelisted → dropped
    assert extra == {"agency_id": "ag-1", "incident_id": "inc-9"}
    assert "patient_name" not in extra and "note" not in extra


def test_safe_extra_only_whitelisted_keys():
    assert "patient_name" not in SAFE_LOG_KEYS and "narrative" not in SAFE_LOG_KEYS
    assert {"agency_id", "incident_id", "request_id"} <= SAFE_LOG_KEYS


# ───────────────────────── redact_phi() ─────────────────────────
def test_redact_identifiers():
    assert redact_phi("ssn 123-45-6789") == "ssn [REDACTED-SSN]"
    assert "jane.doe@hospital.org" not in redact_phi("email jane.doe@hospital.org")
    assert "716-555-0199" not in redact_phi("call 716-555-0199")
    assert "(716) 555-0199" not in redact_phi("call (716) 555-0199")
    assert "03/14/1980" not in redact_phi("dob 03/14/1980")
    assert "00123456789" not in redact_phi("record 00123456789")        # 9+ digit run


def test_redact_keyvalue_fragments():
    out = redact_phi("bad row: dob=1980-03-14 ssn=123456789 mrn=ABC12345 phone=7165550199")
    for leak in ("1980-03-14", "123456789", "ABC12345", "7165550199"):
        assert leak not in out


def test_iso_timestamp_is_preserved():
    # A log timestamp / ISO datetime WITH a time component must not be mangled as a DOB.
    s = "2026-10-07T14:03:22 request complete"
    assert "2026-10-07T14:03:22" in redact_phi(s)


def test_uuid_is_preserved():
    s = "agency 1cef3357-9801-4c3b-8d61-bca58bdb5913 ok"
    assert redact_phi(s) == s                                            # hex+dashes, not a digit run


def test_short_counts_preserved():
    assert redact_phi("processed 4977 rows in 28 units") == "processed 4977 rows in 28 units"


def test_free_text_name_is_a_known_gap():
    # Honest limitation (per the Phase 4 egress + Phase 3 logging design): bare free-text
    # names are NOT pattern-detectable. The control for names is architectural — never log
    # them. This test pins the limitation so it is not mistaken for coverage.
    s = "patient John Smith arrived"
    assert redact_phi(s) == s


# ───────────────────────── PhiRedactingFilter (end-to-end) ─────────────────────────
def _capture_logger(name):
    buf = io.StringIO()
    h = logging.StreamHandler(buf)
    h.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
    h.addFilter(PhiRedactingFilter())
    lg = logging.getLogger(name)
    lg.handlers = [h]
    lg.setLevel(logging.INFO)
    lg.propagate = False
    return lg, buf


def test_filter_scrubs_message_fstring_and_args():
    lg, buf = _capture_logger("phi_test_msg")
    lg.error("cleaning failed for ssn 123-45-6789")                     # f-string style
    lg.error("patient email %s dob %s", "jane@x.org", "03/14/1980")     # %-args style
    out = buf.getvalue()
    for leak in ("123-45-6789", "jane@x.org", "03/14/1980"):
        assert leak not in out
    assert "[REDACTED-SSN]" in out and "[REDACTED-EMAIL]" in out and "[REDACTED-DATE]" in out


def test_filter_scrubs_exception_traceback():
    lg, buf = _capture_logger("phi_test_exc")
    try:
        raise ValueError("bad patient row: ssn=123-45-6789 email=a@b.org")
    except ValueError:
        lg.exception("unhandled error during cleaning")
    out = buf.getvalue()
    assert "123-45-6789" not in out and "a@b.org" not in out
    assert "ValueError" in out                                          # structure preserved
