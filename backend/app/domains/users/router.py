import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user, require_admin
from app.shared.pagination import PaginatedResponse, PaginationParams
from app.models.user import User
from app.domains.users import service
from app.domains.users.schemas import UserCreate, UserUpdate, UserResponse, UserFCMUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page, search=search)
    users, total = await service.list_users(current_user.company_id, params, db)
    return PaginatedResponse.build(
        items=[UserResponse.model_validate(u) for u in users],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await service.create_user(current_user.company_id, data, db)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_user(user_id, current_user.company_id, db)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await service.update_user(user_id, current_user.company_id, data, db)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_user(user_id, current_user.company_id, db)


@router.post("/me/fcm-token", status_code=204)
async def update_fcm_token(
    data: UserFCMUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.update_fcm_token(current_user, data.fcm_token, db)
