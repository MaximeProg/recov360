import uuid
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user
from app.shared.pagination import PaginatedResponse, PaginationParams
from app.models.user import User
from app.domains.invoices import service
from app.domains.invoices.schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, PaymentCreate, PaymentResponse,
)

router = APIRouter(prefix="/invoices", tags=["Factures & Créances"])


@router.get("", response_model=PaginatedResponse[InvoiceResponse])
async def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page, search=search)
    invoices, total = await service.list_invoices(current_user.company_id, params, status, db)
    return PaginatedResponse.build(
        items=[InvoiceResponse.model_validate(i) for i in invoices],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.create_invoice(current_user.company_id, current_user.id, data, db)
    return InvoiceResponse.model_validate(invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.get_invoice(invoice_id, current_user.company_id, db)
    return InvoiceResponse.model_validate(invoice)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.update_invoice(invoice_id, current_user.company_id, data, db)
    return InvoiceResponse.model_validate(invoice)


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_invoice(invoice_id, current_user.company_id, db)


@router.get("/{invoice_id}/payments", response_model=list[PaymentResponse])
async def list_payments(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payments = await service.list_payments(invoice_id, current_user.company_id, db)
    return [PaymentResponse.model_validate(p) for p in payments]


@router.post("/{invoice_id}/payments", response_model=PaymentResponse, status_code=201)
async def add_payment(
    invoice_id: uuid.UUID,
    data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await service.add_payment(invoice_id, current_user.company_id, current_user.id, data, db)
    return PaymentResponse.model_validate(payment)


@router.post("/{invoice_id}/payments/{payment_id}/proof", response_model=PaymentResponse)
async def upload_proof(
    invoice_id: uuid.UUID,
    payment_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await service.upload_proof(invoice_id, current_user.company_id, payment_id, file, db)
    return PaymentResponse.model_validate(payment)
