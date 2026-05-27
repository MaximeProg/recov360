from fastapi import Depends, HTTPException, status
from app.shared.dependencies import get_current_user
from app.models.user import User
from app.core.config import settings


async def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email.lower() not in settings.superadmin_email_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux super administrateurs de la plateforme",
        )
    return current_user
