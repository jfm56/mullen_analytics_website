"""
Web search for lead discovery — DuckDuckGo (no API key) by default, or Tavily /
Brave when configured. Plus best-effort contact-email enrichment by fetching a
prospect's OWN site (robots/ToS-respecting: only the org's homepage/contact/about
pages, on-domain emails only). Adapted from mullen_ai_jarvis integrations/websearch.py.

Degrades gracefully: returns [] / None and reports availability so discovery can
no-op with a clear reason instead of crashing when deps/keys are absent.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

from ...config import get_settings

_UA = "Mozilla/5.0 (compatible; MullenAnalyticsBot/1.0; +https://mullenanalytics.com)"


def available() -> bool:
    s = get_settings()
    provider = (s.lead_search_provider or "duckduckgo").lower()
    if provider in ("tavily", "brave"):
        return bool(s.lead_search_api_key)
    try:
        import ddgs  # noqa: F401
        return True
    except Exception:
        try:
            import duckduckgo_search  # noqa: F401
            return True
        except Exception:
            return False


def search(query: str, max_results: int = 6) -> List[Dict]:
    s = get_settings()
    provider = (s.lead_search_provider or "duckduckgo").lower()
    try:
        if provider == "tavily" and s.lead_search_api_key:
            return _tavily(query, max_results, s.lead_search_api_key)
        if provider == "brave" and s.lead_search_api_key:
            return _brave(query, max_results, s.lead_search_api_key)
        return _ddg(query, max_results)
    except Exception:
        return []


def _ddg(query: str, max_results: int) -> List[Dict]:
    try:
        from ddgs import DDGS
    except Exception:
        try:
            from duckduckgo_search import DDGS  # older package name
        except Exception:
            return []
    out: List[Dict] = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max_results):
            out.append({
                "title": r.get("title", ""),
                "url": r.get("href") or r.get("url", ""),
                "snippet": r.get("body") or r.get("snippet", ""),
            })
    return out


def _tavily(query: str, max_results: int, key: str) -> List[Dict]:
    r = httpx.post("https://api.tavily.com/search",
                   json={"api_key": key, "query": query, "max_results": max_results}, timeout=20)
    r.raise_for_status()
    return [{"title": x.get("title", ""), "url": x.get("url", ""), "snippet": x.get("content", "")}
            for x in r.json().get("results", [])]


def _brave(query: str, max_results: int, key: str) -> List[Dict]:
    r = httpx.get("https://api.search.brave.com/res/v1/web/search",
                  params={"q": query, "count": max_results},
                  headers={"X-Subscription-Token": key, "Accept": "application/json"}, timeout=20)
    r.raise_for_status()
    return [{"title": x.get("title", ""), "url": x.get("url", ""), "snippet": x.get("description", "")}
            for x in r.json().get("web", {}).get("results", [])]


_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_NOISE = ("example.", "sentry.", "wixpress.", "@2x", ".png", ".jpg", ".gif", "your@", "email@", "user@")


def find_contact_email(website: Optional[str]) -> Optional[str]:
    """Best-effort: fetch the org's own homepage/contact/about and return an on-domain email."""
    if not website:
        return None
    base = website if "://" in website else "https://" + website
    try:
        host = (urlparse(base).hostname or "").lower()
    except Exception:
        return None
    if not host:
        return None
    for path in ("", "/contact", "/about", "/contact-us"):
        try:
            r = httpx.get(base.rstrip("/") + path, timeout=10, follow_redirects=True,
                          headers={"User-Agent": _UA})
            if r.status_code != 200:
                continue
            for m in _EMAIL_RE.findall(r.text):
                ml = m.lower()
                if any(n in ml for n in _NOISE):
                    continue
                dom = ml.rsplit("@", 1)[1]
                if dom == host or dom.endswith("." + host) or host.endswith("." + dom):
                    return m
        except Exception:
            continue
    return None
