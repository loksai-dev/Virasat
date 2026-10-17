# Virasat — Evaluator Fallback & Emergency Run Guide
**Google Cloud AI Builder Cup 2026 (BFSI Category)**

> If any live cloud dependency experiences transient network degradation during judging, this guide ensures 100% uninterrupted evaluation of the Virasat platform.

---

## 1. Quick Access Links

| Resource | Primary URL | Backup / Alternative | Status |
| :--- | :--- | :--- | :---: |
| **Live Web App** | [`https://virasat-511210.web.app`](https://virasat-511210.web.app) | [`https://virasat-511210.firebaseapp.com`](https://virasat-511210.firebaseapp.com) | **LIVE (HTTP 200)** |
| **Backend API** | [`https://virasat-api-275851497852.asia-south1.run.app/health`](https://virasat-api-275851497852.asia-south1.run.app/health) | [`/ready`](https://virasat-api-275851497852.asia-south1.run.app/ready) | **LIVE (HTTP 200)** |
| **OpenAPI Docs** | [`https://virasat-api-275851497852.asia-south1.run.app/docs`](https://virasat-api-275851497852.asia-south1.run.app/docs) | [`/redoc`](https://virasat-api-275851497852.asia-south1.run.app/redoc) | **LIVE (HTTP 200)** |
| **Demo Video** | `docs/submission/video/final.mp4` (1080p, 02:51) | YouTube / Public Drive link | **READY** |
| **Codebase** | [`https://github.com/loksai-dev/Virasat`](https://github.com/loksai-dev/Virasat) | Clone via `git clone` | **PUBLIC** |

---

## 2. Emergency Fallback Modes

### A. How to Switch to Degraded Mode (Deterministic Fallback)
If Vertex AI experiences an API quota limit or transient outage during your live test:
1. Virasat automatically handles model outages:
   - Base agents retry 3 times with exponential backoff.
   - On exhaustion, the orchestrator automatically switches to **Deterministic Fallback Mode**.
   - An amber badge `[Deterministic Fallback Mode]` will appear in the top telemetry bar.
   - **Crucial Fact:** All legal shares, family tree nodes, statutory Class-I calculations, and claim packets will still calculate with 100% precision because succession math is computed by the deterministic rules engine, never by LLMs!
2. To explicitly test or simulate degraded mode locally:
   - Set `AGENT_FALLBACK_TO_CACHE=true` in `backend/.env`.

### B. If SSE Telemetry Stream Disconnects Mid-Run
1. If your browser connection hiccups during an active multi-agent run:
   - Virasat uses sequence-numbered events (`last-event-id`).
   - The UI automatically resumes from the last seen sequence without duplicate logs.
   - You can safely **refresh the page** (`F5` or `Ctrl + R`). The app automatically calls `GET /api/cases/{id}/runs/latest` on mount and rehydrates the exact stage and progress bar.

### C. If You Encounter a Rate Limit (HTTP 429)
- Virasat enforces token bucket protection (60 general req/min, 5 runs/min).
- If triggered, wait **10 seconds** for tokens to refill and retry.
- You can also click **Reset Case** in the top profile menu to start a fresh private session.

---

## 3. Direct Pre-loaded Demo Deep Links

If you want to skip document ingestion and inspect specific pages directly:

- **Settlement Overview (Sharma, ₹2.84 Cr):**  
  `https://virasat-511210.web.app/case/VR-2026-0142/overview`
- **Bi-Temporal Family Kinship Graph & Time-Travel Slider:**  
  `https://virasat-511210.web.app/case/VR-2026-0142/family`
- **Deterministic Succession Shares & Citations:**  
  `https://virasat-511210.web.app/case/VR-2026-0142/family/shares`
- **Estate Asset Folios (12 Assets):**  
  `https://virasat-511210.web.app/case/VR-2026-0142/assets`
- **Institutional Claims & Generated PDF Packets:**  
  `https://virasat-511210.web.app/case/VR-2026-0142/claims`
- **Dispute Guard (Planting Adverse Caveat Intercepted):**  
  `https://virasat-511210.web.app/case/VR-2026-0142/disputes`
- **Tamper-Evident SHA-256 Audit Trail & Sec 65B Certificate:**  
  `https://virasat-511210.web.app/case/VR-2026-0142/audit`
- **Bank & Insurer Centralized STP Console:**  
  `https://virasat-511210.web.app/institution`
- **Cloud Run Health & Model Diagnostic Monitor:**  
  `https://virasat-511210.web.app/dev/api-status`

---

## 4. Emergency Contacts

If you experience any platform access difficulty during judging, please reach out immediately:

- **Team Lead:** Lok Sai
- **Email:** `laasya.ai.dev@gmail.com`
- **GitHub Issue Tracker:** [https://github.com/loksai-dev/Virasat/issues](https://github.com/loksai-dev/Virasat/issues)
- **Timezone Availability:** IST (UTC+5:30) • Active 24/7 during AI Builder Cup evaluation.
