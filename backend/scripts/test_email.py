"""
Test d'envoi d'email SMTP — Recov360
Usage: python scripts/test_email.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from app.core.config import settings

TO_EMAIL = "kouassimaxime540@gmail.com"

HTML_BODY = """
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 30px;">
    <h2 style="color: #3B82F6;">Recov360 — Test d'envoi email</h2>
    <p>Bonjour,</p>
    <p>Ceci est un email de test envoyé depuis la plateforme <strong>Recov360</strong>.</p>
    <p>Si vous recevez cet email, la configuration SMTP est correcte.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #666; font-size: 13px;">
      Serveur : {host}:{port}<br>
      Compte : {user}<br>
      Expéditeur affiché : {from_name} &lt;{from_email}&gt;
    </p>
  </div>
</body>
</html>
""".format(
    host=settings.SMTP_HOST,
    port=settings.SMTP_PORT,
    user=settings.SMTP_USER,
    from_name=settings.SMTP_FROM_NAME,
    from_email=settings.SMTP_FROM_EMAIL,
)

async def test_email():
    print(f"\n=== Test Email SMTP ===")
    print(f"Host     : {settings.SMTP_HOST}:{settings.SMTP_PORT}")
    print(f"User     : {settings.SMTP_USER}")
    print(f"From     : {settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>")
    print(f"To       : {TO_EMAIL}")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Test Recov360 - Email SMTP"
    # Pour Gmail : le From DOIT etre le meme que le compte authentifie
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = TO_EMAIL
    msg.attach(MIMEText(HTML_BODY, "html"))

    print("\n--- Connexion SMTP (STARTTLS port 587)...")
    try:
        async with aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,       # STARTTLS requis pour port 587
        ) as smtp:
            print("  Connexion OK")
            await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            print("  Authentification OK")
            await smtp.send_message(msg)
            print(f"  Email envoye a {TO_EMAIL} avec succes!")

    except aiosmtplib.errors.SMTPAuthenticationError as e:
        print(f"  ERREUR AUTH: {e}")
        print("  -> Verifier SMTP_USER / SMTP_PASSWORD dans .env")
        print("  -> Pour Gmail: utiliser un mot de passe d'application (pas le mot de passe principal)")
    except aiosmtplib.errors.SMTPConnectError as e:
        print(f"  ERREUR CONNEXION: {e}")
        print("  -> Verifier SMTP_HOST / SMTP_PORT")
    except Exception as e:
        print(f"  ERREUR: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_email())
