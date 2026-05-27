import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.company import Company
from app.models.user import User, UserRole
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.core.email_service import send_email, tpl_welcome
from app.core.superadmin_notify import notify_new_registration
from app.domains.auth.schemas import RegisterRequest, LoginRequest
from app.domains.subscriptions.service import create_trial_subscription

import logging
logger = logging.getLogger(__name__)


async def register(data: RegisterRequest, db: AsyncSession) -> dict:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé")

    company = Company(
        name=data.company_name,
        email=data.company_email,
        phone=data.company_phone,
        country=data.company_country,
    )
    db.add(company)
    await db.flush()

    user = User(
        company_id=company.id,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole.admin,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    # Créer automatiquement une période d'essai de 14 jours (plan starter)
    trial_days = 14
    try:
        sub = await create_trial_subscription(company.id, "starter", db)
        if sub and sub.end_date and sub.start_date:
            trial_days = max(1, round((sub.end_date - sub.start_date).total_seconds() / 86400))
    except Exception:
        # Si le plan "starter" n'existe pas encore, ignorer silencieusement
        pass

    # ── Email de bienvenue → admin de la nouvelle entreprise (fire-and-forget) ──
    try:
        dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
        subject, html = tpl_welcome(
            company_name=company.name,
            admin_first_name=user.first_name,
            trial_days=trial_days,
            dashboard_url=dashboard_url,
        )
        asyncio.create_task(send_email(user.email, subject, html))
    except Exception as exc:
        logger.warning("[register] Email bienvenue non envoyé : %s", exc)

    # ── Notification super admins (email + push FCM) ──────────────────────────
    try:
        await notify_new_registration(
            company_name=company.name,
            company_email=company.email or "",
            admin_name=f"{user.first_name} {user.last_name}",
            admin_email=user.email,
            country=company.country or "",
            trial_days=trial_days,
            db=db,
        )
    except Exception as exc:
        logger.warning("[register] Notification super admin échouée : %s", exc)

    access_token = create_access_token(str(user.id), {"company_id": str(company.id), "role": user.role.value})
    refresh_token = create_refresh_token(str(user.id))

    return {"access_token": access_token, "refresh_token": refresh_token}


async def login(data: LoginRequest, db: AsyncSession) -> dict:
    result = await db.execute(
        select(User).where(User.email == data.email, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte désactivé")

    user.last_login = datetime.now(timezone.utc)

    access_token = create_access_token(str(user.id), {"company_id": str(user.company_id), "role": user.role.value})
    refresh_token = create_refresh_token(str(user.id))

    return {"access_token": access_token, "refresh_token": refresh_token}


async def refresh_tokens(refresh_token: str, db: AsyncSession) -> dict:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de rafraîchissement invalide")

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(payload["sub"]), User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")

    access_token = create_access_token(str(user.id), {"company_id": str(user.company_id), "role": user.role.value})
    new_refresh = create_refresh_token(str(user.id))

    return {"access_token": access_token, "refresh_token": new_refresh}


async def change_password(user: User, current_password: str, new_password: str, db: AsyncSession):
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mot de passe actuel incorrect")
    user.password_hash = hash_password(new_password)
