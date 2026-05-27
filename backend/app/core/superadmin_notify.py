"""
Notifications super admin — Recov360.

Envoie email + push FCM aux super admins configurés
pour chaque événement métier important (inscription, paiement…).
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.firebase import send_fcm_multicast
from app.core.email_service import (
    send_email,
    tpl_sa_new_registration,
    tpl_sa_new_payment,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internes
# ─────────────────────────────────────────────────────────────────────────────

async def _get_superadmin_fcm_tokens(db: AsyncSession) -> list[str]:
    """Récupère les tokens FCM des utilisateurs dont l'email est dans SUPERADMIN_EMAILS."""
    if not settings.superadmin_email_list:
        return []
    from app.models.user import User  # import local → évite les imports circulaires
    result = await db.execute(
        select(User.fcm_token).where(
            User.email.in_(settings.superadmin_email_list),
            User.fcm_token.isnot(None),
            User.deleted_at.is_(None),
        )
    )
    return [row[0] for row in result.fetchall() if row[0]]


def _fire(coro) -> None:
    """Lance une coroutine en tâche de fond sans bloquer la requête courante."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(coro)
        else:
            loop.run_until_complete(coro)
    except Exception as exc:
        logger.debug("_fire: impossible de lancer la tâche : %s", exc)


async def _broadcast_email(subject: str, html: str) -> None:
    """Envoie l'email à tous les super admins configurés (en parallèle)."""
    emails = settings.superadmin_email_list
    if not emails:
        return
    tasks = [send_email(addr, subject, html) for addr in emails]
    await asyncio.gather(*tasks, return_exceptions=True)


# ─────────────────────────────────────────────────────────────────────────────
# Événement : nouvelle inscription
# ─────────────────────────────────────────────────────────────────────────────

async def notify_new_registration(
    company_name: str,
    company_email: str,
    admin_name: str,
    admin_email: str,
    country: str,
    trial_days: int,
    db: AsyncSession,
) -> None:
    """
    Notifie tous les super admins d'une nouvelle inscription.
    - Email à chaque adresse de SUPERADMIN_EMAILS
    - Push FCM à chaque super admin avec un token enregistré
    """
    if not settings.superadmin_email_list:
        return

    registered_at = datetime.now(timezone.utc).strftime("%d/%m/%Y à %H:%M UTC")
    panel_url = f"{settings.FRONTEND_URL}/recov-super-admin-panel/companies"

    # Récupérer les tokens FCM pendant que la session DB est encore ouverte
    tokens = await _get_superadmin_fcm_tokens(db)

    # Email (fire-and-forget)
    try:
        subject, html = tpl_sa_new_registration(
            company_name=company_name,
            company_email=company_email,
            admin_name=admin_name,
            admin_email=admin_email,
            country=country or "Non renseigné",
            trial_days=trial_days,
            panel_url=panel_url,
            registered_at=registered_at,
        )
        _fire(_broadcast_email(subject, html))
    except Exception as exc:
        logger.error("[notify] Erreur email inscription : %s", exc)

    # Push FCM (fire-and-forget)
    if tokens:
        _fire(send_fcm_multicast(
            tokens=tokens,
            title="🆕 Nouvelle inscription",
            body=f"{company_name} vient de s'inscrire sur Recov360",
            data={"type": "new_registration", "company_name": company_name},
        ))


# ─────────────────────────────────────────────────────────────────────────────
# Événement : nouveau paiement confirmé
# ─────────────────────────────────────────────────────────────────────────────

async def notify_new_payment(
    company_name: str,
    company_email: str,
    plan_name: str,
    amount: str,
    period: str,
    transaction_id: str,
    db: AsyncSession,
) -> None:
    """
    Notifie tous les super admins d'un paiement confirmé.
    - Email à chaque adresse de SUPERADMIN_EMAILS
    - Push FCM à chaque super admin avec un token enregistré
    """
    if not settings.superadmin_email_list:
        return

    paid_at = datetime.now(timezone.utc).strftime("%d/%m/%Y à %H:%M UTC")
    panel_url = f"{settings.FRONTEND_URL}/recov-super-admin-panel/transactions"

    # Récupérer les tokens FCM pendant que la session DB est encore ouverte
    tokens = await _get_superadmin_fcm_tokens(db)

    # Email (fire-and-forget)
    try:
        subject, html = tpl_sa_new_payment(
            company_name=company_name,
            company_email=company_email,
            plan_name=plan_name,
            amount=amount,
            period=period,
            transaction_id=transaction_id,
            panel_url=panel_url,
            paid_at=paid_at,
        )
        _fire(_broadcast_email(subject, html))
    except Exception as exc:
        logger.error("[notify] Erreur email paiement : %s", exc)

    # Push FCM (fire-and-forget)
    if tokens:
        _fire(send_fcm_multicast(
            tokens=tokens,
            title="💰 Paiement reçu",
            body=f"{company_name} — {amount} ({plan_name})",
            data={"type": "new_payment", "company_name": company_name, "amount": amount},
        ))
