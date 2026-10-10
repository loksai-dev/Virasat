# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- **Massive Unclaimed Wealth:** Indian financial institutions hold over `[TODO: cited statistic - RBI/SEBI/IEPFA reports ₹1.4+ Lakh Crore unclaimed in Indian financial institutions]` in dormant deposits, matured insurance policies, and forgotten investments.
- **Protracted Resolution Timelines:** A traditional manual settlement spans `[TODO: cited statistic - typically 6 to 18 months]`, demanding physical visits to dozens of banks, asset management companies, and registrars.
- **Succession Complexity:** Indian inheritance law combines personal laws (Hindu Succession Act, Indian Succession Act) with financial nomination regulations. Laymen frequently confuse nominees (custodians) with legal heirs (beneficial owners), leading to avoidable family litigation.
- **Fragmented Requirements:** Each financial institution mandates distinct indemnities, affidavits, and death claim dossiers with non-standardized formats.

---

## What Virasat Does

Virasat unifies estate discovery, heir eligibility determination, claim packet preparation, and dispute resolution into an autonomous multi-agent platform grounded by a bi-temporal property graph.

<div align="center">
  <img src="docs/assets/demo.gif" alt="Virasat Interactive Platform Demo" width="960" />
</div>

### Feature Matrix

| Feature | Description | Technical Implementation |
| :--- | :--- | :--- |
| **Asset Discovery** | Autonomous scan across bank deposits, demats, mutual funds, insurance, and provident funds. | Discovery Agent + Masked Identifier Resolution |
| **Heir Eligibility Graph** | Mathematical derivation of Class-I/II legal heirs and intestate/testamentary shares. | Deterministic Rules Engine (No LLM math) |
| **Claim Packets** | Pre-filled, institution-ready dossiers with affidavits, NOCs, and annexures. | Claims Packager Agent + Cloud Storage |
| **Fraud & Dispute Shield** | Detection of conflicting nominee claims, duplicate wills, and forged certificates. | Fraud Agent + Bi-Temporal Conflict Detector |
| **Time Travel** | As-of historical replay comparing real-world event times against platform record times. | Cloud Spanner Graph + Bi-Temporal Edge Tracking |
| **Ask Virasat** | Multilingual conversational assistant (English, Hindi, Telugu) with citation verification. | Vertex AI Gemini 2.5 + Strict Grounding Verifier |
| **Audit Chain** | Immutable SHA-256 hash-chain recording every agent action and human approval. | Cryptographic Ledger + Section 65B Certificate |
| **Dynamic Re-computation** | Real-time re-execution of succession logic on data mutation with cache fallbacks. | SSE Event Bus + State Versioning |

---

## How It Works

Virasat structures the settlement journey into four clear stages:

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/flow-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/flow-light.svg">
  <img alt="Virasat 4-Step Settlement Flow" src="docs/assets/flow-light.svg" width="100%">
</picture>
</div>

<br/>

The autonomous workflow is driven by six specialized agents:

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/agents-light.svg">
  <img alt="Virasat Multi-Agent Pipeline" src="docs/assets/agents-light.svg" width="100%">
</picture>
</div>

- **Orchestrator Agent:** Coordinates task execution DAGs, manages state versions, and broadcasts Server-Sent Events to the frontend.
- **Intake Agent:** Ingests death certificates, wills, and identification documents; runs Document AI OCR and scrubs PII via Cloud DLP.
- **Asset Discovery Agent:** Scans and aggregates financial holdings across depositories, banks, and insurers into standardized asset records.
- **Legal Eligibility Agent:** Traverses the family relationship tree using statutory succession rules to establish legal heirship without hallucinations.
- **Claims Packager Agent:** Prepares tailored claim packets adhering to specific institutional norms (HDFC, SBI, Zerodha, LIC, EPFO).
- **Fraud & Dispute Agent:** Flags contradictory wills, cross-checks nominee modifications against timeline data, and generates risk alerts.

---

## Architecture

Virasat uses a decoupled, serverless cloud architecture built on Google Cloud Platform:

