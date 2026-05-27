"""
PlatformConfig — configuration clé/valeur de la plateforme.
Géré par les super admins depuis l'interface d'administration.
Données affichées sur le site public (footer, contacts, réseaux sociaux).
"""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base_model import BaseModel


class PlatformConfig(BaseModel):
    __tablename__ = "platform_configs"

    # La clé unique (ex: "phone", "whatsapp", "email", "twitter", etc.)
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)

    # La valeur (texte libre, URL, numéro, etc.)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Libellé lisible (pour l'interface admin)
    label: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Catégorie pour grouper les champs dans l'interface
    # Valeurs: "contact", "social", "footer", "general"
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, default="general")
