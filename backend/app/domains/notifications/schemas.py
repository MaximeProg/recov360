import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    action_url: str | None
    entity_type: str | None
    entity_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    title: str
    message: str
    notification_type: NotificationType
    action_url: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None


class ReminderSendRequest(BaseModel):
    invoice_id: uuid.UUID
    channel: str
    message: str | None = None
    template_id: uuid.UUID | None = None
