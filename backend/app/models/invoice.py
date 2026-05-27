import uuid
import enum
from datetime import date
from sqlalchemy import String, Text, ForeignKey, Float, Date, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class InvoiceStatus(str, enum.Enum):
    en_attente = "en_attente"
    partiellement_paye = "partiellement_paye"
    en_retard = "en_retard"
    solde = "solde"
    litige = "litige"


class Invoice(BaseModel):
    __tablename__ = "invoices"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    debtor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("debtors.id"), nullable=False, index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str] = mapped_column(String(10), default="XOF")

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0)
    penalty_rate: Mapped[float] = mapped_column(Float, default=0.0)
    penalty_amount: Mapped[float] = mapped_column(Float, default=0.0)

    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[InvoiceStatus] = mapped_column(SAEnum(InvoiceStatus), default=InvoiceStatus.en_attente, index=True)
    pdf_url: Mapped[str | None] = mapped_column(Text)
    reminder_level: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)

    company: Mapped["Company"] = relationship("Company", back_populates="invoices")
    debtor: Mapped["Debtor"] = relationship("Debtor", back_populates="invoices")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="invoice", lazy="noload")
    reminders: Mapped[list["Reminder"]] = relationship("Reminder", back_populates="invoice", lazy="noload")
    promises: Mapped[list["PromiseToPay"]] = relationship("PromiseToPay", back_populates="invoice", lazy="noload")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="invoice", lazy="noload")
