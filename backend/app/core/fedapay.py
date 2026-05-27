"""
Client FedaPay — intégration paiement West Africa.
Doc API: https://docs.fedapay.com/

NOTE IMPORTANTE (découverte par diagnostic 27/05/2026) :
  - La réponse de création de transaction contient déjà :
      • payment_token  → le JWT du paiement
      • payment_url    → l'URL de checkout réelle (https://process.fedapay.com/{token})
  - Il n'est PAS nécessaire d'appeler l'endpoint /token séparément.
  - L'URL correcte est payment_url, PAS https://checkout.fedapay.com/pay/{token}.
"""
import json
import httpx
from fastapi import HTTPException
from app.core.config import settings


def _base() -> str:
    if settings.FEDAPAY_ENV == "sandbox":
        return "https://sandbox-api.fedapay.com/v1"
    return "https://api.fedapay.com/v1"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.FEDAPAY_SECRET_KEY}",
        "Content-Type": "application/json",
    }


async def create_transaction(
    amount: int,
    description: str,
    customer_email: str,
    customer_firstname: str,
    customer_lastname: str,
    callback_url: str,
    currency: str = "XOF",
) -> dict:
    """
    Crée une transaction FedaPay.
    Retourne {fedapay_id, checkout_url, status, raw}.

    La réponse FedaPay contient directement :
      - v1/transaction.payment_url  → URL de checkout à utiliser
      - v1/transaction.payment_token → token JWT
    """
    async with httpx.AsyncClient(timeout=30) as client:
        payload = {
            "description": description,
            "amount": int(amount),
            "currency": {"iso": currency},
            "callback_url": callback_url,
            "customer": {
                "email": customer_email,
                "firstname": customer_firstname or "Client",
                "lastname": customer_lastname or "Recov360",
            },
        }

        tx_res = await client.post(
            f"{_base()}/transactions",
            headers=_headers(),
            json=payload,
        )
        tx_body = tx_res.json()

        # Vérifier les erreurs d'authentification
        if tx_res.status_code in (401, 403):
            msg = tx_body.get("message", "Erreur d'authentification FedaPay")
            raise HTTPException(status_code=502, detail=f"FedaPay auth: {msg}")

        if tx_res.status_code not in (200, 201):
            msg = tx_body.get("message", f"Erreur FedaPay HTTP {tx_res.status_code}")
            raise HTTPException(status_code=502, detail=f"FedaPay: {msg}")

        # FedaPay encapsule la réponse sous la clé "v1/transaction"
        transaction = tx_body.get("v1/transaction", {})
        transaction_id = transaction.get("id")

        if not transaction_id:
            raise HTTPException(status_code=502, detail="FedaPay n'a pas retourné d'ID de transaction")

        # L'URL de checkout est directement dans la réponse de création
        # → payment_url est la vraie URL (ex: https://process.fedapay.com/{token})
        checkout_url = transaction.get("payment_url")

        # Fallback : si payment_url absent, on essaie l'endpoint /token séparé
        if not checkout_url:
            checkout_url = await _fetch_token_url(client, transaction_id)

        return {
            "fedapay_id": str(transaction_id),
            "checkout_url": checkout_url,
            "status": transaction.get("status", "pending"),
            "raw": json.dumps(tx_body),
        }


async def _fetch_token_url(client: httpx.AsyncClient, transaction_id: int) -> str | None:
    """
    Fallback : appelle POST /transactions/{id}/token pour récupérer l'URL de paiement.
    Utilisé seulement si payment_url n'est pas dans la réponse de création.
    """
    try:
        token_res = await client.post(
            f"{_base()}/transactions/{transaction_id}/token",
            headers=_headers(),
        )
        token_body = token_res.json()

        if token_res.status_code not in (200, 201):
            return None

        # Chercher l'URL dans les deux structures possibles
        nested = token_body.get("v1/token", {})
        url = (
            token_body.get("url") or
            nested.get("url") or
            token_body.get("payment_url") or
            nested.get("payment_url")
        )

        if url:
            return url

        # Dernier recours : construire à partir du token
        token_val = token_body.get("token") or nested.get("token")
        if token_val:
            # Utiliser le même domaine que payment_url (process.fedapay.com)
            base_domain = (
                "https://sandbox-checkout.fedapay.com/pay"
                if settings.FEDAPAY_ENV == "sandbox"
                else "https://process.fedapay.com"
            )
            return f"{base_domain}/{token_val}"

    except Exception:
        pass
    return None


async def verify_transaction(fedapay_id: str) -> dict:
    """
    Interroge FedaPay pour obtenir le vrai statut d'une transaction.
    Retourne {"status": "approved"|"declined"|"pending"|..., "amount": ..., "raw": ...}
    """
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            f"{_base()}/transactions/{fedapay_id}",
            headers=_headers(),
        )
        body = res.json()

        if res.status_code in (401, 403):
            raise HTTPException(status_code=502, detail="FedaPay: erreur d'authentification lors de la vérification")

        if res.status_code == 404:
            raise HTTPException(status_code=404, detail="Transaction FedaPay introuvable")

        if res.status_code not in (200, 201):
            msg = body.get("message", f"Erreur FedaPay HTTP {res.status_code}")
            raise HTTPException(status_code=502, detail=f"FedaPay verify: {msg}")

        transaction = body.get("v1/transaction", {})
        return {
            "fedapay_id": str(fedapay_id),
            "status": transaction.get("status", "pending"),
            "amount": transaction.get("amount", 0),
            "currency": (transaction.get("currency") or {}).get("iso", "XOF"),
            "raw": json.dumps(body),
        }
