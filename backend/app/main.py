from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis import get_redis, close_redis
from app.core.firebase import init_firebase
from app.core.middleware import RequestIDMiddleware, TimingMiddleware

from app.domains.auth.router import router as auth_router
from app.domains.companies.router import router as companies_router
from app.domains.users.router import router as users_router
from app.domains.debtors.router import router as debtors_router
from app.domains.invoices.router import router as invoices_router
from app.domains.notifications.router import router as notifications_router
from app.domains.workflows.router import router as workflows_router
from app.domains.scoring.router import router as scoring_router
from app.domains.reports.router import router as reports_router
from app.domains.admin.router import admin_router, superadmin_router
from app.domains.subscriptions.router import router as subscriptions_router, public_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
    init_firebase()
    yield
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    description="API de recouvrement automatisé pour PME en Afrique de l'Ouest",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not settings.is_production else settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = settings.API_V1_PREFIX

app.include_router(auth_router, prefix=PREFIX)
app.include_router(companies_router, prefix=PREFIX)
app.include_router(users_router, prefix=PREFIX)
app.include_router(debtors_router, prefix=PREFIX)
app.include_router(invoices_router, prefix=PREFIX)
app.include_router(notifications_router, prefix=PREFIX)
app.include_router(workflows_router, prefix=PREFIX)
app.include_router(scoring_router, prefix=PREFIX)
app.include_router(reports_router, prefix=PREFIX)
app.include_router(admin_router, prefix=PREFIX)
app.include_router(superadmin_router, prefix=PREFIX)
app.include_router(subscriptions_router, prefix=PREFIX)
app.include_router(public_router, prefix=PREFIX)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}


@app.get("/", tags=["Root"])
async def root():
    return {"message": f"Bienvenue sur {settings.APP_NAME} API", "docs": "/docs"}
