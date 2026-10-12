#!/usr/bin/env python3
"""Verify that all description variants for AI Builder Cup are strictly <= 1000 characters."""

import sys

VARIANT_A = """When an Indian family loses a loved one, settling estates across fragmented institutions takes months of stressful paperwork. Virasat automates asset discovery, heir mapping, succession shares, and claim packets.

Vertex AI runs Gemini 2.5 Flash to extract records and Gemini 2.5 Pro to evaluate dispute caveats. Cloud Spanner stores bi-temporal family trees via ISO GQL graph queries and indexes statutory clauses for cosine vector search. Google ADK orchestrates multi-agent workflows, Cloud Storage secures vaults, Cloud Run serves APIs, and Firebase delivers auth and hosting.

Virasat uses a deterministic rules engine instead of LLM math, achieving 100% share accuracy across 30 golden cases. GraphRAG verifies citations before display. Users can edit nodes with automatic re-runs, guarded by hash-chained audit logs and human approval. Evaluated at 15.1s p50 latency and 1.3 rupees ($0.015) per estate.

Demonstrated with synthetic data; provides guidance, not legal advice."""

VARIANT_B = """Estate settlement in India forces families through months of fragmented institutional bureaucracy. Virasat automates asset discovery, heir mapping, succession shares, and claim packets.

Vertex AI runs Gemini 2.5 Flash for document extraction and Gemini 2.5 Pro for legal dispute evaluation. Google ADK orchestrates multi-agent DAGs via typed tools. Cloud Spanner stores bi-temporal facts using ISO GQL graph traversals and indexes text-embedding-005 vectors for cosine search. Cloud Storage vaults PDFs, Cloud Run hosts APIs, and Firebase delivers auth and hosting.

Virasat eliminates LLM math using a deterministic rules engine, reaching 100% share accuracy across 30 golden cases and 100% defect recall on 10 corrupted cases. GraphRAG verifies every citation against Spanner statutes. Edits trigger automatic re-runs, backed by hash-chained audit logs and human approval before filing. Runs at 15.1s p50 latency ($0.015/run).

Uses synthetic demo data; provides guidance, not legal advice."""

VARIANT_C = """Following a bereavement, Indian families lose months navigating disjointed institutions, risking frozen savings and disputes. Virasat simplifies estate settlement into an equitable, institution-ready digital process.

Vertex AI deploys Gemini 2.5 Flash to digitize paperwork and Gemini 2.5 Pro to evaluate succession claims. Cloud Spanner tracks bi-temporal family trees via ISO GQL and performs cosine vector search over statutes with text-embedding-005. Google ADK coordinates agents, Cloud Storage secures document vaults, Cloud Run serves APIs, and Firebase handles auth and hosting.

Virasat avoids LLM math with a deterministic rules engine, achieving 100% share accuracy on 30 golden cases. GraphRAG verifies all citations. Node edits trigger automatic re-runs, secured by hash-chained audit trails and human approval before filing. Benchmarked at 15.1s p50 latency and 1.3 rupees ($0.015) per estate.

Demonstrated with synthetic data; provides guidance, not legal advice."""

def main():
    variants = [
        ("Variant A (Balanced)", VARIANT_A),
        ("Variant B (Technical-Heavy)", VARIANT_B),
        ("Variant C (Impact-Heavy)", VARIANT_C),
    ]

    print("=" * 60)
    print(" AI Builder Cup Solution Description Character Verification")
    print(" Hard Ceiling: 1000 chars (form limit: 1024 chars)")
    print("=" * 60)

    all_passed = True
    for name, text in variants:
        char_count = len(text)
        status = "PASS" if char_count <= 1000 else "FAIL"
        print(f"[{status}] {name:<28}: {char_count:>4} / 1000 characters")
        if char_count > 1000:
            all_passed = False

    print("=" * 60)
    if not all_passed:
        print("ERROR: One or more variants exceed 1000 characters!")
        sys.exit(1)
    else:
        print("SUCCESS: All variants strictly <= 1000 characters!")
        sys.exit(0)

if __name__ == "__main__":
    main()
