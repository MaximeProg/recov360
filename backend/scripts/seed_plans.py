"""
Script d'initialisation des plans d'abonnement Recov360.
Usage : python scripts/seed_plans.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.models.plan import Plan


PLANS = [
    {
        "name": "Starter",
        "slug": "starter",
        "description": "Pour les TPE et indépendants qui débutent dans la gestion des impayés.",
        "price_monthly": 9900,
        "price_yearly": 95000,   # ~20% de réduction
        "currency": "XOF",
        "max_users": 3,
        "max_debtors": 50,
        "max_invoices": 200,
        "is_free": False,
        "is_active": True,
        "trial_days": 14,
        "sort_order": 0,
        "features": {
            "scoring": False,
            "workflows": False,
            "reports": False,
            "api_access": False,
            "support_priority": False,
        },
    },
    {
        "name": "Pro",
        "slug": "pro",
        "description": "Pour les PME qui veulent automatiser leur recouvrement et gagner du temps.",
        "price_monthly": 29900,
        "price_yearly": 287000,  # ~20% de réduction
        "currency": "XOF",
        "max_users": 10,
        "max_debtors": 500,
        "max_invoices": 2000,
        "is_free": False,
        "is_active": True,
        "trial_days": 14,
        "sort_order": 1,
        "features": {
            "scoring": True,
            "workflows": True,
            "reports": True,
            "api_access": False,
            "support_priority": False,
        },
    },
    {
        "name": "Enterprise",
        "slug": "enterprise",
        "description": "Pour les structures avec des volumes importants et des besoins d'intégration avancés.",
        "price_monthly": 59900,
        "price_yearly": 575000,  # ~20% de réduction
        "currency": "XOF",
        "max_users": 50,
        "max_debtors": 5000,
        "max_invoices": 20000,
        "is_free": False,
        "is_active": True,
        "trial_days": 30,
        "sort_order": 2,
        "features": {
            "scoring": True,
            "workflows": True,
            "reports": True,
            "api_access": True,
            "support_priority": True,
        },
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        inserted = 0
        updated = 0
        for plan_data in PLANS:
            result = await db.execute(
                select(Plan).where(Plan.slug == plan_data["slug"], Plan.deleted_at.is_(None))
            )
            existing = result.scalar_one_or_none()
            if existing:
                for k, v in plan_data.items():
                    setattr(existing, k, v)
                updated += 1
                print(f"  Updated : {plan_data['name']}")
            else:
                db.add(Plan(**plan_data))
                inserted += 1
                print(f"  Created : {plan_data['name']} - {plan_data['price_monthly']:,} FCFA/mois")

        await db.commit()
        print(f"\n  Plans insérés : {inserted} | mis à jour : {updated}")


if __name__ == "__main__":
    print("\n=== Seed des plans Recov360 ===")
    asyncio.run(seed())
    print("=== Termine ===")
