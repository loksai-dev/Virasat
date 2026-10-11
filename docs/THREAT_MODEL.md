# Virasat: Threat Model & Security Hardening (P14)

Virasat is an AI-powered estate settlement platform designed for the Google Cloud JAPAC Hackathon 2026 (BFSI Theme). Because Virasat processes sensitive testamentary records, banking statements, and legal heir determinations, security, privacy, and determinism are core architectural requirements.

---

## Top 10 Security Risks & Implemented Mitigations

| # | Risk Category | Severity | Primary Attack Vector | Virasat Mitigation Implementation |
|---|---|---|---|---|
| 1 | **Prompt Injection** | CRITICAL | Malicious text in uploaded PDFs, affidavits, or chat messages attempting to override system prompts or force unauthorized actions. | **Dual Isolation & Strict Schemas**: Document text and user inputs are strictly delimited (`<<<DOCUMENT_CONTENT>>>`, `<<<UNTRUSTED_USER_INPUT>>>`). System directives instruct models never to follow instructions inside data. Output is locked to Pydantic JSON schemas. Succession math is entirely decoupled from LLMs. |
| 2 | **Document Forgery** | HIGH | Submission of altered bank passbooks, tampered affidavits, or backdated notary certificates. | **Deterministic Multi-Detector Engine**: 5 specialized detectors scan for notary date preceding date of death, Levenshtein name spelling variations, contradictory claims, and seal/notary anomalies. Disputes are automatically logged in Spanner and block claim transitions to `READY`. |
| 3 | **Cross-Tenant Access** | CRITICAL | A user calling APIs with another user's token or targeting nested resource IDs (`asset_id`, `claim_id`, `doc_id`, `run_id`). | **Zero-Trust Case Ownership**: Every route verifies `Cases.owner_uid == caller.uid`. Nested entity endpoints look up parent case and return `403 Forbidden` or `404 NotFound` on mismatch. Seed templates (`owner_uid = 'SEED'`) are strictly read-only. |
| 4 | **PII Leakage** | HIGH | Exposure of Aadhaar, PAN, phone numbers, or account details in logs, API responses, or model prompts. | **Universal PII Redaction & Masking**: Only masked identifiers are stored (Aadhaar `XXXX-XXXX-1234`, PAN `XXXXX1234X`, account `…1234`). Redaction service cleans text before Vertex AI calls and structured logs. AuditLog payloads are redacted before SHA-256 hashing. Signed GCS URLs expire in 10 minutes. |
| 5 | **Cost Abuse & DoS** | HIGH | Flooding endpoints with expensive Gemini Pro inference, uploads, or concurrent pipeline runs. | **Token Bucket Rate Limiting**: Per-UID and per-IP rate limits (60 req/min general; 15 req/min upload; 5 req/min run; 20 req/min chat; 15 req/min whatif). Enforces 1 active run per UID, a global cap of 10 concurrent runs, and a daily quota of 150 model calls per UID. |
| 6 | **Hallucinated Legal Output** | CRITICAL | LLM inventing legal rules, miscalculating heir percentages, or citing nonexistent statutes. | **Zero LLM Math & Anti-Hallucination Verifier**: Legal distribution is 100% computed by the deterministic rules engine using `Decimal` arithmetic. Chat answers pass through `AnswerVerifier`, which verifies cited `clause_id` against Spanner's verified corpus and rejects mismatched numbers. |
| 7 | **Stale Data** | MEDIUM | Acting upon outdated claim packets or share calculations after graph edits (e.g. heir marked deceased). | **Bi-temporal Concurrency & Change Propagation**: Optimistic concurrency (`If-Match` ETags on `Cases.data_version`). When mutations occur, `stale: true` is returned immediately. Background debouncer runs minimal stages and fires SSE `case_fresh` upon completion. |
| 8 | **Simulator Mistaken for Real Banks** | MEDIUM | Users or institutions confusing the institutional simulator with live RBI/SEBI banking gateways. | **Explicit Simulation Flags**: All institutional responses and claim packets carry `simulated: true` and `synthetic: true`. Clear UI watermarks and zero real banking API integration. |
| 9 | **Uncited Market Claims** | MEDIUM | Displaying ungrounded, inflated, or hallucinated BFSI market statistics in dashboards. | **Strict Configuration Sourcing**: All macro metrics strictly sourced from `backend/app/config/market.yaml`. Metrics lacking an authentic HTTP URL return `{value: null, note: "source needed"}`. |
| 10 | **Leaked Credentials** | CRITICAL | Leaked GCP service account keys or Firebase credentials. | **Zero Key File Architecture**: Application Default Credentials (ADC) only; no private key files exist in the repository. Administrative routes (`/admin/cleanup`) are protected by Cloud Scheduler Google OIDC verification. |

---

## Detailed Threat Mitigations

### 1. Prompt Injection Defense
- **Delimited Data Inputs**: Untrusted inputs (uploaded document OCR text, user chat queries) are encased inside explicit boundary tags.
- **Strict Response Schemas**: All Gemini Flash and Pro calls use `response_mime_type="application/json"` and Pydantic response models (`DocExtraction`, `ChatResponseSchema`). Even if injected text says "ignore all rules", the Gemini response must conform to the JSON structure or be rejected.
- **Engine Isolation**: Mathematical calculations (shares, amounts, statutory succession) never query an LLM.

### 2. Multi-Tenant Authorization & RBAC
- **Token Verification**: Every request requires `Authorization: Bearer <token>`.
- **Case Access Control**:
  - `check_case_access(case_id, uid)`
  - `verify_case_access(case_id, uid)`
- **Nested Resource Checks**: Resources without `case_id` in URL (e.g. `/assets/{aid}`, `/documents/{did}`, `/claims/{cid}/packet`, `/runs/{rid}`) look up their parent case and enforce ownership before executing any action.

### 3. PII & Privacy Hardening
- **Sensitive Data Protection**: Regex and field-name redaction cleans strings before logging or sending to models.
- **Masking Rules**:
  - Aadhaar: `XXXX-XXXX-1234`
  - PAN: `XXXXX1234X`
  - Account / Policy / Folio: `…1234`
  - Phone: `XXXXXX1234`
  - Email: `a***@domain.com`
- **Short-Lived Signed URLs**: GCS document signed URLs expire in 600 seconds (10 minutes).
- **AuditLog Payload Redaction**: Payload parameters are sanitized prior to SHA-256 hash chaining.

### 4. Rate Limiting & Concurrency Architecture
- **Algorithm**: Token Bucket with monotonic time refilling.
- **Limits**:
  - General API: 60 requests/minute (61st request returns HTTP 429).
  - Document Upload: 15 requests/minute.
  - Agent Pipeline Run: 5 requests/minute.
  - Ask Virasat Chat: 20 requests/minute.
  - What-If Simulation: 15 requests/minute.
- **Run Concurrency**:
  - Max 1 active run per user UID.
  - Max 10 concurrent active runs globally across the instance.
  - Max 150 daily Gemini model calls per user UID.

### 5. Admin & Infrastructure Protection
- **Cloud Scheduler OIDC**:
  `POST /admin/cleanup` verifies the caller's Google OIDC identity token, matching `virasat-api@virasat-511210.iam.gserviceaccount.com`. Unauthenticated or unauthorized callers receive HTTP 401 or 403.
- **Expired Session Cleanup**:
  Purges expired sessions completely across all 19 Spanner tables and GCS prefixes.
