import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class SubscriptionStatus:
    TRIAL = "trial"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"     # paiement en attente


class Subscription(BaseModel):
    """Abonnement d'une entreprise à un plan."""
    __tablename__ = "subscriptions"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=True)
    plan_slug: Mapped[str] = mapped_column(String(50), nullable=False)   # snapshot du slug au moment de l'achat
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=SubscriptionStatus.TRIAL)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_yearly: Mapped[bool] = mapped_column(Boolean, default=False)
    fedapay_transaction_id: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)

    company: Mapped["Company"] = relationship("Company", foreign_keys=[company_id], lazy="noload")
    plan: Mapped["Plan | None"] = relationship("Plan", foreign_keys=[plan_id], lazy="noload")
