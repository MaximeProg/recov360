from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io
from app.core.database import get_db
from app.shared.dependencies import get_current_user
from app.models.user import User
from app.domains.reports import service

router = APIRouter(prefix="/reports", tags=["Rapports"])


@router.get("/dashboard")
async def dashboard_kpis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_dashboard_kpis(current_user.company_id, db)


@router.get("/monthly-evolution")
async def monthly_evolution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_monthly_evolution(current_user.company_id, db)


@router.get("/agents")
async def agent_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_agent_report(current_user.company_id, db)


@router.get("/export/excel")
async def export_excel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await service.export_invoices_excel(current_user.company_id, db)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=creances.xlsx"},
    )


@router.get("/export/csv")
async def export_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await service.export_invoices_csv(current_user.company_id, db)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=creances.csv"},
    )
