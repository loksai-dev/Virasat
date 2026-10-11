# ==============================================================================
# Virasat Backend - Cloud Run Smoke Test Runner (PowerShell for Windows)
# ==============================================================================
param(
    [string]$Url = ""
)

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR

$PROJECT_ID = "virasat-511210"
$REGION = "asia-south1"
$SERVICE_NAME = "virasat-api"

if (-not $Url) {
    $Url = (gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)").Trim()
}

Write-Host "Running smoke test suite against: $Url" -ForegroundColor Cyan

$PYTHON = "$ROOT_DIR\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $PYTHON)) {
    $PYTHON = "python"
}

& $PYTHON "$SCRIPT_DIR\smoke_test.py" --url="$Url"
