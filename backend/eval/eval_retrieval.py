"""Evaluation 3: Legal Corpus and GraphRAG Retrieval Benchmark.

Evaluates:
- 30 diverse legal succession and BFSI deceased claims questions
- Recall@3 and Recall@6 against Spanner LegalClause corpus
- Mean Reciprocal Rank (MRR)
"""

from typing import Any
from app.engines.graphrag import GraphRAGEngine

EVAL_RETRIEVAL_QUESTIONS = [
    # 1-5: Hindu Succession Act Core
    ("Who inherits first when a Hindu male dies intestate without a will?", ["HSA-1956-S8", "HSA-1956-S10"]),
    ("What is the order of priority among heirs in the Schedule of Hindu Succession Act?", ["HSA-1956-S9", "HSA-1956-SCHEDULE"]),
    ("How is the deceased estate divided equally among surviving widow, mother, and children?", ["HSA-1956-S10"]),
    ("What relatives are included in Class I of the Schedule under Hindu law?", ["HSA-1956-SCHEDULE", "HSA-1956-S8"]),
    ("Can Class II relatives claim inheritance if the deceased has a surviving spouse or child?", ["HSA-1956-S8", "HSA-1956-S9"]),

    # 6-10: Testamentary Succession & Wills
    ("What are the legal formalities required to execute a valid will in India?", ["ISA-1925-WILL-FORMALITIES"]),
    ("Can a testator bequeath their entire self-acquired property to non-relatives?", ["ISA-1925-TESTAMENTARY"]),
    ("When is probate mandatory for a will executed in Mumbai, Kolkata, or Chennai?", ["ISA-1925-PROBATE"]),
    ("How does an executor obtain letters of administration for an unprobated will?", ["ISA-1925-PROBATE"]),
    ("How to apply for a succession certificate in civil court to collect debts and securities?", ["ISA-1925-SUCCESSION-CERT"]),

    # 11-15: Banking & RBI Regulations
    ("How do banks settle deceased depositor savings accounts when a nominee is registered?", ["RBI-DECEASED-CLAIMS-NOMINEE", "BANK-NOMINATION-GENERAL"]),
    ("What documents and process are needed by banks to settle deceased accounts without nomination?", ["RBI-DECEASED-CLAIMS-NO-NOMINEE", "RBI-DECEASED-CLAIMS-DOCUMENTS"]),
    ("What is the RBI mandated timeline or SLA for settling deceased depositor claims?", ["RBI-DECEASED-CLAIMS-TIMELINES"]),
    ("What is the threshold limit up to which banks settle claims without requiring a succession certificate?", ["RBI-DECEASED-CLAIMS-NO-NOMINEE"]),
    ("How do banks handle survivor mandates in Either or Survivor joint accounts upon death?", ["BANK-JOINT-SURVIVOR", "RBI-DECEASED-CLAIMS-NOMINEE"]),

    # 16-20: Nominee Legal Status & Custodianship
    ("Does a nominee become the absolute owner of bank deposits or just a custodian for legal heirs?", ["BANK-NOMINATION-GENERAL"]),
    ("What did the Supreme Court rule regarding nominee rights in Sarbati Devi v. Usha Devi?", ["BANK-NOMINATION-GENERAL", "INS-ACT-NOMINATION"]),
    ("Who is considered a beneficial nominee under Section 39 of the Insurance Act 1938?", ["INS-ACT-NOMINATION", "INS-BENEFICIAL-NOMINEE"]),
    ("Can legal heirs claim insurance policy proceeds from a beneficial nominee spouse or child?", ["INS-BENEFICIAL-NOMINEE", "INS-ACT-NOMINATION"]),
    ("What happens if a bank nominee refuses to distribute estate funds to statutory heirs?", ["BANK-NOMINATION-GENERAL", "HSA-1956-S8"]),

    # 21-25: Capital Markets (SEBI) & Mutual Funds
    ("What are the SEBI regulations for transmission of mutual funds and shares to a registered nominee?", ["SEBI-TRANSMISSION-NOMINEE"]),
    ("How to claim mutual fund units where the investor died without registering a nominee?", ["SEBI-TRANSMISSION-NO-NOMINEE", "SEBI-TRANSMISSION-DOCS"]),
    ("What is the maximum limit for simplified transmission of demat shares without succession certificate?", ["SEBI-TRANSMISSION-NO-NOMINEE"]),
    ("How are demat shares transferred to a joint demat account holder upon primary holder death?", ["SEBI-TRANSMISSION-NOMINEE", "SEBI-TRANSMISSION-DOCS"]),
    ("What indemnity bond format is required by AMCs for mutual fund transmission?", ["SEBI-TRANSMISSION-NO-NOMINEE"]),

    # 26-30: Provident Fund, Property & Dispute Resolution
    ("How can nominees withdraw employee provident fund and EDLI insurance benefits?", ["EPF-NOMINATION-CLAIM", "EPF-DECEASED-EDLI-CLAIM"]),
    ("What are the PPF rules regarding nomination and transmission to legal heirs?", ["PPF-NOMINATION-CLAIM"]),
    ("How to transfer ownership and RC of a motor vehicle upon death of the registered owner?", ["VEHICLE-TRANSFER-LEGAL-HEIR", "VEHICLE-TRANSFER-FORMALITY"]),
    ("What is a legal heir certificate or surviving member certificate and how is it used?", ["PROCESS-LEGAL-HEIR-CERT"]),
    ("How can conflicting family claimants resolve estate disputes through conciliation under Section 89 CPC?", ["PROCESS-FAMILY-SETTLEMENT", "HSA-1956-S8"]),
]


