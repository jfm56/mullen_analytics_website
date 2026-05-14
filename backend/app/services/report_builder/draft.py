"""
LLM drafting module — calls Anthropic claude-3-haiku via httpx (no SDK dep).

Anti-hallucination constraints live in each prompt template in sections.py:
  - Exact numbers only (from summary dict)
  - No recommendations
  - No speculation on causes
  - Mandatory caveats when timestamp_caveat is set

Set ANTHROPIC_API_KEY in backend/.env to enable drafting.
"""
import json
import os
from typing import Optional

import httpx

from .sections import PROMPTS

_ANTHROPIC_URL   = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_MODEL = "claude-3-haiku-20240307"
_MAX_TOKENS      = 350


async def draft_section(section_id: str, summary: dict) -> str:
    """
    Generate 2-4 descriptive sentences for a report section.

    Raises:
        ValueError: ANTHROPIC_API_KEY missing or no template for section_id
        httpx.HTTPStatusError: Anthropic API error
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. "
            "Add it to backend/.env to enable LLM drafting."
        )

    template = PROMPTS.get(section_id)
    if not template:
        raise ValueError(f"No prompt template for section: {section_id!r}")

    summary_json = json.dumps(summary, indent=2, default=str)
    user_msg     = template.format(summary_json=summary_json)

    payload = {
        "model":      _ANTHROPIC_MODEL,
        "max_tokens": _MAX_TOKENS,
        "messages":   [{"role": "user", "content": user_msg}],
    }
    headers = {
        "x-api-key":         api_key,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(_ANTHROPIC_URL, json=payload, headers=headers)
        resp.raise_for_status()

    return resp.json()["content"][0]["text"].strip()


def is_drafting_available() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())
