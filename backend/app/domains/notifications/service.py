import uuid
import httpx
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from app.models.notification import Notification, NotificationType
from app.models.reminder import Reminder, ReminderChannel, ReminderStatus, ReminderType
from app.models.invoice import Invoice
from app.models.debtor import Debtor
from app.models.template import MessageTemplate
from app.models.company import Company
from app.core.config import settings
from app.shared.pagination import PaginationParams
from app.shared.utils import render_template


async def list_notifications(user_id: uuid.UUID, company_id: uuid.UUID, params: PaginationParams, db: AsyncSession):
    query = select(Notification).where(
        Notification.user_id == user_id,
        Notification.company_id == company_id,
        Notification.deleted_at.is_(None),
    )
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()
    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(Notification.created_at.desc()))
    return result.scalars().all(), total


async def mark_read(notification_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True


async def mark_all_read(user_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(
        select(Notification).where(Notification.user_id == user_id, Notification.company_id == company_id, Notification.is_read.is_(False))
    )
    for notif in result.scalars().all():
        notif.is_read = True


async def create_notification(company_id: uuid.UUID, user_id: uuid.UUID, title: str, message: str,
                               notification_type: NotificationType, db: AsyncSession,
                               action_url: str | None = None, entity_type: str | None = None, entity_id: str | None = None):
    notif = Notification(
        company_id=company_id,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    await db.flush()
    return notif


async def send_email_reminder(invoice: Invoice, debtor: Debtor, company: Company, template: MessageTemplate | None, custom_message: str | None):
    smtp_cfg = company.smtp_config or {}
    host = smtp_cfg.get("host", settings.SMTP_HOST)
    port = smtp_cfg.get("port", settings.SMTP_PORT)
    user = smtp_cfg.get("user", settings.SMTP_USER)
    password = smtp_cfg.get("password", settings.SMTP_PASSWORD)
    from_email = smtp_cfg.get("from_email", settings.SMTP_FROM_EMAIL)
    from_name = smtp_cfg.get("from_name", settings.SMTP_FROM_NAME)

    if not debtor.email:
        return False, "Email débiteur manquant"

    variables = {
        "debtor_name": debtor.name,
        "invoice_number": invoice.invoice_number,
        "amount": f"{invoice.amount:,.0f} {invoice.currency}",
        "amount_paid": f"{invoice.amount_paid:,.0f} {invoice.currency}",
        "due_date": invoice.due_date.strftime("%d/%m/%Y"),
        "company_name": company.name,
    }

    subject = "Rappel de paiement"
    body = custom_message or ""

    if template:
        subject = render_template(template.subject or subject, variables)
        body = render_template(template.body, variables)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = debtor.email
    msg.attach(MIMEText(body, "html" if "<" in body else "plain"))

    try:
        # port 587 = STARTTLS (start_tls=True) — PAS use_tls qui est pour le port 465
        async with aiosmtplib.SMTP(hostname=host, port=int(port), start_tls=True) as smtp:
            await smtp.login(user, password)
            await smtp.send_message(msg)
        return True, None
    except Exception as e:
        return False, str(e)


async def send_sms_reminder(phone: str, message: str) -> tuple[bool, str | None]:
    if not settings.SMS_GATEWAY_URL or not phone:
        return False, "Gateway SMS non configurée"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                settings.SMS_GATEWAY_URL,
                json={"to": phone, "message": message, "sender": settings.SMS_SENDER_ID},
                headers={"Authorization": f"Bearer {settings.SMS_GATEWAY_API_KEY}"},
            )
            if resp.status_code < 300:
                return True, None
            return False, resp.text
    except Exception as e:
        return False, str(e)


async def send_reminder(
    invoice_id: uuid.UUID,
    company_id: uuid.UUID,
    channel: str,
    db: AsyncSession,
    template_id: uuid.UUID | None = None,
    custom_message: str | None = None,
    reminder_type: ReminderType = ReminderType.rappel_simple,
    level: int = 1,
) -> Reminder:
    invoice_result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.company_id == company_id)
    )
    invoice = invoice_result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    debtor_result = await db.execute(select(Debtor).where(Debtor.id == invoice.debtor_id))
    debtor = debtor_result.scalar_one()

    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one()

    template = None
    if template_id:
        t_result = await db.execute(select(MessageTemplate).where(MessageTemplate.id == template_id))
        template = t_result.scalar_one_or_none()

    channel_enum = ReminderChannel(channel) if isinstance(channel, str) else channel

    reminder = Reminder(
        invoice_id=invoice_id,
        company_id=company_id,
        template_id=template_id,
        channel=channel_enum,
        reminder_type=reminder_type,
        level=level,
        recipient_email=debtor.email,
        recipient_phone=debtor.phone,
    )

    if channel_enum == ReminderChannel.email:
        success, error = await send_email_reminder(invoice, debtor, company, template, custom_message)
        reminder.status = ReminderStatus.sent if success else ReminderStatus.failed
        reminder.error_message = error
    elif channel_enum == ReminderChannel.sms:
        msg = custom_message or (template.body if template else f"Rappel: Facture {invoice.invoice_number} due le {invoice.due_date.strftime('%d/%m/%Y')}")
        variables = {"debtor_name": debtor.name, "invoice_number": invoice.invoice_number, "due_date": invoice.due_date.strftime("%d/%m/%Y")}
        msg = render_template(msg, variables)
        success, error = await send_sms_reminder(debtor.phone, msg)
        reminder.status = ReminderStatus.sent if success else ReminderStatus.failed
        reminder.error_message = error

    from datetime import datetime, timezone
    reminder.sent_at = datetime.now(timezone.utc)
    invoice.reminder_level = level

    db.add(reminder)
    await db.flush()
    return reminder