def evaluate_retrieval() -> dict[str, Any]:
    """Execute hybrid retrieval evaluation on 30 benchmark questions."""
    engine = GraphRAGEngine()

    questions = [tc[0] for tc in EVAL_RETRIEVAL_QUESTIONS]
    q_vectors = engine._embed_queries_batch(questions)

    total_queries = len(EVAL_RETRIEVAL_QUESTIONS)
    hits_at_3 = 0
    hits_at_6 = 0
    rr_sum = 0.0

    query_details = []

    for (q, expected), q_vec in zip(EVAL_RETRIEVAL_QUESTIONS, q_vectors, strict=False):
        res = engine._hybrid_retrieve_clauses(q, k=6, q_vec=q_vec)
        retrieved_ids = [c["clause_id"] for c in res]

        top_3 = retrieved_ids[:3]
        top_6 = retrieved_ids[:6]

        in_top_3 = any(exp in top_3 for exp in expected)
        in_top_6 = any(exp in top_6 for exp in expected)

        if in_top_3:
            hits_at_3 += 1
        if in_top_6:
            hits_at_6 += 1

        # Calculate Reciprocal Rank
        rank = 0
        for idx, cid in enumerate(retrieved_ids):
            if cid in expected:
                rank = idx + 1
                break
        rr = (1.0 / rank) if rank > 0 else 0.0
        rr_sum += rr

        query_details.append({
            "query": q,
            "expected": expected,
            "top_3": top_3,
            "hit_top_3": in_top_3,
            "hit_top_6": in_top_6,
            "reciprocal_rank": round(rr, 3),
        })

    recall_at_3 = round((hits_at_3 / total_queries) * 100.0, 2)
    recall_at_6 = round((hits_at_6 / total_queries) * 100.0, 2)
    mrr = round(rr_sum / total_queries, 3)

    return {
        "suite": "retrieval",
        "total_queries": total_queries,
        "hits_at_3": hits_at_3,
        "hits_at_6": hits_at_6,
        "recall_at_3_pct": recall_at_3,
        "recall_at_6_pct": recall_at_6,
        "mrr": mrr,
        "details": query_details,
    }


if __name__ == "__main__":
    res = evaluate_retrieval()
    print(res)
