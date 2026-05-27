#!/bin/bash
set -e

echo "=== Recov360 Startup ==="
echo ">>> Applying database migrations..."
alembic upgrade head
echo ">>> Migrations applied successfully."
echo ">>> Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
