"""Tests for P8: Legal Corpus, Embeddings and GraphRAG Engine.

Validates:
1. Legal corpus ingestion: 40+ chunks stored in Spanner with 768-dim vectors.
2. Retrieval accuracy benchmark: 15 diverse questions finding expected clause in top 3 >= 12 times.
3. Anti-hallucination verifier: Rejection of fake citation IDs.
4. Anti-hallucination verifier: Rejection of ungrounded rupee amounts and percentages.
5. End-to-end GraphRAG: Correctly answers 'Who can claim the HDFC account?' for the Sharma clone
   citing real clause_ids and nominee graph facts with standard disclaimer.
"""

import pytest
from typing import Any

from google.cloud import spanner

from app.config import get_settings
from app.db.client import run_in_snapshot
from app.engines.graphrag import GraphRAGEngine
from app.engines.verifier import AnswerVerifier
from app.models.schemas import GraphRAGContext
from app.services.sessions import clone_seed


def test_corpus_ingestion_and_vector_dimensions():
    """Verify that Spanner LegalClause table has >= 40 chunks with 768-dim embeddings."""
    def _query(snap: Any):
        sql = """
        SELECT clause_id, ARRAY_LENGTH(embedding) as emb_len
        FROM LegalClause
        """
        rows = list(snap.execute_sql(sql))
        return rows

    rows = run_in_snapshot(_query)
    assert len(rows) >= 40, f"Expected at least 40 chunks, found {len(rows)}"

    clause_ids = {r[0] for r in rows}
    # Check that critical stable clause_ids exist
    required_ids = [
        "HSA-1956-S8",
        "HSA-1956-S9",
        "HSA-1956-S10",
        "HSA-1956-SCHEDULE",
        "ISA-1925-TESTAMENTARY",
        "ISA-1925-WILL-FORMALITIES",
        "ISA-1925-PROBATE",
        "ISA-1925-SUCCESSION-CERT",
        "RBI-DECEASED-CLAIMS-NOMINEE",
        "RBI-DECEASED-CLAIMS-NO-NOMINEE",
        "RBI-DECEASED-CLAIMS-TIMELINES",
        "RBI-DECEASED-CLAIMS-DOCUMENTS",
        "BANK-NOMINATION-GENERAL",
        "INS-ACT-NOMINATION",
        "SEBI-TRANSMISSION-NOMINEE",
        "EPF-NOMINATION-CLAIM",
        "PPF-NOMINATION-CLAIM",
        "PROCESS-LEGAL-HEIR-CERT",
        "PROCESS-INDEMNITY-BOND",
        "PROCESS-DEATH-CERT",
        "PROCESS-CLAIM-FORM",
        "PROCESS-CANCELLED-CHEQUE-KYC",
    ]
    for req_id in required_ids:
        assert req_id in clause_ids, f"Required clause_id '{req_id}' missing from LegalClause table"

    # Verify vector dimension is 768
    for cid, emb_len in rows:
        assert emb_len == 768, f"Clause {cid} has embedding dimension {emb_len}, expected 768"


def test_retrieval_benchmark_15_queries():
    """Verify retrieval test of 15 questions finds expected clause in top 3 at least 12 times (>=80%)."""
    engine = GraphRAGEngine()

    test_cases = [
        ("Who inherits first when a Hindu male dies intestate without a will?", ["HSA-1956-S8", "HSA-1956-S10"]),
        ("What is the order of priority among heirs in the Schedule of Hindu Succession Act?", ["HSA-1956-S9", "HSA-1956-SCHEDULE"]),
        ("How is the deceased estate divided equally among surviving widow, mother, and children?", ["HSA-1956-S10"]),
        ("What are the legal formalities required to execute a valid will in India?", ["ISA-1925-WILL-FORMALITIES"]),
        ("When is probate mandatory for a will in Mumbai or Kolkata?", ["ISA-1925-PROBATE"]),
        ("How to apply for a succession certificate to collect debts and securities?", ["ISA-1925-SUCCESSION-CERT"]),
        ("How do banks settle deceased depositor savings accounts when a nominee is registered?", ["RBI-DECEASED-CLAIMS-NOMINEE", "BANK-NOMINATION-GENERAL"]),
        ("What documents and process are needed by banks to settle deceased accounts without nomination?", ["RBI-DECEASED-CLAIMS-NO-NOMINEE", "RBI-DECEASED-CLAIMS-DOCUMENTS"]),
        ("What is the RBI mandated timeline or SLA for settling deceased depositor claims?", ["RBI-DECEASED-CLAIMS-TIMELINES"]),
        ("Does a nominee become the absolute owner of bank deposits or just a custodian for legal heirs?", ["BANK-NOMINATION-GENERAL"]),
        ("Who is considered a beneficial nominee under Section 39 of the Insurance Act?", ["INS-ACT-NOMINATION", "INS-BENEFICIAL-NOMINEE"]),
        ("What are the SEBI regulations for transmission of mutual funds and shares to a registered nominee?", ["SEBI-TRANSMISSION-NOMINEE"]),
        ("How can nominees withdraw employee provident fund and EDLI insurance benefits?", ["EPF-NOMINATION-CLAIM", "EPF-DECEASED-EDLI-CLAIM"]),
        ("How to transfer ownership and RC of a motor vehicle upon death of the registered owner?", ["VEHICLE-TRANSFER-LEGAL-HEIR", "VEHICLE-TRANSFER-FORMALITY"]),
        ("What is a legal heir certificate or surviving member certificate and how is it used?", ["PROCESS-LEGAL-HEIR-CERT"]),
    ]

    questions = [tc[0] for tc in test_cases]
    # Batch embed all questions in a single API call to avoid quota throttling
    q_vectors = engine._embed_queries_batch(questions)

    hits = 0
    results_summary = []
    for (q, expected), q_vec in zip(test_cases, q_vectors, strict=False):
        res = engine._hybrid_retrieve_clauses(q, k=3, q_vec=q_vec)
        top_ids = [c["clause_id"] for c in res]
        found = any(exp in top_ids for exp in expected)
        if found:
            hits += 1
        results_summary.append((q, expected, top_ids, found))

    # Assert at least 12 out of 15 queries find expected clause in top 3
    assert hits >= 12, f"Expected at least 12/15 hits, got {hits}/15. Details: {results_summary}"


