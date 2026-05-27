import uuid
from sqlalchemy import String, Numeric, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class FedaPayTransaction(BaseModel):
    """Enregistrement d'une transaction FedaPay."""
    __tablename__ = "fedapay_transactions"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)

    fedapay_id: Mapped[str | None] = mapped_column(String(255), index=True)   # ID FedaPay
    reference: Mapped[str | None] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="XOF")
    status: Mapped[str] = mapped_column(String(50), default="pending")   # pending / approved / declined / cancelled
    description: Mapped[str | None] = mapped_column(Text)
    customer_email: Mapped[str | None] = mapped_column(String(255))
    checkout_url: Mapped[str | None] = mapped_column(Text)
    callback_url: Mapped[str | None] = mapped_column(Text)
    raw_response: Mapped[str | None] = mapped_column(Text)   # JSON brut FedaPay

    company: Mapped["Company"] = relationship("Company", foreign_keys=[company_id], lazy="noload")