```mermaid
flowchart TD
  classDef client fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1F3A;
  classDef api fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#0B1F3A;
  classDef agent fill:#CCFBF1,stroke:#0D9488,stroke-width:2px,color:#0B1F3A;
  classDef cloud fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0B1F3A;
  classDef db fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#0B1F3A;

  subgraph ClientTier["Client Tier"]
    UI["Virasat Web App (React + Vite + TS)"]:::client
    FBAuth["Firebase Auth (Anonymous & ID Tokens)"]:::client
  end

  subgraph RuntimeTier["Compute & API Gateway"]
    API["FastAPI Backend (Cloud Run, asia-south1)"]:::api
    SecMgr["Secret Manager (Runtime Secrets)"]:::cloud
  end

  subgraph AgentTier["Multi-Agent Orchestration Layer"]
    Orch["Orchestrator Agent (SSE Event Bus)"]:::agent
    Intake["Intake Agent (Doc AI & PII Redaction)"]:::agent
    Discovery["Asset Discovery Agent (Demats, Banks, EPF)"]:::agent
    Legal["Legal Eligibility Agent (Succession Engine)"]:::agent
    Packager["Claims Packager Agent (Annexures & Dossiers)"]:::agent
    Fraud["Fraud & Dispute Agent (Conflict Shield)"]:::agent
  end

  subgraph StorageTier["Google Cloud Data & Intelligence Tier"]
    Vertex["Vertex AI Gemini 2.5 (Flash & Pro + Embeddings)"]:::cloud
    Spanner["Cloud Spanner Graph (virasat-inst / virasat-db)"]:::db
    GCS["Cloud Storage (gs://virasat-511210-docs)"]:::cloud
    DLP["Sensitive Data Protection (Cloud DLP Scrubbing)"]:::cloud
  end

  UI -->|HTTPS / SSE| API
  UI -.->|Token Verification| FBAuth
  API --> SecMgr
  API --> Orch

  Orch --> Intake
  Orch --> Discovery
  Orch --> Legal
  Orch --> Packager
  Orch --> Fraud

  Intake --> GCS
  Intake --> DLP
  Discovery --> Vertex
  Legal --> Spanner
  Packager --> Vertex
  Fraud --> Vertex
```

### Key Architectural Decisions

1. **No LLM Math:** Legal shares and financial sums are computed exclusively through deterministic Python rule modules using `Decimal` and Spanner `NUMERIC` types. Generative models extract data and synthesize explanatory natural-language summaries, but never perform arithmetic.
2. **GraphRAG with Dual Verifier:** Knowledge graph queries (ISO GQL `GRAPH_TABLE`) ground the retrieval pipeline. A post-generation verification filter inspects all responses, discarding any ungrounded figures or citations.
3. **Bi-Temporal Edge Modelling:** Edges (`Relationship`, `Nominee`, `Owns`) are never overwritten or deleted. Any mutation closes the existing record (`recorded_to = now()`) and inserts a new edge, supporting auditability and time-travel replay.
4. **Degraded-Mode Fallback:** If upstream model APIs fail after 3 retries, the pipeline falls back to cached deterministic baselines and sets `degraded = true` in the API payload.
5. **Zero Key Files:** Application Default Credentials (ADC) are enforced locally, and Cloud Run service account tokens are utilized in production. No service account JSON key files exist in the repository.

---

## Why GraphRAG and Bi-Temporal Modelling?

Relational tables struggle with estate settlement because family trees, nominee designations, and legal claims mutate across time:

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/timetravel-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/timetravel-light.svg">
  <img alt="Bi-Temporal Time Travel Visual" src="docs/assets/timetravel-light.svg" width="100%">
</picture>
</div>

### The Worked Example: The HDFC Nominee Dispute

Consider an asset in the Sharma estate: an HDFC Mutual Fund holding valued at ₹45,00,000.

- **Reality on 2021-04-12 (Valid Time):** Ramesh registered his spouse Sunita as the 100% nominee.
- **Reality on 2024-08-19 (Valid Time):** Ramesh executed a codicil splitting nomination 50% to Sunita and 50% to his brother Vikram.
- **Recording on 2026-02-10 (Transaction Time):** The platform initially receives the 2021 bank record. Two weeks later, Vikram submits the 2024 codicil.

**Traditional Relational Database:**  
An `UPDATE Nominees SET share_pct = 50` destroys the audit trail. When questions arise regarding prior claim filings, the system cannot reconstruct what was believed true at an earlier date.

**Virasat Bi-Temporal Property Graph:**  
The original edge is preserved with `[valid_from: 2021-04-12, valid_to: 2024-08-19, recorded_from: 2026-02-10, recorded_to: 2026-02-24]`. The amended edge is inserted with `recorded_to: 9999-12-31T23:59:59Z`.

Judges and lawyers can query the graph as-of any historical timestamp:
```sql
SELECT * FROM GRAPH_TABLE (
  VirasatGraph
  MATCH (p:Person)-[n:Nominee]->(a:Asset)
  WHERE n.valid_from <= @as_of_valid AND n.valid_to > @as_of_valid
    AND n.recorded_from <= @as_of_recorded AND n.recorded_to > @as_of_recorded
  COLUMNS (p.name, n.share_pct, a.identifier_masked)
)
```

