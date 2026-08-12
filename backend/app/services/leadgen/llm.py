"""
LLM wrapper for lead discovery — need-signal extraction + outreach drafting.
Local Ollama by default (keeps lead analysis on-prem + free); auto-falls back to
Anthropic when Ollama isn't reachable and an Anthropic key is set (so the cloud/
Railway backend, which already has the key for AI insights, just works). Returns
None when neither is available so callers degrade gracefully.
"""
from __future__ import annotations

import os
from typing import Optional

import httpx

from ...config import get_settings


def _has_anthropic(s) -> bool:
    return bool(s.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY"))


def _ollama_up(s) -> bool:
    try:
        r = httpx.get(s.ollama_base_url.rstrip("/") + "/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def _resolve_provider(s) -> Optional[str]:
    """Provider to actually use. Explicit 'anthropic' is honored (needs a key); the
    default 'ollama' uses Ollama when reachable, else auto-falls back to Anthropic
    when a key is present, else None (unavailable)."""
    pref = (s.lead_llm_provider or "ollama").lower()
    if pref == "anthropic":
        return "anthropic" if _has_anthropic(s) else None
    if _ollama_up(s):
        return "ollama"
    if _has_anthropic(s):
        return "anthropic"
    return None


def available() -> bool:
    return _resolve_provider(get_settings()) is not None


def generate(prompt: str, system: str = "", json_mode: bool = False, max_tokens: int = 1500) -> Optional[str]:
    s = get_settings()
    prov = _resolve_provider(s)
    try:
        if prov == "anthropic":
            return _anthropic(prompt, system, max_tokens, s)
        if prov == "ollama":
            return _ollama(prompt, system, json_mode, s)
        return None
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
