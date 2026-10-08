"""PHI-safe logging (Phase 3) — centralized redaction.

Defense-in-depth, NOT a "magical PHI detector." The primary control is architectural:
the app does not log PHI-bearing objects (only exception text can reach logs — see
docs/phi-data-flow.md). This module adds a second layer: every log record that passes
through a handler is scrubbed of common PHI *identifier patterns* (SSN, phone, email,
DOB-style dates, medical-record / long numeric ids) and of explicit `key: value` PHI
fields that can appear inside exception strings.

Limitations (documented honestly): free-text names and narrative clinical text are NOT
detected by pattern. Those must never be logged in the first place; this filter is the
backstop for identifiers that slip into an exception message. `redact_phi()` is reused by
the egress guard and the error handler so redaction is consistent everywhere.
"""
from __future__ import annotations

import logging
import re
import traceback as _traceback

_SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# phone only when separators/parens make it unambiguous; bare 10-digit runs fall to _LONGNUM
_PHONE = re.compile(r"(?<!\d)(?:\+?1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)")
# US DOB-style date mm/dd/yyyy or mm-dd-yyyy (1900-2099); ISO log timestamps are left intact
_DATE = re.compile(r"\b(0?[1-9]|1[0-2])[/\-](0?[1-9]|[12]\d|3[01])[/\-](?:19|20)\d\d\b")
# explicit PHI key: value / key=value fragments (e.g. inside an exception repr)
_KEYVAL = re.compile(
    r"(?i)\b(ssn|dob|date_of_birth|mrn|medical_record(?:_number)?|patient(?:_name)?|"
    r"first_?name|last_?name|fname|lname|address|addr|phone|dln?|drivers?_license|insurance(?:_id)?)\b"
    r"(\s*[:=]\s*)(\"?)([^\"\s,;}{]+)"
)
# street address: number + street name + a street-type suffix (conservative)
_ADDRESS = re.compile(
    r"\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s){0,4}"
    r"(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|"
    r"Ter|Terrace|Cir|Circle|Hwy|Highway|Pkwy|Parkway)\b\.?",
    re.IGNORECASE,
)
# any remaining 9+ digit run (SSN w/o dashes, MRN, account, long id)
_LONGNUM = re.compile(r"(?<!\d)\d{9,}(?!\d)")


def redact_phi(text: str) -> str:
    """Scrub common PHI identifier patterns from a string. Order matters."""
    if not text or not isinstance(text, str):
        return text
    text = _EMAIL.sub("[REDACTED-EMAIL]", text)
    text = _SSN.sub("[REDACTED-SSN]", text)
    text = _PHONE.sub("[REDACTED-PHONE]", text)
    text = _ADDRESS.sub("[REDACTED-ADDRESS]", text)
    text = _DATE.sub("[REDACTED-DATE]", text)
    text = _KEYVAL.sub(lambda m: f"{m.group(1)}{m.group(2)}[REDACTED]", text)
    text = _LONGNUM.sub("[REDACTED-NUM]", text)
    return text


# Keys that are safe to log as structured metadata (identifiers/counts — never PHI content).
SAFE_LOG_KEYS = frozenset({
    "agency_id", "incident_id", "request_id", "correlation_id", "user_id", "actor_user_id",
    "upload_id", "session_id", "finding_id", "indicator_number", "action", "result", "status",
    "count", "counts", "duration_ms", "method", "path", "host", "purpose", "classification",
    "record_count", "rows", "scoring_version", "ruleset_version", "event",
})


def safe_extra(**fields) -> dict:
    """Return a logging `extra=` dict of ONLY whitelisted metadata keys (values redacted as a
    backstop). Preferred pattern — never log a PHI-bearing object:

        logger.info("chart processed", extra=safe_extra(agency_id=a, incident_id=i))

    Non-whitelisted keys are DROPPED (fail closed), so PHI cannot ride along in `extra`."""
    out = {}
    for k, v in fields.items():
        if k not in SAFE_LOG_KEYS:
            continue
        out[k] = redact_phi(v) if isinstance(v, str) else v
    return out


class PhiRedactingFilter(logging.Filter):
    """A logging.Filter that redacts PHI from the fully-formatted message.

    It resolves the record's message (applying %-args), redacts it, and replaces
    `record.msg`/`record.args` so every downstream formatter emits the scrubbed text.
    Never blocks a record (returns True) and never raises out of logging.
    """

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            msg = record.getMessage()
        except Exception:  # noqa: BLE001 — logging must never raise
            return True
        try:
            red = redact_phi(msg)
            if red != msg:
                record.msg = red
                record.args = ()
            # The formatter renders a traceback from exc_info AFTER filters run and only if
            # exc_text is unset. Pre-render + redact it here and store in exc_text, so the
            # formatter uses the redacted text and never re-renders the raw traceback.
            if record.exc_info:
                record.exc_text = redact_phi("".join(_traceback.format_exception(*record.exc_info)))
            elif record.exc_text:
                record.exc_text = redact_phi(record.exc_text)
            if record.stack_info:
                record.stack_info = redact_phi(record.stack_info)
        except Exception:  # noqa: BLE001
            return True
        return True


_FILTER = PhiRedactingFilter()
_UVICORN_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access", "gunicorn.error", "gunicorn.access")


def _attach(handlers) -> None:
    for h in handlers:
        if not any(isinstance(x, PhiRedactingFilter) for x in h.filters):
            h.addFilter(_FILTER)


def configure_phi_safe_logging(level: str = "INFO") -> None:
    """Install the PHI redaction filter on the root + server handlers. Idempotent.

    Also ensures a root handler exists (the app previously had no logging config, so
    records fell back to the last-resort handler). Safe to call at startup every boot.
    """
    root = logging.getLogger()
    if not root.handlers:
        h = logging.StreamHandler()
        h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        root.addHandler(h)
    try:
        root.setLevel(level)
    except (ValueError, TypeError):
        root.setLevel(logging.INFO)
    _attach(root.handlers)
    for name in _UVICORN_LOGGERS:
        _attach(logging.getLogger(name).handlers)
