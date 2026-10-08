"""Phase 4 — PHI egress guard tests. Proves the guard fails closed for POSSIBLE_PHI,
permits NON_PHI only to approved processors, emits a non-PHI audit event on block, and
that the dispatch predictor degrades to its on-box heuristic when egress is blocked."""
import asyncio

import pytest

from app import phi_egress
from app.phi_egress import guard_egress, is_allowed, Sensitivity, PhiEgressBlocked


def test_possible_phi_blocked_by_default():
    assert is_allowed("api.anthropic.com", Sensitivity.POSSIBLE_PHI) is False
    with pytest.raises(PhiEgressBlocked):
        guard_egress("api.anthropic.com", Sensitivity.POSSIBLE_PHI, purpose="dispatch_prediction")


def test_non_phi_allowed_to_approved_processor():
    assert is_allowed("api.anthropic.com", Sensitivity.NON_PHI) is True
    guard_egress("api.anthropic.com", Sensitivity.NON_PHI, purpose="ai_insights")   # must not raise


def test_non_phi_blocked_to_unapproved_host():
    assert is_allowed("telemetry.example.com", Sensitivity.NON_PHI) is False
    with pytest.raises(PhiEgressBlocked):
        guard_egress("telemetry.example.com", Sensitivity.NON_PHI, purpose="telemetry")


def test_possible_phi_allowed_only_for_baa_approved_host(monkeypatch):
    monkeypatch.setattr(phi_egress, "_phi_approved_hosts",
                        lambda: frozenset({"bedrock-runtime.us-east-2.amazonaws.com"}))
    assert is_allowed("bedrock-runtime.us-east-2.amazonaws.com", Sensitivity.POSSIBLE_PHI) is True
    guard_egress("bedrock-runtime.us-east-2.amazonaws.com", Sensitivity.POSSIBLE_PHI, purpose="x")
    # a non-approved external LLM stays blocked even with another host approved
    assert is_allowed("api.anthropic.com", Sensitivity.POSSIBLE_PHI) is False


def test_block_emits_non_phi_audit_event():
    events = []
    with pytest.raises(PhiEgressBlocked):
        guard_egress("api.anthropic.com", Sensitivity.POSSIBLE_PHI, purpose="dispatch_prediction",
                     agency_id="ag-1", actor_user_id="u-1", audit_hook=events.append)
    assert events and events[0]["event"] == "PHI_EGRESS_BLOCKED"
    assert events[0]["host"] == "api.anthropic.com" and events[0]["sensitivity"] == "possible_phi"
    # only metadata keys — no payload / PHI captured in the event
    assert set(events[0]) == {"event", "host", "sensitivity", "purpose", "agency_id", "actor_user_id"}


def test_no_telemetry_or_apm_destination_is_allowed():
    # There are no APM/error-monitoring/telemetry integrations; prove such hosts can't receive
    # anything through the guard (neither NON_PHI nor POSSIBLE_PHI).
    for host in ("sentry.io", "app.datadoghq.com", "api.newrelic.com", "in.segment.com",
                 "api.rollbar.com", "otlp.honeycomb.io"):
        assert is_allowed(host, Sensitivity.NON_PHI) is False
        assert is_allowed(host, Sensitivity.POSSIBLE_PHI) is False


def test_non_phi_allowlist_is_exactly_the_known_processors():
    from app.phi_egress import _NON_PHI_ALLOWLIST
    assert set(_NON_PHI_ALLOWLIST) == {"api.anthropic.com", "api.sendgrid.com", "api.stripe.com"}


def test_dispatch_predictor_falls_back_to_heuristic_when_blocked(monkeypatch):
    from app.services import ems_dispatch_predictor_service as svc
    monkeypatch.setattr(svc, "_api_key", lambda: "test-key")   # make the external path eligible
    out = asyncio.run(svc.predict_dispatch("chest pain and shortness of breath, diaphoretic"))
    assert out["available"] is True
    assert out["method"] == "heuristic"                        # external call never happened
    assert "egress guard" in out.get("note", "")
    assert out["level"] == "ALS"                               # on-box model still useful
