import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class CompanyCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    country: str = "Côte d'Ivoire"
    city: str | None = None
    sector: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    country: str | None = None
    city: str | None = None
    sector: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    signature: str | None = None


class SMTPConfigUpdate(BaseModel):
    host: str
    port: int = 587
    user: str
    password: str
    from_email: str
    from_name: str


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    address: str | None
    country: str
    city: str | None
    sector: str | None
    logo_url: str | None
    primary_color: str
    secondary_color: str
    signature: str | None
    is_active: bool
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}
