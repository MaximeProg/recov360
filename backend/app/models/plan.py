from sqlalchemy import String, Boolean, Integer, Numeric, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base_model import BaseModel


class Plan(BaseModel):
    """Plans d'abonnement définis par les super admins."""
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    price_monthly: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    price_yearly: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(10), default="XOF")
    max_users: Mapped[int] = mapped_column(Integer, default=5)
    max_debtors: Mapped[int] = mapped_column(Integer, default=100)
    max_invoices: Mapped[int] = mapped_column(Integer, default=500)
    features: Mapped[dict | None] = mapped_column(JSON)   # {"scoring": true, "workflows": true, ...}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_days: Mapped[int] = mapped_column(Integer, default=14)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
