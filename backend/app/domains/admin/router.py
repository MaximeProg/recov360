import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user, require_admin
from app.shared.pagination import PaginatedResponse, PaginationParams
from app.models.user import User
from app.domains.admin import service
from app.domains.admin.dependencies import require_superadmin
from app.domains.admin.schemas import (
    CompanyStatusUpdate, CompanyPlanUpdate, PlatformStats,
    AuditLogResponse, AuditLogCreate,
)
from app.domains.companies.schemas import CompanyResponse
from app.domains.subscriptions import service as sub_service
from app.domains.subscriptions.schemas import (
    PlanPublic, PlanCreate, PlanUpdate,
    TransactionResponse, SubscriptionResponse,
)

# ── Super Admin (plateforme) ─────────────────────────────────────────────────
superadmin_router = APIRouter(prefix="/superadmin", tags=["Super Admin"])


@superadmin_router.get("/stats", response_model=PlatformStats)
async def platform_stats(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_platform_stats(db)


@superadmin_router.get("/companies")
async def list_all_companies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page, search=search)
    companies, total = await service.list_all_companies(params, db)
    return PaginatedResponse.build(items=companies, total=total, page=page, per_page=per_page)


@superadmin_router.get("/companies/{company_id}")
async def get_company_detail(
    company_id: uuid.UUID,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_company_detail(company_id, db)


@superadmin_router.put("/companies/{company_id}/status", response_model=CompanyResponse)
async def set_company_status(
    company_id: uuid.UUID,
    data: CompanyStatusUpdate,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    company = await service.set_company_status(company_id, data.is_active, db)
    await db.commit()
    await db.refresh(company)
    return company


@superadmin_router.put("/companies/{company_id}/plan", response_model=CompanyResponse)
async def set_company_plan(
    company_id: uuid.UUID,
    data: CompanyPlanUpdate,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    company = await service.set_company_plan(company_id, data.plan, db)
    await db.commit()
    await db.refresh(company)
    return company


@superadmin_router.delete("/companies/{company_id}", status_code=204)
async def delete_company(
    company_id: uuid.UUID,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Suppression douce d'une entreprise et de toutes ses données."""
    await service.delete_company(company_id, db)
    await db.commit()


@superadmin_router.get("/audit-logs")
async def list_all_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    company_id: uuid.UUID | None = Query(None),
    action: str | None = Query(None),
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page)
    logs, total = await service.list_audit_logs(db, company_id, params, action)
    return PaginatedResponse.build(
        items=[AuditLogResponse.model_validate(l) for l in logs],
        total=total, page=page, per_page=per_page,
    )


# ── Plans (gérés par super admin) ────────────────────────────────────────────
@superadmin_router.get("/plans", response_model=list[PlanPublic])
async def list_plans(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_service.list_all_plans(db)


@superadmin_router.post("/plans", response_model=PlanPublic, status_code=201)
async def create_plan(
    data: PlanCreate,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    plan = await sub_service.create_plan(data.model_dump(), db)
    await db.commit()
    await db.refresh(plan)
    return plan


@superadmin_router.put("/plans/{plan_id}", response_model=PlanPublic)
async def update_plan(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    plan = await sub_service.update_plan(plan_id, data.model_dump(exclude_none=True), db)
    await db.commit()
    await db.refresh(plan)
    return plan


@superadmin_router.delete("/plans/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: uuid.UUID,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    await sub_service.delete_plan(plan_id, db)
    await db.commit()


# ── Transactions (super admin) ─────────────────────────────────────────────
@superadmin_router.get("/transactions")
async def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    company_id: uuid.UUID | None = Query(None),
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page)
    txs, total = await sub_service.list_transactions(db, params, company_id)
    return PaginatedResponse.build(
        items=[TransactionResponse.model_validate(t) for t in txs],
        total=total, page=page, per_page=per_page,
    )


# ── PlatformConfig (super admin) ──────────────────────────────────────────────
@superadmin_router.get("/config")
async def get_platform_config(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Retourne toute la configuration de la plateforme pour le super admin."""
    return await sub_service.get_public_config(db)


@superadmin_router.put("/config")
async def update_platform_config(
    items: list[dict],
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour plusieurs clés de configuration en une seule requête."""
    await sub_service.bulk_upsert_config(items, db)
    await db.commit()
    return await sub_service.get_public_config(db)


# ── Admin Company (admin de son entreprise) ──────────────────────────────────
admin_router = APIRouter(prefix="/admin", tags=["Admin Entreprise"])


@admin_router.get("/audit-logs", response_model=PaginatedResponse[AuditLogResponse])
async def company_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action: str | None = Query(None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, per_page=per_page)
    logs, total = await service.list_audit_logs(db, current_user.company_id, params, action)
    return PaginatedResponse.build(
        items=[AuditLogResponse.model_validate(l) for l in logs],
        total=total, page=page, per_page=per_page,
    )


@admin_router.post("/audit-logs", response_model=AuditLogResponse, status_code=201)
async def create_audit_log(
    data: AuditLogCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    log = await service.write_audit_log(
        db=db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        action=data.action,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        old_values=data.old_values,
        new_values=data.new_values,
        description=data.description,
    )
    await db.commit()
    return AuditLogResponse.model_validate(log)


@admin_router.get("/team/stats")
async def team_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.user import User as UserModel
    from app.models.invoice import Invoice

    users_result = await db.execute(
        select(UserModel).where(
            UserModel.company_id == current_user.company_id,
            UserModel.deleted_at.is_(None),
            UserModel.is_active.is_(True),
        )
    )
    users = users_result.scalars().all()

    stats = []
    for u in users:
        invoices_count = (await db.execute(
            select(func.count(Invoice.id)).where(Invoice.created_by == u.id, Invoice.deleted_at.is_(None))
        )).scalar_one()
        recovered = (await db.execute(
            select(func.sum(Invoice.amount_paid)).where(Invoice.created_by == u.id, Invoice.deleted_at.is_(None))
        )).scalar_one() or 0
        stats.append({
            "user_id": str(u.id),
            "name": f"{u.first_name} {u.last_name}",
            "role": u.role.value,
            "invoices_managed": invoices_count,
            "total_recovered": float(recovered),
        })
    return stats
