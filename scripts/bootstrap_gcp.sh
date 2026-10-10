#!/usr/bin/env bash
# ==============================================================================
# scripts/bootstrap_gcp.sh
# Idempotent Google Cloud setup script for Virasat (virasat-511210)
# ==============================================================================
set -euo pipefail

PROJECT_ID="virasat-511210"
REGION="asia-south1"
VERTEX_LOC="us-central1"
BUCKET_NAME="virasat-511210-docs"
SA_NAME="virasat-api"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SPANNER_INSTANCE="virasat-inst"
SPANNER_DATABASE="virasat-db"

echo "============================================================"
echo " Bootstrapping Google Cloud for Virasat: ${PROJECT_ID}"
echo "============================================================"

# 1. Tools Check
echo "[1/7] Verifying CLI tools..."
for tool in gcloud python node npm firebase; do
  if ! command -v "$tool" &>/dev/null; then
    echo "ERROR: Required tool '$tool' is not installed or not in PATH."
    exit 1
  fi
done
echo "All CLI tools available."

# 2. Config & Project
echo "[2/7] Setting active GCP project..."
gcloud config set project "${PROJECT_ID}"

# 3. Enable Required APIs (Batched)
echo "[3/7] Enabling APIs..."
APIS=(
  run.googleapis.com
  cloudbuild.googleapis.com
  artifactregistry.googleapis.com
  spanner.googleapis.com
  aiplatform.googleapis.com
  documentai.googleapis.com
  storage.googleapis.com
  secretmanager.googleapis.com
  identitytoolkit.googleapis.com
  firebase.googleapis.com
  firebasehosting.googleapis.com
  dlp.googleapis.com
  cloudscheduler.googleapis.com
  logging.googleapis.com
  monitoring.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  cloudresourcemanager.googleapis.com
  serviceusage.googleapis.com
  billingbudgets.googleapis.com
  pubsub.googleapis.com
)

# Batch 1 (15 APIs)
gcloud services enable "${APIS[@]:0:15}" --project="${PROJECT_ID}"
# Batch 2 (remaining APIs)
gcloud services enable "${APIS[@]:15}" --project="${PROJECT_ID}"
echo "APIs verified/enabled."

# 4. Service Account
echo "[4/7] Setting up runtime service account: ${SA_EMAIL}..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "Creating service account ${SA_NAME}..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Virasat Runtime API Service Account" \
    --project="${PROJECT_ID}"
else
  echo "Service account ${SA_NAME} already exists."
fi

# Project-level roles
ROLES=(
  roles/aiplatform.user
  roles/documentai.apiUser
  roles/dlp.user
  roles/secretmanager.secretAccessor
  roles/logging.logWriter
  roles/monitoring.metricWriter
)

for role in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${role}" \
    --condition=None --quiet >/dev/null
done

# Self-impersonation for signing URLs without JSON keys
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project="${PROJECT_ID}" --quiet >/dev/null

echo "Service account permissions configured."

# 5. Cloud Storage Bucket
echo "[5/7] Configuring Cloud Storage bucket: gs://${BUCKET_NAME}..."
if ! gcloud storage buckets describe "gs://${BUCKET_NAME}" &>/dev/null; then
  echo "Creating bucket..."
  gcloud storage buckets create "gs://${BUCKET_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --uniform-bucket-level-access
else
  echo "Bucket gs://${BUCKET_NAME} already exists."
fi

# Public access prevention & Uniform access
gcloud storage buckets update "gs://${BUCKET_NAME}" --public-access-prevention
gcloud storage buckets update "gs://${BUCKET_NAME}" --uniform-bucket-level-access

# Apply lifecycle rule
if [ -f "scripts/gcs_lifecycle.json" ]; then
  gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file="scripts/gcs_lifecycle.json"
fi

# Bucket IAM binding for service account
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin" --quiet >/dev/null

echo "Storage bucket configured."

# 6. Spanner Instance & Database
echo "[6/7] Configuring Cloud Spanner..."
if ! gcloud spanner instances describe "${SPANNER_INSTANCE}" &>/dev/null; then
  echo "Creating free-trial Spanner instance ${SPANNER_INSTANCE}..."
  gcloud spanner instances create "${SPANNER_INSTANCE}" \
    --config="regional-${REGION}" \
    --description="Virasat Spanner Instance" \
    --instance-type=free-instance \
    --expire-behavior=remove-after-grace-period
else
  echo "Spanner instance ${SPANNER_INSTANCE} already exists."
fi

# Grant Spanner databaseUser to service account
gcloud spanner instances add-iam-policy-binding "${SPANNER_INSTANCE}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/spanner.databaseUser" --quiet >/dev/null

# Create database if missing
if ! gcloud spanner databases describe "${SPANNER_DATABASE}" --instance="${SPANNER_INSTANCE}" &>/dev/null; then
  echo "Creating Spanner database ${SPANNER_DATABASE}..."
  gcloud spanner databases create "${SPANNER_DATABASE}" \
    --instance="${SPANNER_INSTANCE}" \
    --database-dialect=GOOGLE_STANDARD_SQL
else
  echo "Spanner database ${SPANNER_DATABASE} already exists."
fi

# Apply schema if schema.sql exists
if [ -f "scripts/schema.sql" ]; then
  echo "Applying database schema..."
  gcloud spanner databases ddl update "${SPANNER_DATABASE}" \
    --instance="${SPANNER_INSTANCE}" \
    --ddl-file="scripts/schema.sql"
fi

# 7. Verification
echo "[7/7] Running cloud verification test..."
python scripts/verify_cloud.py

echo "============================================================"
echo " Virasat GCP Bootstrap completed successfully!"
echo "============================================================"
