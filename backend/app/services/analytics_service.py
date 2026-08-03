"""
Read-side aggregations for the admin visitor-analytics dashboard.

ORM group-by/count queries over web_sessions + web_events (mirrors the inline
aggregation style in routers/admin.py). Returns plain dicts for the API. All
timestamps are naive UTC (rendered Eastern on the client via lib/datetime.js).
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.web_analytics import VisitorSession, WebEvent


def _daily_trend(db: Session, start: datetime) -> list[dict]:
    d = func.date(WebEvent.created_at)
    pv_rows = (
        db.query(d, func.count(WebEvent.id))
        .filter(WebEvent.event_type == "pageview", WebEvent.created_at >= start)
        .group_by(d).order_by(d).all()
    )
    pv_by_day = {str(r[0]): int(r[1]) for r in pv_rows}

    dv = func.date(VisitorSession.started_at)
    v_rows = (
        db.query(dv, func.count(func.distinct(VisitorSession.visitor_id)))
        .filter(VisitorSession.started_at >= start)
        .group_by(dv).order_by(dv).all()
    )
    v_by_day = {str(r[0]): int(r[1]) for r in v_rows}

    days = sorted(set(pv_by_day) | set(v_by_day))
    return [{"date": d, "pageviews": pv_by_day.get(d, 0), "visitors": v_by_day.get(d, 0)} for d in days]


def _top_pages(db: Session, start: datetime, limit: int = 12) -> list[dict]:
    rows = (
        db.query(WebEvent.path, func.count(WebEvent.id).label("n"))
        .filter(WebEvent.event_type == "pageview", WebEvent.created_at >= start, WebEvent.path.isnot(None))
        .group_by(WebEvent.path).order_by(func.count(WebEvent.id).desc()).limit(limit).all()
    )
    return [{"path": r[0], "views": int(r[1])} for r in rows]


def _top_tabs(db: Session, start: datetime, limit: int = 12) -> list[dict]:
    rows = (
        db.query(WebEvent.label, func.count(WebEvent.id).label("n"))
        .filter(WebEvent.event_type == "click", WebEvent.created_at >= start, WebEvent.label.isnot(None))
        .group_by(WebEvent.label).order_by(func.count(WebEvent.id).desc()).limit(limit).all()
    )
    return [{"label": r[0], "clicks": int(r[1])} for r in rows]


def _referrers(db: Session, start: datetime, limit: int = 10) -> list[dict]:
    rows = (
        db.query(VisitorSession.referrer_host, func.count(VisitorSession.id).label("n"))
        .filter(VisitorSession.started_at >= start)
        .group_by(VisitorSession.referrer_host).order_by(func.count(VisitorSession.id).desc()).limit(limit).all()
    )
    return [{"source": r[0] or "Direct / none", "sessions": int(r[1])} for r in rows]


def _devices(db: Session, start: datetime) -> list[dict]:
    rows = (
        db.query(VisitorSession.device, func.count(VisitorSession.id).label("n"))
        .filter(VisitorSession.started_at >= start)
        .group_by(VisitorSession.device).order_by(func.count(VisitorSession.id).desc()).all()
    )
    return [{"device": r[0] or "unknown", "sessions": int(r[1])} for r in rows]


def _regions(db: Session, start: datetime, limit: int = 10) -> list[dict]:
    n = func.count(func.distinct(VisitorSession.visitor_id))
    rows = (
        db.query(VisitorSession.timezone, n)
        .filter(VisitorSession.started_at >= start, VisitorSession.timezone.isnot(None))
        .group_by(VisitorSession.timezone).order_by(n.desc()).limit(limit).all()
    )
    return [{"timezone": r[0], "visitors": int(r[1])} for r in rows]


def _time_on_page(db: Session, start: datetime, limit: int = 10) -> list[dict]:
    rows = (
        db.query(WebEvent.path, func.avg(WebEvent.dwell_ms), func.count(WebEvent.id))
        .filter(WebEvent.event_type == "dwell", WebEvent.created_at >= start, WebEvent.dwell_ms.isnot(None))
        .group_by(WebEvent.path).order_by(func.count(WebEvent.id).desc()).limit(limit).all()
    )
    return [{"path": r[0], "avg_seconds": round((float(r[1]) or 0) / 1000, 1), "samples": int(r[2])} for r in rows]


def overview(db: Session, days: int = 30) -> dict:
    now = datetime.utcnow()
    start = now - timedelta(days=days)
    day_ago = now - timedelta(days=1)

    pageviews = db.query(func.count(WebEvent.id)).filter(
        WebEvent.event_type == "pageview", WebEvent.created_at >= start).scalar() or 0
    visitors = db.query(func.count(func.distinct(VisitorSession.visitor_id))).filter(
        VisitorSession.started_at >= start).scalar() or 0
    sessions = db.query(func.count(VisitorSession.id)).filter(
        VisitorSession.started_at >= start).scalar() or 0
    pageviews_24h = db.query(func.count(WebEvent.id)).filter(
        WebEvent.event_type == "pageview", WebEvent.created_at >= day_ago).scalar() or 0

    avg_dwell = db.query(func.avg(WebEvent.dwell_ms)).filter(
        WebEvent.event_type == "dwell", WebEvent.created_at >= start, WebEvent.dwell_ms.isnot(None)).scalar()
    avg_time_on_page_s = round((float(avg_dwell) or 0) / 1000, 1) if avg_dwell else 0.0

    bounce_sessions = db.query(func.count(VisitorSession.id)).filter(
        VisitorSession.started_at >= start, VisitorSession.pageviews <= 1).scalar() or 0
    bounce_rate = round(100.0 * bounce_sessions / sessions, 1) if sessions else 0.0

    new_visitors = db.query(func.count(VisitorSession.id)).filter(
        VisitorSession.started_at >= start, VisitorSession.is_new_visitor.is_(True)).scalar() or 0

    return {
        "range_days": days,
        "kpis": {
            "pageviews": int(pageviews),
            "visitors": int(visitors),
            "sessions": int(sessions),
            "pageviews_24h": int(pageviews_24h),
            "avg_time_on_page_s": avg_time_on_page_s,
            "bounce_rate": bounce_rate,
            "new_visitors": int(new_visitors),
            "returning_visitors": max(int(sessions) - int(new_visitors), 0),
        },
        "trend": _daily_trend(db, start),
        "top_pages": _top_pages(db, start),
        "top_tabs": _top_tabs(db, start),
        "referrers": _referrers(db, start),
        "devices": _devices(db, start),
        "regions": _regions(db, start),
        "time_on_page": _time_on_page(db, start),
    }
