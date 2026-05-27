import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True

    creds_path = settings.FIREBASE_CREDENTIALS_PATH
    if not os.path.exists(creds_path):
        logger.warning("Firebase credentials not found at %s — push notifications disabled", creds_path)
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials
        cred = credentials.Certificate(creds_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase initialized successfully")
        return True
    except Exception as e:
        logger.error("Firebase initialization failed: %s", e)
        return False


def is_firebase_ready() -> bool:
    return _firebase_initialized


async def send_fcm(token: str, title: str, body: str, data: dict | None = None) -> bool:
    if not _firebase_initialized:
        return False
    try:
        from firebase_admin import messaging
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
            android=messaging.AndroidConfig(priority="high"),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(aps=messaging.Aps(sound="default"))
            ),
        )
        messaging.send(message)
        return True
    except Exception as e:
        logger.warning("FCM send failed for token %s: %s", token[:20], e)
        return False


async def send_fcm_multicast(tokens: list[str], title: str, body: str, data: dict | None = None) -> int:
    if not _firebase_initialized or not tokens:
        return 0
    try:
        from firebase_admin import messaging
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=tokens,
            android=messaging.AndroidConfig(priority="high"),
        )
        response = messaging.send_each_for_multicast(message)
        return response.success_count
    except Exception as e:
        logger.warning("FCM multicast failed: %s", e)
        return 0
