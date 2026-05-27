"""
Script de diagnostic FedaPay — affiche les réponses brutes de l'API.
Exécuter: python scripts/test_fedapay.py
"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from app.core.config import settings


def base():
    return "https://sandbox-api.fedapay.com/v1" if settings.FEDAPAY_ENV == "sandbox" else "https://api.fedapay.com/v1"

def checkout_base():
    return "https://sandbox-checkout.fedapay.com" if settings.FEDAPAY_ENV == "sandbox" else "https://checkout.fedapay.com"

def headers():
    return {"Authorization": f"Bearer {settings.FEDAPAY_SECRET_KEY}", "Content-Type": "application/json"}


async def main():
    print(f"\n=== FedaPay Diagnostic ===")
    print(f"ENV      : {settings.FEDAPAY_ENV}")
    print(f"API BASE : {base()}")
    print(f"KEY      : {settings.FEDAPAY_SECRET_KEY[:15]}...")

    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Créer une transaction de test
        payload = {
            "description": "Test Recov360",
            "amount": 100,
            "currency": {"iso": "XOF"},
            "callback_url": "http://localhost:3000/subscribe/callback",
            "customer": {
                "email": "test@recov360.com",
                "firstname": "Test",
                "lastname": "User",
            },
        }
        print(f"\n--- POST /transactions ---")
        tx_res = await client.post(f"{base()}/transactions", headers=headers(), json=payload)
        tx_body = tx_res.json()
        print(f"Status : {tx_res.status_code}")
        print(f"Body   : {json.dumps(tx_body, indent=2)}")

        if tx_res.status_code not in (200, 201):
            print("\n❌ Impossible de créer la transaction. Arrêt.")
            return

        # Essayer les deux clés possibles
        transaction = tx_body.get("v1/transaction") or tx_body.get("transaction") or {}
        transaction_id = transaction.get("id")
        print(f"\n✅ Transaction ID : {transaction_id}")

        if not transaction_id:
            print("❌ Pas d'ID de transaction trouvé dans la réponse.")
            return

        # 2. Générer le token de paiement
        print(f"\n--- POST /transactions/{transaction_id}/token ---")
        token_res = await client.post(f"{base()}/transactions/{transaction_id}/token", headers=headers())
        token_body = token_res.json()
        print(f"Status : {token_res.status_code}")
        print(f"Body   : {json.dumps(token_body, indent=2)}")

        # Essayer de trouver le token et l'URL dans toutes les clés possibles
        nested = token_body.get("v1/token") or {}
        token_val = token_body.get("token") or nested.get("token")
        url_from_api = token_body.get("url") or nested.get("url")

        print(f"\n--- Résultat ---")
        print(f"token          : {token_val}")
        print(f"url_from_api   : {url_from_api}")

        if token_val:
            built_url = f"{checkout_base()}/pay/{token_val}"
            print(f"url_construite : {built_url}")

        if url_from_api:
            print(f"\n✅ FedaPay renvoie directement l'URL : {url_from_api}")
            print("   → Utiliser token_body['url'] ou token_body['v1/token']['url']")
        elif token_val:
            print(f"\n✅ Token trouvé, URL construite : {built_url}")
        else:
            print("\n❌ Ni token ni URL trouvé dans la réponse.")


if __name__ == "__main__":
    asyncio.run(main())
