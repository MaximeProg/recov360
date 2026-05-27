import uuid
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.debtor import RiskLevel
from app.domains.scoring import service

router = APIRouter(prefix="/scoring", tags=["Scoring & IA"])


class ScoringResponse(BaseModel):
    debtor_id: str
    name: str
    risk_score: float
    risk_level: RiskLevel
    total_due: float
    total_paid: float
    payment_rate: float  # percentage 0-100, computed backend-side

    model_config = {"from_attributes": True}


class RiskSummary(BaseModel):
    critique: int
    eleve: int
    moyen: int
    faible: int
    total: int


@router.get("/debtors/{debtor_id}")
async def get_debtor_score(
    debtor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.compute_debtor_score(debtor_id, current_user.company_id, db)


@router.post("/compute-all")
async def compute_all_scores(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    count = await service.compute_all_scores(current_user.company_id, db)
    return {"computed": count, "updated": count}


@router.get("/summary", response_model=RiskSummary)
async def risk_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_risk_summary(current_user.company_id, db)


@router.get("/top-risky", response_model=list[ScoringResponse])
async def top_risky_debtors(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debtors = await service.get_top_risky(current_user.company_id, limit, db)
    return [
        ScoringResponse(
            debtor_id=str(d.id),
            name=d.name,
            risk_score=d.risk_score,
            risk_level=d.risk_level,
            total_due=d.total_due,
            total_paid=d.total_paid,
            payment_rate=round((d.total_paid / d.total_due * 100), 1) if d.total_due > 0 else 0.0,
        )
        for d in debtors
    ]
