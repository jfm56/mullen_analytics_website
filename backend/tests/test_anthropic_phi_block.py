"""PHI remediation Priority 2 — verify the Anthropic PHI egress block.

Proves that identifiable / PHI dispatch text results in ZERO external Anthropic calls
(the guard blocks and the on-box heuristic runs instead), that NON_PHI aggregates are
permitted, and that an unknown classification is blocked (UNKNOWN = PHI = BLOCK)."""
import asyncio

import httpx
import pytest

from app.services import ems_dispatch_predictor_service as svc
from app.phi_egress import guard_egress, is_allowed, Sensitivity, PhiEgressBlocked


@pytest.fixture()
def count_anthropic(monkeypatch):
    """Patch httpx so any outbound POST is counted; the external path is made eligible
    (api key present). If the guard works, the count stays 0."""
    calls = {"n": 0}

    async def _fake_post(self, *args, **kwargs):  # pragma: no cover - should never run
        calls["n"] += 1

        class _Resp:
            status_code = 200

            def raise_for_status(self):
                return None

            def json(self):
                return {"content": [{"type": "text", "text": "{}"}]}

        return _Resp()

    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post)
    monkeypatch.setattr(svc, "_api_key", lambda: "test-key")
    return calls


def test_identifiable_chief_complaint_zero_anthropic_calls(count_anthropic):
    out = asyncio.run(svc.predict_dispatch("64F chest pain, patient Jane Doe DOB 03/14/1960"))
    assert count_anthropic["n"] == 0          # external AI never invoked
    assert out["method"] == "heuristic" and out["available"] is True


def test_phi_narrative_zero_anthropic_calls(count_anthropic):
    narrative = ("Pt John Smith SSN 123-45-6789 found unresponsive at 42 Elm St, "
                 "possible overdose, naloxone administered")
    out = asyncio.run(svc.predict_dispatch(narrative))
    assert count_anthropic["n"] == 0
    assert out["method"] == "heuristic"


def test_aggregate_non_phi_request_permitted():
    # Permitted ONLY because it is explicitly classified NON_PHI to an approved processor.
    assert is_allowed("api.anthropic.com", Sensitivity.NON_PHI) is True
    guard_egress("api.anthropic.com", Sensitivity.NON_PHI, purpose="ai_dashboard_insights")  # no raise


def test_unknown_classification_blocked():
    # UNKNOWN = PHI-SENSITIVE = BLOCK (fail closed).
    assert is_allowed("api.anthropic.com", None) is False
    assert is_allowed("api.anthropic.com", "mystery") is False
    for bad in (None, "mystery"):
        with pytest.raises(PhiEgressBlocked):
            guard_egress("api.anthropic.com", bad, purpose="unknown_path")
