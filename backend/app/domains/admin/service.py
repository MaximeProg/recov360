import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, Request
from app.models.company import Company
from app.models.user import User
from app.models.debtor import Debtor
from app.models.invoice import Invoice
from app.models.audit import AuditLog
from app.shared.pagination import PaginationParams


async def get_platform_stats(db: AsyncSession) -> dict:
    total_companies = (await db.execute(select(func.count(Company.id)).where(Company.deleted_at.is_(None)))).scalar_one()
    active_companies = (await db.execute(select(func.count(Company.id)).where(Company.is_active.is_(True), Company.deleted_at.is_(None)))).scalar_one()
    total_users = (await db.execute(select(func.count(User.id)).where(User.deleted_at.is_(None)))).scalar_one()
    total_debtors = (await db.execute(select(func.count(Debtor.id)).where(Debtor.deleted_at.is_(None)))).scalar_one()
    total_invoices = (await db.execute(select(func.count(Invoice.id)).where(Invoice.deleted_at.is_(None)))).scalar_one()

    amounts = (await db.execute(
        select(func.sum(Invoice.amount), func.sum(Invoice.amount_paid))
        .where(Invoice.deleted_at.is_(None))
    )).one()
    total_due = float(amounts[0] or 0)
    total_recovered = float(amounts[1] or 0)
    recovery_rate = (total_recovered / total_due * 100) if total_due > 0 else 0.0

    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "total_users": total_users,
        "total_debtors": total_debtors,
        "total_invoices": total_invoices,
        "total_amount_due": total_due,
        "total_amount_recovered": total_recovered,
        "global_recovery_rate": round(recovery_rate, 2),
    }


async def list_all_companies(params: PaginationParams, db: AsyncSession) -> tuple[list[dict], int]:
    query = select(Company).where(Company.deleted_at.is_(None))
    if params.search:
        term = f"%{params.search}%"
        query = query.where((Company.name.ilike(term)) | (Company.email.ilike(term)))
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(Company.created_at.desc()))
    companies = result.scalars().all()

    enriched = []
    for c in companies:
        users_count = (await db.execute(select(func.count(User.id)).where(User.company_id == c.id, User.deleted_at.is_(None)))).scalar_one()
        debtors_count = (await db.execute(select(func.count(Debtor.id)).where(Debtor.company_id == c.id, Debtor.deleted_at.is_(None)))).scalar_one()
        invoices_count = (await db.execute(select(func.count(Invoice.id)).where(Invoice.company_id == c.id, Invoice.deleted_at.is_(None)))).scalar_one()
        enriched.append({
            "id": c.id, "name": c.name, "email": c.email, "phone": c.phone,
            "country": c.country, "plan": c.plan, "is_active": c.is_active,
            "total_users": users_count, "total_debtors": debtors_count,
            "total_invoices": invoices_count, "created_at": c.created_at,
        })
    return enriched, count


async def get_company_detail(company_id: uuid.UUID, db: AsyncSession) -> dict:
    result = await db.execute(select(Company).where(Company.id == company_id, Company.deleted_at.is_(None)))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")

    users = (await db.execute(select(User).where(User.company_id == company_id, User.deleted_at.is_(None)))).scalars().all()
    amounts = (await db.execute(
        select(func.sum(Invoice.amount), func.sum(Invoice.amount_paid))
        .where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
    )).one()

    return {
        "company": company,
        "users": users,
        "total_amount_due": float(amounts[0] or 0),
        "total_amount_recovered": float(amounts[1] or 0),
    }


async def set_company_status(company_id: uuid.UUID, is_active: bool, db: AsyncSession) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id, Company.deleted_at.is_(None)))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    company.is_active = is_active
    return company


async def set_company_plan(company_id: uuid.UUID, plan: str, db: AsyncSession) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id, Company.deleted_at.is_(None)))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    company.plan = plan
    return company


async def list_audit_logs(
    db: AsyncSession,
    company_id: uuid.UUID | None,
    params: PaginationParams,
    action: str | None = None,
) -> tuple[list[AuditLog], int]:
    query = select(AuditLog).where(AuditLog.deleted_at.is_(None))
    if company_id:
        query = query.where(AuditLog.company_id == company_id)
    if action:
        query = query.where(AuditLog.action == action)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(query.offset(params.offset).limit(params.per_page).order_by(AuditLog.created_at.desc()))
    return result.scalars().all(), count


async def delete_company(company_id: uuid.UUID, db: AsyncSession) -> None:
    """Suppression douce d'une entreprise (et ses utilisateurs)."""
    result = await db.execute(select(Company).where(Company.id == company_id, Company.deleted_at.is_(None)))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    company.soft_delete()
    # Désactiver aussi tous les utilisateurs
    users_result = await db.execute(select(User).where(User.company_id == company_id, User.deleted_at.is_(None)))
    for user in users_result.scalars().all():
        user.soft_delete()


async def write_audit_log(
    db: AsyncSession,
    company_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    description: str | None = None,
    request: Request | None = None,
):
    log = AuditLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        description=description,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(log)
    await db.flush()
    return log
