#!/usr/bin/env bash
# ==============================================================================
# Virasat Backend - Cloud Run Deployment Script (Phase 15)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_ID="virasat-511210"
REGION="asia-south1"
SERVICE_NAME="virasat-api"
SERVICE_ACCOUNT="virasat-api@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=============================================================================="
echo " Deploying Virasat Backend to Cloud Run"
echo " Project: ${PROJECT_ID} | Region: ${REGION} | Service: ${SERVICE_NAME}"
echo "=============================================================================="

# Ensure gcloud configuration
gcloud config set project "${PROJECT_ID}" --quiet

# Define environment variables matching backend/.env
ENV_VARS="GCP_PROJECT=virasat-511210"
ENV_VARS="${ENV_VARS},GCP_REGION=asia-south1"
ENV_VARS="${ENV_VARS},VERTEX_LOCATION=us-central1"
ENV_VARS="${ENV_VARS},GEMINI_PRO_MODEL=gemini-2.5-pro"
ENV_VARS="${ENV_VARS},GEMINI_FLASH_MODEL=gemini-2.5-flash"
ENV_VARS="${ENV_VARS},EMBED_MODEL=text-embedding-005"
ENV_VARS="${ENV_VARS},EMBED_DIM=768"
ENV_VARS="${ENV_VARS},SPANNER_INSTANCE=virasat-inst"
ENV_VARS="${ENV_VARS},SPANNER_DATABASE=virasat-db"
ENV_VARS="${ENV_VARS},GCS_BUCKET=virasat-511210-docs"
ENV_VARS="${ENV_VARS},DEMO_MODE=true"
ENV_VARS="${ENV_VARS},AGENT_FALLBACK_TO_CACHE=true"
ENV_VARS="${ENV_VARS},USE_SQL_FALLBACK=false"
ENV_VARS="${ENV_VARS},ALLOWED_ORIGINS=http://localhost:5173,https://virasat-511210.web.app,https://virasat-511210.firebaseapp.com"

echo "[1/4] Deploying container image from backend/ source to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --source "${ROOT_DIR}/backend" \
  --region "${REGION}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --allow-unauthenticated \
  --no-cpu-throttling \
  --min-instances=1 \
  --max-instances=3 \
  --concurrency=20 \
  --timeout=900 \
  --memory=1Gi \
  --env-vars-file="${ROOT_DIR}/backend/env_vars.yaml" \
  --project="${PROJECT_ID}" \
  --quiet

# Retrieve the deployed URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --format="value(status.url)")
echo ">> Cloud Run Service URL: ${SERVICE_URL}"

# Run database migration, seeding, and corpus ingestion against Cloud Spanner
echo "[2/4] Running Cloud Spanner database migrations..."
python "${ROOT_DIR}/scripts/migrate.py"

echo "[3/4] Ensuring seed estates and legal knowledge corpus are current..."
PYTHONPATH="${ROOT_DIR}/backend" python "${ROOT_DIR}/backend/scripts/seed.py"
PYTHONPATH="${ROOT_DIR}/backend" python "${ROOT_DIR}/backend/scripts/ingest_corpus.py"

# Configure Cloud Scheduler job for automated session cleanup
echo "[4/4] Configuring Cloud Scheduler job 'virasat-cleanup'..."
CLEANUP_URI="${SERVICE_URL}/api/admin/cleanup"

if gcloud scheduler jobs describe virasat-cleanup --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "Updating existing Cloud Scheduler job 'virasat-cleanup'..."
  gcloud scheduler jobs update http virasat-cleanup \
    --location="${REGION}" \
    --schedule="0 */6 * * *" \
    --uri="${CLEANUP_URI}" \
    --http-method=POST \
    --oidc-service-account-email="${SERVICE_ACCOUNT}" \
    --oidc-token-audience="${CLEANUP_URI}" \
    --time-zone="UTC" \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "Creating new Cloud Scheduler job 'virasat-cleanup'..."
  gcloud scheduler jobs create http virasat-cleanup \
    --location="${REGION}" \
    --schedule="0 */6 * * *" \
    --uri="${CLEANUP_URI}" \
    --http-method=POST \
    --oidc-service-account-email="${SERVICE_ACCOUNT}" \
    --oidc-token-audience="${CLEANUP_URI}" \
    --time-zone="UTC" \
    --project="${PROJECT_ID}" \
    --quiet
fi

echo "=============================================================================="
echo " Cloud Run Deployment & Cloud Setup Complete!"
echo " Service Endpoint: ${SERVICE_URL}"
echo " Scheduler Job   : virasat-cleanup (Every 6 hours -> ${CLEANUP_URI})"
echo "=============================================================================="
