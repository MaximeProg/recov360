import asyncio
from app.workers.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.notification import NotificationType


def run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="app.workers.tasks_notifications.send_push_notification")
def send_push_notification(user_id: str, title: str, message: str, data: dict | None = None):
    async def _run():
        async with AsyncSessionLocal() as db:
            import uuid
            from sqlalchemy import select
            from app.models.user import User
            result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            user = result.scalar_one_or_none()
            if not user or not user.fcm_token:
                return False
            try:
                import firebase_admin
                from firebase_admin import messaging
                message_obj = messaging.Message(
                    notification=messaging.Notification(title=title, body=message),
                    data=data or {},
                    token=user.fcm_token,
                )
                messaging.send(message_obj)
                return True
            except Exception:
                return False
    return run_async(_run())


@celery_app.task(name="app.workers.tasks_notifications.create_internal_notification")
def create_internal_notification(company_id: str, user_id: str, title: str, message: str, notification_type: str):
    import uuid
    async def _run():
        async with AsyncSessionLocal() as db:
            from app.domains.notifications.service import create_notification
            notif = await create_notification(
                company_id=uuid.UUID(company_id),
                user_id=uuid.UUID(user_id),
                title=title,
                message=message,
                notification_type=NotificationType(notification_type),
                db=db,
            )
            await db.commit()
            return str(notif.id)
    return run_async(_run())
