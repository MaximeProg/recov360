import asyncio
from datetime import date, timedelta
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.invoice import Invoice, InvoiceStatus
from app.models.workflow import WorkflowRule
from app.models.debtor import Debtor
from app.models.notification import NotificationType
from app.domains.notifications.service import send_reminder
from app.models.reminder import ReminderChannel, ReminderType, ReminderStatus
from app.shared.push_service import notify_company


def run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="app.workers.tasks_workflows.mark_overdue_invoices")
def mark_overdue_invoices():
    async def _run():
        async with AsyncSessionLocal() as db:
            today = date.today()
            result = await db.execute(
                select(Invoice).where(
                    Invoice.due_date < today,
                    Invoice.status.in_([InvoiceStatus.en_attente, InvoiceStatus.partiellement_paye]),
                    Invoice.deleted_at.is_(None),
                )
            )
            invoices = result.scalars().all()
            count = 0
            for invoice in invoices:
                invoice.status = InvoiceStatus.en_retard
                count += 1
            await db.commit()
            return count
    return run_async(_run())


@celery_app.task(name="app.workers.tasks_workflows.run_workflow_reminders")
def run_workflow_reminders():
    async def _run():
        async with AsyncSessionLocal() as db:
            today = date.today()
            rules_result = await db.execute(
                select(WorkflowRule).where(WorkflowRule.is_active.is_(True), WorkflowRule.deleted_at.is_(None))
            )
            rules = rules_result.scalars().all()

            sent = 0
            for rule in rules:
                target_date = today + timedelta(days=rule.trigger_days) if rule.trigger_days < 0 else today - timedelta(days=rule.trigger_days)
                invoices_result = await db.execute(
                    select(Invoice).where(
                        Invoice.company_id == rule.company_id,
                        Invoice.due_date == target_date,
                        Invoice.status.notin_([InvoiceStatus.solde]),
                        Invoice.deleted_at.is_(None),
                    )
                )
                invoices = invoices_result.scalars().all()
                for invoice in invoices:
                    channels = [ReminderChannel.email, ReminderChannel.sms] if rule.channel.value == "both" else [rule.channel]
                    for channel in channels:
                        try:
                            reminder = await send_reminder(
                                invoice_id=invoice.id,
                                company_id=invoice.company_id,
                                channel=channel.value,
                                db=db,
                                template_id=rule.template_id,
                                level=int(rule.level.value.split("_")[1]),
                            )
                            sent += 1
                            if reminder.status == ReminderStatus.failed:
                                await notify_company(
                                    db=db,
                                    company_id=invoice.company_id,
                                    title="Echec de relance",
                                    message=f"Relance {channel.value} échouée pour facture {invoice.invoice_number}",
                                    notification_type=NotificationType.echec_relance,
                                    target="admin",
                                    entity_type="invoice",
                                    entity_id=invoice.id,
                                )
                        except Exception:
                            pass
            await db.commit()
            return sent
    return run_async(_run())


@celery_app.task(name="app.workers.tasks_workflows.check_broken_promises")
def check_broken_promises():
    async def _run():
        async with AsyncSessionLocal() as db:
            from app.domains.workflows.service import check_broken_promises as _check
            count = await _check(db)
            await db.commit()
            return count
    return run_async(_run())
