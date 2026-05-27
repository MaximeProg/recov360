import uuid
import cloudinary
import cloudinary.uploader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status, UploadFile
from app.models.company import Company
from app.core.config import settings
from app.domains.companies.schemas import CompanyUpdate, SMTPConfigUpdate

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


async def get_company(company_id: uuid.UUID, db: AsyncSession) -> Company:
    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.deleted_at.is_(None))
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise introuvable")
    return company


async def update_company(company_id: uuid.UUID, data: CompanyUpdate, db: AsyncSession) -> Company:
    company = await get_company(company_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(company, field, value)
    return company


async def upload_logo(company_id: uuid.UUID, file: UploadFile, db: AsyncSession) -> Company:
    company = await get_company(company_id, db)
    contents = await file.read()
    result = cloudinary.uploader.upload(
        contents,
        folder=f"recov360/companies/{company_id}/logo",
        public_id="logo",
        overwrite=True,
        resource_type="image",
    )
    company.logo_url = result["secure_url"]
    return company


async def update_smtp_config(company_id: uuid.UUID, data: SMTPConfigUpdate, db: AsyncSession) -> Company:
    company = await get_company(company_id, db)
    company.smtp_config = data.model_dump()
    return company
