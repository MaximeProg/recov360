import asyncio
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.company import Company


def run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="app.workers.tasks_scoring.compute_all_risk_scores")
def compute_all_risk_scores():
    async def _run():
        async with AsyncSessionLocal() as db:
            from app.domains.scoring.service import compute_all_scores
            companies_result = await db.execute(
                select(Company).where(Company.is_active.is_(True), Company.deleted_at.is_(None))
            )
            companies = companies_result.scalars().all()
            total = 0
            for company in companies:
                count = await compute_all_scores(company.id, db)
                total += count
            await db.commit()
            return total
    return run_async(_run())


@celery_app.task(name="app.workers.tasks_scoring.compute_single_debtor_score")
def compute_single_debtor_score(debtor_id: str, company_id: str):
    import uuid
    async def _run():
        async with AsyncSessionLocal() as db:
            from app.domains.scoring.service import compute_debtor_score
            result = await compute_debtor_score(uuid.UUID(debtor_id), uuid.UUID(company_id), db)
            await db.commit()
            return result
    return run_async(_run())
