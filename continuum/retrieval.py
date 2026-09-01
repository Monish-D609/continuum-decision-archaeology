"""
Hybrid retrieval — combines semantic (pgvector) and keyword (BM25)
search using Reciprocal Rank Fusion.

Per CLAUDE.md / PRD: "Hybrid — semantic (embeddings) + keyword/BM25
fallback, since decision language is often informal and doesn't embed
cleanly against a formal question."
"""

from __future__ import annotations

import logging
from typing import Optional

from continuum.config import SEMANTIC_TOP_K, BM25_TOP_K, FINAL_TOP_K
from continuum.embeddings import embed_text
from continuum.vector_store import semantic_search
from continuum.bm25_index import BM25Index

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    ranked_lists: list[list[dict]],
    k: int = 60,
    id_key: str = "id",
) -> list[dict]:
    """
    Merge multiple ranked lists using Reciprocal Rank Fusion (RRF).

    RRF score = sum over lists of 1 / (k + rank)
    where k is a constant (default 60, standard in literature).
    """
    scores: dict[str, float] = {}
    docs: dict[str, dict] = {}

    for ranked_list in ranked_lists:
        for rank, doc in enumerate(ranked_list):
            doc_id = doc[id_key]
            rrf_score = 1.0 / (k + rank + 1)
            scores[doc_id] = scores.get(doc_id, 0.0) + rrf_score
            if doc_id not in docs:
                docs[doc_id] = doc

    # Sort by RRF score descending
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    result = []
    for doc_id in sorted_ids:
        doc = docs[doc_id].copy()
        doc["rrf_score"] = scores[doc_id]
        result.append(doc)

    return result


def hybrid_retrieve(
    query: str,
    bm25_index: BM25Index,
    semantic_top_k: int = SEMANTIC_TOP_K,
    bm25_top_k: int = BM25_TOP_K,
    final_top_k: int = FINAL_TOP_K,
) -> list[dict]:
    """
    Perform hybrid retrieval: semantic + BM25 + RRF fusion.

    Returns the top-k decision records ranked by combined relevance.
    Each record includes 'rrf_score', 'similarity' (from semantic), and
    'bm25_score' (from keyword).
    """
    # 1. Semantic search via pgvector
    query_embedding = embed_text(query)
    semantic_results = semantic_search(
        query_embedding=query_embedding,
        top_k=semantic_top_k,
    )
    logger.info(f"Semantic search returned {len(semantic_results)} results")

    # 2. BM25 keyword search
    bm25_results = bm25_index.search(query, top_k=bm25_top_k)
    logger.info(f"BM25 search returned {len(bm25_results)} results")

    # 3. Reciprocal Rank Fusion
    if not semantic_results and not bm25_results:
        logger.warning("Both semantic and BM25 returned no results")
        return []

    fused = reciprocal_rank_fusion(
        [semantic_results, bm25_results],
        id_key="id",
    )

    result = fused[:final_top_k]
    logger.info(
        f"Hybrid retrieval: {len(semantic_results)} semantic + "
        f"{len(bm25_results)} BM25 → {len(result)} fused results"
    )

    return result
