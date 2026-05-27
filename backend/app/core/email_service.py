"""
Service d'envoi d'emails — Recov360.

Fournit :
  - send_email()          : envoi générique
  - Templates HTML professionnels pour chaque événement métier
"""
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Envoi générique
# ─────────────────────────────────────────────────────────────────────────────

async def send_email(to: str, subject: str, html: str, text: str = "") -> bool:
    """
    Envoie un email HTML. Retourne True si envoi OK, False sinon.
    Ne lève jamais d'exception (les erreurs sont loguées).
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning("[Email] SMTP non configuré — email non envoyé à %s", to)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"]      = to
        if text:
            msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        async with aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=int(settings.SMTP_PORT),
            start_tls=True,
        ) as smtp:
            await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            await smtp.send_message(msg)

        logger.info("[Email] Envoyé à %s — %s", to, subject)
        return True
    except Exception as e:
        logger.error("[Email] Échec envoi à %s : %s", to, e)
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Wrapper HTML commun
# ─────────────────────────────────────────────────────────────────────────────

def _wrap(content: str, preview: str = "") -> str:
    """Entoure le contenu dans un layout email responsive et professionnel."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Recov360</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
{f'<div style="display:none;max-height:0;overflow:hidden;color:#F1F5F9;">{preview}</div>' if preview else ''}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:16px 16px 0 0;padding:28px 36px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:inline-block;text-align:center;line-height:40px;font-size:20px;">📊</div>
                <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;vertical-align:middle;">Recov360</span>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#ffffff;padding:36px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
        {content}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;">
          Recov360 — Plateforme de recouvrement pour les PME africaines
        </p>
        <p style="margin:0;font-size:11px;color:#CBD5E1;">
          Vous recevez cet email car vous êtes inscrit sur Recov360.<br/>
          © 2026 Recov360. Tous droits réservés.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


def _btn(text: str, url: str, color: str = "#2563EB") -> str:
    return f"""<table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="background:{color};border-radius:8px;padding:0;">
    <a href="{url}" style="display:inline-block;padding:12px 28px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">{text}</a>
  </td></tr>
</table>"""


def _badge(text: str, color: str = "#2563EB", bg: str = "") -> str:
    bg = bg or color + "18"
    return f'<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:{bg};color:{color};font-size:12px;font-weight:700;">{text}</span>'


def _info_row(label: str, value: str) -> str:
    return f"""<tr>
      <td style="padding:8px 12px;font-size:13px;color:#64748B;font-weight:500;white-space:nowrap;">{label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#1E293B;font-weight:600;">{value}</td>
    </tr>"""


def _info_table(*rows: str) -> str:
    inner = "".join(rows)
    return f"""<table cellpadding="0" cellspacing="0" border="0" width="100%"
        style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:16px 0;">
      {inner}
    </table>"""


# ─────────────────────────────────────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────────────────────────────────────

def tpl_welcome(
    company_name: str,
    admin_first_name: str,
    trial_days: int,
    dashboard_url: str,
) -> tuple[str, str]:
    """Email de bienvenue envoyé à l'entreprise après inscription."""
    subject = f"Bienvenue sur Recov360, {company_name} 🎉"
    content = f"""
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0F172A;">
  Bienvenue, {admin_first_name} !
</h1>
<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
  Votre compte <strong>{company_name}</strong> est prêt.<br/>
  Vous bénéficiez d'une période d'essai gratuite de <strong>{trial_days} jours</strong>
  pour explorer toutes les fonctionnalités de Recov360.
</p>

{_info_table(
    _info_row("🏢 Entreprise", company_name),
    _info_row("⏳ Essai gratuit", f"{trial_days} jours"),
    _info_row("📦 Plan", "Starter (essai)"),
)}

<p style="margin:20px 0 8px;font-size:14px;font-weight:700;color:#0F172A;">Ce que vous pouvez faire maintenant :</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
  {"".join(f'<tr><td style="padding:5px 0;font-size:14px;color:#475569;">✅ &nbsp;{f}</td></tr>' for f in [
    "Ajouter vos premiers débiteurs",
    "Créer et suivre vos créances",
    "Configurer des workflows de relance automatique",
    "Inviter vos collaborateurs",
    "Analyser votre taux de recouvrement",
  ])}
</table>

{_btn("Accéder à mon tableau de bord →", dashboard_url)}

<p style="margin:24px 0 0;font-size:13px;color:#94A3B8;">
  Des questions ? Répondez à cet email, nous sommes là pour vous aider.
</p>
"""
    return subject, _wrap(content, f"Bienvenue {company_name} — votre essai gratuit de {trial_days} jours commence maintenant")


