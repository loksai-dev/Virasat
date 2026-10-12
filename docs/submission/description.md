# Virasat — Solution Description for AI Builder Cup Form

This document provides the "Brief Description of Your Solution (please include how you are leveraging Google services in your submission)" for the AI Builder Cup submission form.

The form field requires plain text with a hard limit of 1024 characters. All three variants below have been strictly verified to be under 1000 characters using `len()` in Python.

---

## 1. Google Services Runtime Evidence Table

The table below catalogs every Google Cloud service used in Virasat, its exact function in the solution, and the specific file paths in the repository that prove runtime usage.

| Google Service | Function in Virasat | Evidence File Path(s) in Codebase |
| :--- | :--- | :--- |
| **Gemini via Vertex AI** (`gemini-2.5-flash`, `gemini-2.5-pro`) | Multimodal document extraction from financial papers, wills, and death certificates (Flash); complex succession legal reasoning, anomaly evaluation, and dispute analysis (Pro); conversational chat (Flash). | [`backend/app/deps.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/deps.py)<br>[`backend/app/engines/extract.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/engines/extract.py)<br>[`backend/app/agents/base.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/agents/base.py)<br>[`backend/app/services/chat.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/services/chat.py)<br>[`backend/app/engines/verifier.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/engines/verifier.py) |
| **Vertex AI Embeddings** (`text-embedding-005`, 768-dim) | Generates 768-dimensional semantic embeddings for statutory clauses (Hindu Succession Act, Indian Succession Act, banking circulars) to enable hybrid GraphRAG retrieval. | [`backend/app/engines/graphrag.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/engines/graphrag.py)<br>[`backend/scripts/ingest_corpus.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/scripts/ingest_corpus.py) |
| **Google Agent Development Kit** (`google-adk`) | Standard agent interface conventions, structured state machines, typed tool execution loops, retry policies, and SSE telemetry streaming across 6 coordinated agents. | [`backend/requirements.txt`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/requirements.txt)<br>[`backend/app/agents/base.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/agents/base.py)<br>[`backend/app/agents/runner.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/agents/runner.py) |
| **Google Cloud Spanner** (Database, ISO GQL Graph & Vector Search) | Primary persistence in `asia-south1`. Stores bi-temporal relational entities (`valid_from`/`valid_to`), executes ISO GQL graph queries over `EstateGraph` (`GRAPH EstateGraph MATCH ...`), and executes native cosine distance vector search (`COSINE_DISTANCE`) over legal clauses. | [`backend/app/db/client.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/db/client.py)<br>[`backend/app/db/schema.sql`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/db/schema.sql)<br>[`backend/app/db/graph_queries.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/db/graph_queries.py)<br>[`backend/app/db/bitemporal.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/db/bitemporal.py)<br>[`backend/app/engines/graphrag.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/engines/graphrag.py) |
| **Google Cloud Storage** | Encrypted document vault (`gs://virasat-511210-docs`) for uploaded deceased records, death certificates, statements, and generated institution-specific PDF claim packets with short-lived signed URLs. | [`backend/app/services/documents.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/services/documents.py)<br>[`backend/app/services/claims.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/services/claims.py)<br>[`docs/CLOUD_SETUP.md`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/docs/CLOUD_SETUP.md) |
| **Google Cloud Run** | Serverless container compute hosting the FastAPI backend (`virasat-api`) in `asia-south1`, configured with autoscaling, minimum instances, and service account identity. | [`scripts/deploy.sh`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/scripts/deploy.sh)<br>[`backend/Dockerfile`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/Dockerfile) |
| **Firebase Hosting & Firebase Authentication** | Global edge distribution for the React Vite SPA (`https://virasat-511210.web.app`) and tenant authentication with Bearer token validation for case isolation. | [`frontend/firebase.json`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/frontend/firebase.json)<br>[`frontend/src/lib/firebase.ts`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/frontend/src/lib/firebase.ts)<br>[`backend/app/auth.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/auth.py) |
| **Google Cloud Scheduler** | Automated cron trigger executing every 6 hours with OIDC service account authentication against Cloud Run `/api/admin/cleanup` to prune transient demo sessions. | [`scripts/deploy.sh`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/scripts/deploy.sh)<br>[`backend/app/routers/admin.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend/app/routers/admin.py) |

> **Transparency Note on Other Services:**
> - **Document AI:** The API was enabled in the GCP project during initial setup (`scripts/verify_cloud.py`), but all runtime document parsing is performed directly via Gemini 2.5 Flash multimodal vision in `backend/app/engines/extract.py`.
> - **Text-to-Speech:** Used exclusively in `scripts/generate_voice_tts.py` to synthesize the video demo voiceover track (`en-IN-Neural2-B`), not within the web application backend.

---

## 2. Submission Variants (Plain Text Only)

### Variant A: Balanced
**Character Count: 981 / 1000 characters**

```text
When an Indian family loses a loved one, settling estates across fragmented institutions takes months of stressful paperwork. Virasat automates asset discovery, heir mapping, succession shares, and claim packets.

Vertex AI runs Gemini 2.5 Flash to extract records and Gemini 2.5 Pro to evaluate dispute caveats. Cloud Spanner stores bi-temporal family trees via ISO GQL graph queries and indexes statutory clauses for cosine vector search. Google ADK orchestrates multi-agent workflows, Cloud Storage secures vaults, Cloud Run serves APIs, and Firebase delivers auth and hosting.

Virasat uses a deterministic rules engine instead of LLM math, achieving 100% share accuracy across 30 golden cases. GraphRAG verifies citations before display. Users can edit nodes with automatic re-runs, guarded by hash-chained audit logs and human approval. Evaluated at 15.1s p50 latency and 1.3 rupees ($0.015) per estate.

Demonstrated with synthetic data; provides guidance, not legal advice.
```

---

### Variant B: Technical-Heavy (Recommended)
**Character Count: 993 / 1000 characters**

```text
Estate settlement in India forces families through months of fragmented institutional bureaucracy. Virasat automates asset discovery, heir mapping, succession shares, and claim packets.

Vertex AI runs Gemini 2.5 Flash for document extraction and Gemini 2.5 Pro for legal dispute evaluation. Google ADK orchestrates multi-agent DAGs via typed tools. Cloud Spanner stores bi-temporal facts using ISO GQL graph traversals and indexes text-embedding-005 vectors for cosine search. Cloud Storage vaults PDFs, Cloud Run hosts APIs, and Firebase delivers auth and hosting.

Virasat eliminates LLM math using a deterministic rules engine, reaching 100% share accuracy across 30 golden cases and 100% defect recall on 10 corrupted cases. GraphRAG verifies every citation against Spanner statutes. Edits trigger automatic re-runs, backed by hash-chained audit logs and human approval before filing. Runs at 15.1s p50 latency ($0.015/run).

Uses synthetic demo data; provides guidance, not legal advice.
```

---

### Variant C: Impact-Heavy
**Character Count: 980 / 1000 characters**

```text
Following a bereavement, Indian families lose months navigating disjointed institutions, risking frozen savings and disputes. Virasat simplifies estate settlement into an equitable, institution-ready digital process.

Vertex AI deploys Gemini 2.5 Flash to digitize paperwork and Gemini 2.5 Pro to evaluate succession claims. Cloud Spanner tracks bi-temporal family trees via ISO GQL and performs cosine vector search over statutes with text-embedding-005. Google ADK coordinates agents, Cloud Storage secures document vaults, Cloud Run serves APIs, and Firebase handles auth and hosting.

Virasat avoids LLM math with a deterministic rules engine, achieving 100% share accuracy on 30 golden cases. GraphRAG verifies all citations. Node edits trigger automatic re-runs, secured by hash-chained audit trails and human approval before filing. Benchmarked at 15.1s p50 latency and 1.3 rupees ($0.015) per estate.

Demonstrated with synthetic data; provides guidance, not legal advice.
```

---

## 3. Character Count Verification Script

Run the verification script anytime using:
```bash
python scripts/verify_description_length.py
```

The script measures `len()` on the exact raw string representation (including all newlines and whitespace) against the 1000-character ceiling.

---

## 4. Recommendation

**Recommendation:** Submit **Variant B (Technical-Heavy)**. Because Technical Merit and Generative AI Implementation represent 40% of the AI Builder Cup evaluation criteria, Variant B directly addresses the rubric by detailing the Gemini 2.5 Pro/Flash synergy, Google ADK orchestration, Spanner Graph ISO GQL traversals, native vector search, and deterministic zero-LLM-math guarantees within the strict character limit.
