import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class NotificationType(str, enum.Enum):
    nouvelle_creance = "nouvelle_creance"
    retard_important = "retard_important"
    paiement_recu = "paiement_recu"
    echec_relance = "echec_relance"
    escalade_dossier = "escalade_dossier"
    alerte_systeme = "alerte_systeme"
    promesse_non_tenue = "promesse_non_tenue"


class Notification(BaseModel):
    __tablename__ = "notifications"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    action_url: Mapped[str | None] = mapped_column(String(500))
    entity_type: Mapped[str | None] = mapped_column(String(100))
    entity_id: Mapped[str | None] = mapped_column(String(100))

    company: Mapped["Company"] = relationship("Company", back_populates="notifications")
    user: Mapped["User"] = relationship("User", back_populates="notifications")
