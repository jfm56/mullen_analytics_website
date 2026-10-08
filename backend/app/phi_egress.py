"""PHI egress guard (Phase 4) — a fail-closed control on outbound PHI.

This is NOT a "magical PHI detector." It uses an architectural boundary: the caller
declares the **Sensitivity** of what it is about to transmit and the destination host,
and the guard allows the transmission only if that host is approved for that sensitivity —
BLOCKING otherwise (fail closed). POSSIBLE_PHI (raw clinical text, free text, patient-level
data) may leave only to a host explicitly approved for PHI under a BAA, of which there are
**none by default**; so raw PHI can never egress to an unapproved third party such as an
external LLM, analytics, telemetry, webhook, email or SMS endpoint. A blocked attempt
raises `PhiEgressBlocked` and emits an auditable, **non-PHI** security event.

Usage (at an egress call site):

    from ..phi_egress import guard_egress, Sensitivity, PhiEgressBlocked
    try:
        guard_egress("api.anthropic.com", Sensitivity.POSSIBLE_PHI, purpose="dispatch_prediction")
    except PhiEgressBlocked:
        return _local_fallback(...)           # fail closed → stay inside the boundary
    ... perform the external call ...
"""
from __future__ import annotations

import enum
import logging

from .config import get_settings
from .phi_redaction import redact_phi

logger = logging.getLogger(__name__)


class Sensitivity(str, enum.Enum):
    NON_PHI = "non_phi"            # aggregates, de-identified metrics, operational metadata, PII-only
    POSSIBLE_PHI = "possible_phi"  # raw clinical/free text or patient-level data that may contain PHI


class PhiEgressBlocked(Exception):
    """Raised when the egress guard blocks an outbound transmission (fail closed)."""

    def __init__(self, host: str, sensitivity: str, purpose: str):
        self.host = host
        self.sensitivity = sensitivity
        self.purpose = purpose
        super().__init__(f"PHI egress to {host!r} blocked for {sensitivity} ({purpose})")


# Third-party processors approved to receive NON-PHI only (aggregates / metadata / PII).
# PHI must NOT go to any of these. This is a conservative, explicit allowlist.
_NON_PHI_ALLOWLIST = frozenset({
    "api.anthropic.com",   # external LLM — aggregate dashboard summaries only
    "api.sendgrid.com",    # transactional email (PII, not PHI)
    "api.stripe.com",      # billing (no PHI, no card data stored)
})


def _phi_approved_hosts() -> frozenset:
    """Hosts explicitly approved to receive POSSIBLE_PHI. Requires an executed BAA; EMPTY by
    default so POSSIBLE_PHI egress fails closed everywhere. Operators set
    `phi_egress_allowed_hosts` (comma-separated) only for a BAA-covered destination."""
    raw = getattr(get_settings(), "phi_egress_allowed_hosts", "") or ""
    return frozenset(h.strip().lower() for h in raw.split(",") if h.strip())


def _coerce(sensitivity) -> "Sensitivity":
    """Map any unknown/missing classification to POSSIBLE_PHI. UNKNOWN = PHI-sensitive =
    block (fail closed) — the guard never permits egress for an unclassified payload."""
    if isinstance(sensitivity, Sensitivity):
        return sensitivity
    try:
        return Sensitivity(sensitivity)
    except (ValueError, TypeError):
        return Sensitivity.POSSIBLE_PHI


def is_allowed(host: str, sensitivity) -> bool:
    host = (host or "").lower()
    sensitivity = _coerce(sensitivity)
    if sensitivity == Sensitivity.POSSIBLE_PHI:
        # Only BAA-approved PHI destinations — never the NON-PHI processor allowlist.
        return host in _phi_approved_hosts()
    # NON_PHI: approved processors, or any PHI-approved host (a superset).
    return host in _NON_PHI_ALLOWLIST or host in _phi_approved_hosts()


def guard_egress(host: str, sensitivity: Sensitivity, *, purpose: str,
                 agency_id=None, actor_user_id=None, audit_hook=None) -> None:
    """Allow or BLOCK an outbound transmission. Raises `PhiEgressBlocked` when not allowed,
    after emitting a non-PHI auditable event (log line + optional `audit_hook`). `purpose`
    is a short fixed label (e.g. "dispatch_prediction") — never free text/PHI."""
    sensitivity = _coerce(sensitivity)
    if is_allowed(host, sensitivity):
        return
    # Event carries only metadata (host/sensitivity/purpose/ids). Redact defensively anyway.
    logger.warning("PHI_EGRESS_BLOCKED host=%s sensitivity=%s purpose=%s agency=%s actor=%s",
                   host, sensitivity.value, redact_phi(str(purpose)), agency_id, actor_user_id)
    if audit_hook is not None:
        try:
            audit_hook({
                "event": "PHI_EGRESS_BLOCKED", "host": host, "sensitivity": sensitivity.value,
                "purpose": str(purpose),
                "agency_id": str(agency_id) if agency_id else None,
                "actor_user_id": str(actor_user_id) if actor_user_id else None,
            })
        except Exception:  # noqa: BLE001 — auditing must never break the guard
            logger.error("PHI_EGRESS_BLOCKED audit_hook failed for host=%s purpose=%s", host, purpose)
    raise PhiEgressBlocked(host, sensitivity.value, str(purpose))
