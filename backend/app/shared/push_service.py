"""
Service centralisé de notifications push.
Chaque appel à `notify_company` :
  1. Crée une notification interne en base (visible dans la cloche)
  2. Envoie un FCM push à tous les utilisateurs ciblés qui ont un fcm_token
"""
import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.notification import Notification, NotificationType
from app.core.firebase import send_fcm_multicast

logger = logging.getLogger(__name__)

_ROLE_MAP = {
    "admin": [UserRole.admin],
    "superviseur": [UserRole.superviseur],
    "agent": [UserRole.agent],
    "comptable": [UserRole.comptable],
    "managers": [UserRole.admin, UserRole.superviseur],
    "all": [UserRole.admin, UserRole.superviseur, UserRole.agent, UserRole.comptable],
}


async def notify_company(
    db: AsyncSession,
    company_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: NotificationType,
    target: str = "managers",
    action_url: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    data: dict | None = None,
):
    """
    Notifie les utilisateurs d'une company selon leur rôle.
    target: 'admin' | 'superviseur' | 'agent' | 'comptable' | 'managers' | 'all'
    """
    roles = _ROLE_MAP.get(target, _ROLE_MAP["managers"])

    result = await db.execute(
        select(User).where(
            User.company_id == company_id,
            User.role.in_(roles),
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    )
    users = result.scalars().all()

    for user in users:
        notif = Notification(
            company_id=company_id,
            user_id=user.id,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
        )
        db.add(notif)

    fcm_tokens = [u.fcm_token for u in users if u.fcm_token]
    if fcm_tokens:
        sent = await send_fcm_multicast(
            tokens=fcm_tokens,
            title=title,
            body=message,
            data=data or {},
        )
        logger.debug("FCM multicast: %d/%d sent for company %s", sent, len(fcm_tokens), company_id)


async def notify_user(
    db: AsyncSession,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: NotificationType,
    action_url: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    data: dict | None = None,
):
    """Notifie un utilisateur spécifique."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        return

    notif = Notification(
        company_id=company_id,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
    )
    db.add(notif)

    if user.fcm_token:
        from app.core.firebase import send_fcm
        await send_fcm(
            token=user.fcm_token,
            title=title,
            body=message,
            data=data or {},
        )
