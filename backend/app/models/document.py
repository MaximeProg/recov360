import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import BaseModel


class DocumentType(str, enum.Enum):
    contrat = "contrat"
    facture = "facture"
    identite = "identite"
    preuve_paiement = "preuve_paiement"
    photo = "photo"
    autre = "autre"


class Document(BaseModel):
    __tablename__ = "documents"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    debtor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("debtors.id"), nullable=True, index=True)
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True, index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[DocumentType] = mapped_column(SAEnum(DocumentType), default=DocumentType.autre)
    file_size: Mapped[int | None] = mapped_column(Integer)
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)

    debtor: Mapped["Debtor | None"] = relationship("Debtor", back_populates="documents")
    invoice: Mapped["Invoice | None"] = relationship("Invoice", back_populates="documents")
