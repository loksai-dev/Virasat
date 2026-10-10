# Virasat — Google Cloud Infrastructure Setup & Teardown Guide

This document catalogs all Google Cloud Platform resources provisioned for **Virasat** (Project ID: `virasat-511210`), along with verification procedures and teardown instructions for post-hackathon cleanup.

---

## 1. Resource Inventory

| Resource Type | Resource Identifier | Region / Location | Pricing / Tier | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud Spanner Instance** | `virasat-inst` | `regional-asia-south1` | 90-Day Free Trial (₹0/mo, 10 GiB) | Primary database and Knowledge Graph storage |
| **Spanner Database** | `virasat-db` | `regional-asia-south1` | Included with instance | GoogleSQL dialect, 15 tables + `VirasatGraph` |
| **Cloud Storage Bucket** | `gs://virasat-511210-docs` | `asia-south1` (Mumbai) | Standard GCS | Document vaults (wills, death certificates, packets) |
| **Runtime Service Account** | `virasat-api@virasat-511210.iam.gserviceaccount.com` | Global | Free | Least-privilege identity for Cloud Run & Vertex |
| **Vertex AI LLM** | `gemini-2.5-flash` | `us-central1` | Pay-per-token | Fast document parsing, chat agent, entity extraction |
| **Vertex AI LLM** | `gemini-2.5-pro` | `us-central1` | Pay-per-token | Succession legal reasoning & dispute analysis |
| **Vertex AI Embeddings** | `text-embedding-005` (dim: 768) | `us-central1` | Pay-per-token | Vector similarity & semantic clause retrieval |
| **Budget Alert** | `Virasat-Budget` | Global | Free | Billing alerts at 50%, 90%, and 100% |
| **Firebase Project** | `virasat-511210` | Global | Spark / Blaze | Client authentication & hosting |

---

## 2. Security & Guardrails Implemented

1. **Zero Key Files:** No JSON service account private keys are created or stored. Application Default Credentials (ADC) are used locally, and metadata server identity tokens are used on Cloud Run.
2. **Public Access Prevention:** Enforced on `gs://virasat-511210-docs`.
3. **Data Retention Lifecycle:** Objects under `cases/` prefix automatically expire after 2 days; `seed/` reference data is preserved.
4. **Bi-Temporal Knowledge Graph:** ISO GQL `VirasatGraph` defined directly over relational GoogleSQL tables (`People`, `Assets`, `Institutions`, `Relationships`, `Ownerships`, `Nominees`).
5. **Self-Impersonation for Signed URLs:** Service account has `roles/iam.serviceAccountTokenCreator` on itself, enabling short-lived signed URLs without long-lived keys.

---

## 3. Verification

To verify all resources and permissions idempotently at any time:

```powershell
python scripts/verify_cloud.py
```

Expected output:
```text
============================================================
 Verifying Google Cloud Setup for Project: virasat-511210
============================================================
[PASS] auth: Application Default Credentials active
[PASS] billing: Project billing linked and enabled
[PASS] APIs: All 21 required Google Cloud APIs enabled
[PASS] service account: virasat-api@virasat-511210.iam.gserviceaccount.com verified
[PASS] bucket: gs://virasat-511210-docs accessible (ASIA-SOUTH1)
[PASS] Spanner SELECT 1: query returned 1 on virasat-inst/virasat-db
[PASS] Gemini generate: gemini-2.5-flash in us-central1 responded: ''
[PASS] embedding (768 dims): text-embedding-005 returned vector with dimension 768

============================================================
 Verification Summary
============================================================
  auth                     : PASS
  billing                  : PASS
  APIs                     : PASS
  service account          : PASS
  bucket                   : PASS
  Spanner SELECT 1         : PASS
  Gemini generate          : PASS
  embedding (768 dims)     : PASS

>>> ALL CLOUD VERIFICATION CHECKS PASSED! <<<
```

---

## 4. Teardown & Deletion Guide (Post-Judging)

Run the following commands in order after the hackathon judging period to completely remove all provisioned resources and prevent recurring charges:

### 1. Delete Spanner Instance & Database
```powershell
gcloud spanner instances delete virasat-inst --quiet
```

### 2. Delete Cloud Storage Bucket and Documents
```powershell
gcloud storage rm -r gs://virasat-511210-docs --quiet
```

### 3. Delete Service Account
```powershell
gcloud iam service-accounts delete virasat-api@virasat-511210.iam.gserviceaccount.com --project=virasat-511210 --quiet
```

### 4. (Optional) Disable Billable APIs
```powershell
gcloud services disable spanner.googleapis.com aiplatform.googleapis.com documentai.googleapis.com run.googleapis.com --project=virasat-511210
```

### 5. (Complete Teardown) Delete GCP Project
If the project was created exclusively for Virasat and is no longer needed:
```powershell
gcloud projects delete virasat-511210 --quiet
```
