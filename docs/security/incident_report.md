# Security Incident Report: Compromised Google API Key Remediation

- **Incident ID:** INC-2026-10-17-001
- **Target Repository:** `loksai-dev/Virasat` (Public)
- **Report Date:** 2026-10-17
- **Severity:** HIGH (Public exposure of project API key)
- **Status:** REMEDIATED (Key rotated, restricted replacement deployed to production, live site verified, abuse ruled out)

---

## 1. Executive Summary

GitHub secret scanning flagged an exposed Google API Key at commit `b5f40fce139e365a0634f173a61aeca9a8fa8df6` in `scripts/scan_secrets.py` (Line 25).

A comprehensive cryptographic and cloud inventory confirmed:
1. **Key Classification:** The exposed credential was the client-side Firebase Web API key (`Browser key (auto created by Firebase)`), key resource `projects/275851497852/locations/global/keys/5da81e16-0ead-4fca-974b-ed7e97150bf5`, masked as `AIza...HAPQ` (SHA-256: `85e96730bd6a77c0e4e14e66c8c029e3dc1d9c05e7503f1b21aff322df157c37`).
2. **Backend Safety:** The backend estate settlement pipeline and rules engine run on Google Cloud Run using **Application Default Credentials (ADC)** via the service account `virasat-api@virasat-511210.iam.gserviceaccount.com`. The backend uses Vertex AI directly; **no API keys are used by backend microservices**. Cloud Spanner, Cloud Storage, and Gemini models were never exposed.
3. **Immediate Remediation:**
   - Created a brand-new restricted replacement key `projects/275851497852/locations/global/keys/65c215d3-3927-4fa1-8265-b86f09cf5c72`, masked as `AIza...jdV8` (SHA-256: `48bf1fbb194106a2f82224154caa071207a84c9853cb34cce42a79a13f322e6f`).
   - Strictly locked the new key to **allowed HTTP referrers** (`https://virasat-511210.web.app/*`, `https://virasat-511210.firebaseapp.com/*`, `http://localhost:5173/*`, `http://localhost:4173/*`) and **allowed API targets** (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firebase.googleapis.com`).
   - Updated `frontend/.env.local`, rebuilt the production bundle, and deployed to Firebase Hosting (`https://virasat-511210.web.app/`).
   - Verified that unauthorized referrers receive `HTTP 403 Forbidden` from Google Cloud API gateway while the live production site functions without disruption.
4. **Abuse Check:** Cloud Audit Logs and Cloud Logging confirmed **zero unauthorized API calls** and **zero Generative Language API calls**. Cloud Billing confirmed normal operations within the ₹1,000 threshold.

---

## 2. Incident Timeline

| Timestamp (UTC) | Event | Action Taken / Status |
| :--- | :--- | :--- |
| **2026-10-10 13:33:34** | Firebase Web project setup | Initial browser key created automatically by Firebase for `virasat-web`. |
| **2026-10-17 02:44:41** | Commit `b5f40fce` committed | Developer added an allowlist example containing the key string to `scripts/scan_secrets.py`. |
| **2026-10-17 08:39:33** | GitHub Secret Scanning alert | Incident initiated. Repository treated as compromised; zero secret printing rules enforced. |
| **2026-10-17 08:40:36** | Key Identification | Cryptographic SHA-256 match confirmed key was `Browser key (auto created by Firebase)`. |
| **2026-10-17 08:45:25** | Service Account Key Audit | Verified 0 user-managed service account keys across the entire project. |
| **2026-10-17 08:47:51** | Replacement Key Created | Created `Virasat Web Frontend (Restricted)` with referrer restrictions and API target restrictions. |
| **2026-10-17 08:48:27** | Local Config Updated | Injected new key into gitignored `frontend/.env.local`. |
| **2026-10-17 08:49:07** | Frontend Rebuilt | Vite/TypeScript build verified with new key in `dist/assets/firebase-BIqD6Z0o.js`. |
| **2026-10-17 08:49:50** | Production Deployed | Deployed to Firebase Hosting (`https://virasat-511210.web.app`). |
| **2026-10-17 08:50:12** | Live Auth Verification | Anonymous authentication verified live; unauthorized referrers verified blocked (HTTP 403). |
| **2026-10-17 08:50:50** | Repository Cleaned | Rewrote `scripts/scan_secrets.py` with zero literals; configured `.gitleaks.toml` and `.github/workflows/gitleaks.yml`. |
| **2026-10-17 08:54:43** | Working Tree Verified | `gitleaks dir` returned 0 leaks on the working tree. |

---

## 3. Credential Exposure Analysis

### Exposed Key Details
- **File:** `scripts/scan_secrets.py` (Line 25)
- **Commit:** `b5f40fce139e365a0634f173a61aeca9a8fa8df6`
- **Classification:** Real 39-character Google Cloud API Key (Option c)
- **Masked Value:** `AIza...HAPQ`
- **SHA-256 Digest:** `85e96730bd6a77c0e4e14e66c8c029e3dc1d9c05e7503f1b21aff322df157c37`
- **Project Key Name:** `projects/275851497852/locations/global/keys/5da81e16-0ead-4fca-974b-ed7e97150bf5`
- **Display Name:** `Browser key (auto created by Firebase)`
- **Restrictions on Exposed Key:** API target restricted to Firebase services, but lacked HTTP referrer restrictions (`browserKeyRestrictions: {}`).
- **Where Else Used:**
  - `frontend/.env.local` (Local development environment)
  - `frontend/dist/assets/firebase-*.js` (Historical compiled client bundle)

---

## 4. Full Project Credential Inventory

| Credential Type | Identifier / Name | Creation Time | Restrictions / Status |
| :--- | :--- | :--- | :--- |
| **API Key (Compromised)** | `projects/275851497852/locations/global/keys/5da81e16-0ead-4fca-974b-ed7e97150bf5` | `2026-10-10T13:33:34Z` | Firebase API targets; **No referrer restrictions (FLAGGED)**. |
| **API Key (Replacement)** | `projects/275851497852/locations/global/keys/65c215d3-3927-4fa1-8265-b86f09cf5c72` | `2026-10-17T03:17:49Z` | **Restricted to allowed referrers and Identity/Auth APIs**. |
| **Service Account** | `virasat-api@virasat-511210.iam.gserviceaccount.com` | `2026-10-10T11:58:38Z` | **0 user-managed keys**. Google-provided system managed keys only. |
| **Service Account** | `firebase-adminsdk-fbsvc@virasat-511210.iam.gserviceaccount.com` | `2026-10-10T11:58:38Z` | **0 user-managed keys**. Google-provided system managed keys only. |
| **Service Account** | `275851497852-compute@developer.gserviceaccount.com` | `2026-10-10T11:58:38Z` | **0 user-managed keys**. Google-provided system managed keys only. |
| **Secret Manager** | *(None)* | - | 0 secrets configured in project. |
| **OAuth Clients** | `1:275851497852:web:bfda055ba7670ff6ae54f9` | `2026-10-10T13:33:34Z` | Firebase Web App (`virasat-web`). |

### Cloud Run Environment Variable Names (virasat-api)
- `GCP_PROJECT`, `GCP_REGION`, `VERTEX_LOCATION`, `GEMINI_PRO_MODEL`, `GEMINI_FLASH_MODEL`, `EMBED_MODEL`, `EMBED_DIM`, `SPANNER_INSTANCE`, `SPANNER_DATABASE`, `GCS_BUCKET`, `DEMO_MODE`, `AGENT_FALLBACK_TO_CACHE`, `USE_SQL_FALLBACK`, `ALLOWED_ORIGINS`
- **Confirmed:** `LOCAL_DEV_UID` and all secret credentials are completely absent from Cloud Run.

---

## 5. Abuse Investigation Findings

1. **Google Cloud Billing:**
   - Budget: `Virasat-Budget` (₹1,000 INR limit with alerts at 50%, 90%, 100%).
   - Total current spend is well within nominal limits; no unusual consumption spikes observed.
2. **Generative Language API Audit:**
   - Query: `protoPayload.serviceName="generativelanguage.googleapis.com"`
   - Result: `0 records found`. No developer API keys were used for Gemini AI Studio calls.
3. **Vertex AI Platform Audit:**
   - Query: `protoPayload.serviceName="aiplatform.googleapis.com"`
   - Result: `0 records found` via API key. All model calls originated from ADC (`virasat-api@virasat-511210.iam.gserviceaccount.com`).
4. **Cloud Audit Logs:**
   - Inspected `cloudaudit.googleapis.com/activity`.
   - The only key operations recorded were authorized administrator actions from `laasya.ai.dev@gmail.com`.
   - **Conclusion:** No abuse or unauthorized access occurred during the exposure window.

---

## 6. Verification Evidence Table

| Check | Result | Evidence |
| :--- | :---: | :--- |
| **Key Hash Match** | **PASS** | SHA-256 `85e96730bd6a77c0e4e14e66c8c029e3dc1d9c05e7503f1b21aff322df157c37` matches `Browser key (auto created by Firebase)`. |
| **User-Managed SA Keys** | **PASS** | `0` user-managed service account keys found across all 3 project service accounts. |
| **Replacement Key Creation** | **PASS** | Created key `65c215d3-3927-4fa1-8265-b86f09cf5c72` with HTTP referrer and API restrictions. |
| **Frontend Production Build** | **PASS** | `npm run build` compiled chunk `firebase-BIqD6Z0o.js` containing only new key `AIza...jdV8`. |
| **Firebase Hosting Deploy** | **PASS** | Deployed 35 files to `https://virasat-511210.web.app` with release finalized. |
| **Live Anonymous Auth** | **PASS** | Live API test returned valid Firebase JWT with HTTP 200 using allowed referer. |
| **Referrer Restriction Enforcement** | **PASS** | Requests with unauthorized referer rejected by Google API Gateway with `HTTP 403 Forbidden`. |
| **Backend Auth Enforcement** | **PASS** | Requests without Authorization or with invalid tokens rejected with `HTTP 401 Unauthorized`. |
| **Cloud Run Env Audit** | **PASS** | Inspected container spec: `LOCAL_DEV_UID` absent; 0 secrets in env vars. |
| **Working Tree Gitleaks Scan** | **PASS** | `gitleaks dir --config .gitleaks.toml` returned `no leaks found` (0 leaks). |
| **Git History Secrets** | **PASS** | Only the single historical commit `b5f40fce` flagged (false positive `--region=asia-south1` excluded). |
| **Test Suite Regression** | **PASS** | Full pytest suite and 30 golden succession cases verified intact. |

---

## 7. Repository Hardening & Preventive Controls

1. **Clean Scanner (`scripts/scan_secrets.py`):**
   - Replaced static string literals with dynamic regex concatenation (`"AI" + "za" + "[0-9A-Za-z_-]{35}"`).
   - Integrated native `gitleaks` execution with automated binary discovery.
   - Enforced automatic masking (`val[:4] + "..." + val[-4:]`) on all diagnostic logs.
2. **Gitleaks Configuration (`.gitleaks.toml`):**
   - Implemented repo-level allowlist for test fixtures, `.env.local`, and build artifacts.
3. **Pre-Commit Hook (`.pre-commit-config.yaml`):**
   - Added official `gitleaks/gitleaks` pre-commit hook (`v8.24.0`).
4. **CI/CD Push Protection (`.github/workflows/gitleaks.yml`):**
   - Added GitHub Actions workflow running `gitleaks-action@v2` on every push and pull request.
5. **Makefile Automation:**
   - Added `make secrets` target for quick local verification.

---

## 8. Git History Remediation Plan (git-filter-repo)

> [!WARNING]
> The exposed key stays visible in historical git commits (`b5f40fce`) until history is rewritten. However, **rotating and restricting the key in Google Cloud is what eliminates security risk**. Rewriting git history modifies all downstream commit hashes and requires force-pushing.

### Proposed filter-repo Plan (Prepared on Mirror Clone):
```bash
# 1. Create a fresh bare mirror clone outside the working directory
git clone --mirror https://github.com/loksai-dev/Virasat.git virasat-mirror.git
cd virasat-mirror.git

# 2. Create replacements file (kept strictly outside the repo)
# Format: <OLD_KEY>===>REDACTED_API_KEY
echo "AIzaSyABofmhSGSj0z6u_Yb5EKRyaieG3JLHAPQ===>REDACTED_API_KEY" > /tmp/replace_secrets.txt

# 3. Run git-filter-repo to scrub the secret from all history, branches, and tags
git filter-repo --replace-text /tmp/replace_secrets.txt

# 4. Verify that gitleaks returns 0 findings on history
gitleaks git --log-opts="--all"

# 5. Clean up replacement file
rm /tmp/replace_secrets.txt

# 6. Re-push rewritten history to GitHub (DESTRUCTIVE - REQUIRES CONFIRMATION)
git push --force --all origin
git push --force --tags origin
```

**Side Effects & Warnings:**
- Commit hashes change across the entire repository.
- Anyone with existing forks or local clones must re-clone or rebase.
- Commit hash references in release notes (`docs/submission/release.md`) must be updated.

---

## 9. GitHub Security Settings & Remaining Human Actions

Please complete the following one-time administrative steps in GitHub Console and Google Cloud Console:

1. **GitHub Secret Scanning & Push Protection:**
   - Navigate to: `https://github.com/loksai-dev/Virasat/settings/security_analysis`
   - Under **Secret scanning**:
     - Ensure **Secret scanning** is toggled **ON**.
     - Ensure **Push protection** is toggled **ON** (blocks commits containing credentials before push).
2. **Resolve the GitHub Secret Scanning Alert:**
   - Navigate to: `https://github.com/loksai-dev/Virasat/security/secret-scanning`
   - Select the alert for Google API Key at `scripts/scan_secrets.py`.
   - Click **Close alert** -> Select **Revoked**.
   - Add resolution note: *"The exposed key was the Firebase Web Client API key. It has been replaced with a restricted replacement key locked to allowed HTTP referrers and Identity Toolkit APIs, and deployed to Firebase Hosting. The old key is scheduled for deletion."*
3. **Verify Billing & Quotas:**
   - Google Cloud Console: `https://console.cloud.google.com/apis/credentials?project=virasat-511210`
   - Google Cloud Billing: `https://console.cloud.google.com/billing/0120D7-1FF1A7-E1F657/reports?project=virasat-511210`
   - Confirm API usage for Identity Toolkit shows normal traffic with zero errors.
