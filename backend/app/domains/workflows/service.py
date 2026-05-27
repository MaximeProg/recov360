import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from app.models.workflow import WorkflowRule
from app.models.template import MessageTemplate
from app.models.promise import PromiseToPay, PromiseStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.debtor import Debtor
from app.models.notification import NotificationType
from app.domains.workflows.schemas import WorkflowRuleCreate, WorkflowRuleUpdate, PromiseCreate, PromiseUpdate, TemplateCreate, TemplateUpdate
from app.shared.push_service import notify_company


async def list_rules(company_id: uuid.UUID, db: AsyncSession) -> list[WorkflowRule]:
    result = await db.execute(
        select(WorkflowRule).where(WorkflowRule.company_id == company_id, WorkflowRule.deleted_at.is_(None))
        .order_by(WorkflowRule.order)
    )
    return result.scalars().all()


async def create_rule(company_id: uuid.UUID, data: WorkflowRuleCreate, db: AsyncSession) -> WorkflowRule:
    rule = WorkflowRule(company_id=company_id, **data.model_dump())
    db.add(rule)
    await db.flush()
    return rule


async def update_rule(rule_id: uuid.UUID, company_id: uuid.UUID, data: WorkflowRuleUpdate, db: AsyncSession) -> WorkflowRule:
    result = await db.execute(
        select(WorkflowRule).where(WorkflowRule.id == rule_id, WorkflowRule.company_id == company_id, WorkflowRule.deleted_at.is_(None))
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(rule, field, value)
    return rule


async def delete_rule(rule_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(
        select(WorkflowRule).where(WorkflowRule.id == rule_id, WorkflowRule.company_id == company_id)
    )
    rule = result.scalar_one_or_none()
    if rule:
        rule.soft_delete()


async def list_templates(company_id: uuid.UUID, db: AsyncSession) -> list[MessageTemplate]:
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.company_id == company_id, MessageTemplate.deleted_at.is_(None))
        .order_by(MessageTemplate.created_at.desc())
    )
    return result.scalars().all()


async def create_template(company_id: uuid.UUID, data: TemplateCreate, db: AsyncSession) -> MessageTemplate:
    template = MessageTemplate(company_id=company_id, **data.model_dump())
    db.add(template)
    await db.flush()
    return template


async def update_template(template_id: uuid.UUID, company_id: uuid.UUID, data: TemplateUpdate, db: AsyncSession) -> MessageTemplate:
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id, MessageTemplate.company_id == company_id, MessageTemplate.deleted_at.is_(None))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(template, field, value)
    return template


async def delete_template(template_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id, MessageTemplate.company_id == company_id)
    )
    template = result.scalar_one_or_none()
    if template:
        template.soft_delete()


async def list_promises(company_id: uuid.UUID, db: AsyncSession) -> list[PromiseToPay]:
    result = await db.execute(
        select(PromiseToPay).where(PromiseToPay.company_id == company_id, PromiseToPay.deleted_at.is_(None))
        .order_by(PromiseToPay.promised_date)
    )
    return result.scalars().all()


async def create_promise(company_id: uuid.UUID, created_by: uuid.UUID, data: PromiseCreate, db: AsyncSession) -> PromiseToPay:
    promise = PromiseToPay(company_id=company_id, created_by=created_by, **data.model_dump())
    db.add(promise)
    await db.flush()
    return promise


async def update_promise(promise_id: uuid.UUID, company_id: uuid.UUID, data: PromiseUpdate, db: AsyncSession) -> PromiseToPay:
    result = await db.execute(
        select(PromiseToPay).where(PromiseToPay.id == promise_id, PromiseToPay.company_id == company_id)
    )
    promise = result.scalar_one_or_none()
    if not promise:
        raise HTTPException(status_code=404, detail="Promesse introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(promise, field, value)
    return promise


async def check_broken_promises(db: AsyncSession) -> int:
    today = date.today()
    result = await db.execute(
        select(PromiseToPay).where(
            PromiseToPay.promised_date < today,
            PromiseToPay.status == PromiseStatus.pending,
            PromiseToPay.deleted_at.is_(None),
        )
    )
    promises = result.scalars().all()
    for p in promises:
        p.status = PromiseStatus.broken
        invoice_result = await db.execute(select(Invoice).where(Invoice.id == p.invoice_id))
        invoice = invoice_result.scalar_one_or_none()
        debtor_result = await db.execute(select(Debtor).where(Debtor.id == p.debtor_id))
        debtor = debtor_result.scalar_one_or_none()
        invoice_ref = invoice.invoice_number if invoice else "—"
        debtor_name = debtor.name if debtor else "—"
        await notify_company(
            db=db,
            company_id=p.company_id,
            title="Promesse de paiement non tenue",
            message=f"{debtor_name} — {p.promised_amount:,.0f} XOF prévu le {p.promised_date.strftime('%d/%m/%Y')} (facture {invoice_ref})",
            notification_type=NotificationType.promesse_non_tenue,
            target="managers",
            action_url=f"/invoices/{p.invoice_id}",
            entity_type="promise",
            entity_id=p.id,
            data={"promise_id": str(p.id), "debtor_name": debtor_name},
        )
    return len(promises)
