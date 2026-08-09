"""
Point-of-contact enrichment for discovered leads.

For a lead we know the org + website + apparent need. This gathers text from the
org's own contact / procurement / purchasing / about pages plus a couple of
targeted search results, then asks the LLM to extract a single best point of
contact — name, title, email, phone — using ONLY what appears in that text (no
guessing). Falls back to a regex on-domain email. Prefers an email on the org's
own domain.

Respectful: fetches the org's own site + public search-result pages only, with
short timeouts and capped size. The LLM is instructed to never fabricate a
contact, so a lead with no discoverable contact stays blank rather than wrong.
"""
from __future__ import annotations

import json
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

from . import llm, websearch

_UA = "Mozilla/5.0 (compatible; MullenAnalyticsBot/1.0; +https://mullenanalytics.com)"
_CONTACT_PATHS = ("", "/contact", "/contact-us", "/about", "/procurement",
                  "/purchasing", "/bids", "/rfp", "/doing-business-with-us")

_SCRIPT_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.I | re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t\r\f\v]+")
_EMAIL_OK = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

_SYSTEM = (
    "You extract ONE best procurement / business point of contact for reaching an "
    "organization about a data / analytics / IT need, using ONLY the provided page text. "
    "Prefer a named procurement or contracts officer, purchasing manager, RFP/solicitation "
    "contact, or the relevant department head. Do NOT invent or guess names, emails, or phone "
    "numbers — if the text does not clearly contain a value, use null for it. Prefer an email "
    "on the organization's own domain. Respond as strict JSON only: "
    '{"contact_name":null,"contact_role":null,"contact_email":null,"contact_phone":null}'
)


def _visible_text(html: str, cap: int = 5000) -> str:
    html = _SCRIPT_RE.sub(" ", html)
    html = _TAG_RE.sub(" ", html)
    html = _WS_RE.sub(" ", html)
    return html.strip()[:cap]


def _fetch(url: str, cap: int = 5000) -> str:
    try:
        r = httpx.get(url, timeout=10, follow_redirects=True, headers={"User-Agent": _UA})
        if r.status_code != 200:
            return ""
        if "html" not in r.headers.get("content-type", "text/html").lower():
            return ""
        return _visible_text(r.text, cap)
    except Exception:
        return ""


def _candidate_urls(company: str, website: Optional[str]) -> List[str]:
    urls: List[str] = []
    if website:
        base = (website if "://" in website else "https://" + website).rstrip("/")
        for p in _CONTACT_PATHS:
            urls.append(base + p)
    try:  # targeted search for a procurement/contact page (often a .gov purchasing office)
        for r in websearch.search(f"{company} procurement purchasing RFP contact email", max_results=4):
            u = (r.get("url") or "").strip()
            if u:
                urls.append(u)
    except Exception:
        pass
    seen, out = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
        if len(out) >= 8:
            break
    return out


def find_contact(company: str, website: Optional[str] = None, need: Optional[str] = None) -> Dict:
    """Return {contact_name, contact_role, contact_email, contact_phone}; values may be None."""
    result: Dict = {"contact_name": None, "contact_role": None, "contact_email": None, "contact_phone": None}

    blobs: List[str] = []
    total = 0
    for u in _candidate_urls(company, website):
        t = _fetch(u)
        if t:
            blobs.append(f"[{u}]\n{t}")
            total += len(t)
        if total > 22000:
            break

    if blobs and llm.available():
        prompt = (f"Organization: {company}\nTheir apparent need: {need or 'data/analytics services'}\n\n"
                  "Page text (each block prefixed with its URL):\n"
                  + "\n\n".join(blobs)[:24000]
                  + "\n\nReturn the JSON now.")
        raw = llm.generate(prompt, system=_SYSTEM, json_mode=True)
        try:
            parsed = json.loads(raw) if raw else {}
            if isinstance(parsed, dict):
                for k in result:
                    v = parsed.get(k)
                    if isinstance(v, str):
                        v = v.strip() or None
                    result[k] = v
        except Exception:
            pass

    if not result.get("contact_email"):
        result["contact_email"] = websearch.find_contact_email(website)

    email = result.get("contact_email")
    if email and not _EMAIL_OK.match(str(email)):
        result["contact_email"] = None

    # Length guards to fit the DB columns.
    if result.get("contact_name"):
        result["contact_name"] = str(result["contact_name"])[:200]
    if result.get("contact_role"):
        result["contact_role"] = str(result["contact_role"])[:200]
    if result.get("contact_phone"):
        result["contact_phone"] = str(result["contact_phone"])[:50]
    return result
