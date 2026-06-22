"""Public plan catalog endpoint — powers the /pricing and /signup pages."""
from fastapi import APIRouter

from ..services.plans import PLANS, TRIAL_DAYS

router = APIRouter(tags=["plans"])


@router.get("/plans")
async def list_plans():
    """Public: the membership plans an agency can choose at signup."""
    return {"plans": PLANS, "trial_days": TRIAL_DAYS}
