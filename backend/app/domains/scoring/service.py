import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.debtor import Debtor, RiskLevel
from app.models.invoice import Invoice, InvoiceStatus
from app.models.promise import PromiseToPay, PromiseStatus
from app.models.reminder import Reminder
from app.models.notification import NotificationType
from app.shared.push_service import notify_company


def _compute_score(stats: dict) -> tuple[float, RiskLevel]:
    score = 0.0

    late_ratio = stats["late_count"] / max(stats["total_invoices"], 1)
    score += late_ratio * 40

    broken_ratio = stats["broken_promises"] / max(stats["total_promises"], 1)
    score += broken_ratio * 25

    if stats["avg_days_late"] > 30:
        score += 20
    elif stats["avg_days_late"] > 15:
        score += 10
    elif stats["avg_days_late"] > 7:
        score += 5

    if stats["total_due"] > 5_000_000:
        score += 10
    elif stats["total_due"] > 1_000_000:
        score += 5

    score += min(stats["failed_reminders"] * 2, 5)

    score = min(score, 100.0)

    if score >= 80:
        level = RiskLevel.critique
    elif score >= 55:
        level = RiskLevel.eleve
    elif score >= 30:
        level = RiskLevel.moyen
    else:
        level = RiskLevel.faible

    return round(score, 2), level


async def compute_debtor_score(debtor_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession) -> dict:
    debtor_result = await db.execute(
        select(Debtor).where(Debtor.id == debtor_id, Debtor.company_id == company_id, Debtor.deleted_at.is_(None))
    )
    debtor = debtor_result.scalar_one_or_none()
    if not debtor:
        return {"error": "Débiteur introuvable"}

    invoices_result = await db.execute(
        select(Invoice).where(Invoice.debtor_id == debtor_id, Invoice.deleted_at.is_(None))
    )
    invoices = invoices_result.scalars().all()

    today = date.today()
    late_invoices = [i for i in invoices if i.status == InvoiceStatus.en_retard]
    days_late_list = [(today - i.due_date).days for i in late_invoices if i.due_date < today]

    promises_result = await db.execute(
        select(PromiseToPay).where(PromiseToPay.debtor_id == debtor_id)
    )
    promises = promises_result.scalars().all()

    reminders_result = await db.execute(
        select(Reminder).where(Reminder.invoice_id.in_([i.id for i in invoices]))
    )
    reminders = reminders_result.scalars().all()
    failed_reminders = sum(1 for r in reminders if r.status.value == "failed")

    stats = {
        "total_invoices": len(invoices),
        "late_count": len(late_invoices),
        "avg_days_late": (sum(days_late_list) / len(days_late_list)) if days_late_list else 0,
        "total_promises": len(promises),
        "broken_promises": sum(1 for p in promises if p.status == PromiseStatus.broken),
        "total_due": debtor.total_due - debtor.total_paid,
        "failed_reminders": failed_reminders,
    }

    previous_level = debtor.risk_level
    score, level = _compute_score(stats)
    debtor.risk_score = score
    debtor.risk_level = level

    if level == RiskLevel.critique and previous_level != RiskLevel.critique:
        await notify_company(
            db=db,
            company_id=company_id,
            title="Alerte : Débiteur score critique",
            message=f"{debtor.name} a atteint le niveau de risque CRITIQUE (score {score:.0f}/100) — {debtor.total_due - debtor.total_paid:,.0f} XOF dus",
            notification_type=NotificationType.escalade_dossier,
            target="managers",
            action_url=f"/debtors/{debtor_id}",
            entity_type="debtor",
            entity_id=debtor_id,
            data={"debtor_id": str(debtor_id), "score": str(score), "level": level.value},
        )

    return {"debtor_id": str(debtor_id), "score": score, "level": level.value, "stats": stats}


async def compute_all_scores(company_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(Debtor).where(Debtor.company_id == company_id, Debtor.deleted_at.is_(None))
    )
    debtors = result.scalars().all()
    for debtor in debtors:
        await compute_debtor_score(debtor.id, company_id, db)
    return len(debtors)


async def get_top_risky(company_id: uuid.UUID, limit: int, db: AsyncSession) -> list[Debtor]:
    result = await db.execute(
        select(Debtor)
        .where(Debtor.company_id == company_id, Debtor.deleted_at.is_(None))
        .order_by(Debtor.risk_score.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_risk_summary(company_id: uuid.UUID, db: AsyncSession) -> dict:
    result = await db.execute(
        select(Debtor.risk_level, func.count(Debtor.id))
        .where(Debtor.company_id == company_id, Debtor.deleted_at.is_(None))
        .group_by(Debtor.risk_level)
    )
    counts = {row[0].value: row[1] for row in result.all()}
    return {
        "critique": counts.get("critique", 0),
        "eleve": counts.get("eleve", 0),
        "moyen": counts.get("moyen", 0),
        "faible": counts.get("faible", 0),
        "total": sum(counts.values()),
    }
