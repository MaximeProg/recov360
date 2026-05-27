from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user, require_admin
from app.models.user import User
from app.domains.companies import service
from app.domains.companies.schemas import CompanyUpdate, CompanyResponse, SMTPConfigUpdate

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    company = await service.get_company(current_user.company_id, db)
    return company


@router.put("/me", response_model=CompanyResponse)
async def update_my_company(
    data: CompanyUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_company(current_user.company_id, data, db)


@router.post("/me/logo", response_model=CompanyResponse)
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.upload_logo(current_user.company_id, file, db)


@router.put("/me/smtp", response_model=CompanyResponse)
async def update_smtp(
    data: SMTPConfigUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_smtp_config(current_user.company_id, data, db)
