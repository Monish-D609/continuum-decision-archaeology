"""
Supabase pgvector store — stores decision records with their embeddings
and provides semantic similarity search.

Uses Supabase's built-in pgvector extension on the free tier.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from continuum.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    EMBEDDING_DIMENSION,
    SEMANTIC_TOP_K,
)

logger = logging.getLogger(__name__)

# Lazy-loaded client
_client = None


def _get_client():
    """Lazy-load the Supabase client."""
    global _client
    if _client is None:
        from supabase import create_client
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info(f"Connected to Supabase at {SUPABASE_URL}")
    return _client


# SQL to create the table and index — run this once via Supabase SQL editor
# or via the setup script
SETUP_SQL = f"""
-- Enable pgvector extension (already enabled on Supabase free tier)
CREATE EXTENSION IF NOT EXISTS vector;

-- Decision records table
CREATE TABLE IF NOT EXISTS decision_records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    decision_summary TEXT,
    record_json JSONB NOT NULL,
    source_url TEXT,
    source_type TEXT,
    source_id TEXT,
    embedding VECTOR({EMBEDDING_DIMENSION}),
    text_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Similarity search index
CREATE INDEX IF NOT EXISTS idx_decision_embedding
    ON decision_records
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- Text search index for BM25-style fallback
CREATE INDEX IF NOT EXISTS idx_decision_text
    ON decision_records
    USING gin (to_tsvector('english', text_content));

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_decisions(
    query_embedding VECTOR({EMBEDDING_DIMENSION}),
    match_count INT DEFAULT {SEMANTIC_TOP_K},
    match_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    decision_summary TEXT,
    record_json JSONB,
    source_url TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.id,
        dr.title,
        dr.decision_summary,
        dr.record_json,
        dr.source_url,
        1 - (dr.embedding <=> query_embedding) AS similarity
    FROM decision_records dr
    WHERE 1 - (dr.embedding <=> query_embedding) > match_threshold
    ORDER BY dr.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
"""


def upsert_decision_record(
    decision_id: str,
    title: str,
    decision_summary: str,
    record_json: dict,
    source_url: str,
    source_type: str,
    source_id: str,
    embedding: list[float],
    text_content: str,
) -> None:
    """Upsert a single decision record with its embedding into Supabase."""
    client = _get_client()

    data = {
        "id": decision_id,
        "title": title,
        "decision_summary": decision_summary,
        "record_json": record_json,
        "source_url": source_url,
        "source_type": source_type,
        "source_id": source_id,
        "embedding": embedding,
        "text_content": text_content,
    }

    client.table("decision_records").upsert(data).execute()


def upsert_batch(records: list[dict]) -> int:
    """Upsert a batch of decision records. Returns count of upserted records.

    Deduplicates by 'id' within each batch — Postgres cannot ON CONFLICT
    UPDATE the same row twice in a single statement.
    """
    client = _get_client()
    count = 0

    for i in range(0, len(records), 50):
        batch = records[i:i + 50]

        # Deduplicate: if two records share the same id, keep the last one
        seen: dict[str, dict] = {}
        for rec in batch:
            seen[rec["id"]] = rec
        deduped = list(seen.values())

        if len(deduped) < len(batch):
            logger.warning(
                f"Deduplicated batch {i//50 + 1}: {len(batch)} → {len(deduped)} records "
                f"({len(batch) - len(deduped)} duplicate ids removed)"
            )

        client.table("decision_records").upsert(deduped).execute()
        count += len(deduped)

    return count



def semantic_search(
    query_embedding: list[float],
    top_k: int = SEMANTIC_TOP_K,
    threshold: float = 0.0,
) -> list[dict]:
    """
    Search for similar decision records using cosine similarity.
    Returns records sorted by descending similarity.
    """
    client = _get_client()

    result = client.rpc(
        "match_decisions",
        {
            "query_embedding": query_embedding,
            "match_count": top_k,
            "match_threshold": threshold,
        },
    ).execute()

    return result.data if result.data else []


def get_all_records() -> list[dict]:
    """Fetch all decision records (for BM25 index building)."""
    client = _get_client()
    result = (
        client.table("decision_records")
        .select("id, title, decision_summary, record_json, source_url, text_content")
        .execute()
    )
    return result.data if result.data else []


def get_record_by_id(decision_id: str) -> Optional[dict]:
    """Fetch a single decision record by ID."""
    client = _get_client()
    result = (
        client.table("decision_records")
        .select("*")
        .eq("id", decision_id)
        .single()
        .execute()
    )
    return result.data


def get_record_count() -> int:
    """Get the total number of decision records."""
    client = _get_client()
    result = (
        client.table("decision_records")
        .select("id", count="exact")
        .execute()
    )
    return result.count or 0


def delete_all_records() -> None:
    """Delete all records (for re-indexing)."""
    client = _get_client()
    client.table("decision_records").delete().neq("id", "").execute()
    logger.info("Deleted all decision records from Supabase")
