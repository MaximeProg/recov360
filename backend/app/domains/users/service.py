import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.user import User
from app.core.security import hash_password
from app.domains.users.schemas import UserCreate, UserUpdate
from app.shared.pagination import PaginationParams


async def list_users(company_id: uuid.UUID, params: PaginationParams, db: AsyncSession) -> tuple[list[User], int]:
    query = select(User).where(User.company_id == company_id, User.deleted_at.is_(None))
    if params.search:
        term = f"%{params.search}%"
        query = query.where(
            (User.first_name.ilike(term)) | (User.last_name.ilike(term)) | (User.email.ilike(term))
        )
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(User.created_at.desc()))
    return result.scalars().all(), total


async def get_user(user_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    return user


async def create_user(company_id: uuid.UUID, data: UserCreate, db: AsyncSession) -> User:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé")

    user = User(
        company_id=company_id,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    await db.flush()
    return user


async def update_user(user_id: uuid.UUID, company_id: uuid.UUID, data: UserUpdate, db: AsyncSession) -> User:
    user = await get_user(user_id, company_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    return user


async def delete_user(user_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession):
    user = await get_user(user_id, company_id, db)
    user.soft_delete()


async def update_fcm_token(user: User, fcm_token: str, db: AsyncSession):
    user.fcm_token = fcm_token
