#!/usr/bin/env bash
set -e

echo "Starting Virasat backend server on http://localhost:8000..."
if [ -f "./.venv/bin/uvicorn" ]; then
    ./.venv/bin/uvicorn app.main:app --reload --port 8000
else
    uvicorn app.main:app --reload --port 8000
fi
