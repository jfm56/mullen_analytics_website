"""
Plan-based feature gating for the client portal.

Admins bypass all gates. Tiers + capabilities are defined in services/plans.py.
Used by the data router (Data Explorer, Compare, dataset-count limit) and the
datasets router (year-over-year groups).
"""
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.data_upload import DataUpload
from ..models.user import Profile, User
from .plans import MODULE_LABELS, features_for_plan, resolve_features

_LABELS = {
    "data_explorer": "the Data Explorer",
    "compare_years": "year-over-year comparison",
    "preferences": "preference controls",
}


def _profile(db: Session, user: User) -> Optional[Profile]:
    return db.query(Profile).filter(Profile.id == user.id).first()


def is_admin(db: Session, user: User) -> bool:
    p = _profile(db, user)
    return bool(p and p.role == "admin")


def user_features(db: Session, user: User) -> Dict[str, Any]:
    p = _profile(db, user)
    return resolve_features(p) if p else features_for_plan("essential")


def require_feature(db: Session, user: User, feature: str) -> None:
    """Raise 403 with an upgrade message unless the user's plan includes `feature`.
    Admins always pass."""
    if is_admin(db, user):
        return
    if not user_features(db, user).get(feature):
        raise HTTPException(
            status_code=403,
            detail=f"Your plan doesn't include {_LABELS.get(feature, feature)}. Upgrade your plan to use it.",
        )


def require_module(db: Session, user: User, module: str) -> None:
    """Raise 403 unless the client's membership enables the product `module`
    (analytics/predictive/geographic/qa). Admins always pass. This is the
    backend half of the per-client module access the admin sets."""
    if is_admin(db, user):
        return
    if not user_features(db, user).get("modules", {}).get(module):
        raise HTTPException(
            status_code=403,
            detail=f"{MODULE_LABELS.get(module, module)} isn't included in your membership.",
        )


def active_dataset_count(db: Session, client_id, exclude_upload_id=None) -> int:
    q = db.query(DataUpload).filter(
        DataUpload.client_id == client_id,
        DataUpload.upload_status == "CLEANED",
    )
    if exclude_upload_id is not None:
        q = q.filter(DataUpload.id != exclude_upload_id)
    return q.count()


def enforce_dataset_limit(db: Session, user: User, upload: DataUpload) -> None:
    """Block cleaning a NEW dataset once the plan's active-dataset limit is reached.
    Re-cleaning an already-active dataset is always allowed (it's excluded)."""
    if is_admin(db, user):
        return
    limit = int(user_features(db, user).get("max_active_datasets", 1))
    current = active_dataset_count(db, upload.client_id, exclude_upload_id=upload.id)
    if current >= limit:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Your plan allows {limit} active dataset{'s' if limit != 1 else ''}. "
                "Delete one, upgrade your plan, or add an Extra Dataset add-on to clean another."
            ),
        )
