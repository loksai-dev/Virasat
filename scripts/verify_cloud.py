#!/usr/bin/env python3
"""
scripts/verify_cloud.py
Verifies GCP setup for project virasat-511210:
- auth (Application Default Credentials)
- billing (active billing account)
- APIs (all required services enabled)
- service account (virasat-api exists)
- bucket (gs://virasat-511210-docs accessible)
- Spanner (instance virasat-inst, database virasat-db, SELECT 1)
- Gemini generate (gemini-2.5-flash on Vertex AI)
- Embedding (text-embedding-005, 768 dims)
"""

import sys
import os
import warnings

# Suppress noisy grpc/deprecation warnings
warnings.filterwarnings("ignore")

# Ensure UTF-8 output if possible
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import subprocess
import google.auth
import google.auth.transport.requests
from google.cloud import storage
from google.cloud import spanner
from google import genai
from google.genai import types

PROJECT_ID = os.environ.get("GCP_PROJECT", "virasat-511210")
REGION = os.environ.get("GCP_REGION", "asia-south1")
VERTEX_LOC = os.environ.get("VERTEX_LOCATION", "us-central1")
FLASH_MODEL = os.environ.get("GEMINI_FLASH_MODEL", "gemini-2.5-flash")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "text-embedding-005")
EMBED_DIM = int(os.environ.get("EMBED_DIM", "768"))
SPANNER_INSTANCE = os.environ.get("SPANNER_INSTANCE", "virasat-inst")
SPANNER_DATABASE = os.environ.get("SPANNER_DATABASE", "virasat-db")
BUCKET_NAME = os.environ.get("GCS_BUCKET", "virasat-511210-docs")
SA_EMAIL = f"virasat-api@{PROJECT_ID}.iam.gserviceaccount.com"

REQUIRED_APIS = [
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "spanner.googleapis.com",
    "aiplatform.googleapis.com",
    "documentai.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "identitytoolkit.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "dlp.googleapis.com",
    "cloudscheduler.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "billingbudgets.googleapis.com",
    "pubsub.googleapis.com"
]

results = {}

def check_auth():
    try:
        credentials, project = google.auth.default()
        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        if credentials.token:
            results["auth"] = "PASS"
            print("[PASS] auth: Application Default Credentials active")
            return credentials
    except Exception as e:
        results["auth"] = f"FAIL: {e}"
        print(f"[FAIL] auth: {e}")
    return None

def check_billing():
    try:
        res = subprocess.run(
            ["gcloud", "billing", "projects", "describe", PROJECT_ID, "--format=value(billingEnabled)"],
            capture_output=True, text=True, check=True, shell=True
        )
        if res.stdout.strip() == "True":
            results["billing"] = "PASS"
            print("[PASS] billing: Project billing linked and enabled")
        else:
            results["billing"] = f"FAIL: billingEnabled is {res.stdout.strip()}"
            print(f"[FAIL] billing: billingEnabled is {res.stdout.strip()}")
    except Exception as e:
        results["billing"] = f"FAIL: {e}"
        print(f"[FAIL] billing: {e}")

def check_apis():
    try:
        res = subprocess.run(
            ["gcloud", "services", "list", "--enabled", "--format=value(config.name)", f"--project={PROJECT_ID}"],
            capture_output=True, text=True, check=True, shell=True
        )
        enabled_services = set(line.strip() for line in res.stdout.strip().splitlines() if line.strip())
        missing = [api for api in REQUIRED_APIS if api not in enabled_services]
        if not missing:
            results["APIs"] = "PASS"
            print("[PASS] APIs: All 21 required Google Cloud APIs enabled")
        else:
            results["APIs"] = f"FAIL: missing {missing}"
            print(f"[FAIL] APIs: Missing {missing}")
    except Exception as e:
        results["APIs"] = f"FAIL: {e}"
        print(f"[FAIL] APIs: {e}")

def check_service_account():
    try:
        res = subprocess.run(
            ["gcloud", "iam", "service-accounts", "describe", SA_EMAIL, f"--project={PROJECT_ID}", "--format=value(email)"],
            capture_output=True, text=True, check=True, shell=True
        )
        if SA_EMAIL in res.stdout.strip():
            results["service account"] = "PASS"
            print(f"[PASS] service account: {SA_EMAIL} verified")
        else:
            results["service account"] = f"FAIL: unexpected output {res.stdout}"
            print(f"[FAIL] service account: {res.stdout}")
    except Exception as e:
        results["service account"] = f"FAIL: {e}"
        print(f"[FAIL] service account: {e}")