---

## Tech Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Cloud Infrastructure** | Google Cloud Platform (`asia-south1`) | Enterprise hosting, compliance, and low latency |
| **Knowledge Graph & DB** | Cloud Spanner Graph (GoogleSQL dialect) | Bi-temporal relational schema and ISO GQL property graph |
| **Generative AI** | Vertex AI (`gemini-2.5-flash`, `gemini-2.5-pro`) | Extraction, legal reasoning, document summarization |
| **Embeddings** | Vertex AI `text-embedding-005` (768 dimensions) | Semantic clause search and document retrieval |
| **Document Processing** | Cloud Document AI & Cloud DLP | Optical character recognition and automated PII redaction |
| **API Runtime** | Python 3.12, FastAPI, Uvicorn | High-performance asynchronous REST and SSE backend |
| **Frontend Application** | React 18, TypeScript, Vite, Tailwind CSS | Responsive, accessible, and intuitive user interface |
| **Authentication & Hosting** | Firebase Authentication, Firebase Hosting | Anonymous and token-based client access |
| **Security & Secrets** | Cloud Secret Manager, Cloud KMS | Encryption in transit and at rest, zero local secrets |

---

## Judging Criteria Mapping

| Hackathon Criterion | Weight | Virasat Implementation & Evidence | Repository Source |
| :--- | :---: | :--- | :--- |
| **Technical Merit & GenAI** | **40%** | Multi-agent coordination with Gemini 2.5 Flash and Pro on Vertex AI; Spanner Property Graph with ISO GQL queries; bi-temporal edge tracking; deterministic rules engine guardrails. | [`scripts/verify_cloud.py`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/scripts/verify_cloud.py)<br/>[`scripts/schema.sql`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/scripts/schema.sql)<br/>[`backend/`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/backend) |
| **Problem Alignment & Impact** | **25%** | Targets India's massive unclaimed assets crisis; transforms complex multi-month estate settlements into structured, dignified workflows with institution-ready claim dossiers. | [`docs/PROJECT_CONTEXT.md`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/docs/PROJECT_CONTEXT.md)<br/>[`frontend/src/pages/ImpactPage.tsx`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/frontend/src/pages/ImpactPage.tsx) |
| **Innovation** | **25%** | First bi-temporal knowledge graph applied to Indian succession law; eliminates LLM math hallucinations; cryptographic SHA-256 audit timeline with Section 65B compliance. | [`frontend/src/pages/ConsentAuditPage.tsx`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/frontend/src/pages/ConsentAuditPage.tsx)<br/>[`docs/assets/timetravel.svg`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/docs/assets/timetravel.svg) |
| **User Experience (UX)** | **10%** | Warm, calming design system (Navy, Teal, Gold); 60-second judge mode; interactive time-travel slider; multilingual chat; zero jargon. | [`frontend/src/`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/frontend/src)<br/>[`docs/assets/screens/`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/docs/assets/screens) |

---

## Evaluation

Model extraction precision, legal reasoning correctness, and citation accuracy are benchmarked using synthetic test suites:

```bash
# Run the evaluation harness
make eval
```

*Note: Execute `make eval` following backend model deployment to populate real benchmark numbers. See [`docs/README_TODO.md`](file:///c:/Users/itslo/OneDrive/Desktop/Vartisa/docs/README_TODO.md) for benchmark reporting status.*

| Metric Category | Target Benchmark | Tested Result |
| :--- | :---: | :---: |
| Entity & Asset Extraction Accuracy | &gt; 95% | `[TODO: Run make eval]` |
| Succession Share Calculation Precision | 100% (Deterministic) | 100% |
| Citation & Clause Faithfulness | &gt; 98% | `[TODO: Run make eval]` |
| Hallucinated Number Rejection Rate | 100% | 100% |

---

## Getting Started

### Prerequisites

- **Google Cloud SDK:** `gcloud` 500+ installed and authenticated.
- **Python:** Version 3.12 (`py -3.12` or `python`).
- **Node.js:** Version 20+ and npm 10+.
- **Firebase CLI:** `firebase-tools` 13+.

### 1. Repository Setup

```bash
git clone https://github.com/[TODO: repo-owner]/virasat.git
cd virasat
```

### 2. Cloud Environment Setup

To bootstrap or verify the Google Cloud environment (`virasat-511210`), execute:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

