"""
Service d'abonnements — gère les plans, subscriptions et transactions FedaPay.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.plan import Plan
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.fedapay_transaction import FedaPayTransaction
from app.models.user import User
from app.models.company import Company
from app.models.platform_config import PlatformConfig
from app.core import fedapay as fedapay_client
from app.core.config import settings
from app.core.email_service import send_email, tpl_subscription_confirmed
from app.core.superadmin_notify import notify_new_payment
from app.shared.pagination import PaginationParams

logger = logging.getLogger(__name__)


# ── Plans ────────────────────────────────────────────────────────────────────

async def list_active_plans(db: AsyncSession) -> list[Plan]:
    result = await db.execute(
        select(Plan)
        .where(Plan.is_active.is_(True), Plan.deleted_at.is_(None))
        .order_by(Plan.sort_order.asc(), Plan.price_monthly.asc())
    )
    return result.scalars().all()


async def list_all_plans(db: AsyncSession) -> list[Plan]:
    result = await db.execute(
        select(Plan).where(Plan.deleted_at.is_(None)).order_by(Plan.sort_order.asc())
    )
    return result.scalars().all()


async def create_plan(data: dict, db: AsyncSession) -> Plan:
    existing = await db.execute(select(Plan).where(Plan.slug == data["slug"], Plan.deleted_at.is_(None)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Un plan avec ce slug existe déjà")
    plan = Plan(**data)
    db.add(plan)
    await db.flush()
    return plan


async def update_plan(plan_id: uuid.UUID, data: dict, db: AsyncSession) -> Plan:
    result = await db.execute(select(Plan).where(Plan.id == plan_id, Plan.deleted_at.is_(None)))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan introuvable")
    for k, v in data.items():
        if v is not None:
            setattr(plan, k, v)
    return plan


async def delete_plan(plan_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(select(Plan).where(Plan.id == plan_id, Plan.deleted_at.is_(None)))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan introuvable")
    plan.soft_delete()


# ── Subscriptions ─────────────────────────────────────────────────────────────

async def get_current_subscription(company_id: uuid.UUID, db: AsyncSession) -> Subscription | None:
    """Retourne l'abonnement actif/trial le plus récent."""
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.company_id == company_id,
            Subscription.deleted_at.is_(None),
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
        )
        .order_by(Subscription.created_at.desc())
    )
    return result.scalar_one_or_none()


async def has_active_subscription(company_id: uuid.UUID, db: AsyncSession) -> bool:
    """Vérifie si une entreprise a un abonnement valide (trial ou payant non expiré)."""
    sub = await get_current_subscription(company_id, db)
    if not sub:
        return False
    now = datetime.now(timezone.utc)
    if sub.status == SubscriptionStatus.TRIAL:
        # Vérifier que la période d'essai n'est pas expirée
        if sub.end_date and sub.end_date < now:
            sub.status = SubscriptionStatus.EXPIRED
            await db.flush()
            return False
        return True
    if sub.status == SubscriptionStatus.ACTIVE:
        if sub.end_date and sub.end_date < now:
            # Abonnement payant expiré → mettre à jour
            sub.status = SubscriptionStatus.EXPIRED
            await db.flush()
            return False
        return True
    return False


async def create_trial_subscription(company_id: uuid.UUID, plan_slug: str, db: AsyncSession) -> Subscription:
    """Crée une période d'essai pour une nouvelle entreprise."""
    plan = await _get_plan_by_slug(plan_slug, db)
    trial_days = plan.trial_days if plan else 14
    sub = Subscription(
        company_id=company_id,
        plan_id=plan.id if plan else None,
        plan_slug=plan_slug,
        status=SubscriptionStatus.TRIAL,
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc) + timedelta(days=trial_days),
    )
    db.add(sub)
    await db.flush()
    return sub


