import uuid
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user
from app.shared.pagination import PaginatedResponse, PaginationParams
from app.models.user import User
from app.domains.debtors import service
from app.domains.debtors.schemas import DebtorCreate, DebtorUpdate, DebtorResponse, NoteAdd

router = APIRouter(prefix="/debtors", tags=["Débiteurs"])


@router.get("", response_model=PaginatedResponse[DebtorResponse])
async def list_debtors(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page, search=search)
    debtors, total = await service.list_debtors(current_user.company_id, params, db)
    return PaginatedResponse.build(
        items=[DebtorResponse.model_validate(d) for d in debtors],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=DebtorResponse, status_code=201)
async def create_debtor(
    data: DebtorCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debtor = await service.create_debtor(current_user.company_id, current_user.id, data, db)
    return DebtorResponse.model_validate(debtor)


@router.get("/{debtor_id}", response_model=DebtorResponse)
async def get_debtor(
    debtor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debtor = await service.get_debtor(debtor_id, current_user.company_id, db)
    return DebtorResponse.model_validate(debtor)


@router.put("/{debtor_id}", response_model=DebtorResponse)
async def update_debtor(
    debtor_id: uuid.UUID,
    data: DebtorUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debtor = await service.update_debtor(debtor_id, current_user.company_id, data, db)
    return DebtorResponse.model_validate(debtor)


@router.delete("/{debtor_id}", status_code=204)
async def delete_debtor(
    debtor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_debtor(debtor_id, current_user.company_id, db)


@router.post("/{debtor_id}/notes", response_model=DebtorResponse)
async def add_note(
    debtor_id: uuid.UUID,
    data: NoteAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debtor = await service.add_note(debtor_id, current_user.company_id, data, db)
    return DebtorResponse.model_validate(debtor)


@router.post("/{debtor_id}/photo", response_model=DebtorResponse)
async def upload_photo(
    debtor_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debtor = await service.upload_photo(debtor_id, current_user.company_id, file, db)
    return DebtorResponse.model_validate(debtor)


@router.post("/import", status_code=200)
async def import_debtors(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.import_from_csv(current_user.company_id, current_user.id, file, db)
