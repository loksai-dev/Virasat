# ==============================================================================
# Virasat Backend - Cloud Run Deployment Script (PowerShell for Windows)
# ==============================================================================
$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR

$PROJECT_ID = "virasat-511210"
$REGION = "asia-south1"
$SERVICE_NAME = "virasat-api"
$SERVICE_ACCOUNT = "virasat-api@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " Deploying Virasat Backend to Cloud Run" -ForegroundColor Cyan
Write-Host " Project: $PROJECT_ID | Region: $REGION | Service: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

# Ensure gcloud configuration
gcloud config set project $PROJECT_ID --quiet

# Define environment variables matching backend/.env
$ENV_VARS = @(
    "GCP_PROJECT=virasat-511210",
    "GCP_REGION=asia-south1",
    "VERTEX_LOCATION=us-central1",
    "GEMINI_PRO_MODEL=gemini-2.5-pro",
    "GEMINI_FLASH_MODEL=gemini-2.5-flash",
    "EMBED_MODEL=text-embedding-005",
    "EMBED_DIM=768",
    "SPANNER_INSTANCE=virasat-inst",
    "SPANNER_DATABASE=virasat-db",
    "GCS_BUCKET=virasat-511210-docs",
    "DEMO_MODE=true",
    "AGENT_FALLBACK_TO_CACHE=true",
    "USE_SQL_FALLBACK=false",
    "ALLOWED_ORIGINS=http://localhost:5173,https://virasat-511210.web.app,https://virasat-511210.firebaseapp.com"
) -join ","

Write-Host "[1/4] Deploying container image from backend/ source to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --source "$ROOT_DIR\backend" `
  --region $REGION `
  --service-account $SERVICE_ACCOUNT `
  --allow-unauthenticated `
  --no-cpu-throttling `
  --min-instances=1 `
  --max-instances=3 `
  --concurrency=20 `
  --timeout=900 `
  --memory=1Gi `
  --env-vars-file="$ROOT_DIR\backend\env_vars.yaml" `
  --project=$PROJECT_ID `
  --quiet

# Retrieve the deployed URL
$SERVICE_URL = (gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)").Trim()
Write-Host ">> Cloud Run Service URL: $SERVICE_URL" -ForegroundColor Green

# Run database migration, seeding, and corpus ingestion against Cloud Spanner
$PYTHON = "$ROOT_DIR\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $PYTHON)) {
    $PYTHON = "python"
}

Write-Host "[2/4] Running Cloud Spanner database migrations..." -ForegroundColor Yellow
& $PYTHON "$ROOT_DIR\scripts\migrate.py"

Write-Host "[3/4] Ensuring seed estates and legal knowledge corpus are current..." -ForegroundColor Yellow
$env:PYTHONPATH = "$ROOT_DIR\backend"
& $PYTHON "$ROOT_DIR\backend\scripts\seed.py"
& $PYTHON "$ROOT_DIR\backend\scripts\ingest_corpus.py"

# Configure Cloud Scheduler job for automated session cleanup
Write-Host "[4/4] Configuring Cloud Scheduler job 'virasat-cleanup'..." -ForegroundColor Yellow
$CLEANUP_URI = "$SERVICE_URL/api/admin/cleanup"

$existing = gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID --format="value(ID)" | Select-String -Pattern "virasat-cleanup"
if ($existing) {
    Write-Host "Updating existing Cloud Scheduler job 'virasat-cleanup'..."
    gcloud scheduler jobs update http virasat-cleanup `
      --location=$REGION `
      --schedule="0 */6 * * *" `
      --uri=$CLEANUP_URI `
      --http-method=POST `
      --oidc-service-account-email=$SERVICE_ACCOUNT `
      --oidc-token-audience=$CLEANUP_URI `
      --time-zone="UTC" `
      --project=$PROJECT_ID `
      --quiet
} else {
    Write-Host "Creating new Cloud Scheduler job 'virasat-cleanup'..."
    gcloud scheduler jobs create http virasat-cleanup `
      --location=$REGION `
      --schedule="0 */6 * * *" `
      --uri=$CLEANUP_URI `
      --http-method=POST `
      --oidc-service-account-email=$SERVICE_ACCOUNT `
      --oidc-token-audience=$CLEANUP_URI `
      --time-zone="UTC" `
      --project=$PROJECT_ID `
      --quiet
}

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host " Cloud Run Deployment & Cloud Setup Complete!" -ForegroundColor Green
Write-Host " Service Endpoint: $SERVICE_URL" -ForegroundColor Green
Write-Host " Scheduler Job   : virasat-cleanup (Every 6 hours -> $CLEANUP_URI)" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
