"""
Public visitor-analytics ingest — the ONE unauthenticated write endpoint.

The public marketing site posts consent-gated beacons here (pageview / click /
dwell). Mirrors the shape of routers/errors.py (POST /errors/client) but:
  * no auth dependency (anonymous visitors),
  * abuse-guarded by an in-process IP rate limit (services.signup_guard),
  * the real client IP is parsed from X-Forwarded-For for that rate limit ONLY
    and is never persisted (request.client.host is the proxy/tunnel IP behind
    Vercel/Cloudflare, so it must be parsed explicitly),
  * obvious bots are dropped by user-agent.
"""
from typing import Optional
from datetime import datetime
from urllib.parse import urlparse

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.web_analytics import VisitorSession, WebEvent
from ..services.signup_guard import check_rate_limit

router = APIRouter(prefix="/analytics", tags=["analytics"])

_VALID_TYPES = {"pageview", "click", "dwell"}
_BOT_MARKERS = (
    "bot", "crawl", "spider", "slurp", "bingpreview", "headless",
    "python-requests", "httpx", "curl", "wget", "facebookexternalhit",
    "lighthouse", "pingdom", "uptimerobot",
)


def _client_ip(request: Request) -> str:
    """Real visitor IP (first hop of X-Forwarded-For); used for rate-limiting only."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "unknown"


def _is_bot(ua: str) -> bool:
    ua = (ua or "").lower()
    return any(m in ua for m in _BOT_MARKERS)


class Beacon(BaseModel):
    session_id: str
    visitor_id: str
    type: str
    is_new: Optional[bool] = False
    path: Optional[str] = None
    label: Optional[str] = None
    dwell_ms: Optional[int] = None
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    device: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


def _clip(v: Optional[str], n: int) -> Optional[str]:
    if not v:
        return None
    v = str(v)[:n].strip()
    return v or None


@router.post("/collect")
async def collect(data: Beacon, request: Request):
    """Record one anonymous visitor event. Always returns 200 (fire-and-forget)."""
    ip = _client_ip(request)
    # Generous cap: a busy session emits a few beacons per page. Over-limit is dropped silently.
    if not check_rate_limit(f"analytics:{ip}", max_calls=600, window_seconds=60):
        return {"ok": False}

    etype = (data.type or "").lower()
    if etype not in _VALID_TYPES or not data.session_id or not data.visitor_id:
        return {"ok": False}

    ua = request.headers.get("user-agent", "")
    if _is_bot(ua):
        return {"ok": False}

    sid = data.session_id[:64]
    vid = data.visitor_id[:64]
    now = datetime.utcnow()

    db: Session = SessionLocal()
    try:
        sess = db.query(VisitorSession).filter(VisitorSession.session_id == sid).first()
        if sess is None:
            ref = _clip(data.referrer, 1000)
            host = None
            if ref:
                try:
                    host = _clip(urlparse(ref).hostname or "", 255)
                except Exception:  # noqa: BLE001
                    host = None
            sess = VisitorSession(
                session_id=sid,
                visitor_id=vid,
                is_new_visitor=bool(data.is_new),
                landing_path=_clip(data.path, 500),
                referrer=ref,
                referrer_host=host,
                utm_source=_clip(data.utm_source, 255),
                utm_medium=_clip(data.utm_medium, 255),
                utm_campaign=_clip(data.utm_campaign, 255),
                device=_clip(data.device, 20),
                language=_clip(data.language, 20),
                timezone=_clip(data.timezone, 64),
                user_agent=_clip(ua, 1000),
                pageviews=0,
                started_at=now,
                last_seen_at=now,
            )
            db.add(sess)
        else:
            sess.last_seen_at = now

        if etype == "pageview":
            sess.pageviews = (sess.pageviews or 0) + 1

        dwell = None
        if data.dwell_ms and data.dwell_ms > 0:
            dwell = min(int(data.dwell_ms), 6 * 60 * 60 * 1000)  # clamp to 6h

        db.add(WebEvent(
            session_id=sid,
            visitor_id=vid,
            event_type=etype,
            path=_clip(data.path, 500),
            label=_clip(data.label, 255),
            dwell_ms=dwell,
            created_at=now,
        ))
        db.commit()
        return {"ok": True}
    except Exception:  # noqa: BLE001
        db.rollback()
        return {"ok": False}
    finally:
        db.close()