def test_verifier_rejects_hallucinated_citation():
    """Verify that an answer forcing a fake citation ID is rejected by the verifier."""
    verifier = AnswerVerifier()

    context = GraphRAGContext(
        clauses=[
            {"clause_id": "HSA-1956-S8", "topic": "General Rules of Succession", "text": "Males succession rules."},
            {"clause_id": "RBI-DECEASED-CLAIMS-NOMINEE", "topic": "Deceased Claims", "text": "Bank settles with nominee."},
        ],
        graph_facts=[
            {"fact_id": "fact-nominee-01", "text": "Sunita is 50% nominee on account."},
        ],
    )

    hallucinated_answer = {
        "answer": "Under [FAKE-STATUTE-123], the claimant receives the entire amount.",
        "steps": ["Step 1", "Step 2"],
        "citations": ["FAKE-STATUTE-123"],
        "confidence": 0.95,
        "needs_lawyer": False,
    }

    is_valid, failure_reason, _ = verifier.verify("Who can claim?", hallucinated_answer, context)
    assert not is_valid, "Verifier should reject answer with fake citation ID"
    assert "FAKE-STATUTE-123" in failure_reason


def test_verifier_rejects_ungrounded_monetary_amount():
    """Verify that an answer with an ungrounded rupee amount or percentage is rejected."""
    verifier = AnswerVerifier()

    context = GraphRAGContext(
        clauses=[
            {"clause_id": "RBI-DECEASED-CLAIMS-NOMINEE", "topic": "Claims", "text": "Bank settles with nominee."},
        ],
        graph_facts=[
            {"fact_id": "fact-asset-01", "text": "Asset holds balance ₹920,000."},
            {"fact_id": "fact-nominee-01", "text": "Sunita is 50.0% nominee."},
        ],
    )

    unsupported_money_answer = {
        "answer": "The claimant is entitled to receive ₹99,99,999 in total [RBI-DECEASED-CLAIMS-NOMINEE].",
        "steps": ["Step 1"],
        "citations": ["RBI-DECEASED-CLAIMS-NOMINEE"],
        "confidence": 0.95,
        "needs_lawyer": False,
    }

    is_valid, failure_reason, _ = verifier.verify("Who can claim?", unsupported_money_answer, context)
    assert not is_valid, "Verifier should reject answer with ungrounded rupee amount"
    assert "99,99,999" in failure_reason or "9999999" in failure_reason


def test_sharma_clone_hdfc_account_claim():
    """End-to-end GraphRAG test for Sharma clone on 'Who can claim the HDFC account?'."""
    # 1. Clone Sharma prefilled seed case
    case_id = clone_seed(seed_key="sharma", uid="test-p8-verifier", mode="prefilled")
    assert case_id is not None

    engine = GraphRAGEngine()

    # 2. Retrieve context
    question = "Who can claim the HDFC account?"
    ctx = engine.retrieve(case_id, question)

    # Validate retrieved legal clauses
    retrieved_clause_ids = {c["clause_id"] for c in ctx.clauses}
    assert any(cid in retrieved_clause_ids for cid in ["RBI-DECEASED-CLAIMS-NOMINEE", "BANK-NOMINATION-GENERAL"]), (
        f"Expected banking nominee clauses in retrieved set: {retrieved_clause_ids}"
    )

    # Validate graph facts
    fact_ids = {f["fact_id"] for f in ctx.graph_facts}
    fact_texts = " ".join(f["text"] for f in ctx.graph_facts)
    assert any("nominee" in fid for fid in fact_ids), "Expected nominee facts in graph facts"
    assert "Sunita Sharma" in fact_texts, "Expected Sunita Sharma in graph facts"

    # 3. Generate verified answer
    ans = engine.answer(question, ctx)

    # Assert answer quality and grounding
    assert not ans.degraded, f"Expected valid verified answer, but degraded: {ans.answer}"
    assert ans.confidence >= 0.7
    assert "Guidance, not legal advice." in ans.answer

    # Assert cited references are present
    assert len(ans.citations) > 0
    # Must cite at least one legal clause and at least one graph fact
    has_clause_citation = any(c in retrieved_clause_ids for c in ans.citations)
    has_fact_citation = any(c in fact_ids for c in ans.citations)
    assert has_clause_citation, f"Answer must cite real retrieved clauses: {ans.citations}"
    assert has_fact_citation, f"Answer must cite real graph facts: {ans.citations}"

    # Verify substantive correctness: explains nominee claim rights and beneficial legal heir ownership
    full_text = f"{ans.answer} {' '.join(ans.steps)}".lower()
    assert "sunita" in full_text
    assert "nominee" in full_text
    assert ("custodian" in full_text or "trustee" in full_text or "heir" in full_text or "succession" in full_text)
