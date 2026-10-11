"""Ingestion script for Virasat Legal Corpus.

Parses all legal and institutional chunks from backend/app/corpus/*.md,
generates 768-dimensional embeddings using text-embedding-005 via Vertex AI,
and upserts them into Cloud Spanner's LegalClause table.
Re-runnable.
"""

import logging
import sys
from pathlib import Path
from typing import Any

import yaml
from google.genai import types

# Ensure backend directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from app.db.client import run_in_snapshot, run_in_transaction
from app.deps import get_genai_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingest_corpus")

CORPUS_DIR = Path(__file__).resolve().parent.parent / "app" / "corpus"


def parse_corpus_files() -> list[dict[str, Any]]:
    """Parse all markdown files in CORPUS_DIR extracting front-matter and body text."""
    chunks: list[dict[str, Any]] = []

    for md_file in sorted(CORPUS_DIR.glob("*.md")):
        if md_file.name == "README.md":
            continue

        content = md_file.read_text(encoding="utf-8")
        # Split by separator '---'
        parts = content.split("\n---\n")

        for part in parts:
            p = part.strip()
            if p.startswith("---"):
                p = p[3:].strip()
            if not p:
                continue

            if "---" in p:
                fm_text, body = p.split("---", 1)
                fm = yaml.safe_load(fm_text) or {}
                body = body.strip()
            else:
                lines = p.splitlines()
                fm_lines = []
                body_lines = []
                in_fm = True
                for line in lines:
                    if in_fm and ":" in line:
                        fm_lines.append(line)
                    else:
                        in_fm = False
                        body_lines.append(line)
                fm = yaml.safe_load("\n".join(fm_lines)) or {}
                body = "\n".join(body_lines).strip()

            if not fm or "clause_id" not in fm:
                continue

            clause_id = str(fm["clause_id"]).strip()
            source = str(fm.get("source", "")).strip()
            section = str(fm.get("section", "")).strip() if fm.get("section") is not None else ""
            jurisdiction = str(fm.get("jurisdiction", "India")).strip()
            topic = str(fm.get("topic", "")).strip()
            needs_review = bool(fm.get("needs_review", True))
            official_url = str(fm.get("official_url", "")).strip()

            chunks.append({
                "clause_id": clause_id,
                "source": source,
                "section": section,
                "jurisdiction": jurisdiction,
                "topic": topic,
                "text": body,
                "needs_review": needs_review,
                "official_url": official_url,
            })

    logger.info("Parsed %d unique chunks from %s", len(chunks), CORPUS_DIR)
    return chunks


def generate_embeddings_batch(
    client: Any,
    model: str,
    dim: int,
    texts: list[str],
) -> list[list[float]]:
    """Generate 768-dim embeddings in batches using Google GenAI SDK."""
    resp = client.models.embed_content(
        model=model,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=dim,
        ),
    )
    return [e.values for e in resp.embeddings]


def ingest_corpus() -> int:
    """Parse, embed, and upsert all corpus chunks into Spanner."""
    settings = get_settings()
    genai_client = get_genai_client(settings)
    chunks = parse_corpus_files()

    if not chunks:
        raise RuntimeError("No chunks found in corpus directory!")

    logger.info("Generating embeddings with model %s (dim=%d)...", settings.EMBED_MODEL, settings.EMBED_DIM)

    # Embed in batches of 10
    batch_size = 10
    all_embeddings: list[list[float]] = []

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        # Include topic context with text for richer retrieval representations
        embed_inputs = [f"{c['topic']}: {c['text']}" for c in batch]
        embeddings = generate_embeddings_batch(genai_client, settings.EMBED_MODEL, settings.EMBED_DIM, embed_inputs)
        all_embeddings.extend(embeddings)
        logger.info("Embedded chunks %d - %d of %d", i + 1, min(i + batch_size, len(chunks)), len(chunks))

    logger.info("Upserting %d rows into Spanner LegalClause table...", len(chunks))

    cols = [
        "clause_id",
        "source",
        "section",
        "jurisdiction",
        "topic",
        "text",
        "needs_review",
        "official_url",
        "embedding",
    ]

    values = []
    for c, emb in zip(chunks, all_embeddings, strict=False):
        values.append([
            c["clause_id"],
            c["source"],
            c["section"],
            c["jurisdiction"],
            c["topic"],
            c["text"],
            c["needs_review"],
            c["official_url"],
            emb,
        ])

    def _write_tx(tx: Any):
        tx.insert_or_update(
            table="LegalClause",
            columns=cols,
            values=values,
        )

    run_in_transaction(_write_tx)
    logger.info("Upsert transaction committed successfully!")

    def _verify_count(snap: Any) -> int:
        rows = list(snap.execute_sql("SELECT COUNT(1) FROM LegalClause"))
        return rows[0][0]

    count = run_in_snapshot(_verify_count)
    logger.info("Verified LegalClause total count in Spanner: %d", count)
    return count


if __name__ == "__main__":
    count = ingest_corpus()
    print(f"\nIngestion complete: {count} LegalClause chunks loaded into Spanner.")
