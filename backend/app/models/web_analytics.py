"""
First-party website-visitor analytics (consent-gated, self-hosted).

Anonymous public-visitor tracking — NOT tied to any authenticated user (unlike
sessions/audit_logs/error_logs, which all FK users.id). The public site posts
beacons to POST /api/analytics/collect ONLY after the visitor accepts cookies.

  * VisitorSession — one row per anonymous browsing session (client-generated
    anon session id). Holds the acquisition context (referrer, utm, device,
    locale) once per session + a denormalized pageview count for bounce calc.
  * WebEvent — one row per captured event: pageview (route change), click
    (a tracked nav/tab, via data-track), or dwell (time-on-page, sent on leave).

Privacy: the real client IP is used only for abuse rate-limiting at ingest and
is NEVER stored. Location is approximated from the browser timezone/language the
client sends (no IP geolocation). See src/app/privacy/page.jsx.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class VisitorSession(Base):
    __tablename__ = "web_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(64), unique=True, index=True, nullable=False)   # anon client session id
    visitor_id = Column(String(64), index=True, nullable=False)                # anon persistent id (returning-visitor)
    is_new_visitor = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    landing_path = Column(String(500), nullable=True)
    referrer = Column(String(1000), nullable=True)
    referrer_host = Column(String(255), nullable=True, index=True)             # for "top sources"
    utm_source = Column(String(255), nullable=True)
    utm_medium = Column(String(255), nullable=True)
    utm_campaign = Column(String(255), nullable=True)
    device = Column(String(20), nullable=True, index=True)                     # mobile | tablet | desktop
    language = Column(String(20), nullable=True)
    timezone = Column(String(64), nullable=True, index=True)                   # locale proxy for region
    user_agent = Column(Text, nullable=True)
    pageviews = Column(Integer, default=0)                                     # denormalized (bounce = <=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class WebEvent(Base):
    __tablename__ = "web_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(64), index=True, nullable=False)
    visitor_id = Column(String(64), index=True, nullable=False)
    event_type = Column(String(20), index=True, nullable=False)                # pageview | click | dwell
    path = Column(String(500), nullable=True, index=True)
    label = Column(String(255), nullable=True, index=True)                     # e.g. "nav:Products" for clicks
    dwell_ms = Column(Integer, nullable=True)                                  # for dwell events
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
