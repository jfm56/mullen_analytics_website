"""
Nightly lead discovery: search for organizations that appear to be seeking
analytics / ML / data-engineering help, extract the *need signal* with the LLM,
score, de-dupe, and persist as leads. Adapted from mullen_ai_jarvis
lead_generation/agent.py (search + LLM inference + heuristic scoring).

Runs on the on-prem instance (nightly via APScheduler) and on demand via
POST /api/admin/leads/discover. No-ops with a clear reason if web search or the
LLM is unavailable.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Dict, List

from sqlalchemy.orm import Session

from ...models.lead import Lead
from . import contacts, freshness, llm, websearch

# (label, search fragment) — kept small; each pairs with a NEED below.
_VERTICALS = [
    ("healthcare", "hospital OR \"health system\" OR clinic"),
    ("ems", "\"EMS agency\" OR \"fire department\" OR \"ambulance service\""),
    ("gov", "\"government agency\" OR municipality OR county"),
    ("smb", "company OR business"),
]
_NEEDS = [
    "request for proposal data analytics",
    "hiring data analytics consultant",
    "machine learning consultant needed",
    "business intelligence dashboard project",
    "data engineering services RFP",
]

_SYSTEM = (
    "You identify real prospective CLIENTS for an analytics / machine-learning / "
    "data-engineering consultancy. From the search results, return ONLY genuine "
    "organizations that appear to be SEEKING such help (an RFP, a job posting, a "
    "stated data problem, or grant funding) that are CURRENT — open or recent. "
    "EXCLUDE anything clearly expired, closed, or from a prior year (judge against "
    "today's date given below), plus job boards, directories, other consultancies/"
    "competitors, news aggregators, and Wikipedia. "
    "Respond as strict JSON only: "
    '{"leads":[{"company":"","website":"","role":"","need_summary":"one plain sentence on what they want",'
    '"signal":"short why-relevant tag","vertical":"healthcare|ems|gov|smb|research|other",'
    '"date_note":"any posting or deadline date visible, or null"}]}'
)


def _queries(region: str = "United States") -> List[str]:
    qs: List[str] = []
    for _, vert in _VERTICALS:
        for need in _NEEDS[:3]:
            qs.append(f"{vert} {region} {need}")
    return qs[:8]


def score_lead(l: Dict) -> int:
    """Heuristic 0-100 (no ML) — mirrors the jarvis scoring intent."""
    s = 30
    if l.get("website"):
        s += 15
    if l.get("contact_email"):
        s += 20
    if l.get("role"):
        s += 5
    if l.get("vertical") in ("healthcare", "ems", "gov"):
        s += 15
    if l.get("need_summary") and len(str(l["need_summary"])) > 30:
        s += 15
    return max(0, min(100, s))


def run_discovery(db: Session, max_per_query: int = 6) -> Dict:
    if not websearch.available():
        return {"ok": False, "reason": "web search unavailable — install `ddgs` or set a Tavily/Brave key"}
    if not llm.available():
        return {"ok": False, "reason": "LLM unavailable — start Ollama or set ANTHROPIC_API_KEY"}

    _today = datetime.utcnow().date().isoformat()
    seen = set()
    candidates: List[Dict] = []
    for q in _queries():
        for r in websearch.search(q, max_per_query, timelimit="y"):
            u = (r.get("url") or "").strip()
            if not u or u in seen:
                continue
            seen.add(u)
            candidates.append(r)
    if not candidates:
        return {"ok": True, "found": 0, "inserted": 0, "candidates": 0}

    blob = "\n".join(f"- {c.get('title', '')} | {c.get('url', '')} | {str(c.get('snippet', ''))[:300]}"
                     for c in candidates[:40])
    raw = llm.generate(f"Today is {_today}.\nSearch results:\n{blob}\n\nReturn the JSON now.",
                       system=_SYSTEM, json_mode=True)
    try:
        parsed = json.loads(raw) if raw else {}
        found = parsed.get("leads", []) if isinstance(parsed, dict) else []
    except Exception:
        found = []

    inserted = 0
    for ld in found:
        company = (ld.get("company") or "").strip()
        if not company:
            continue
        if db.query(Lead).filter(Lead.company.ilike(company)).first():
            continue  # de-dupe by company name
        website = (ld.get("website") or "").strip() or None
        fresh = freshness.assess(company, ld.get("need_summary"), website, _today)
        if fresh.get("verdict") == "expired":
            continue  # skip stale / closed opportunities
        poc = contacts.find_contact(company, website, ld.get("need_summary"))
        email = poc.get("contact_email")
        row = {
            "company": company, "website": website, "role": ld.get("role"),
            "vertical": ld.get("vertical"), "need_summary": ld.get("need_summary"),
            "contact_email": email,
        }
        db.add(Lead(
            company=company[:300],
            website=website,
            contact_name=poc.get("contact_name"),
            contact_email=email,
            contact_role=(poc.get("contact_role") or ld.get("role") or None),
            contact_phone=poc.get("contact_phone"),
            vertical=(ld.get("vertical") or "other")[:50],
            source="research",
            source_url=None,
            need_summary=ld.get("need_summary"),
            signal=(ld.get("signal") or "")[:500] or None,
            date_note=((fresh.get("date_note") or ld.get("date_note") or "")[:200] or None),
            status="researched",
            score=score_lead(row),
            discovered_at=datetime.utcnow(),
        ))
        inserted += 1

    db.commit()
    return {"ok": True, "candidates": len(candidates), "found": len(found), "inserted": inserted}
