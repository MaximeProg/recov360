from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "recov360",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks_workflows",
        "app.workers.tasks_scoring",
        "app.workers.tasks_notifications",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Abidjan",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery_app.conf.beat_schedule = {
    "mark-overdue-invoices": {
        "task": "app.workers.tasks_workflows.mark_overdue_invoices",
        "schedule": crontab(hour=1, minute=0),
    },
    "run-workflow-reminders": {
        "task": "app.workers.tasks_workflows.run_workflow_reminders",
        "schedule": crontab(hour=8, minute=0),
    },
    "check-broken-promises": {
        "task": "app.workers.tasks_workflows.check_broken_promises",
        "schedule": crontab(hour=9, minute=0),
    },
    "compute-risk-scores": {
        "task": "app.workers.tasks_scoring.compute_all_risk_scores",
        "schedule": crontab(hour=2, minute=0, day_of_week="1"),
    },
}
