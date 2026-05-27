import uuid
import enum
from sqlalchemy import String, ForeignKey, Boolean, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class WorkflowChannel(str, enum.Enum):
    email = "email"
    sms = "sms"
    both = "both"


class WorkflowLevel(str, enum.Enum):
    niveau_1 = "niveau_1"
    niveau_2 = "niveau_2"
    niveau_3 = "niveau_3"
    niveau_4 = "niveau_4"


class WorkflowRule(BaseModel):
    __tablename__ = "workflow_rules"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("message_templates.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger_days: Mapped[int] = mapped_column(Integer, nullable=False)
    channel: Mapped[WorkflowChannel] = mapped_column(SAEnum(WorkflowChannel), default=WorkflowChannel.email)
    level: Mapped[WorkflowLevel] = mapped_column(SAEnum(WorkflowLevel), default=WorkflowLevel.niveau_1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    company: Mapped["Company"] = relationship("Company", back_populates="workflow_rules")