def check_bucket(credentials):
    try:
        client = storage.Client(project=PROJECT_ID, credentials=credentials)
        bucket = client.get_bucket(BUCKET_NAME)
        results["bucket"] = "PASS"
        print(f"[PASS] bucket: gs://{BUCKET_NAME} accessible ({bucket.location})")
    except Exception as e:
        results["bucket"] = f"FAIL: {e}"
        print(f"[FAIL] bucket: {e}")

def check_spanner(credentials):
    try:
        client = spanner.Client(project=PROJECT_ID, credentials=credentials)
        instance = client.instance(SPANNER_INSTANCE)
        database = instance.database(SPANNER_DATABASE)
        with database.snapshot() as snapshot:
            rows = list(snapshot.execute_sql("SELECT 1 AS test"))
            if rows and rows[0][0] == 1:
                results["Spanner SELECT 1"] = "PASS"
                print(f"[PASS] Spanner SELECT 1: query returned 1 on {SPANNER_INSTANCE}/{SPANNER_DATABASE}")
            else:
                results["Spanner SELECT 1"] = f"FAIL: unexpected rows {rows}"
                print(f"[FAIL] Spanner SELECT 1: unexpected rows {rows}")
    except Exception as e:
        results["Spanner SELECT 1"] = f"FAIL: {e}"
        print(f"[FAIL] Spanner SELECT 1: {e}")

def check_gemini_generate():
    try:
        client = genai.Client(vertexai=True, project=PROJECT_ID, location=VERTEX_LOC)
        resp = client.models.generate_content(
            model=FLASH_MODEL,
            contents="Say 'PASS' in one word.",
            config=types.GenerateContentConfig(max_output_tokens=10)
        )
        text = resp.text.strip() if resp.text else ""
        results["Gemini generate"] = "PASS"
        print(f"[PASS] Gemini generate: {FLASH_MODEL} in {VERTEX_LOC} responded: '{text}'")
    except Exception as e:
        results["Gemini generate"] = f"FAIL: {e}"
        print(f"[FAIL] Gemini generate: {e}")

def check_embedding():
    try:
        client = genai.Client(vertexai=True, project=PROJECT_ID, location=VERTEX_LOC)
        res = client.models.embed_content(
            model=EMBED_MODEL,
            contents="Virasat estate settlement embedding verification",
            config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM)
        )
        dim = len(res.embeddings[0].values)
        if dim == EMBED_DIM:
            results["embedding (768 dims)"] = "PASS"
            print(f"[PASS] embedding (768 dims): {EMBED_MODEL} returned vector with dimension {dim}")
        else:
            results["embedding (768 dims)"] = f"FAIL: dimension is {dim}, expected {EMBED_DIM}"
            print(f"[FAIL] embedding (768 dims): dimension is {dim}, expected {EMBED_DIM}")
    except Exception as e:
        results["embedding (768 dims)"] = f"FAIL: {e}"
        print(f"[FAIL] embedding (768 dims): {e}")

def main():
    print("=" * 60)
    print(f" Verifying Google Cloud Setup for Project: {PROJECT_ID}")
    print("=" * 60)
    creds = check_auth()
    if not creds:
        print("\nAuth failed. Cannot continue.")
        sys.exit(1)

    check_billing()
    check_apis()
    check_service_account()
    check_bucket(creds)
    check_spanner(creds)
    check_gemini_generate()
    check_embedding()

    print("\n" + "=" * 60)
    print(" Verification Summary")
    print("=" * 60)
    all_pass = True
    for item, status in results.items():
        print(f"  {item.ljust(25)}: {status}")
        if status != "PASS":
            all_pass = False

    if all_pass:
        print("\n>>> ALL CLOUD VERIFICATION CHECKS PASSED! <<<")
        sys.exit(0)
    else:
        print("\n>>> SOME VERIFICATION CHECKS FAILED. <<<")
        sys.exit(1)

if __name__ == "__main__":
    main()