async def _get_plan_by_slug(slug: str, db: AsyncSession) -> Plan | None:
    result = await db.execute(select(Plan).where(Plan.slug == slug, Plan.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def create_checkout(
    company_id: uuid.UUID,
    plan_id: uuid.UUID,
    is_yearly: bool,
    user: User,
    db: AsyncSession,
) -> dict:
    """Crée un paiement FedaPay et retourne l'URL de checkout."""
    # Récupérer le plan
    result = await db.execute(select(Plan).where(Plan.id == plan_id, Plan.is_active.is_(True), Plan.deleted_at.is_(None)))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan introuvable")

    amount = int(plan.price_yearly if is_yearly else plan.price_monthly)
    if amount == 0 and plan.is_free:
        # Activation gratuite directe
        return await _activate_free_plan(company_id, plan, is_yearly, db)

    description = f"Abonnement Recov360 – Plan {plan.name} ({'annuel' if is_yearly else 'mensuel'})"
    callback_url = f"{settings.FRONTEND_URL}/subscribe/callback"

    # Créer une entrée transaction préalable
    fedapay_tx = FedaPayTransaction(
        company_id=company_id,
        amount=amount,
        currency=plan.currency,
        status="pending",
        description=description,
        customer_email=user.email,
    )
    db.add(fedapay_tx)
    await db.flush()

    # Créer une subscription en attente
    sub = Subscription(
        company_id=company_id,
        plan_id=plan.id,
        plan_slug=plan.slug,
        status=SubscriptionStatus.PENDING,
        is_yearly=is_yearly,
    )
    db.add(sub)
    await db.flush()

    fedapay_tx.subscription_id = sub.id

    try:
        result_fp = await fedapay_client.create_transaction(
            amount=amount,
            description=description,
            customer_email=user.email,
            customer_firstname=user.first_name or "",
            customer_lastname=user.last_name or "",
            callback_url=callback_url,
            currency=plan.currency,
        )
        fedapay_tx.fedapay_id = result_fp["fedapay_id"]
        fedapay_tx.checkout_url = result_fp["checkout_url"]
        fedapay_tx.raw_response = result_fp["raw"]
        sub.fedapay_transaction_id = result_fp["fedapay_id"]

        return {
            "checkout_url": result_fp["checkout_url"],
            "transaction_id": str(fedapay_tx.id),
            "amount": amount,
            "currency": plan.currency,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur FedaPay: {str(e)}")


async def _activate_free_plan(company_id: uuid.UUID, plan: Plan, is_yearly: bool, db: AsyncSession) -> dict:
    sub = Subscription(
        company_id=company_id,
        plan_id=plan.id,
        plan_slug=plan.slug,
        status=SubscriptionStatus.ACTIVE,
        is_yearly=is_yearly,
        start_date=datetime.now(timezone.utc),
        end_date=None,  # pas d'expiration pour gratuit
    )
    db.add(sub)
    await db.flush()
    return {"checkout_url": None, "transaction_id": None, "amount": 0, "currency": plan.currency}


async def verify_payment_by_transaction_id(
    transaction_id: uuid.UUID,
    company_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """
    Vérifie le vrai statut d'un paiement directement depuis FedaPay (pas de webhook).
    Prend notre transaction_id interne, récupère le fedapay_id, interroge FedaPay,
    et met à jour la DB si approuvé.
    """
    # Récupérer notre transaction en DB
    result = await db.execute(
        select(FedaPayTransaction).where(
            FedaPayTransaction.id == transaction_id,
            FedaPayTransaction.company_id == company_id,
            FedaPayTransaction.deleted_at.is_(None),
        )
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction introuvable")

    if not tx.fedapay_id:
        return {"fedapay_status": "pending", "subscription_active": False, "subscription_status": "pending"}

    # Interroger FedaPay pour le vrai statut
    fp_result = await fedapay_client.verify_transaction(tx.fedapay_id)
    real_status = fp_result["status"]

    # Mettre à jour notre transaction
    tx.status = real_status
    tx.raw_response = fp_result["raw"]

    subscription_status = None

    # Si approuvé → activer l'abonnement
    sub = None
    if real_status == "approved" and tx.subscription_id:
        sub_result = await db.execute(
            select(Subscription).where(Subscription.id == tx.subscription_id)
        )
        sub = sub_result.scalar_one_or_none()
        if sub and sub.status != SubscriptionStatus.ACTIVE:
            sub.status = SubscriptionStatus.ACTIVE
            sub.start_date = datetime.now(timezone.utc)
            if sub.is_yearly:
                sub.end_date = datetime.now(timezone.utc) + timedelta(days=365)
            else:
                sub.end_date = datetime.now(timezone.utc) + timedelta(days=30)
        if sub:
            subscription_status = sub.status.value if hasattr(sub.status, "value") else sub.status

    await db.flush()

    # ── Notifications post-paiement (fire-and-forget) ─────────────────────────
    if real_status == "approved" and sub:
        try:
            # Récupérer entreprise et admin
            comp_result = await db.execute(select(Company).where(Company.id == tx.company_id))
            company = comp_result.scalar_one_or_none()

            user_q = select(User).where(
                User.company_id == tx.company_id,
                User.deleted_at.is_(None),
                User.is_active.is_(True),
            ).order_by(User.created_at.asc())
            user_result = await db.execute(user_q)
            admin_user = user_result.scalars().first()

            plan_name = (sub.plan_slug or "starter").capitalize()
            period = "Annuel" if sub.is_yearly else "Mensuel"
            amount_str = f"{tx.amount:,.0f} {tx.currency}"
            end_date_str = sub.end_date.strftime("%d/%m/%Y") if sub.end_date else "–"

            if company and admin_user:
                # Email de confirmation → admin de l'entreprise
                dashboard_url = f"{settings.FRONTEND_URL}/subscription"
                subject, html = tpl_subscription_confirmed(
                    company_name=company.name,
                    admin_first_name=admin_user.first_name,
                    plan_name=plan_name,
                    amount=amount_str,
                    period=period,
                    end_date=end_date_str,
                    dashboard_url=dashboard_url,
                )
                asyncio.create_task(send_email(admin_user.email, subject, html))

            # Alerte super admins (email + push)
            await notify_new_payment(
                company_name=company.name if company else "–",
                company_email=company.email if company else (tx.customer_email or ""),
                plan_name=plan_name,
                amount=amount_str,
                period=period,
                transaction_id=str(tx.fedapay_id or tx.id),
                db=db,
            )
        except Exception as exc:
            logger.warning("[payment] Notification post-paiement échouée : %s", exc)

    return {
        "fedapay_status": real_status,
        "subscription_active": real_status == "approved",
        "subscription_status": subscription_status,
    }


async def handle_fedapay_callback(
    fedapay_transaction_id: str,
    status: str,
    db: AsyncSession,
) -> None:
    """Traite le callback FedaPay (webhook ou retour URL)."""
    result = await db.execute(
        select(FedaPayTransaction).where(FedaPayTransaction.fedapay_id == fedapay_transaction_id)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        return

    tx.status = status
    sub = None
    if status == "approved" and tx.subscription_id:
        sub_result = await db.execute(select(Subscription).where(Subscription.id == tx.subscription_id))
        sub = sub_result.scalar_one_or_none()
        if sub:
            sub.status = SubscriptionStatus.ACTIVE
            sub.start_date = datetime.now(timezone.utc)
            if sub.is_yearly:
                sub.end_date = datetime.now(timezone.utc) + timedelta(days=365)
            else:
                sub.end_date = datetime.now(timezone.utc) + timedelta(days=30)

    # ── Notifications via webhook (fire-and-forget) ────────────────────────────
    if status == "approved" and sub:
        try:
            comp_result = await db.execute(select(Company).where(Company.id == tx.company_id))
            company = comp_result.scalar_one_or_none()

            user_q = select(User).where(
                User.company_id == tx.company_id,
                User.deleted_at.is_(None),
                User.is_active.is_(True),
            ).order_by(User.created_at.asc())
            admin_user = (await db.execute(user_q)).scalars().first()

            plan_name = (sub.plan_slug or "starter").capitalize()
            period = "Annuel" if sub.is_yearly else "Mensuel"
            amount_str = f"{tx.amount:,.0f} {tx.currency}"
            end_date_str = sub.end_date.strftime("%d/%m/%Y") if sub.end_date else "–"

            if company and admin_user:
                dashboard_url = f"{settings.FRONTEND_URL}/subscription"
                subject, html = tpl_subscription_confirmed(
                    company_name=company.name,
                    admin_first_name=admin_user.first_name,
                    plan_name=plan_name,
                    amount=amount_str,
                    period=period,
                    end_date=end_date_str,
                    dashboard_url=dashboard_url,
                )
                asyncio.create_task(send_email(admin_user.email, subject, html))

            await notify_new_payment(
                company_name=company.name if company else "–",
                company_email=company.email if company else (tx.customer_email or ""),
                plan_name=plan_name,
                amount=amount_str,
                period=period,
                transaction_id=str(tx.fedapay_id or tx.id),
                db=db,
            )
        except Exception as exc:
            logger.warning("[webhook] Notification post-paiement échouée : %s", exc)


# ── Transactions (pour super admin) ──────────────────────────────────────────

async def list_transactions(
    db: AsyncSession,
    params: PaginationParams,
    company_id: uuid.UUID | None = None,
) -> tuple[list[FedaPayTransaction], int]:
    query = select(FedaPayTransaction).where(FedaPayTransaction.deleted_at.is_(None))
    if company_id:
        query = query.where(FedaPayTransaction.company_id == company_id)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(FedaPayTransaction.created_at.desc()))
    return result.scalars().all(), count


async def list_subscriptions_admin(
    db: AsyncSession,
    params: PaginationParams,
    company_id: uuid.UUID | None = None,
) -> tuple[list[Subscription], int]:
    query = select(Subscription).where(Subscription.deleted_at.is_(None))
    if company_id:
        query = query.where(Subscription.company_id == company_id)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(Subscription.created_at.desc()))
    return result.scalars().all(), count


# ── PlatformConfig ────────────────────────────────────────────────────────────

# Valeurs par défaut si la config n'est pas encore en DB
_DEFAULT_CONFIG = {
    "phone": "+225 07 00 00 00 00",
    "whatsapp": "+225 07 00 00 00 00",
    "email": "contact@recov360.com",
    "address": "Abidjan, Côte d'Ivoire",
    "twitter": "",
    "linkedin": "",
    "facebook": "",
    "footer_tagline": "La solution de recouvrement de créances pour les PME africaines.",
    "company_name": "Recov360",
}


async def get_public_config(db: AsyncSession) -> dict:
    """Retourne la configuration publique de la plateforme."""
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.deleted_at.is_(None)))
    configs = result.scalars().all()
    data = dict(_DEFAULT_CONFIG)
    for c in configs:
        if c.value is not None:
            data[c.key] = c.value
    return data


async def get_all_config(db: AsyncSession) -> list[PlatformConfig]:
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.deleted_at.is_(None)).order_by(PlatformConfig.category, PlatformConfig.key))
    return result.scalars().all()


async def upsert_config(key: str, value: str, label: str, category: str, db: AsyncSession) -> PlatformConfig:
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.key == key))
    config = result.scalar_one_or_none()
    if config:
        config.value = value
        config.label = label
        config.category = category
    else:
        config = PlatformConfig(key=key, value=value, label=label, category=category)
        db.add(config)
    await db.flush()
    return config


async def bulk_upsert_config(items: list[dict], db: AsyncSession) -> list[PlatformConfig]:
    """Met à jour plusieurs clés de configuration en une seule opération."""
    result_list = []
    for item in items:
        c = await upsert_config(
            key=item["key"],
            value=item.get("value", ""),
            label=item.get("label", item["key"]),
            category=item.get("category", "general"),
            db=db,
        )
        result_list.append(c)
    await db.flush()
    return result_list
