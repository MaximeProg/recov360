import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status, UploadFile
import cloudinary.uploader
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.models.debtor import Debtor
from app.domains.invoices.schemas import InvoiceCreate, InvoiceUpdate, PaymentCreate
from app.shared.pagination import PaginationParams
from app.shared.utils import generate_invoice_number
from app.shared.push_service import notify_company
from app.models.notification import NotificationType


async def list_invoices(company_id: uuid.UUID, params: PaginationParams, status_filter: str | None, db: AsyncSession):
    query = select(Invoice).where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if params.search:
        term = f"%{params.search}%"
        query = query.where(Invoice.invoice_number.ilike(term))
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()
    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(Invoice.created_at.desc()))
    return result.scalars().all(), total


async def get_invoice(invoice_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession) -> Invoice:
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facture introuvable")
    return invoice


async def create_invoice(company_id: uuid.UUID, created_by: uuid.UUID, data: InvoiceCreate, db: AsyncSession) -> Invoice:
    debtor_result = await db.execute(
        select(Debtor).where(Debtor.id == data.debtor_id, Debtor.company_id == company_id)
    )
    debtor = debtor_result.scalar_one_or_none()
    if not debtor:
        raise HTTPException(status_code=404, detail="Débiteur introuvable")

    invoice_number = data.invoice_number or generate_invoice_number("FAC")
    invoice = Invoice(
        company_id=company_id,
        created_by=created_by,
        invoice_number=invoice_number,
        debtor_id=data.debtor_id,
        description=data.description,
        currency=data.currency,
        amount=data.amount,
        due_date=data.due_date,
        penalty_rate=data.penalty_rate,
        notes=data.notes,
    )
    db.add(invoice)
    await db.flush()

    debtor.total_due = (debtor.total_due or 0) + data.amount

    await notify_company(
        db=db,
        company_id=company_id,
        title="Nouvelle créance enregistrée",
        message=f"{debtor.name} — {data.amount:,.0f} {data.currency} échéance {data.due_date.strftime('%d/%m/%Y')}",
        notification_type=NotificationType.nouvelle_creance,
        target="managers",
        action_url=f"/invoices/{invoice.id}",
        entity_type="invoice",
        entity_id=invoice.id,
        data={"invoice_id": str(invoice.id), "debtor_name": debtor.name},
    )
    return invoice


async def update_invoice(invoice_id: uuid.UUID, company_id: uuid.UUID, data: InvoiceUpdate, db: AsyncSession) -> Invoice:
    invoice = await get_invoice(invoice_id, company_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(invoice, field, value)
    return invoice


async def delete_invoice(invoice_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession):
    invoice = await get_invoice(invoice_id, company_id, db)
    invoice.soft_delete()


async def list_payments(invoice_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession) -> list[Payment]:
    await get_invoice(invoice_id, company_id, db)
    result = await db.execute(
        select(Payment)
        .where(Payment.invoice_id == invoice_id, Payment.company_id == company_id)
        .order_by(Payment.payment_date.desc())
    )
    return result.scalars().all()


async def add_payment(invoice_id: uuid.UUID, company_id: uuid.UUID, created_by: uuid.UUID, data: PaymentCreate, db: AsyncSession) -> Payment:
    invoice = await get_invoice(invoice_id, company_id, db)

    if invoice.status == InvoiceStatus.solde:
        raise HTTPException(status_code=400, detail="Facture déjà soldée")

    if data.amount > (invoice.amount + invoice.penalty_amount - invoice.amount_paid):
        raise HTTPException(status_code=400, detail="Montant supérieur au solde restant")

    payment = Payment(
        invoice_id=invoice_id,
        company_id=company_id,
        created_by=created_by,
        amount=data.amount,
        payment_date=data.payment_date,
        method=data.method,
        reference=data.reference,
        notes=data.notes,
    )
    db.add(payment)

    invoice.amount_paid = (invoice.amount_paid or 0) + data.amount
    total = invoice.amount + invoice.penalty_amount
    previously_solde = invoice.status == InvoiceStatus.solde

    if invoice.amount_paid >= total:
        invoice.status = InvoiceStatus.solde
        invoice.paid_date = data.payment_date
    elif invoice.amount_paid > 0:
        invoice.status = InvoiceStatus.partiellement_paye

    debtor_result = await db.execute(select(Debtor).where(Debtor.id == invoice.debtor_id))
    debtor = debtor_result.scalar_one_or_none()
    if debtor:
        debtor.total_paid = (debtor.total_paid or 0) + data.amount

    await db.flush()

    if invoice.status == InvoiceStatus.solde:
        msg = f"Facture {invoice.invoice_number} entièrement soldée — {invoice.amount:,.0f} {invoice.currency}"
    else:
        solde_restant = total - invoice.amount_paid
        msg = f"Paiement de {data.amount:,.0f} {invoice.currency} reçu sur {invoice.invoice_number} — Reste {solde_restant:,.0f}"

    await notify_company(
        db=db,
        company_id=company_id,
        title="Paiement reçu",
        message=msg,
        notification_type=NotificationType.paiement_recu,
        target="managers",
        action_url=f"/invoices/{invoice_id}",
        entity_type="invoice",
        entity_id=invoice_id,
        data={"invoice_id": str(invoice_id), "amount": str(data.amount), "status": str(invoice.status.value if hasattr(invoice.status, 'value') else invoice.status)},
    )
    return payment


async def upload_proof(invoice_id: uuid.UUID, company_id: uuid.UUID, payment_id: uuid.UUID, file: UploadFile, db: AsyncSession) -> Payment:
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.invoice_id == invoice_id, Payment.company_id == company_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    contents = await file.read()
    upload = cloudinary.uploader.upload(contents, folder=f"recov360/payments/{payment_id}", resource_type="auto")
    payment.proof_url = upload["secure_url"]
    return payment


async def mark_overdue(db: AsyncSession):
    today = date.today()
    result = await db.execute(
        select(Invoice).where(
            Invoice.due_date < today,
            Invoice.status.in_([InvoiceStatus.en_attente, InvoiceStatus.partiellement_paye]),
            Invoice.deleted_at.is_(None),
        )
    )
    invoices = result.scalars().all()
    for invoice in invoices:
        invoice.status = InvoiceStatus.en_retard
        await notify_company(
            db=db,
            company_id=invoice.company_id,
            title="Facture en retard",
            message=f"Facture {invoice.invoice_number} — {invoice.amount - invoice.amount_paid:,.0f} {invoice.currency} en retard",
            notification_type=NotificationType.retard_important,
            target="all",
            action_url=f"/invoices/{invoice.id}",
            entity_type="invoice",
            entity_id=invoice.id,
            data={"invoice_id": str(invoice.id)},
        )
    return len(invoices)