def tpl_subscription_confirmed(
    company_name: str,
    admin_first_name: str,
    plan_name: str,
    amount: str,
    period: str,
    end_date: str,
    dashboard_url: str,
) -> tuple[str, str]:
    """Email de confirmation d'abonnement payant."""
    subject = f"Votre abonnement {plan_name} est activé — Recov360"
    content = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="width:64px;height:64px;background:#DCFCE7;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px;">✅</div>
  <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F172A;">Paiement confirmé !</h1>
  <p style="margin:0;font-size:15px;color:#475569;">Votre abonnement est maintenant actif.</p>
</div>

{_info_table(
    _info_row("🏢 Entreprise", company_name),
    _info_row("📦 Plan", plan_name),
    _info_row("💳 Montant", amount),
    _info_row("📅 Facturation", period),
    _info_row("📆 Valide jusqu'au", end_date),
)}

<p style="margin:20px 0;font-size:14px;color:#475569;line-height:1.6;">
  Merci, <strong>{admin_first_name}</strong> ! Votre abonnement <strong>{plan_name}</strong> est actif.
  Profitez de toutes les fonctionnalités incluses dans votre plan.
</p>

{_btn("Accéder à mon espace →", dashboard_url)}

<p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">
  Un reçu de paiement peut être généré depuis votre espace Abonnement.
</p>
"""
    return subject, _wrap(content, f"Abonnement {plan_name} activé — merci pour votre confiance")


def tpl_sa_new_registration(
    company_name: str,
    company_email: str,
    admin_name: str,
    admin_email: str,
    country: str,
    trial_days: int,
    panel_url: str,
    registered_at: str,
) -> tuple[str, str]:
    """Alerte super admin — nouvelle inscription."""
    subject = f"[Recov360] Nouvelle inscription : {company_name}"
    content = f"""
<div style="background:#EFF6FF;border-left:4px solid #2563EB;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
  <p style="margin:0;font-size:14px;font-weight:700;color:#1D4ED8;">🆕 Nouvelle entreprise inscrite</p>
  <p style="margin:4px 0 0;font-size:13px;color:#3B82F6;">{registered_at}</p>
</div>

<h2 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0F172A;">{company_name}</h2>

{_info_table(
    _info_row("🏢 Entreprise", company_name),
    _info_row("📧 Email entreprise", company_email),
    _info_row("👤 Administrateur", admin_name),
    _info_row("📧 Email admin", admin_email),
    _info_row("🌍 Pays", country or "Non renseigné"),
    _info_row("⏳ Période d'essai", f"{trial_days} jours"),
)}

{_btn("Voir dans le panel →", panel_url, "#2563EB")}
"""
    return subject, _wrap(content, f"Nouvelle inscription : {company_name} — {registered_at}")


def tpl_sa_new_payment(
    company_name: str,
    company_email: str,
    plan_name: str,
    amount: str,
    period: str,
    transaction_id: str,
    panel_url: str,
    paid_at: str,
) -> tuple[str, str]:
    """Alerte super admin — nouveau paiement reçu."""
    subject = f"[Recov360] 💰 Paiement reçu — {company_name} ({amount})"
    content = f"""
<div style="background:#F0FDF4;border-left:4px solid #059669;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
  <p style="margin:0;font-size:14px;font-weight:700;color:#059669;">💰 Nouveau paiement confirmé</p>
  <p style="margin:4px 0 0;font-size:13px;color:#10B981;">{paid_at}</p>
</div>

{_info_table(
    _info_row("🏢 Entreprise", company_name),
    _info_row("📧 Email", company_email),
    _info_row("📦 Plan", plan_name),
    _info_row("💳 Montant", amount),
    _info_row("📅 Période", period),
    _info_row("🔑 Transaction ID", transaction_id),
)}

{_btn("Voir les transactions →", panel_url, "#059669")}
"""
    return subject, _wrap(content, f"Paiement {amount} reçu de {company_name}")
