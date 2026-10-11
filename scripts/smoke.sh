#!/usr/bin/env bash
# ==============================================================================
# Virasat Backend - Cloud Run Smoke Test Runner (Phase 15)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_ID="virasat-511210"
REGION="asia-south1"
SERVICE_NAME="virasat-api"

# Get URL from argument or gcloud
if [ -n "${1:-}" ]; then
  SERVICE_URL="$1"
else
  SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --format="value(status.url)")
fi

echo "Running smoke test suite against: ${SERVICE_URL}"
python "${SCRIPT_DIR}/smoke_test.py" --url="${SERVICE_URL}"
