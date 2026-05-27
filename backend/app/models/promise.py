import uuid
import enum
from datetime import date
from sqlalchemy import Text, ForeignKey, Float, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class PromiseStatus(str, enum.Enum):
    pending = "pending"
    fulfilled = "fulfilled"
    broken = "broken"
    cancelled = "cancelled"


class PromiseToPay(BaseModel):
    __tablename__ = "promises_to_pay"

    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    debtor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("debtors.id"), nullable=False, index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    promised_date: Mapped[date] = mapped_column(Date, nullable=False)
    promised_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[PromiseStatus] = mapped_column(SAEnum(PromiseStatus), default=PromiseStatus.pending)
    notes: Mapped[str | None] = mapped_column(Text)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="promises")
    debtor: Mapped["Debtor"] = relationship("Debtor", back_populates="promises")
