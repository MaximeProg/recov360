import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, Boolean, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class TemplateChannel(str, enum.Enum):
    email = "email"
    sms = "sms"


class MessageTemplate(BaseModel):
    __tablename__ = "message_templates"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[TemplateChannel] = mapped_column(SAEnum(TemplateChannel), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[list | None] = mapped_column(JSON, default=list)
    language: Mapped[str] = mapped_column(String(10), default="fr")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    company: Mapped["Company"] = relationship("Company", back_populates="templates")
    reminders: Mapped[list["Reminder"]] = relationship("Reminder", lazy="noload")
