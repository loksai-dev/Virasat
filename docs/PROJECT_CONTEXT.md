# Virasat: project context (every prompt starts by reading this file)

## Product
Virasat is an AI estate-settlement platform. After a person dies it finds their assets (bank, FD, demat, mutual funds, insurance, EPF, PPF, property), works out the legal heirs and their shares, prepares each institution's claim packet, flags disputes and fraud, and tracks the claims. Built for the AI Builder Cup 2026 (Google Cloud JAPAC hackathon, BFSI theme). It must use Gemini and Google agent tooling and run on Google Cloud (Cloud Run + Firebase). All data is synthetic. Output is guidance, not legal advice.

## Cloud facts
- Project ID: virasat-511210 | Project number: 275851497852 | Account: laasya.ai.dev@gmail.com
- Region: asia-south1. Spanner instance: virasat-inst, database: virasat-db. Bucket: virasat-511210-docs.
- Runtime service account: virasat-api@virasat-511210.iam.gserviceaccount.com. Cloud Run service: virasat-api. Firebase project = same project.
- Gemini runs through Vertex AI with Application Default Credentials. No API keys, no downloaded key files. Model IDs and VERTEX_LOCATION live only in env/config (chosen in P1).

## Repo layout
/backend FastAPI (Python 3.12) | /frontend existing React + Vite + TypeScript app (wire it, never rewrite it) | /docs | /scripts

## Non-negotiable rules
1. No secrets or key files in the repo. ADC only.
2. Money is Decimal in code and NUMERIC in the database, never float. Currency INR.
3. No LLM math. Shares come from the deterministic rules engine. LLMs extract, retrieve and explain with citations; a verifier rejects unknown citations and numbers.
4. Bi-temporal edges (Relationship, Nominee, Owns) are never overwritten or hard-deleted. Close the old row (recorded_to = now, valid_to = effective date) and insert a new one. "Still true" sentinel = 9999-12-31T23:59:59Z.
5. Every mutation bumps Cases.data_version, writes a ChangeLog row and an AuditLog hash-chain entry.
6. Every case-scoped route checks the case belongs to the caller's uid. Seed templates (Cases.owner_uid = 'SEED') are read-only.
7. Model failures: retry 3 times, then fall back to a cached or deterministic result and set degraded = true. Never crash the demo, never hide degradation.
8. Anything synthetic or simulated is flagged in API payloads (synthetic, simulated, degraded).
9. Every legal rule, institution rule and market figure carries needs_review or a source. Never invent citations or statistics.
10. Python: ruff, type hints, pytest. Small modules. Structured JSON logs. Never log document contents or full account numbers.

## Data conventions
- Ids are strings. Case-scoped rows carry case_id. Every user gets a private clone of a seed case.
- Relationship(from_id, to_id, rel_type) means "from_id IS THE rel_type OF to_id": (Arjun, Ramesh, CHILD) = Arjun is Ramesh's child; (Kamala, Ramesh, PARENT) = Kamala is Ramesh's parent; (Sunita, Ramesh, SPOUSE); (Vikram, Ramesh, SIBLING).
- As-of reads use two timestamps: valid_at (true in the real world) and known_at (what Virasat had recorded then): valid_from <= valid_at < valid_to AND recorded_from <= known_at < recorded_to.
- Cases.data_version increments on every change. Derived rows (ShareResult, Claim, Dispute) store computed_for_version. APIs return stale = true when they differ.

## API contract (all under /api, JSON, Authorization: Bearer <Firebase ID token>)
SESSIONS    POST /demo/session {role, scenario: "sharma"|"mehta", mode: "prefilled"|"from_documents"} -> {case_id} ; POST /cases/{id}/reset
CASES       GET /cases/{id} ; GET /cases/{id}/overview
PEOPLE      GET|POST /cases/{id}/people ; PATCH|DELETE /people/{pid}
RELATIONS   POST /cases/{id}/relationships ; PATCH|DELETE /relationships/{rid}
ASSETS      GET|POST /cases/{id}/assets ; GET|PATCH|DELETE /assets/{aid} ; PUT /assets/{aid}/nominees
WILL        GET|PUT /cases/{id}/will
DOCUMENTS   GET|POST(multipart) /cases/{id}/documents ; GET|PATCH|DELETE /documents/{did}
GRAPH       GET /cases/{id}/graph?valid_at=&known_at=
SHARES      GET /cases/{id}/shares?scenario=current|with_will|no_will
HISTORY     GET /cases/{id}/history?entity=&entity_id=
RUNS        POST /cases/{id}/run ; GET /runs/{rid} ; GET /runs/{rid}/events (SSE) ; GET /cases/{id}/events (SSE)
WHATIF      POST /cases/{id}/whatif
CLAIMS      GET /cases/{id}/claims ; GET /claims/{cid}/packet ; POST /claims/{cid}/approve ; POST /claims/{cid}/advance
DISPUTES    GET /cases/{id}/disputes ; POST /disputes/{did}/resolve
CHAT        POST /chat (SSE) {case_id, message, language: en|hi|te} ; GET /cases/{id}/chat
AUDIT       GET /cases/{id}/audit ; GET /cases/{id}/audit/verify
CONSENT     GET|PUT /cases/{id}/consent
INSTITUTION GET /institution/dashboard ; GET /institution/claims ; GET /institution/savings?claims_per_year=
IMPACT      GET /impact
ADMIN       POST /admin/cleanup (Cloud Scheduler OIDC only)
HEALTH      GET /health ; GET /ready (outside /api prefix is fine)

## Response shapes (Pydantic)
Overview{case_id, deceased_name, status, estate_value_inr, assets_found, claims_filed, claims_total, est_settlement_days, baseline_days, risk_label, by_type[{type,value_inr}], next_actions[{title,cta,target_route}], alerts[], timeline[], consent{given,total}, stale}
GraphResponse{nodes[{id,label,kind: person|asset|institution, eligibility, disputed}], edges[{source,target,label,valid_from,valid_to}]}
SharesResponse{flows[{source,target,value}], shares[{person_id,name,relationship,share_pct,amount_inr,clause_ids,docs_status}], reasoning[{step,text,citations[]}], confidence, scenario, stale}
AgentEvent{seq, type, agent, message, progress, citations[], degraded}
Error envelope: {error:{code, message, request_id}}

## The two demo cases (full data is in prompt P5)
Sharma (VR-2026-0142): Ramesh Sharma, Hyderabad, intestate, 12 assets, net estate 2.84 Cr, disputed claimant Vikram. Mehta (VR-2026-0187): Anil Mehta, Pune, registered will, 8 assets, net 1.678 Cr, clean.

## Chosen models
- Gemini Flash: `gemini-2.5-flash` (fast extraction, summarization, routing)
- Gemini Pro: `gemini-2.5-pro` (complex legal reasoning, dispute evaluation, citation verification)
- Text Embedding: `text-embedding-005` (dimension: 768, semantic document & clause retrieval)
- Vertex AI Location: `us-central1` (verified live with all 3 models working via `google-genai` SDK in Vertex AI mode)
- Main GCP Region: `asia-south1` (Spanner, Cloud Storage, Cloud Run, Artifact Registry)

