"""
Public marketing-tool usage capture + admin read-back.

POST /api/tools/usage      (public, rate-limited) — record a calculation.
GET  /api/tools/admin/usage (admin) — recent submissions + per-tool totals.
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.tool_usage import ToolUsage
from ..models.user import User
from ..services.signup_guard import check_rate_limit
from .auth import require_admin_or_upstream

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tools", tags=["tools"])

_TOOLS = {"revenue_checker", "profit_calculator"}


class ToolUsageIn(BaseModel):
    tool: str
    inputs: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    anon_id: Optional[str] = None
    referrer: Optional[str] = None


@router.post("/usage")
async def log_tool_usage(payload: ToolUsageIn, request: Request, db: Session = Depends(get_db)):
    """Public: record a tool calculation (inputs + results). Anonymous; no IP stored."""
    tool = (payload.tool or "").strip().lower()
    if tool not in _TOOLS:
        raise HTTPException(status_code=400, detail="Unknown tool.")

    # Generous rate-limit so honest use is never blocked; over the cap we accept
    # the request but skip the write (keeps the tool UX intact for the visitor).
    ip = request.client.host if request.client else None
    if not check_rate_limit(f"toolusage:{ip}", max_calls=80, window_seconds=3600):
        return {"ok": True, "stored": False}

    row = ToolUsage(
        tool=tool,
        inputs=payload.inputs if isinstance(payload.inputs, dict) else None,
        results=payload.results if isinstance(payload.results, dict) else None,
        anon_id=(payload.anon_id or None) and str(payload.anon_id)[:64],
        referrer=(str(payload.referrer)[:500] if payload.referrer else None),
    )
    db.add(row)
    db.commit()
    return {"ok": True, "stored": True}


@router.get("/admin/usage")
async def admin_tool_usage(
    tool: Optional[str] = None,
    limit: int = 200,
    current_user: User = Depends(require_admin_or_upstream),
    db: Session = Depends(get_db),
):
    """Admin: recent tool submissions + per-tool totals."""
    limit = max(1, min(1000, limit))
    q = db.query(ToolUsage)
    if tool in _TOOLS:
        q = q.filter(ToolUsage.tool == tool)
    rows = q.order_by(ToolUsage.created_at.desc()).limit(limit).all()

    totals: Dict[str, int] = dict(db.query(ToolUsage.tool, func.count()).group_by(ToolUsage.tool).all())

    def _row(r: ToolUsage) -> Dict[str, Any]:
        return {
            "id": str(r.id),
            "tool": r.tool,
            "inputs": r.inputs,
            "results": r.results,
            "anon_id": r.anon_id,
            "referrer": r.referrer,
            "has_lead": r.lead_id is not None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }

    return {
        "rows": [_row(r) for r in rows],
        "totals": {
            "revenue_checker": int(totals.get("revenue_checker", 0)),
            "profit_calculator": int(totals.get("profit_calculator", 0)),
            "all": int(sum(totals.values())),
        },
    }
