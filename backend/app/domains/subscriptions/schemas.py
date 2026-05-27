import uuid
from datetime import datetime
from pydantic import BaseModel


class PlanPublic(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    price_monthly: float
    price_yearly: float
    currency: str
    max_users: int
    max_debtors: int
    max_invoices: int
    features: dict | None
    is_free: bool
    trial_days: int
    sort_order: int
    model_config = {"from_attributes": True}


class PlanCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    price_monthly: float = 0
    price_yearly: float = 0
    currency: str = "XOF"
    max_users: int = 5
    max_debtors: int = 100
    max_invoices: int = 500
    features: dict | None = None
    is_free: bool = False
    trial_days: int = 14
    sort_order: int = 0
    is_active: bool = True


class PlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price_monthly: float | None = None
    price_yearly: float | None = None
    max_users: int | None = None
    max_debtors: int | None = None
    max_invoices: int | None = None
    features: dict | None = None
    is_active: bool | None = None
    trial_days: int | None = None
    sort_order: int | None = None


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    plan_slug: str
    status: str
    start_date: datetime | None
    end_date: datetime | None
    is_yearly: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class CheckoutCreate(BaseModel):
    plan_id: uuid.UUID
    is_yearly: bool = False


class CheckoutResponse(BaseModel):
    checkout_url: str | None
    transaction_id: str | None
    amount: float
    currency: str


class VerifyPaymentResponse(BaseModel):
    fedapay_status: str
    subscription_active: bool
    subscription_status: str | None = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    fedapay_id: str | None
    amount: float
    currency: str
    status: str
    description: str | None
    customer_email: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
