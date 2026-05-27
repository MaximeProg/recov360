import uuid
import io
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.models.debtor import Debtor, RiskLevel
from app.models.reminder import Reminder, ReminderStatus
import pandas as pd


async def get_dashboard_kpis(company_id: uuid.UUID, db: AsyncSession) -> dict:
    invoices_result = await db.execute(
        select(Invoice).where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
    )
    invoices = invoices_result.scalars().all()

    total_creances = sum(i.amount for i in invoices)
    total_recovered = sum(i.amount_paid for i in invoices)
    total_late = sum(i.amount - i.amount_paid for i in invoices if i.status == InvoiceStatus.en_retard)
    total_debtors_result = await db.execute(
        select(func.count(Debtor.id)).where(Debtor.company_id == company_id, Debtor.deleted_at.is_(None))
    )
    total_debtors = total_debtors_result.scalar_one()
    recovery_rate = (total_recovered / total_creances * 100) if total_creances > 0 else 0.0

    by_status = {}
    for status in InvoiceStatus:
        count = sum(1 for i in invoices if i.status == status)
        amount = sum(i.amount for i in invoices if i.status == status)
        by_status[status.value] = {"count": count, "amount": amount}

    return {
        "total_creances": total_creances,
        "total_recovered": total_recovered,
        "total_late": total_late,
        "recovery_rate": round(recovery_rate, 2),
        "total_debtors": total_debtors,
        "total_invoices": len(invoices),
        "by_status": by_status,
    }


async def get_monthly_evolution(company_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(
            func.date_trunc("month", Invoice.created_at).label("month"),
            func.sum(Invoice.amount).label("total"),
            func.sum(Invoice.amount_paid).label("paid"),
        )
        .where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
        .group_by(text("1"))
        .order_by(text("1 DESC"))
        .limit(12)
    )
    rows = result.all()
    return [{"month": str(r.month)[:7], "total": float(r.total or 0), "paid": float(r.paid or 0)} for r in rows]


async def get_agent_report(company_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(
            Invoice.created_by,
            func.count(Invoice.id).label("total_invoices"),
            func.sum(Invoice.amount_paid).label("total_recovered"),
        )
        .where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
        .group_by(Invoice.created_by)
    )
    rows = result.all()
    return [{"agent_id": str(r.created_by), "total_invoices": r.total_invoices, "total_recovered": float(r.total_recovered or 0)} for r in rows]


async def export_invoices_excel(company_id: uuid.UUID, db: AsyncSession) -> bytes:
    result = await db.execute(
        select(Invoice, Debtor)
        .join(Debtor, Invoice.debtor_id == Debtor.id)
        .where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
        .order_by(Invoice.created_at.desc())
    )
    rows = result.all()

    data = []
    for invoice, debtor in rows:
        data.append({
            "Numéro": invoice.invoice_number,
            "Débiteur": debtor.name,
            "Téléphone": debtor.phone,
            "Email": debtor.email,
            "Montant": invoice.amount,
            "Payé": invoice.amount_paid,
            "Statut": invoice.status.value,
            "Échéance": invoice.due_date.strftime("%d/%m/%Y"),
            "Devise": invoice.currency,
        })

    df = pd.DataFrame(data)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Créances")
    return buf.getvalue()


async def export_invoices_csv(company_id: uuid.UUID, db: AsyncSession) -> bytes:
    result = await db.execute(
        select(Invoice, Debtor)
        .join(Debtor, Invoice.debtor_id == Debtor.id)
        .where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
        .order_by(Invoice.created_at.desc())
    )
    rows = result.all()
    data = [{"numero": i.invoice_number, "debiteur": d.name, "montant": i.amount, "paye": i.amount_paid,
              "statut": i.status.value, "echeance": str(i.due_date)} for i, d in rows]
    df = pd.DataFrame(data)
    return df.to_csv(index=False).encode("utf-8")
