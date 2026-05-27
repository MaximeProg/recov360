import uuid
from datetime import date, datetime
from pydantic import BaseModel, field_validator
from app.models.invoice import InvoiceStatus
from app.models.payment import PaymentMethod


class InvoiceCreate(BaseModel):
    debtor_id: uuid.UUID
    invoice_number: str | None = None
    description: str | None = None
    currency: str = "XOF"
    amount: float
    due_date: date
    penalty_rate: float = 0.0
    notes: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Le montant doit être positif")
        return v


class InvoiceUpdate(BaseModel):
    description: str | None = None
    amount: float | None = None
    due_date: date | None = None
    penalty_rate: float | None = None
    status: InvoiceStatus | None = None
    notes: str | None = None


class PaymentCreate(BaseModel):
    amount: float
    payment_date: date
    method: PaymentMethod = PaymentMethod.virement
    reference: str | None = None
    notes: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Le montant doit être positif")
        return v


class PaymentResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    amount: float
    payment_date: date
    method: PaymentMethod
    reference: str | None
    proof_url: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    debtor_id: uuid.UUID
    invoice_number: str
    description: str | None
    currency: str
    amount: float
    amount_paid: float
    penalty_rate: float
    penalty_amount: float
    due_date: date
    paid_date: date | None
    status: InvoiceStatus
    pdf_url: str | None
    reminder_level: int
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
