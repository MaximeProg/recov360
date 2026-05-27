import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.debtor import DebtorCategory, RiskLevel


class DebtorCreate(BaseModel):
    name: str
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    company_name: str | None = None
    city: str | None = None
    country: str = "Côte d'Ivoire"
    category: DebtorCategory = DebtorCategory.entreprise
    tags: list[str] = []


class DebtorUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    company_name: str | None = None
    city: str | None = None
    country: str | None = None
    category: DebtorCategory | None = None
    tags: list[str] | None = None


class NoteAdd(BaseModel):
    content: str
    author: str | None = None


class DebtorResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None
    company_name: str | None
    city: str | None
    country: str
    category: DebtorCategory
    risk_level: RiskLevel
    risk_score: float
    total_due: float
    total_paid: float
    tags: list | None
    notes: list | None
    photo_url: str | None
    identity_doc_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
