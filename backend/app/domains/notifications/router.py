import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user
from app.shared.pagination import PaginatedResponse, PaginationParams
from app.models.user import User
from app.models.reminder import ReminderType
from app.domains.notifications import service
from app.domains.notifications.schemas import NotificationResponse, ReminderSendRequest

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page)
    notifs, total = await service.list_notifications(current_user.id, current_user.company_id, params, db)
    return PaginatedResponse.build(
        items=[NotificationResponse.model_validate(n) for n in notifs],
        total=total, page=page, per_page=per_page,
    )


@router.post("/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.mark_read(notification_id, current_user.id, db)


@router.post("/read-all", status_code=204)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.mark_all_read(current_user.id, current_user.company_id, db)


@router.post("/reminders/send", status_code=201)
async def send_reminder(
    data: ReminderSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reminder = await service.send_reminder(
        invoice_id=data.invoice_id,
        company_id=current_user.company_id,
        channel=data.channel,
        db=db,
        template_id=data.template_id,
        custom_message=data.message,
        reminder_type=ReminderType.rappel_simple,
        level=1,
    )
    return {"id": str(reminder.id), "status": str(reminder.status.value if hasattr(reminder.status, 'value') else reminder.status), "channel": str(reminder.channel.value if hasattr(reminder.channel, 'value') else reminder.channel)}
