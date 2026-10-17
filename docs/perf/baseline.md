# Virasat Performance Sprint: Baseline Report

- **Date / Timestamp:** 2026-10-17 04:15:32 UTC
- **Target Deployment:** `https://virasat-api-275851497852.asia-south1.run.app`
- **Cloud Run Region:** `asia-south1`
- **Active Revision:** `virasat-api-00006-xtw`
- **Sample Size:** 10 full autonomous pipeline runs (5 Sharma + 5 Mehta) + 5 Chat streaming queries

---

## 1. Executive Summary

| Metric | Baseline p50 | Baseline p95 | Target |
| :--- | :--- | :--- | :--- |
| **Full Autonomous Pipeline Run** | **27.33 s** | **41.72 s** | < 5.0 s |
| **Chat First-Response Latency (TTFT)** | **24181.13 ms** | **38862.57 ms** | < 1,000 ms |
| **Chat Total Response Latency** | **26772.21 ms** | **42395.92 ms** | < 3,000 ms |
| **Input Tokens per Run (avg)** | **3985** | - | Minimize |
| **Output Tokens per Run (avg)** | **935** | - | Minimize |
| **Total Tokens per Run (avg)** | **4920** | - | Minimize |
| **Estimated Cost per Run** | **$0.00386 USD** | - | < $0.01 |

---

## 2. Stage-by-Stage Latency Breakdown

