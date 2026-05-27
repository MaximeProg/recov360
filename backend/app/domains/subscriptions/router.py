"""
Routeur abonnements — 3 parties:
  /public/plans  — plans visibles publiquement (pas d'auth)
  /subscriptions — espace entreprise (abonnement, checkout, vérification)
  /superadmin    — endpoints admin plans/transactions (ajoutés dans admin/router)
"""
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.shared.dependencies import get_current_user
from app.models.user import User
from app.domains.subscriptions import service
from app.domains.subscriptions.schemas import (
    PlanPublic, CheckoutCreate, CheckoutResponse, SubscriptionResponse, VerifyPaymentResponse,
)

# ── Public ────────────────────────────────────────────────────────────────────
public_router = APIRouter(prefix="/public", tags=["Public"])


@public_router.get("/plans", response_model=list[PlanPublic])
async def get_public_plans(db: AsyncSession = Depends(get_db)):
    """Retourne les plans actifs — aucune authentification requise."""
    return await service.list_active_plans(db)


@public_router.get("/config")
async def get_platform_config(db: AsyncSession = Depends(get_db)):
    """Retourne la configuration publique de la plateforme (contact, réseaux, footer)."""
    return await service.get_public_config(db)


# ── Entreprise ────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/subscriptions", tags=["Abonnements"])


@router.get("/current", response_model=SubscriptionResponse | None)
async def get_current_sub(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_current_subscription(current_user.company_id, db)


@router.get("/check")
async def check_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    active = await service.has_active_subscription(current_user.company_id, db)
    sub = await service.get_current_subscription(current_user.company_id, db)
    return {
        "active": active,
        "status": sub.status if sub else None,
        "plan": sub.plan_slug if sub else None,
        "end_date": sub.end_date if sub else None,
    }


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await service.create_checkout(
        company_id=current_user.company_id,
        plan_id=data.plan_id,
        is_yearly=data.is_yearly,
        user=current_user,
        db=db,
    )
    await db.commit()
    return result


@router.get("/verify-payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    transaction_id: str = Query(..., description="Notre transaction_id interne (UUID)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Vérifie le statut réel d'un paiement directement depuis FedaPay.
    Appeler après le retour depuis la page de paiement FedaPay.
    Aucun webhook utilisé — on interroge FedaPay par ID.
    """
    try:
        tx_uuid = uuid.UUID(transaction_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="transaction_id invalide")

    result = await service.verify_payment_by_transaction_id(tx_uuid, current_user.company_id, db)
    await db.commit()
    return result


@router.post("/callback")
async def fedapay_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Endpoint de retour FedaPay (conservé pour compatibilité mais non utilisé pour la vérification)."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    entity = body.get("entity", body.get("data", {}))
    fedapay_id = str(entity.get("id", ""))
    status = entity.get("status", "pending")

    if fedapay_id:
        await service.handle_fedapay_callback(fedapay_id, status, db)
        await db.commit()
    return {"ok": True}
