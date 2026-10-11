"""GraphRAG Engine for Virasat Estate Settlement Platform.

Combines bi-temporal knowledge graph retrieval with Spanner vector search over the
Indian legal corpus, verified by strict anti-hallucination verification.

Key components:
1. retrieve(case_id, question, valid_at, known_at, k=6):
   - Embeds question with text-embedding-005 (RETRIEVAL_QUERY).
   - Exact Spanner vector search with COSINE_DISTANCE over LegalClause + keyword re-ranking.
   - Subgraph snapshot via graph_queries.snapshot.
   - Entity linking (people, assets, institutions) via RapidFuzz.
   - 2-hop neighborhood expansion into structured graph facts with fact_ids.
   - Returns GraphRAGContext(clauses, graph_facts, entity_links).

2. answer(question, context, engine_output=None):
   - Structured generation via Gemini Pro (Vertex AI).
   - Strict grounding instruction: answer ONLY from context clauses, graph facts, and engine output.
   - Verification via AnswerVerifier (retry once on failure, degrade cleanly if ungrounded).
   - Statutory disclaimer enforcement: "Guidance, not legal advice."
"""

import json
import logging
import re
from datetime import datetime
from typing import Any

from google import genai
from google.cloud import spanner
from google.genai import types
from rapidfuzz import fuzz

from app.config import Settings, get_settings
from app.db import graph_queries
from app.db.client import run_in_snapshot
from app.deps import get_genai_client
from app.engines.verifier import AnswerVerifier
from app.models.schemas import GraphRAGAnswer, GraphRAGContext

logger = logging.getLogger(__name__)


from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# Common legal and banking stop words / query delimiters
STOP_WORDS = {
    "a", "an", "the", "in", "on", "of", "for", "to", "at", "by", "from",
    "with", "is", "are", "was", "were", "be", "been", "being", "have",
    "has", "had", "do", "does", "did", "and", "or", "but", "if", "then",
    "can", "could", "shall", "should", "will", "would", "may", "might",
    "must", "what", "which", "who", "whom", "whose", "why", "how", "where",
    "when", "this", "that", "these", "those", "my", "our", "their", "his", "her"
}


def tokenize_query(query: str) -> list[str]:
    """Tokenize question into meaningful search keywords."""
    clean = re.sub(r"[^a-zA-Z0-9\s]", " ", query.lower())
    tokens = [t for t in clean.split() if len(t) > 2 and t not in STOP_WORDS]
    return tokens


def compute_keyword_match_score(query_tokens: list[str], clause: dict[str, Any]) -> float:
    """Compute normalized keyword match score [0.0, 1.0] for a legal clause."""
    if not query_tokens:
        return 0.0

    target_text = f"{clause.get('clause_id', '')} {clause.get('topic', '')} {clause.get('section', '')} {clause.get('source', '')} {clause.get('text', '')}".lower()

    matches = 0
    weight = 0.0

    # Key domain concepts receive higher priority
    priority_terms = {
        "nominee": 2.5,
        "nomination": 2.5,
        "custodian": 2.5,
        "trustee": 2.5,
        "succession": 2.0,
        "certificate": 2.0,
        "probate": 2.5,
        "will": 2.0,
        "intestate": 2.0,
        "heir": 2.0,
        "heirs": 2.0,
        "class i": 3.0,
        "class ii": 3.0,
        "hindu": 2.0,
        "male": 3.0,
        "males": 3.0,
        "female": 3.0,
        "females": 3.0,
        "schedule": 2.5,
        "hsa": 2.5,
        "rbi": 2.5,
        "bank": 2.0,
        "account": 1.5,
        "claim": 1.5,
        "form": 1.5,
        "indemnity": 2.5,
        "death": 1.5,
        "kyc": 2.0,
        "cheque": 2.0,
        "epf": 2.5,
        "ppf": 2.5,
        "insurance": 2.5,
        "sebi": 2.5,
        "demat": 2.5,
        "transmission": 2.5,
        "vehicle": 2.5,
        "mutation": 2.5,
        "property": 2.0,
        "timeline": 2.0,
        "sla": 2.0,
        "dispute": 2.0,
    }

    total_possible_weight = 0.0
    for token in query_tokens:
        t_weight = priority_terms.get(token, 1.0)
        total_possible_weight += t_weight
        if token in target_text:
            matches += 1
            weight += t_weight

    # Extra boost if clause_id or topic contains the exact token
    topic_text = f"{clause.get('clause_id', '')} {clause.get('topic', '')}".lower()
    for token in query_tokens:
        if token in topic_text:
            weight += priority_terms.get(token, 1.0) * 0.7

    # Penalty if query specifically asks for "male" but clause is specifically for "female", or vice-versa
    if "male" in query_tokens or "males" in query_tokens:
        if "female" in topic_text or "women" in topic_text:
            weight = max(0.0, weight - 2.0)
    elif "female" in query_tokens or "females" in query_tokens:
        if "males" in topic_text:
            weight = max(0.0, weight - 2.0)

    if total_possible_weight == 0:
        return 0.0
    return min(1.0, weight / total_possible_weight)


