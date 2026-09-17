"""
AI-assisted dispatch resource predictor (R&D prototype) — authenticated.

POST /api/dispatch/predict  { text }  -> resource/ALS-BLS/intervention prediction.
Decision support only; a human makes the final call. No PHI stored.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..models.user import User
from ..services.ems_dispatch_predictor_service import predict_dispatch
from ..services.signup_guard import check_rate_limit
from .auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dispatch", tags=["dispatch"])


class PredictIn(BaseModel):
    text: str


@router.post("/predict")
async def predict(payload: PredictIn, request: Request, current_user: User = Depends(get_current_user)):
    ip = request.client.host if request.client else None
    if not check_rate_limit(f"dispatch:{ip}", max_calls=60, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many requests — please wait a moment.")
    return await predict_dispatch(payload.text or "")
