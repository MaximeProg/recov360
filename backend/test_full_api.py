"""
Test complet de toutes les routes API Recov360
"""
import asyncio
import httpx
from httpx import ASGITransport
from datetime import date, timedelta

import time
BASE = "http://test"
RESULTS = []
TS = str(int(time.time()))[-6:]


async def run(client: httpx.AsyncClient):
    token = None
    company_id = None
    debtor_id = None
    invoice_id = None
    user_id = None
    promise_id = None
    rule_id = None
    template_id = None
    new_user_id = None

    def check(label, resp, expected=200):
        ok = resp.status_code == expected
        status = "OK" if ok else "FAIL"
        RESULTS.append((status, label, resp.status_code))
        if not ok:
            print(f"  [FAIL] {label} — {resp.status_code}: {resp.text[:120]}")
        return ok

    # ── AUTH ────────────────────────────────────────────────────────────────
    r = await client.post("/api/v1/auth/register", json={
        "company_name": f"Test Pharma {TS}",
        "company_email": f"pharma{TS}@ci.com",
        "first_name": "Kouame", "last_name": "Test",
        "email": f"admin{TS}@pharma.ci", "password": "password123",
    })
    check("POST /auth/register", r, 201)
    if r.status_code == 201:
        token = r.json()["access_token"]
        refresh = r.json()["refresh_token"]
        H = {"Authorization": f"Bearer {token}"}

    r = await client.post("/api/v1/auth/login", json={"email": f"admin{TS}@pharma.ci", "password": "password123"})
    check("POST /auth/login", r, 200)

    r = await client.post("/api/v1/auth/login", json={"email": "bad@bad.com", "password": "wrong"})
    check("POST /auth/login (mauvais mdp → 401)", r, 401)

    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    check("POST /auth/refresh", r, 200)
    token = r.json()["access_token"]
    H = {"Authorization": f"Bearer {token}"}

    r = await client.get("/api/v1/auth/me", headers=H)
    check("GET /auth/me", r, 200)
    if r.status_code == 200:
        user_id = r.json()["id"]
        company_id = r.json()["company_id"]

    r = await client.post("/api/v1/auth/change-password", headers=H,
                          json={"current_password": "password123", "new_password": "newpass456"})
    check("POST /auth/change-password", r, 204)

    # re-login avec nouveau mdp
    r = await client.post("/api/v1/auth/login", json={"email": f"admin{TS}@pharma.ci", "password": "newpass456"})
    check("POST /auth/login (nouveau mdp)", r, 200)
    token = r.json()["access_token"]
    H = {"Authorization": f"Bearer {token}"}

    # ── COMPANY ──────────────────────────────────────────────────────────────
    r = await client.get("/api/v1/companies/me", headers=H)
    check("GET /companies/me", r, 200)

    r = await client.put("/api/v1/companies/me", headers=H,
                         json={"city": "Abidjan", "sector": "Pharmacie", "primary_color": "#1D4ED8"})
    check("PUT /companies/me", r, 200)

    # ── USERS ────────────────────────────────────────────────────────────────
    r = await client.get("/api/v1/users", headers=H)
    check("GET /users", r, 200)

    r = await client.post("/api/v1/users", headers=H, json={
        "email": f"agent{TS}@pharma.ci", "password": "pass1234",
        "first_name": "Awa", "last_name": "Diallo", "role": "agent"
    })
    check("POST /users", r, 201)
    if r.status_code == 201:
        new_user_id = r.json()["id"]

    r = await client.put(f"/api/v1/users/{new_user_id}", headers=H, json={"phone": "+22507000000"})
    check("PUT /users/{id}", r, 200)

    # ── DEBTORS ──────────────────────────────────────────────────────────────
    r = await client.get("/api/v1/debtors", headers=H)
    check("GET /debtors", r, 200)

    r = await client.post("/api/v1/debtors", headers=H, json={
        "name": "Pharmacie Centrale Abidjan",
        "phone": "+22507123456",
        "email": "centrale@pharma.ci",
        "company_name": "PCA SARL",
        "city": "Abidjan",
        "category": "entreprise",
        "tags": ["pharmacie", "grossiste"],
    })
    check("POST /debtors", r, 201)
    if r.status_code == 201:
        debtor_id = r.json()["id"]

    r = await client.get(f"/api/v1/debtors/{debtor_id}", headers=H)
    check("GET /debtors/{id}", r, 200)

    r = await client.put(f"/api/v1/debtors/{debtor_id}", headers=H, json={"city": "Cocody"})
    check("PUT /debtors/{id}", r, 200)

    r = await client.post(f"/api/v1/debtors/{debtor_id}/notes", headers=H,
                          json={"content": "Client difficile, appeler avant 15h", "author": "Kouame"})
    check("POST /debtors/{id}/notes", r, 200)

    r = await client.get("/api/v1/debtors?search=Pharmacie", headers=H)
    check("GET /debtors?search=", r, 200)

    # ── INVOICES ─────────────────────────────────────────────────────────────
    due_date = (date.today() + timedelta(days=30)).isoformat()
    r = await client.post("/api/v1/invoices", headers=H, json={
        "debtor_id": debtor_id,
        "amount": 1500000,
        "due_date": due_date,
        "currency": "XOF",
        "description": "Livraison médicaments Mars 2026",
    })
    check("POST /invoices", r, 201)
    if r.status_code == 201:
        invoice_id = r.json()["id"]

    r = await client.get("/api/v1/invoices", headers=H)
    check("GET /invoices", r, 200)

    r = await client.get(f"/api/v1/invoices/{invoice_id}", headers=H)
    check("GET /invoices/{id}", r, 200)

    r = await client.put(f"/api/v1/invoices/{invoice_id}", headers=H,
                         json={"description": "Livraison médicaments Mars 2026 — révisé"})
    check("PUT /invoices/{id}", r, 200)

    # Paiement partiel
    r = await client.post(f"/api/v1/invoices/{invoice_id}/payments", headers=H, json={
        "amount": 500000,
        "payment_date": date.today().isoformat(),
        "method": "mobile_money",
        "reference": "MOMO-2026-001",
    })
    check("POST /invoices/{id}/payments (partiel)", r, 201)

    r = await client.get(f"/api/v1/invoices/{invoice_id}", headers=H)
    check("GET /invoices/{id} (après paiement partiel)", r, 200)
    if r.status_code == 200:
        assert r.json()["status"] == "partiellement_paye", f"Status inattendu: {r.json()['status']}"
        assert r.json()["amount_paid"] == 500000

    # Paiement soldant
    r = await client.post(f"/api/v1/invoices/{invoice_id}/payments", headers=H, json={
        "amount": 1000000,
        "payment_date": date.today().isoformat(),
        "method": "virement",
    })
    check("POST /invoices/{id}/payments (solde)", r, 201)

    r = await client.get(f"/api/v1/invoices/{invoice_id}", headers=H)
    check("GET /invoices/{id} (soldé)", r, 200)
    if r.status_code == 200:
        assert r.json()["status"] == "solde"

    # ── WORKFLOWS ────────────────────────────────────────────────────────────
    r = await client.post("/api/v1/workflows/templates", headers=H, json={
        "name": "Rappel J-7",
        "channel": "email",
        "subject": "Rappel paiement — {{invoice_number}}",
        "body": "Bonjour {{debtor_name}}, votre facture {{invoice_number}} de {{amount}} est due le {{due_date}}.",
        "variables": ["debtor_name", "invoice_number", "amount", "due_date"],
    })
    check("POST /workflows/templates", r, 201)
    if r.status_code == 201:
        template_id = r.json()["id"]

    r = await client.get("/api/v1/workflows/templates", headers=H)
    check("GET /workflows/templates", r, 200)

    r = await client.post("/api/v1/workflows/rules", headers=H, json={
        "name": "Rappel 7 jours avant",
        "trigger_days": -7,
        "channel": "email",
        "level": "niveau_1",
        "template_id": template_id,
    })
    check("POST /workflows/rules", r, 201)
    if r.status_code == 201:
        rule_id = r.json()["id"]

    r = await client.get("/api/v1/workflows/rules", headers=H)
    check("GET /workflows/rules", r, 200)

    # Promesse de paiement
    invoice2_r = await client.post("/api/v1/invoices", headers=H, json={
        "debtor_id": debtor_id, "amount": 800000,
        "due_date": (date.today() + timedelta(days=15)).isoformat(),
    })
    invoice2_id = invoice2_r.json()["id"] if invoice2_r.status_code == 201 else invoice_id

    r = await client.post("/api/v1/workflows/promises", headers=H, json={
        "invoice_id": invoice2_id,
        "debtor_id": debtor_id,
        "promised_date": (date.today() + timedelta(days=10)).isoformat(),
        "promised_amount": 800000,
        "notes": "Client a promis de payer avant le 5 juin",
    })
    check("POST /workflows/promises", r, 201)
    if r.status_code == 201:
        promise_id = r.json()["id"]

    r = await client.get("/api/v1/workflows/promises", headers=H)
    check("GET /workflows/promises", r, 200)

    r = await client.put(f"/api/v1/workflows/promises/{promise_id}", headers=H, json={"notes": "Confirmé par appel"})
    check("PUT /workflows/promises/{id}", r, 200)

    # ── NOTIFICATIONS ────────────────────────────────────────────────────────
    r = await client.get("/api/v1/notifications", headers=H)
    check("GET /notifications", r, 200)
    notifs = r.json().get("items", [])

    if notifs:
        notif_id = notifs[0]["id"]
        r = await client.post(f"/api/v1/notifications/{notif_id}/read", headers=H)
        check("POST /notifications/{id}/read", r, 204)

    r = await client.post("/api/v1/notifications/read-all", headers=H)
    check("POST /notifications/read-all", r, 204)

    # Envoi relance manuelle
    r = await client.post("/api/v1/notifications/reminders/send", headers=H, json={
        "invoice_id": invoice2_id,
        "channel": "email",
        "message": "Bonjour, ceci est un rappel de paiement.",
    })
    check("POST /notifications/reminders/send", r, 201)

    # ── SCORING ──────────────────────────────────────────────────────────────
    r = await client.get(f"/api/v1/scoring/debtors/{debtor_id}", headers=H)
    check("GET /scoring/debtors/{id}", r, 200)

    r = await client.post("/api/v1/scoring/compute-all", headers=H)
    check("POST /scoring/compute-all", r, 200)

    r = await client.get("/api/v1/scoring/top-risky?limit=5", headers=H)
    check("GET /scoring/top-risky", r, 200)

    # ── REPORTS ──────────────────────────────────────────────────────────────
    r = await client.get("/api/v1/reports/dashboard", headers=H)
    check("GET /reports/dashboard", r, 200)
    if r.status_code == 200:
        d = r.json()
        assert d["total_invoices"] >= 2
        assert d["total_debtors"] >= 1

    r = await client.get("/api/v1/reports/monthly-evolution", headers=H)
    check("GET /reports/monthly-evolution", r, 200)

    r = await client.get("/api/v1/reports/agents", headers=H)
    check("GET /reports/agents", r, 200)

    r = await client.get("/api/v1/reports/export/csv", headers=H)
    check("GET /reports/export/csv", r, 200)

    r = await client.get("/api/v1/reports/export/excel", headers=H)
    check("GET /reports/export/excel", r, 200)

    # ── ADMIN ENTREPRISE ─────────────────────────────────────────────────────
    r = await client.get("/api/v1/admin/audit-logs", headers=H)
    check("GET /admin/audit-logs", r, 200)

    r = await client.post("/api/v1/admin/audit-logs", headers=H, json={
        "action": "test_action",
        "entity_type": "invoice",
        "entity_id": invoice_id,
        "description": "Test log manuel",
    })
    check("POST /admin/audit-logs", r, 201)

    r = await client.get("/api/v1/admin/team/stats", headers=H)
    check("GET /admin/team/stats", r, 200)

    # ── SUPERADMIN ───────────────────────────────────────────────────────────
    # Grant the test user superadmin access temporarily
    from app.core.config import settings as _settings
    _orig_sa = _settings.SUPERADMIN_EMAILS
    _settings.SUPERADMIN_EMAILS = f"admin{TS}@pharma.ci,{_orig_sa}"

    r = await client.get("/api/v1/superadmin/stats", headers=H)
    check("GET /superadmin/stats", r, 200)

    r = await client.get("/api/v1/superadmin/companies", headers=H)
    check("GET /superadmin/companies", r, 200)

    r = await client.get(f"/api/v1/superadmin/companies/{company_id}", headers=H)
    check("GET /superadmin/companies/{id}", r, 200)

    r = await client.put(f"/api/v1/superadmin/companies/{company_id}/plan", headers=H, json={"plan": "business"})
    check("PUT /superadmin/companies/{id}/plan", r, 200)

    r = await client.get("/api/v1/superadmin/audit-logs", headers=H)
    check("GET /superadmin/audit-logs", r, 200)

    _settings.SUPERADMIN_EMAILS = _orig_sa

    # ── LOGOUT ───────────────────────────────────────────────────────────────
    r = await client.post("/api/v1/auth/logout", headers=H)
    check("POST /auth/logout", r, 204)


async def main():
    from app.main import app
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url=BASE, timeout=30) as client:
        await run(client)

    total = len(RESULTS)
    passed = sum(1 for s, _, _ in RESULTS if s == "OK")
    failed = total - passed
    print(f"\n{'='*55}")
    print(f"  RESULTATS : {passed}/{total} OK — {failed} FAIL")
    print(f"{'='*55}")
    if failed > 0:
        print("\nEchecs :")
        for status, label, code in RESULTS:
            if status == "FAIL":
                print(f"  FAIL  [{code}]  {label}")
    else:
        print("  Tous les endpoints sont operationnels !")


asyncio.run(main())
