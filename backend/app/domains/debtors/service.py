import uuid
import io
import cloudinary.uploader
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException, status, UploadFile
import pandas as pd
from app.models.debtor import Debtor
from app.domains.debtors.schemas import DebtorCreate, DebtorUpdate, NoteAdd
from app.shared.pagination import PaginationParams


async def list_debtors(company_id: uuid.UUID, params: PaginationParams, db: AsyncSession) -> tuple[list[Debtor], int]:
    query = select(Debtor).where(Debtor.company_id == company_id, Debtor.deleted_at.is_(None))
    if params.search:
        term = f"%{params.search}%"
        query = query.where(
            or_(Debtor.name.ilike(term), Debtor.phone.ilike(term), Debtor.email.ilike(term), Debtor.company_name.ilike(term))
        )
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()
    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(Debtor.created_at.desc()))
    return result.scalars().all(), total


async def get_debtor(debtor_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession) -> Debtor:
    result = await db.execute(
        select(Debtor).where(Debtor.id == debtor_id, Debtor.company_id == company_id, Debtor.deleted_at.is_(None))
    )
    debtor = result.scalar_one_or_none()
    if not debtor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Débiteur introuvable")
    return debtor


async def create_debtor(company_id: uuid.UUID, created_by: uuid.UUID, data: DebtorCreate, db: AsyncSession) -> Debtor:
    debtor = Debtor(company_id=company_id, created_by=created_by, **data.model_dump())
    db.add(debtor)
    await db.flush()
    return debtor


async def update_debtor(debtor_id: uuid.UUID, company_id: uuid.UUID, data: DebtorUpdate, db: AsyncSession) -> Debtor:
    debtor = await get_debtor(debtor_id, company_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(debtor, field, value)
    return debtor


async def delete_debtor(debtor_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession):
    debtor = await get_debtor(debtor_id, company_id, db)
    debtor.soft_delete()


async def add_note(debtor_id: uuid.UUID, company_id: uuid.UUID, data: NoteAdd, db: AsyncSession) -> Debtor:
    debtor = await get_debtor(debtor_id, company_id, db)
    notes = list(debtor.notes or [])
    notes.append({"content": data.content, "author": data.author, "created_at": datetime.now(timezone.utc).isoformat()})
    debtor.notes = notes
    return debtor


async def upload_photo(debtor_id: uuid.UUID, company_id: uuid.UUID, file: UploadFile, db: AsyncSession) -> Debtor:
    debtor = await get_debtor(debtor_id, company_id, db)
    contents = await file.read()
    result = cloudinary.uploader.upload(
        contents, folder=f"recov360/debtors/{debtor_id}", public_id="photo", overwrite=True
    )
    debtor.photo_url = result["secure_url"]
    return debtor


async def import_from_csv(company_id: uuid.UUID, created_by: uuid.UUID, file: UploadFile, db: AsyncSession) -> dict:
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        df = pd.read_excel(io.BytesIO(contents))

    required_cols = {"name"}
    if not required_cols.issubset(df.columns):
        raise HTTPException(status_code=400, detail="Colonnes requises: name")

    created, skipped = 0, 0
    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        if not name:
            skipped += 1
            continue
        debtor = Debtor(
            company_id=company_id,
            created_by=created_by,
            name=name,
            phone=str(row.get("phone", "")) or None,
            email=str(row.get("email", "")) or None,
            company_name=str(row.get("company_name", "")) or None,
            address=str(row.get("address", "")) or None,
        )
        db.add(debtor)
        created += 1

    await db.flush()
    return {"created": created, "skipped": skipped}
