"""Plan catalog (public) + the signed-in user's plan & entitlements."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import Profile, User
from ..services.plans import (
    PLANS, ADDONS, TRIAL_DAYS, PLAN_FEATURES, resolve_features, features_for_plan,
)
from ..services.plan_access import active_dataset_count
from .auth import get_current_user

router = APIRouter(tags=["plans"])


@router.get("/plans")
async def list_plans():
    """Public: the membership plans an agency can choose at signup."""
    return {"plans": PLANS, "addons": ADDONS, "trial_days": TRIAL_DAYS}


@router.get("/plans/me")
async def my_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The signed-in user's plan + resolved feature entitlements + usage, so the
    portal can gate the UI. Admins get full access."""
    prof = db.query(Profile).filter(Profile.id == current_user.id).first()
    is_adm = bool(prof and prof.role == "admin")
    if is_adm:
        feats = {k: (True if isinstance(v, bool) else 9999) for k, v in PLAN_FEATURES["enterprise"].items()}
    else:
        feats = resolve_features(prof) if prof else features_for_plan("essential")
    return {
        "plan": getattr(prof, "plan", None),
        "plan_status": getattr(prof, "plan_status", None),
        "is_admin": is_adm,
        "features": feats,
        "usage": {"active_datasets": active_dataset_count(db, current_user.id)},
    }
