"""
Admin-only read API for the visitor-analytics dashboard (/admin/analytics page).
Guarded by require_admin (same gate as routers/admin.py). Aggregations live in
services/analytics_service.py.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..services import analytics_service
from .auth import require_admin_or_upstream

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/overview")
def analytics_overview(
    days: int = 30,
    current_user: User = Depends(require_admin_or_upstream),
    db: Session = Depends(get_db),
):
    """Visitor KPIs + trends over the last `days` (1-365)."""
    days = max(1, min(int(days), 365))
    return analytics_service.overview(db, days=days)
