from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Recov360"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@recov360.com"
    SMTP_FROM_NAME: str = "Recov360"

    FIREBASE_CREDENTIALS_PATH: str = "firebase-credentials.json"

    SMS_GATEWAY_URL: str = ""
    SMS_GATEWAY_API_KEY: str = ""
    SMS_SENDER_ID: str = "RECOV360"

    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    SENTRY_DSN: str = ""

    SUPERADMIN_EMAILS: str = ""

    # FedaPay
    FEDAPAY_SECRET_KEY: str = ""
    FEDAPAY_ENV: str = "sandbox"   # "sandbox" ou "live"
    FEDAPAY_WEBHOOK_SECRET: str = "" # pour vérifier les webhooks
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def superadmin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.SUPERADMIN_EMAILS.split(",") if e.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