class GraphRAGEngine:
    """GraphRAG engine combining Spanner Vector Search, EstateGraph, and Gemini Pro."""

    def __init__(
        self,
        settings: Settings | None = None,
        genai_client: genai.Client | None = None,
    ):
        self.settings = settings or get_settings()
        self.genai_client = genai_client or get_genai_client(self.settings)
        self.verifier = AnswerVerifier()

    @retry(
        retry=retry_if_exception_type(Exception),
        wait=wait_exponential(multiplier=1.5, min=2, max=15),
        stop=stop_after_attempt(5),
    )
    def _embed_query(self, query: str) -> list[float]:
        """Generate 768-dim embedding for question with RETRIEVAL_QUERY task type."""
        resp = self.genai_client.models.embed_content(
            model=self.settings.EMBED_MODEL,
            contents=[query],
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=self.settings.EMBED_DIM,
            ),
        )
        return resp.embeddings[0].values

    @retry(
        retry=retry_if_exception_type(Exception),
        wait=wait_exponential(multiplier=1.5, min=2, max=15),
        stop=stop_after_attempt(5),
    )
    def _embed_queries_batch(self, queries: list[str]) -> list[list[float]]:
        """Generate 768-dim embeddings in a single batch request to avoid rate limits."""
        resp = self.genai_client.models.embed_content(
            model=self.settings.EMBED_MODEL,
            contents=queries,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=self.settings.EMBED_DIM,
            ),
        )
        return [e.values for e in resp.embeddings]

    def _vector_search_clauses(self, query_vec: list[float], limit: int = 15) -> list[dict[str, Any]]:
        """Run Spanner vector search over LegalClause using COSINE_DISTANCE."""
        def _exec(snap: Any) -> list[dict[str, Any]]:
            sql = """
            SELECT
              clause_id,
              source,
              section,
              topic,
              official_url,
              text,
              COSINE_DISTANCE(embedding, @q_vec) as distance
            FROM LegalClause
            ORDER BY distance ASC
            LIMIT @limit
            """
            params = {"q_vec": query_vec, "limit": limit}
            param_types = {
                "q_vec": spanner.param_types.Array(spanner.param_types.FLOAT32),
                "limit": spanner.param_types.INT64,
            }
            rows = list(snap.execute_sql(sql, params=params, param_types=param_types))
            results = []
            for r in rows:
                dist = float(r[6]) if r[6] is not None else 1.0
                sim = max(0.0, 1.0 - dist)
                results.append({
                    "clause_id": r[0],
                    "source": r[1],
                    "section": r[2] or "",
                    "topic": r[3] or "",
                    "official_url": r[4] or "",
                    "text": r[5],
                    "distance": dist,
                    "vector_similarity": sim,
                })
            return results

        return run_in_snapshot(_exec)

    def _hybrid_retrieve_clauses(
        self, question: str, k: int = 6, q_vec: list[float] | None = None
    ) -> list[dict[str, Any]]:
        """Perform hybrid retrieval: vector search + keyword re-ranking."""
        if q_vec is None:
            q_vec = self._embed_query(question)
        candidate_clauses = self._vector_search_clauses(q_vec, limit=max(35, k * 3))

        tokens = tokenize_query(question)

        scored_clauses = []
        for c in candidate_clauses:
            vec_sim = c.get("vector_similarity", 0.0)
            kw_score = compute_keyword_match_score(tokens, c)
            # Hybrid combined score: 65% vector similarity + 35% keyword alignment
            hybrid_score = (0.65 * vec_sim) + (0.35 * kw_score)

            scored_clauses.append((hybrid_score, c))

        # Sort descending by hybrid score
        scored_clauses.sort(key=lambda x: x[0], reverse=True)

        top_k = [item[1] for item in scored_clauses[:k]]
        return top_k

    def _link_entities(
        self,
        question: str,
        subgraph: dict[str, Any],
        min_score: float = 65.0,
    ) -> list[dict[str, Any]]:
        """Link entities (people, assets, institutions) mentioned in question using fuzzy matching."""
        links: list[dict[str, Any]] = []
        q_lower = question.lower()

        # 1. Match People
        for p in subgraph.get("people", []):
            name = p.get("full_name", "")
            pid = p.get("person_id", "")
            role = p.get("role", "")

            # Exact or partial match on full name
            ratio = fuzz.partial_ratio(name.lower(), q_lower)
            token_ratio = fuzz.token_set_ratio(name.lower(), q_lower)
            score = max(ratio, token_ratio)

            # Check direct surname/first name occurrence
            name_parts = name.lower().split()
            if any(part in q_lower for part in name_parts if len(part) > 3):
                score = max(score, 85.0)

            # Check role keywords (e.g. "wife", "spouse", "widow", "son", "brother")
            if role and role.lower() in q_lower:
                score = max(score, 75.0)

            if score >= min_score:
                links.append({
                    "entity_id": pid,
                    "entity_type": "Person",
                    "name": name,
                    "score": float(score),
                })

        # 2. Match Assets
        for a in subgraph.get("assets", []):
            aid = a.get("asset_id", "")
            label = a.get("label", "")
            atype = a.get("type", "")
            ref = a.get("account_ref_masked", "")

            ratio = fuzz.partial_ratio(label.lower(), q_lower)
            token_ratio = fuzz.token_set_ratio(label.lower(), q_lower)
            score = max(ratio, token_ratio)

            # Direct institution/type keywords (e.g. "hdfc", "sbi", "ppf", "epf", "demat", "savings")
            label_lower = label.lower()
            if "hdfc" in q_lower and "hdfc" in label_lower:
                score = max(score, 95.0)
            elif "sbi" in q_lower and "sbi" in label_lower:
                score = max(score, 95.0)
            elif "icici" in q_lower and "icici" in label_lower:
                score = max(score, 95.0)
            elif "epf" in q_lower and ("epf" in label_lower or atype == "EPF"):
                score = max(score, 95.0)
            elif "ppf" in q_lower and ("ppf" in label_lower or atype == "PPF"):
                score = max(score, 95.0)
            elif "lic" in q_lower and ("lic" in label_lower or atype == "INSURANCE_POLICY"):
                score = max(score, 95.0)
            elif "vehicle" in q_lower and atype == "VEHICLE":
                score = max(score, 90.0)
            elif "property" in q_lower and atype in ("PROPERTY", "REAL_ESTATE"):
                score = max(score, 90.0)

            if score >= min_score:
                links.append({
                    "entity_id": aid,
                    "entity_type": "Asset",
                    "name": label,
                    "score": float(score),
                })

        # 3. Match Institutions
        for inst in subgraph.get("institutions", []):
            iid = inst.get("institution_id", "")
            iname = inst.get("name", "")
            ikind = inst.get("kind", "")

            score = fuzz.token_set_ratio(iname.lower(), q_lower)
            if iname.lower() in q_lower:
                score = 100.0

            if score >= min_score:
                links.append({
                    "entity_id": iid,
                    "entity_type": "Institution",
                    "name": iname,
                    "score": float(score),
                })

        # Deduplicate links by entity_id
        seen = set()
        deduped = []
        for l in sorted(links, key=lambda x: x["score"], reverse=True):
            if l["entity_id"] not in seen:
                seen.add(l["entity_id"])
                deduped.append(l)

        return deduped

    def _extract_2hop_graph_facts(
        self,
        subgraph: dict[str, Any],
        entity_links: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Extract structured 2-hop neighborhood graph facts with stable fact_ids."""
        facts: list[dict[str, Any]] = []
        seen_fact_ids: set[str] = set()

        people_by_id = {p["person_id"]: p for p in subgraph.get("people", [])}
        assets_by_id = {a["asset_id"]: a for a in subgraph.get("assets", [])}
        inst_by_id = {i["institution_id"]: i for i in subgraph.get("institutions", [])}
        nominees = subgraph.get("nominees", [])
        relationships = subgraph.get("relationships", [])

        # Find Deceased person (anchor)
        deceased_person = None
        for p in subgraph.get("people", []):
            if p.get("role") == "DECEASED" or not p.get("alive", True):
                deceased_person = p
                break

        # 1. Base facts: Deceased and surviving legal heirs
        if deceased_person:
            fid = f"fact-deceased-{deceased_person['person_id']}"
            dod_str = f" on {deceased_person.get('dod')}" if deceased_person.get("dod") else ""
            notes = f" ({deceased_person.get('notes')})" if deceased_person.get("notes") else ""
            law = deceased_person.get("personal_law", "HINDU")
            f_text = (
                f"Deceased person {deceased_person['full_name']} passed away{dod_str} intestate (no registered will found), "
                f"governed by {law} personal law{notes}."
            )
            facts.append({"fact_id": fid, "text": f_text})
            seen_fact_ids.add(fid)

        # Baseline heir relationships
        for r in relationships:
            p_from = people_by_id.get(r.get("from_id"))
            p_to = people_by_id.get(r.get("to_id"))
            rel_type = r.get("rel_type")
            if p_from and p_to:
                fid = f"fact-rel-{r.get('from_id')}-{r.get('to_id')}"
                if fid not in seen_fact_ids:
                    if p_from.get("eligibility") == "CLASS_I" or p_from.get("role") in ("WIFE", "SPOUSE", "SON", "DAUGHTER", "MOTHER") or rel_type in ("SPOUSE", "SON", "DAUGHTER", "MOTHER"):
                        heir_status = "Class I legal heir"
                    elif p_from.get("eligibility") == "EXCLUDED" or rel_type == "SIBLING":
                        heir_status = "Class II legal heir / relative (excluded when Class I heirs exist)"
                    else:
                        heir_status = "Legal heir / relative"
                    f_text = f"{p_from['full_name']} is the {p_from.get('role') or rel_type} of {p_to['full_name']} ({heir_status})."
                    facts.append({"fact_id": fid, "text": f_text})
                    seen_fact_ids.add(fid)

        # 2. Extract facts for linked assets or all primary assets if none specifically linked
        linked_asset_ids = {l["entity_id"] for l in entity_links if l["entity_type"] == "Asset"}
        # If no specific asset linked, pick first 3 assets
        if not linked_asset_ids:
            linked_asset_ids = {a["asset_id"] for a in subgraph.get("assets", [])[:3]}

        for aid in linked_asset_ids:
            asset = assets_by_id.get(aid)
            if not asset:
                continue

            # Asset baseline fact
            val_inr = int(asset.get("est_value_inr") or 0)
            ref_mask = asset.get("account_ref_masked") or "N/A"
            fid_asset = f"fact-asset-{aid}"
            if fid_asset not in seen_fact_ids:
                f_text = (
                    f"Asset '{asset.get('label')}' (Type: {asset.get('type')}, Account Ref: {ref_mask}) "
                    f"has an estimated balance of ₹{val_inr:,}."
                )
                facts.append({"fact_id": fid_asset, "text": f_text})
                seen_fact_ids.add(fid_asset)

            # 1-Hop: Institution managing the asset
            inst_id = asset.get("institution_id")
            inst = inst_by_id.get(inst_id)
            if inst:
                fid_inst = f"fact-inst-{inst_id}"
                if fid_inst not in seen_fact_ids:
                    f_text = (
                        f"Institution {inst.get('name')} ({inst.get('kind')}) manages asset '{asset.get('label')}'. "
                        f"Standard claim documents required: {inst.get('required_docs')}. SLA: {inst.get('sla_days')} days."
                    )
                    facts.append({"fact_id": fid_inst, "text": f_text})
                    seen_fact_ids.add(fid_inst)

            # 1-Hop & 2-Hop: Nominees on this asset
            asset_nominees = [n for n in nominees if n.get("asset_id") == aid]
            for nom in asset_nominees:
                nom_pid = nom.get("person_id")
                nom_person = people_by_id.get(nom_pid)
                if not nom_person:
                    continue

                share = float(nom.get("share_pct") or 0.0)
                fid_nom = f"fact-nominee-{aid}-{nom_pid}"
                if fid_nom not in seen_fact_ids:
                    f_text = (
                        f"{nom_person.get('full_name')} is registered as a {share}% nominee for asset '{asset.get('label')}' "
                        f"(Account {ref_mask})."
                    )
                    facts.append({"fact_id": fid_nom, "text": f_text})
                    seen_fact_ids.add(fid_nom)

                # 2-Hop: Nominee relationship and succession classification
                if deceased_person:
                    # Find relationship between nominee and deceased
                    nom_rel = None
                    for r in relationships:
                        if (r.get("from_id") == nom_pid and r.get("to_id") == deceased_person["person_id"]) or \
                           (r.get("to_id") == nom_pid and r.get("from_id") == deceased_person["person_id"]):
                            nom_rel = r.get("rel_type")
                            break

                    fid_standing = f"fact-standing-{nom_pid}"
                    if fid_standing not in seen_fact_ids:
                        if nom_rel in ("SPOUSE", "SON", "DAUGHTER", "MOTHER"):
                            f_text = (
                                f"Nominee {nom_person.get('full_name')} is the {nom_rel} of deceased {deceased_person['full_name']} "
                                f"and is a Class I legal heir under the Hindu Succession Act."
                            )
                        elif nom_rel == "SIBLING":
                            f_text = (
                                f"Nominee {nom_person.get('full_name')} is the SIBLING (brother) of deceased {deceased_person['full_name']}, "
                                f"which is a Class II legal heir under the Hindu Succession Act. Class II heirs are excluded when Class I heirs exist."
                            )
                        else:
                            f_text = (
                                f"Nominee {nom_person.get('full_name')} holds relationship {nom_rel} with deceased {deceased_person['full_name']}."
                            )
                        facts.append({"fact_id": fid_standing, "text": f_text})
                        seen_fact_ids.add(fid_standing)

        return facts

    def retrieve(
        self,
        case_id: str,
        question: str,
        valid_at: datetime | None = None,
        known_at: datetime | None = None,
        k: int = 6,
    ) -> GraphRAGContext:
        """Retrieve relevant legal clauses and case graph context for a question."""
        # 1. Hybrid retrieve top legal clauses from Spanner vector search + keyword re-ranking
        clauses = self._hybrid_retrieve_clauses(question, k=k)

        # 2. Fetch case subgraph snapshot from bi-temporal graph
        subgraph = graph_queries.snapshot(case_id, valid_at=valid_at, known_at=known_at)

        # 3. Fuzzy link entities mentioned in question
        entity_links = self._link_entities(question, subgraph)

        # 4. Extract 2-hop neighborhood facts
        graph_facts = self._extract_2hop_graph_facts(subgraph, entity_links)

        # 5. Graph-guided retrieval: If nominees exist on retrieved assets, ensure BANK-NOMINATION-GENERAL is included
        clause_ids = {c["clause_id"] for c in clauses}
        has_nominee = any("nominee" in f.get("fact_id", "") for f in graph_facts)
        if has_nominee and "BANK-NOMINATION-GENERAL" not in clause_ids:
            def _get_bank_clause(snap: Any) -> list[dict[str, Any]]:
                sql = "SELECT clause_id, source, section, topic, official_url, text FROM LegalClause WHERE clause_id = 'BANK-NOMINATION-GENERAL'"
                rows = list(snap.execute_sql(sql))
                return [{
                    "clause_id": r[0],
                    "source": r[1],
                    "section": r[2] or "",
                    "topic": r[3] or "",
                    "official_url": r[4] or "",
                    "text": r[5],
                } for r in rows]

            extra = run_in_snapshot(_get_bank_clause)
            if extra:
                clauses.append(extra[0])

        return GraphRAGContext(
            clauses=clauses,
            graph_facts=graph_facts,
            entity_links=entity_links,
        )

    def answer(
        self,
        question: str,
        context: GraphRAGContext | dict[str, Any],
        engine_output: dict[str, Any] | None = None,
        max_retries: int = 1,
    ) -> GraphRAGAnswer:
        """Generate verified, zero-hallucination legal and factual answer via Gemini Pro."""
        if isinstance(context, dict):
            ctx_obj = GraphRAGContext(**context)
        else:
            ctx_obj = context

        system_instruction = (
            "You are Virasat's verified legal succession and claims intelligence engine for Indian estate settlement.\n"
            "Your task is to answer user queries with absolute factual and legal grounding.\n\n"
            "STRICT GROUNDING RULES:\n"
            "1. Answer ONLY from the provided legal clauses, graph facts, and engine output.\n"
            "2. If the context is insufficient to answer the question, explicitly state that context is insufficient.\n"
            "3. Every factual claim must be backed by citations:\n"
            "   - When citing statutory rules or regulations, cite the exact clause_id in square brackets (e.g. [HSA-1956-S8], [RBI-DECEASED-CLAIMS-NOMINEE], [BANK-NOMINATION-GENERAL]).\n"
            "   - When citing case facts (nominees, accounts, relationships), cite the exact fact_id (e.g. [fact-nominee-a-sharma-hdfc-sav-p-sharma-sunita]).\n"
            "4. Rupee amounts and percentages must come ONLY from graph facts or engine output. Do NOT invent, assume, or alter any amounts or percentages.\n"
            "5. Distinguish clearly between:\n"
            "   - NOMINEE rights: The nominee is a custodian/trustee entitled to claim and receive payout from the bank or institution for valid discharge.\n"
            "   - LEGAL HEIR succession ownership: Beneficial ownership remains with the legal heirs distributed according to succession law (e.g. Class I heirs under Hindu Succession Act).\n"
            "6. Output MUST be a valid JSON object matching this schema:\n"
            "{\n"
            '  "answer": "Clear explanation distinguishing claim rights vs ownership with citations",\n'
            '  "steps": ["Actionable step 1", "Actionable step 2", ...],\n'
            '  "citations": ["clause_id_or_fact_id_1", "clause_id_or_fact_id_2", ...],\n'
            '  "confidence": 0.95,\n'
            '  "needs_lawyer": false\n'
            "}"
        )

        def _build_prompt(feedback: str = "") -> str:
            # Serialize clauses
            clauses_str = ""
            for c in ctx_obj.clauses:
                clauses_str += (
                    f"- [{c.get('clause_id')}]: {c.get('source')} (Section: {c.get('section', 'N/A')}) - "
                    f"Topic: {c.get('topic')}\n  Text: {c.get('text')}\n\n"
                )

            # Serialize graph facts
            facts_str = ""
            for f in ctx_obj.graph_facts:
                facts_str += f"- [{f.get('fact_id')}]: {f.get('text')}\n"

            # Serialize engine output
            engine_str = json.dumps(engine_output, indent=2) if engine_output else "None"

            prompt = (
                f"USER QUESTION: {question}\n\n"
                f"RETRIEVED LEGAL CLAUSES:\n{clauses_str or 'None'}\n\n"
                f"CASE GRAPH FACTS:\n{facts_str or 'None'}\n\n"
                f"SUCCESSION ENGINE OUTPUT:\n{engine_str}\n\n"
            )

            if feedback:
                prompt += (
                    f"PREVIOUS ATTEMPT FAILED VERIFICATION:\n{feedback}\n"
                    "Please regenerate the JSON answer strictly complying with the grounding rules.\n"
                )

            return prompt

        # Primary generation attempt
        attempt = 0
        feedback = ""
        last_raw_dict: dict[str, Any] = {}

        while attempt <= max_retries:
            prompt_content = _build_prompt(feedback)
            try:
                resp = self.genai_client.models.generate_content(
                    model=self.settings.GEMINI_PRO_MODEL,
                    contents=prompt_content,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                raw_text = resp.text.strip()
                parsed = json.loads(raw_text)
                last_raw_dict = parsed
            except Exception as e:
                logger.error("Gemini Pro generation error on attempt %d: %s", attempt, e)
                return GraphRAGAnswer(
                    **self.verifier.build_degraded_answer(f"LLM generation failed: {e!s}")
                )

            # Run strict verification
            is_valid, failure_reason, verified_dict = self.verifier.verify(
                question=question,
                answer_dict=last_raw_dict,
                context=ctx_obj,
                engine_output=engine_output,
            )

            if is_valid:
                logger.info("Answer passed verification successfully on attempt %d.", attempt)
                return GraphRAGAnswer(
                    answer=verified_dict.get("answer", ""),
                    steps=verified_dict.get("steps", []),
                    citations=verified_dict.get("citations", []),
                    confidence=float(verified_dict.get("confidence", 0.9)),
                    needs_lawyer=bool(verified_dict.get("needs_lawyer", False)),
                    degraded=False,
                )

            logger.warning(
                "Attempt %d failed verification: %s. Retrying...", attempt, failure_reason
            )
            feedback = failure_reason
            attempt += 1

        # If retries exhausted and still invalid, degrade gracefully
        logger.error("Verification failed after %d retries. Returning degraded answer.", max_retries)
        degraded = self.verifier.build_degraded_answer(feedback, last_raw_dict)
        return GraphRAGAnswer(
            answer=degraded["answer"],
            steps=degraded.get("steps", []),
            citations=degraded.get("citations", []),
            confidence=0.0,
            needs_lawyer=True,
            degraded=True,
        )
