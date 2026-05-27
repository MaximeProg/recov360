import uuid
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_invoice_number(company_prefix: str = "INV") -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    uid = str(uuid.uuid4())[:6].upper()
    return f"{company_prefix}-{ts}-{uid}"


def render_template(template: str, variables: dict) -> str:
    for key, value in variables.items():
        template = template.replace(f"{{{{{key}}}}}", str(value))
    return template


def mask_email(email: str) -> str:
    parts = email.split("@")
    if len(parts) != 2:
        return email
    local = parts[0]
    masked = local[:2] + "***" if len(local) > 2 else "***"
    return f"{masked}@{parts[1]}"
