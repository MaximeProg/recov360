import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.user import UserRole


class CompanyAdminView(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    country: str
    plan: str
    is_active: bool
    total_users: int
    total_debtors: int
    total_invoices: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyStatusUpdate(BaseModel):
    is_active: bool


class CompanyPlanUpdate(BaseModel):
    plan: str


class PlatformStats(BaseModel):
    total_companies: int
    active_companies: int
    total_users: int
    total_debtors: int
    total_invoices: int
    total_amount_due: float
    total_amount_recovered: float
    global_recovery_rate: float


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    entity_type: str
    entity_id: str | None
    old_values: dict | None
    new_values: dict | None
    ip_address: str | None
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: str | None = None
    old_values: dict | None = None
    new_values: dict | None = None
    description: str | None = None
