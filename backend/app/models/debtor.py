import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, JSON, Float, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class DebtorCategory(str, enum.Enum):
    particulier = "particulier"
    entreprise = "entreprise"
    institution = "institution"


class RiskLevel(str, enum.Enum):
    faible = "faible"
    moyen = "moyen"
    eleve = "eleve"
    critique = "critique"


class Debtor(BaseModel):
    __tablename__ = "debtors"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    address: Mapped[str | None] = mapped_column(Text)
    company_name: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="Côte d'Ivoire")

    category: Mapped[DebtorCategory] = mapped_column(SAEnum(DebtorCategory), default=DebtorCategory.entreprise)
    risk_level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel), default=RiskLevel.faible)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)

    identity_doc_url: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list | None] = mapped_column(JSON, default=list)
    notes: Mapped[list | None] = mapped_column(JSON, default=list)
    geo_location: Mapped[dict | None] = mapped_column(JSON)

    total_due: Mapped[float] = mapped_column(Float, default=0.0)
    total_paid: Mapped[float] = mapped_column(Float, default=0.0)

    company: Mapped["Company"] = relationship("Company", back_populates="debtors")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="debtor", lazy="noload")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="debtor", lazy="noload")
    promises: Mapped[list["PromiseToPay"]] = relationship("PromiseToPay", back_populates="debtor", lazy="noload")
