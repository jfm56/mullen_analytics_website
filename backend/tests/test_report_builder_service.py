"""
Unit tests for report_builder service functions.
No DB required — httpx and os.getenv are mocked.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.report_builder.draft import ask_report, is_drafting_available


# ── is_drafting_available ─────────────────────────────────────────────────────

def test_is_drafting_available_with_key():
    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test-key"}):
        assert is_drafting_available() is True


def test_is_drafting_available_without_key():
    with patch.dict("os.environ", {}, clear=False):
        import os
        original = os.environ.pop("ANTHROPIC_API_KEY", None)
        try:
            assert is_drafting_available() is False
        finally:
            if original is not None:
                os.environ["ANTHROPIC_API_KEY"] = original


def test_is_drafting_available_empty_key():
    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "  "}):
        assert is_drafting_available() is False


# ── ask_report ────────────────────────────────────────────────────────────────

_SAMPLE_REPORT = {
    "agency_name": "Test EMS",
    "key_metrics": {
        "total_calls": 500,
        "date_range_start": "2024-01-01",
        "date_range_end": "2024-03-31",
    },
    "modules": {
        "response_times": {
            "total_response": {"p90": 290.0, "median": 210.0},
            "nfpa_1710": {"compliant": True, "pct_within_target": 93.5},
        },
        "staffing": {"overtime_pct": 12},
        "unit_performance": {
            "units": {
                "MED-1": {"calls": 180, "response_p90": 275},
                "MED-2": {"calls": 160, "response_p90": 310},
            }
        },
        "municipality": {
            "municipalities": {
                "Springfield": {"calls": 300, "response_p90": 280},
            }
        },
        "forecasting": {
            "attrition_risk": {"risk_level": "medium"},
            "call_volume_forecast": {"trend_direction": "increasing", "trend_slope": 0.8},
        },
    },
}

_MOCK_API_RESPONSE = {
    "content": [{"text": "P90 response time is 4m 50s, below the NFPA target of 5m 00s."}]
}


@pytest.mark.asyncio
async def test_ask_report_raises_without_api_key():
    """ask_report must raise ValueError when ANTHROPIC_API_KEY is not set."""
    import os
    original = os.environ.pop("ANTHROPIC_API_KEY", None)
    try:
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            await ask_report("What is our P90?", _SAMPLE_REPORT)
    finally:
        if original is not None:
            os.environ["ANTHROPIC_API_KEY"] = original


@pytest.mark.asyncio
async def test_ask_report_returns_answer():
    """ask_report should return the LLM text when the API call succeeds."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = _MOCK_API_RESPONSE

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}):
        with patch("app.services.report_builder.draft.httpx.AsyncClient", return_value=mock_client):
            answer = await ask_report("What is our P90?", _SAMPLE_REPORT)

    assert answer == "P90 response time is 4m 50s, below the NFPA target of 5m 00s."
    mock_client.post.assert_awaited_once()

    # Verify the payload sent to Anthropic includes the agency context
    call_kwargs = mock_client.post.call_args
    payload = call_kwargs[1]["json"] if "json" in call_kwargs[1] else call_kwargs[0][1]
    assert payload["model"] == "claude-3-haiku-20240307"
    assert any("Test EMS" in str(m.get("content", "")) for m in payload["messages"])


@pytest.mark.asyncio
async def test_ask_report_payload_contains_key_metrics():
    """Verify the context payload carries all key metric fields."""
    captured = {}

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = _MOCK_API_RESPONSE

    async def fake_post(url, *, json=None, headers=None, **kw):
        captured["payload"] = json
        return mock_response

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = fake_post

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}):
        with patch("app.services.report_builder.draft.httpx.AsyncClient", return_value=mock_client):
            await ask_report("How is our staffing?", _SAMPLE_REPORT)

    user_content = captured["payload"]["messages"][0]["content"]
    context_data = json.loads(user_content.split("Agency data:\n")[1].split("\n\nQuestion:")[0])
    assert context_data["agency"] == "Test EMS"
    assert context_data["total_calls"] == 500
    assert context_data["nfpa_compliant"] is True
    assert "MED-1" in context_data["units"]


@pytest.mark.asyncio
async def test_ask_report_handles_empty_report():
    """ask_report should not crash on an empty/minimal report dict."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"content": [{"text": "No data available."}]}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}):
        with patch("app.services.report_builder.draft.httpx.AsyncClient", return_value=mock_client):
            answer = await ask_report("Anything?", {})

    assert answer == "No data available."
