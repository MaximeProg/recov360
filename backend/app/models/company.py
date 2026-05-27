import uuid
from sqlalchemy import String, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class Company(BaseModel):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str] = mapped_column(String(100), default="Côte d'Ivoire")
    city: Mapped[str | None] = mapped_column(String(100))
    sector: Mapped[str | None] = mapped_column(String(100))

    logo_url: Mapped[str | None] = mapped_column(Text)
    primary_color: Mapped[str] = mapped_column(String(7), default="#2563EB")
    secondary_color: Mapped[str] = mapped_column(String(7), default="#1E40AF")
    signature: Mapped[str | None] = mapped_column(Text)

    smtp_config: Mapped[dict | None] = mapped_column(JSON)
    branding: Mapped[dict | None] = mapped_column(JSON)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    plan: Mapped[str] = mapped_column(String(50), default="starter")

    users: Mapped[list["User"]] = relationship("User", back_populates="company", lazy="noload")
    debtors: Mapped[list["Debtor"]] = relationship("Debtor", back_populates="company", lazy="noload")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="company", lazy="noload")
    templates: Mapped[list["MessageTemplate"]] = relationship("MessageTemplate", back_populates="company", lazy="noload")
    workflow_rules: Mapped[list["WorkflowRule"]] = relationship("WorkflowRule", back_populates="company", lazy="noload")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="company", lazy="noload")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="company", lazy="noload")
