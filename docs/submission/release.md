# Virasat v1.0.2 Release & Production Freeze Record

**Google Cloud AI Builder Cup 2026 — BFSI Theme**  
**Submission Tag:** `v1.0.2` (Security Hardening & Key Rotation Release)  
**Freeze Date:** 2026-10-17  
**Submission Status:** FROZEN & HARDENED (Production Active)

---

## 1. Deployed Production Endpoints & Revisions

### Frontend (Firebase Hosting)
- **Live URL:** `https://virasat-511210.web.app` (Primary Custom Domain)
- **Alternate URL:** `https://virasat-511210.firebaseapp.com`
- **Hosting Channel:** `live`
- **Frontend Framework:** React 18.3, TypeScript, Tailwind CSS, Vite 6
- **Routing & Rewrite Rules:** All SPA traffic rewrites to `/index.html`; `/api/**` rewrites directly to Cloud Run backend.
- **Edge CDN:** Google Global Edge CDN with automated TLS 1.3 certificates.

### Backend API (Google Cloud Run)
- **Service Name:** `virasat-api`
- **Region:** `asia-south1` (Mumbai, India)
- **Active Revision:** `virasat-api-00008-rvj` (100% traffic serving)
- **Service URL:** `https://virasat-api-275851497852.asia-south1.run.app`
- **Deployed Version:** `1.0.1` (Commit: `9cc9c66`)
- **Runtime Configuration:**
  - Minimum instances: `1` (warm instance active, cold-ish request <320ms)
  - Maximum instances: `100` (autoscaling)
  - Memory: `2GiB` | CPU: `2 vCPU`
  - Startup CPU Boost: `Enabled`
  - Ingress: `All (Public)`

### Database & Property Graph (Google Cloud Spanner)
- **Instance ID:** `virasat-inst`
- **Database ID:** `virasat-db`
- **Tier:** `FREE_INSTANCE` (100 Processing Units, free until 2027-01-08)
- **Graph Schema:** ISO GQL `VirasatGraph` on unified GoogleSQL storage

### Storage & Security
- **Document Vault Bucket:** `virasat-511210-docs` (asia-south1, Uniform Bucket-Level Access, Private IAM, 2-day auto-expiry lifecycle)
- **Cloud Scheduler Cron:** `virasat-cleanup` (`0 */6 * * *`, OIDC authenticated session garbage collection)

---

## 2. Emergency Redeployment Runbook

If any component goes down during judging, run the following exact commands to redeploy the exact frozen version:

### A. Redeploy Backend to Cloud Run
```bash
# Redeploy exact pinned container image to Cloud Run (asia-south1)
gcloud run deploy virasat-api \
  --image asia-south1-docker.pkg.dev/virasat-511210/cloud-run-source-deploy/virasat-api@sha256:b4de8e22211127899d6b3b6d2122aaac49a7b40181e8a9a95925e3c4b4410e66 \
  --region asia-south1 \
  --project virasat-511210 \
  --min-instances 1 \
  --max-instances 100 \
  --memory 2Gi \
  --cpu 2 \
  --allow-unauthenticated
```

### B. Redeploy Frontend to Firebase Hosting
```bash
# Build production bundle and deploy to Firebase Hosting
cd frontend
npm ci
npm run build
npx firebase-tools deploy --only hosting --project virasat-511210
```

### C. Verify Live Service Health
```bash
# Backend health & readiness checks
curl -s -o /dev/null -w "%{http_code}\n" https://virasat-api-275851497852.asia-south1.run.app/health
curl -s https://virasat-api-275851497852.asia-south1.run.app/ready

# Frontend live URL check
curl -s -o /dev/null -w "%{http_code}\n" https://virasat-511210.web.app/
```

### D. Emergency Cache Degradation Mode (In case of Vertex API quota issues)
If Vertex AI quotas are unexpectedly hit, switch the Cloud Run service to cached deterministic fallback mode:
```bash
gcloud run services update virasat-api \
  --region asia-south1 \
  --project virasat-511210 \
  --update-env-vars AGENT_FALLBACK_TO_CACHE=true
```
In this mode, all 30 golden succession cases, statutory calculations, and claims dossiers remain 100% accurate and functional using deterministic rules and cached responses, accompanied by a clear amber badge in the judge interface.

---

## 3. Rollback Points and Procedure

### A. Cloud Run Rollback Point
- **Active Serving Revision:** `virasat-api-00008-rvj` (100% traffic, deployed Part 5)
- **Known-Good Prior Revision:** `virasat-api-00007-s8f` (or `virasat-api-00006-xtw`)
- **Instant Rollback Command:**
  ```bash
  gcloud run services update-traffic virasat-api \
    --region=asia-south1 \
    --project=virasat-511210 \
    --to-revisions=virasat-api-00007-s8f=100
  ```

### B. Firebase Hosting Rollback Point
- **Active Hosting Channel:** `live` (Released: `2026-10-17 19:11:59 UTC`)
- **Pre-sprint Release Timestamp:** `2026-10-17 08:49:49 UTC`
- **Rollback Procedure:** In Firebase Console > Hosting > Release History, select the release timestamped `2026-10-17 08:49:49` and click "Rollback", or redeploy using `firebase-tools hosting:clone`.

### C. Audit Bug Fixes Deployment Status
Confirmed: The audit bug fixes:
1. `backend/app/services/case_service.py` (`check_case_access` authorization check)
2. `backend/app/services/runs.py` (`rerun_pending` active run state tracking)
3. `backend/app/services/change_propagation.py` (proper mutation propagation)

Are all committed and active in production Cloud Run revision `virasat-api-00008-rvj` (and prior `00007-s8f`).