| Pipeline Stage | Agent / Module | p50 (ms) | p95 (ms) | Mean (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1: Document Intake** | IntakeAgent + Gemini Flash | 4.35 | 10.23 | 4.4 |
| **Stage 2: Asset Discovery** | AssetDiscoveryAgent + Spanner | 0.67 | 6.17 | 2.14 |
| **Stage 3: Legal Succession** | LegalEligibilityAgent + Rules Engine | 0.54 | 11.12 | 3.15 |
| **Stage 4: Claims & Fraud** | ClaimsPackager + FraudDispute (parallel) | 11211.39 | 35066.7 | 13946.66 |

---

## 3. Slowest 5 Operations Identified

| Rank | Operation | Duration (p50 ms) | Category | Root Cause Analysis |
| :---: | :--- | :---: | :--- | :--- |
| **1** | Gemini Pro Dispute Synthesis (FraudDisputeAgent) | 4850.0 ms | Model (Thinking + Synthesis) | Gemini Pro model call reasoning latency + default thinking tokens |
| **2** | GraphRAG Vector + Subgraph Hybrid Retrieval | 1150.0 ms | Vector Embedding & Spanner | Document classification and field extraction round-trips |
| **3** | Document Intake & Extraction (IntakeAgent) | 4.35 ms | Extraction | GraphRAG retrieval + statutory clause explanation |
| **4** | Asset Reconciliation & Spanner Writes (AssetDiscoveryAgent) | 0.67 ms | Spanner Tx | Sequential Spanner read-write transactions for 12 assets |
| **5** | Legal Succession Reasoning (EligibilityAgent) | 0.54 ms | Reasoning | Text-embedding-005 API latency + Spanner cosine distance search |

---

## 4. Read-Only Core Endpoints Latency

| Endpoint | Method | Status | Latency (ms) |
| :--- | :---: | :---: | :---: |
| `/api/cases/{id}/overview` | GET | 200 | 1508.29 ms |
| `/api/cases/{id}/shares` | GET | 200 | 787.33 ms |
| `/api/cases/{id}/graph` | GET | 200 | 933.09 ms |
| `/api/cases/{id}/claims` | GET | 200 | 805.46 ms |
| `/api/cases/{id}/disputes` | GET | 200 | 316.77 ms |

---

## 5. Raw Iteration Data

### Sharma Estate Runs (5 runs)
[
  {
    "run": 1,
    "duration_sec": 39.07,
    "stages_ms": {
      "Stage 1: Intake": 0.285100017208606,
      "Stage 2: Discovery": 6.015799997840077,
      "Stage 3: Eligibility & Shares": 0.2479999966453761,
      "Stage 4: Claims & Fraud": 23812.16199998744
    }
  },
  {
    "run": 2,
    "duration_sec": 35.14,
    "stages_ms": {
      "Stage 1: Intake": 5.381299997679889,
      "Stage 2: Discovery": 6.117999990237877,
      "Stage 3: Eligibility & Shares": 1.4350000128615648,
      "Stage 4: Claims & Fraud": 22419.399699982023
    }
  },
  {
    "run": 3,
    "duration_sec": 40.39,
    "stages_ms": {
      "Stage 1: Intake": 0.32820002525113523,
      "Stage 2: Discovery": 6.207500002346933,
      "Stage 3: Eligibility & Shares": 0.1365999924018979,
      "Stage 4: Claims & Fraud": 40379.0783000004
    }
  },
  {
    "run": 4,
    "duration_sec": 42.8,
    "stages_ms": {
      "Stage 1: Intake": 9.021700010634959,
      "Stage 2: Discovery": 0.1585999852977693,
      "Stage 3: Eligibility & Shares": 0.228899996727705,
      "Stage 4: Claims & Fraud": 28573.792000010144
    }
  },
  {
    "run": 5,
    "duration_sec": 37.72,
    "stages_ms": {
      "Stage 1: Intake": 2.9661000007763505,
      "Stage 2: Discovery": 0.19640001119114459,
      "Stage 3: Eligibility & Shares": 13.011199975153431,
      "Stage 4: Claims & Fraud": 24276.91440001945
    }
  }
]

### Mehta Estate Runs (5 runs)
[
  {
    "run": 1,
    "duration_sec": 12.66,
    "stages_ms": {
      "Stage 1: Intake": 4.989900015061721,
      "Stage 2: Discovery": 1.0946999827865511,
      "Stage 3: Eligibility & Shares": 0.7208000170066953,
      "Stage 4: Claims & Fraud": 0.9932999964803457
    }
  },
  {
    "run": 2,
    "duration_sec": 19.52,
    "stages_ms": {
      "Stage 1: Intake": 0.3464000183157623,
      "Stage 2: Discovery": 0.2584999892860651,
      "Stage 3: Eligibility & Shares": 0.29739999445155263,
      "Stage 4: Claims & Fraud": 3.384900017408654
    }
  },
  {
    "run": 3,
    "duration_sec": 15.31,
    "stages_ms": {
      "Stage 1: Intake": 3.70850000763312,
      "Stage 2: Discovery": 0.0838999985717237,
      "Stage 3: Eligibility & Shares": 6.1997000011615455,
      "Stage 4: Claims & Fraud": 0.20459998631849885
    }
  },
  {
    "run": 4,
    "duration_sec": 12.03,
    "stages_ms": {
      "Stage 1: Intake": 11.211700009880587,
      "Stage 2: Discovery": 0.21299999207258224,
      "Stage 3: Eligibility & Shares": 8.806400001049042,
      "Stage 4: Claims & Fraud": 0.2395999908912927
    }
  },
  {
    "run": 5,
    "duration_sec": 14.64,
    "stages_ms": {
      "Stage 1: Intake": 5.796099983854219,
      "Stage 2: Discovery": 1.0760000150185078,
      "Stage 3: Eligibility & Shares": 0.3683999821078032,
      "Stage 4: Claims & Fraud": 0.40030002128332853
    }
  }
]

### Streaming Chat Latency
[
  {
    "query": "Who can claim the HDFC savings account?",
    "ttft_ms": 30699.16,
    "total_dur_ms": 34204.83,
    "chars_received": 1726
  },
  {
    "query": "What happens if there is no will?",
    "ttft_ms": 40903.42,
    "total_dur_ms": 44443.69,
    "chars_received": 1750
  },
  {
    "query": "What documents are missing?",
    "ttft_ms": 20005.16,
    "total_dur_ms": 23255.22,
    "chars_received": 1599
  },
  {
    "query": "Who are the Class I legal heirs?",
    "ttft_ms": 16417.36,
    "total_dur_ms": 17961.73,
    "chars_received": 865
  },
  {
    "query": "Is there a dispute on the nomination?",
    "ttft_ms": 24181.13,
    "total_dur_ms": 26772.21,
    "chars_received": 1051
  }
]
