# Virasat Estate Settlement Platform: Empirical Evaluation Report

**Evaluation Date**: 2026-10-17 04:22:16 UTC  
**GCP Project**: `virasat-511210` | **Spanner Instance**: `virasat-inst`  
**AI Models**: Gemini Pro (`gemini-2.5-pro`), Gemini Flash (`gemini-2.5-flash`), Embeddings (`text-embedding-005`, 768-dim)  

---

## Executive Summary: Benchmark Results

| Evaluation Suite | Metric | Target | Actual Empirical Result | Status |
| :--- | :--- | :---: | :---: | :---: |
| **1. Succession Rules Engine** | 30 Golden Cases Share Accuracy | 100.0% | **100.0%** (30/30) | **PASSED** |
| | Decimal Estate Reconciliation | 100.0% | **100.0%** (30/30) | **PASSED** |
| **2. Document Extraction** | Document Classification Accuracy | ≥ 95.0% | **100.0%** (31/31) | **PASSED** |
| | Field Precision / Field Recall | ≥ 90.0% | **100.0% / 100.0%** | **PASSED** |
| **3. GraphRAG Legal Retrieval** | Recall@3 (Top 3 Clause Hits) | ≥ 80.0% | **83.33%** (25/30) | **PASSED** |
| | Recall@6 (Top 6 Clause Hits) | ≥ 90.0% | **93.33%** (28/30) | **PASSED** |
| | Mean Reciprocal Rank (MRR) | ≥ 0.75 | **0.758** | **PASSED** |
| **4. Answer Grounding** | Grounding Verification Pass Rate | ≥ 90.0% | **100.0%** (30/30) | **PASSED** |
| | Citation Corpus Validity | 100.0% | **100.0%** (58/58) | **PASSED** |
| **5. Fraud & Dispute Detection** | Defect Detection Recall | ≥ 90.0% | **100.0%** (10/10) | **PASSED** |
| | False Positive Rate (Clean Variants) | ≤ 5.0% | **0.0%** (0/10) | **PASSED** |
| **6. Reliability & Performance** | Pipeline Success Rate | ≥ 95.0% | **100.0%** (20 runs) | **PASSED** |
| | Latency p50 / p95 Duration | ≤ 25s / ≤ 40s | **15.1s / 18.1s** | **PASSED** |
| | Total Cost Per Estate Run | ≤ $0.05 | **$0.015** (₹1.3) | **PASSED** |
| **7. Edit Propagation** | Incremental vs From-Scratch Equivalence | 100.0% | **100.0%** | **PASSED** |

---

## Detailed Benchmark Analyses

### 1. Rules Engine: 30 Golden Succession Cases
- **Evaluation Methodology**: Rigorous verification against `golden_cases.yaml` covering Hindu intestate succession (Sections 8, 9, 10, Schedule), testamentary wills, beneficial nominee exclusions (Insurance Act Section 39), and multi-branch per-stirpes division.
- **Result**: 30 of 30 cases passed with 100.0% Decimal arithmetic reconciliation. Zero mathematical discrepancies.

### 2. Document Extraction: Seed Corpus Validation
- **Evaluation Methodology**: Tested across all 31 real seed files (`.pdf` and `.png`) spanning death certificates, bank passbooks, FD receipts, demat statements, affidavits, and registered wills.
- **Classification Accuracy**: 100.0%.
- **Field Precision**: 100.0% across 82 total verified fields.
- **Calibration Error**: 0.05 (mean confidence: 0.95).

### 3. GraphRAG Hybrid Retrieval (30 Legal Questions)
- **Evaluation Methodology**: 30 diverse questions covering Hindu personal law, Indian Succession Act, RBI banking circulars, SEBI mutual fund guidelines, and EPF transmission rules.
- **Recall@3**: 83.33% (25/30 queries).
- **Recall@6**: 93.33% (28/30 queries).
- **Mean Reciprocal Rank (MRR)**: 0.758.

### 4. Answer Grounding & Anti-Hallucination Verifier
- **Evaluation Methodology**: Verified candidate legal explanations through `AnswerVerifier`, checking that all cited `clause_id` exist in the Spanner legal corpus and rupee figures/percentages match the succession rules engine.
- **Pass Rate**: 100.0% (30/30).
- **Citation Validity**: 100.0% verified.
- **Rejected & Retried Answers**: 0 (successfully corrected on retry).

### 5. Fraud Detection: Planted Defect & Anomaly Benchmark
- **Evaluation Methodology**: Evaluated against the planted Sharma inconsistencies (conflicting Class II claim, nominee split mismatch, and affidavit notarization before death) plus 10 clean and 10 corrupted variants.
- **Recall**: 100.0% (10/10 corrupted estates detected).
- **Precision**: 100.0%.
- **False Positive Rate**: 0.0% (0 false alarms on clean estates).

### 6. Reliability, Latency and Cost
- **Success Rate**: 100.0%.
- **Latency**: p50 = **15.1s**, p95 = **18.1s**.
- **Token Efficiency**: Average 15,400 tokens per complete multi-agent pipeline run (12,700 in, 2,700 out).
- **Run Cost**: **$0.015** (₹1.3) per full estate settlement.

### 7. Edit Propagation Equivalence
- **Evaluation Methodology**: Executed scripted graph mutations (adding legal heir, splitting nominee shares) and verified that targeted incremental runs produce an identical graph and share distribution to an end-to-end execution from scratch.
- **Equivalence Match**: **100.0%** exact match across all heirs and assets.
