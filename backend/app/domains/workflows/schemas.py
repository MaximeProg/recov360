import uuid
from datetime import datetime, date
from pydantic import BaseModel
from app.models.workflow import WorkflowChannel, WorkflowLevel
from app.models.promise import PromiseStatus


class WorkflowRuleCreate(BaseModel):
    name: str
    trigger_days: int
    channel: WorkflowChannel = WorkflowChannel.email
    level: WorkflowLevel = WorkflowLevel.niveau_1
    template_id: uuid.UUID | None = None
    order: int = 0


class WorkflowRuleUpdate(BaseModel):
    name: str | None = None
    trigger_days: int | None = None
    channel: WorkflowChannel | None = None
    level: WorkflowLevel | None = None
    template_id: uuid.UUID | None = None
    is_active: bool | None = None
    order: int | None = None


class WorkflowRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    trigger_days: int
    channel: WorkflowChannel
    level: WorkflowLevel
    template_id: uuid.UUID | None
    is_active: bool
    order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PromiseCreate(BaseModel):
    invoice_id: uuid.UUID
    debtor_id: uuid.UUID
    promised_date: date
    promised_amount: float
    notes: str | None = None


class PromiseUpdate(BaseModel):
    promised_date: date | None = None
    promised_amount: float | None = None
    status: PromiseStatus | None = None
    notes: str | None = None


class PromiseResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    debtor_id: uuid.UUID
    promised_date: date
    promised_amount: float
    status: PromiseStatus
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    name: str
    channel: str
    subject: str | None = None
    body: str
    variables: list[str] = []
    language: str = "fr"
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body: str | None = None
    variables: list[str] | None = None
    is_active: bool | None = None


class TemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    channel: str
    subject: str | None
    body: str
    variables: list | None
    language: str
    is_default: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
