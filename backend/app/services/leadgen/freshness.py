"""
Freshness check for discovered leads: is the opportunity (RFP / solicitation /
tender / posting / funded initiative) still CURRENT, or already expired / from a
prior cycle?

Runs a recency-biased search and asks the LLM to judge against today's date,
returning a verdict + a short date note. Used by discovery (to skip stale
opportunities) and by an admin re-check of existing leads. Conservative: only
returns 'expired' on clear evidence; otherwise 'unknown' (kept).
"""
from __future__ import annotations

import json
from typing import Dict, Optional

from . import llm, websearch

_SYSTEM = (
    "You judge whether a business opportunity (RFP, solicitation, tender, job posting, funded "
    "initiative) at an organization is CURRENTLY ACTIVE or already CLOSED/EXPIRED, using ONLY the "
    "provided search results and the given today's date. Rules: 'expired' = the response deadline "
    "has clearly passed, or it plainly belongs to a prior year/cycle; 'current' = open, or posted "
    "recently (within ~12 months) with no passed deadline; 'unknown' = cannot tell. Do NOT guess. "
    'Respond strict JSON only: {"verdict":"current|expired|unknown","date_note":"short posting/'
    'deadline detail, or null"}'
)


def assess(company: str, need: Optional[str], website: Optional[str], today: str) -> Dict:
    """Return {'verdict': 'current'|'expired'|'unknown', 'date_note': str|None}."""
    out: Dict = {"verdict": "unknown", "date_note": None}
    if not llm.available():
        return out

    query = f"{company} {need or 'RFP solicitation'} deadline OR closes OR due date"
    blobs = []
    try:
        for r in websearch.search(query, max_results=6, timelimit="y"):
            sn = (r.get("snippet") or "").strip()
            u = (r.get("url") or "").strip()
            if sn:
                blobs.append(f"[{u}] {sn}")
    except Exception:
        pass
    text = "\n".join(blobs)[:6000]
    if not text:
        return out

    raw = llm.generate(
        f"Today is {today}.\nOrganization: {company}\nOpportunity: {need or 'unknown'}\n\n"
        f"Recent search results:\n{text}\n\nReturn the JSON now.",
        system=_SYSTEM, json_mode=True,
    )
    try:
        p = json.loads(raw) if raw else {}
        v = str(p.get("verdict") or "unknown").lower()
        out["verdict"] = v if v in ("current", "expired", "unknown") else "unknown"
        dn = p.get("date_note")
        if dn:
            out["date_note"] = str(dn).strip()[:200] or None
    except Exception:
        pass
    return out
