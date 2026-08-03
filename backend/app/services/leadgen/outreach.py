"""
Compliant lead outreach — DRAFT-FOR-REVIEW, never auto-send.

Flow: AI drafts an OutreachMessage(status="draft") → an admin reviews/edits →
an admin explicitly sends it (POST .../send), which stamps approved_by and mails
it via SendGrid. Every send:
  * is blocked if the recipient is on the suppression list (opt-out / bounce),
  * carries a CAN-SPAM footer (physical postal address) + a working one-click
    unsubscribe link, and a List-Unsubscribe header,
  * is sent From noreply@ (settings.smtp_from_email) with Reply-To → jmullen@
    so prospect replies reach a monitored inbox.

Nothing here sends without an explicit admin action on a specific message.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from ...config import get_settings
from ...models.lead import Lead, LeadSuppression, OutreachMessage
from . import llm

REPLY_TO = "jmullen@mullenanalytics.com"
FROM_NAME = "Jim Mullen · Mullen Analytics & Data Solutions"
POSTAL_ADDRESS = "Mullen Analytics &amp; Data Solutions LLC · P.O. Box 2058 · Southampton, NJ 08088"

_DRAFT_SYSTEM = (
    "You write a SHORT, professional, non-spammy cold outreach email from Jim Mullen of "
    "Mullen Analytics & Data Solutions, a veteran-owned analytics / machine-learning / "
    "data-engineering consultancy. Address the prospect's apparent need, keep it to 2-3 short "
    "paragraphs, be specific and human, no hype, no fake claims, no attachments. End by offering "
    "a brief 15-minute call. Do NOT include a signature, greeting sign-off, or unsubscribe text — "
    "those are added automatically. Return strict JSON only: "
    '{"subject":"", "body":"plain text, paragraphs separated by blank lines"}'
)


# ── unsubscribe token (HMAC, no DB row needed) ──────────────────────────────
def unsubscribe_token(email: str) -> str:
    s = get_settings()
    email = (email or "").strip().lower()
    sig = hmac.new(s.secret_key.encode(), email.encode(), hashlib.sha256).hexdigest()[:16]
    return base64.urlsafe_b64encode(f"{email}|{sig}".encode()).decode().rstrip("=")


def verify_unsubscribe(token: str) -> Optional[str]:
    s = get_settings()
    try:
        pad = "=" * (-len(token) % 4)
        raw = base64.urlsafe_b64decode(token + pad).decode()
        email, sig = raw.rsplit("|", 1)
        good = hmac.new(s.secret_key.encode(), email.encode(), hashlib.sha256).hexdigest()[:16]
        return email if hmac.compare_digest(sig, good) else None
    except Exception:  # noqa: BLE001
        return None


def is_suppressed(db: Session, email: Optional[str]) -> bool:
    if not email:
        return False
    return db.query(LeadSuppression).filter(LeadSuppression.email == email.strip().lower()).first() is not None


def add_suppression(db: Session, email: str, reason: str = "unsubscribe") -> None:
    email = (email or "").strip().lower()
    if not email or is_suppressed(db, email):
        return
    db.add(LeadSuppression(email=email, reason=reason[:30]))
    db.commit()


# ── drafting ────────────────────────────────────────────────────────────────
def draft_outreach(db: Session, lead: Lead) -> dict:
    if not llm.available():
        return {"ok": False, "reason": "LLM unavailable — start Ollama or set ANTHROPIC_API_KEY"}
    ctx = (
        f"Company: {lead.company}\n"
        f"Their apparent need: {lead.need_summary or lead.signal or 'unknown'}\n"
        f"Vertical: {lead.vertical or 'unknown'}\n"
        f"Contact role: {lead.contact_role or 'unknown'}\n"
        f"Website: {lead.website or 'unknown'}"
    )
    raw = llm.generate(f"Prospect:\n{ctx}\n\nWrite the outreach email as JSON now.",
                       system=_DRAFT_SYSTEM, json_mode=True)
    subject, body = None, None
    try:
        parsed = json.loads(raw) if raw else {}
        subject = (parsed.get("subject") or "").strip() or None
        body = (parsed.get("body") or "").strip() or None
    except Exception:  # noqa: BLE001
        pass
    if not subject or not body:
        return {"ok": False, "reason": "draft generation failed"}

    msg = OutreachMessage(
        lead_id=lead.id, channel="email", subject=subject[:500], body_text=body,
        status="draft", generated_by=(get_settings().lead_llm_provider or "ollama"),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"ok": True, "id": str(msg.id), "subject": msg.subject, "body_text": msg.body_text}


def _render_html(body_text: str, unsub_url: str) -> str:
    paras = "".join(
        f'<p style="margin:0 0 16px;font-size:15px;color:#1f2937;line-height:24px;">{p.strip()}</p>'
        for p in (body_text or "").split("\n\n") if p.strip()
    )
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;background:#ffffff;">
    {paras}
    <p style="margin:22px 0 0;font-size:15px;color:#1f2937;">Best,<br/>Jim Mullen<br/>
      <span style="color:#6b7280;">Mullen Analytics &amp; Data Solutions</span></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:26px 0 14px;" />
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:18px;">
      {POSTAL_ADDRESS}<br/>
      You received this one-time message because your organization appeared to be seeking analytics
      or data services. <a href="{unsub_url}" style="color:#6b7280;">Unsubscribe</a> and we won't contact you again.
    </p>
  </div></body></html>"""


def send_outreach(db: Session, message_id: str, admin_user_id) -> dict:
    """Explicit admin send of a specific draft. Human-gated, suppression-checked."""
    msg = db.query(OutreachMessage).filter(OutreachMessage.id == message_id).first()
    if not msg:
        return {"ok": False, "reason": "message not found"}
    if msg.status == "sent":
        return {"ok": False, "reason": "already sent"}
    lead = db.query(Lead).filter(Lead.id == msg.lead_id).first()
    if not lead or not lead.contact_email:
        return {"ok": False, "reason": "lead has no email address"}
    to_email = lead.contact_email.strip()
    if is_suppressed(db, to_email):
        return {"ok": False, "reason": "recipient has opted out (suppressed)"}

    s = get_settings()
    if not s.sendgrid_api_key or not s.smtp_from_email:
        return {"ok": False, "reason": "email sender not configured (set SENDGRID_API_KEY)"}

    unsub_url = f"{s.app_url}/api/proxy2/outreach/unsubscribe?token={unsubscribe_token(to_email)}"
    html = _render_html(msg.body_text or "", unsub_url)
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": s.smtp_from_email, "name": FROM_NAME},
        "reply_to": {"email": REPLY_TO, "name": "Jim Mullen"},
        "subject": msg.subject or "Hello from Mullen Analytics & Data Solutions",
        "content": [{"type": "text/html", "value": html}],
        "headers": {"List-Unsubscribe": f"<{unsub_url}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"},
    }
    try:
        r = httpx.post("https://api.sendgrid.com/v3/mail/send",
                       headers={"Authorization": f"Bearer {s.sendgrid_api_key}", "Content-Type": "application/json"},
                       json=payload, timeout=20)
        r.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reason": f"send failed: {exc}"}

    now = datetime.utcnow()
    msg.status = "sent"
    msg.sent_at = now
    msg.approved_by = admin_user_id
    msg.approved_at = now
    lead.status = "contacted"
    lead.last_contacted_at = now
    db.commit()
    return {"ok": True, "sent_to": to_email}
