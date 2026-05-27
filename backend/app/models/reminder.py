import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class ReminderChannel(str, enum.Enum):
    email = "email"
    sms = "sms"


class ReminderStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"
    bounced = "bounced"


class ReminderType(str, enum.Enum):
    rappel_simple = "rappel_simple"
    relance_formelle = "relance_formelle"
    notification_penalite = "notification_penalite"
    escalade_juridique = "escalade_juridique"
    confirmation_paiement = "confirmation_paiement"


class Reminder(BaseModel):
    __tablename__ = "reminders"

    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("message_templates.id"), nullable=True)

    channel: Mapped[ReminderChannel] = mapped_column(SAEnum(ReminderChannel), nullable=False)
    reminder_type: Mapped[ReminderType] = mapped_column(SAEnum(ReminderType), default=ReminderType.rappel_simple)
    status: Mapped[ReminderStatus] = mapped_column(SAEnum(ReminderStatus), default=ReminderStatus.pending)
    level: Mapped[int] = mapped_column(Integer, default=1)

    recipient_email: Mapped[str | None] = mapped_column(String(255))
    recipient_phone: Mapped[str | None] = mapped_column(String(50))
    subject: Mapped[str | None] = mapped_column(String(500))
    message: Mapped[str | None] = mapped_column(Text)

    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="reminders")
