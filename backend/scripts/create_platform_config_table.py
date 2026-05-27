"""
Script pour créer la table platform_configs en DB.
Exécuter avec: python scripts/create_platform_config_table.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine
from app.shared.base_model import BaseModel
from app.models.platform_config import PlatformConfig  # noqa: F401 — needed for metadata


async def main():
    async with engine.begin() as conn:
        # Créer la table si elle n'existe pas
        await conn.run_sync(BaseModel.metadata.create_all)
        print("Table platform_configs créée (ou déjà existante).")

    print("Terminé.")


if __name__ == "__main__":
    asyncio.run(main())
