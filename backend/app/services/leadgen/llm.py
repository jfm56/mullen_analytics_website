"""
LLM wrapper for lead discovery — need-signal extraction + outreach drafting.
Local Ollama by default (keeps lead analysis on-prem + free); Anthropic if
configured. Returns None when unavailable so callers degrade gracefully.
"""
from __future__ import annotations

import os
from typing import Optional

import httpx

from ...config import get_settings


def available() -> bool:
    s = get_settings()
    if (s.lead_llm_provider or "ollama").lower() == "anthropic":
        return bool(s.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY"))
    try:
        r = httpx.get(s.ollama_base_url.rstrip("/") + "/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def generate(prompt: str, system: str = "", json_mode: bool = False, max_tokens: int = 1500) -> Optional[str]:
    s = get_settings()
    try:
        if (s.lead_llm_provider or "ollama").lower() == "anthropic":
            return _anthropic(prompt, system, max_tokens, s)
        return _ollama(prompt, system, json_mode, s)
    except Exception:
        return None


def _ollama(prompt: str, system: str, json_mode: bool, s) -> Optional[str]:
    body = {"model": s.ollama_model, "prompt": prompt, "system": system, "stream": False}
    if json_mode:
        body["format"] = "json"
    r = httpx.post(s.ollama_base_url.rstrip("/") + "/api/generate", json=body, timeout=120)
    r.raise_for_status()
    return r.json().get("response")


def _anthropic(prompt: str, system: str, max_tokens: int, s) -> Optional[str]:
    key = s.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return None
    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        json={"model": "claude-opus-4-8", "max_tokens": max_tokens,
              "system": system or "", "messages": [{"role": "user", "content": prompt}]},
        timeout=120,
    )
    r.raise_for_status()
    parts = r.json().get("content", [])
    return "".join(p.get("text", "") for p in parts if p.get("type") == "text")
