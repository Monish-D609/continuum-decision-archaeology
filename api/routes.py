"""
API route definitions for Continuum.

These endpoints form the stable contract the frontend consumes.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.schemas import (
    QueryRequest,
    QueryResponse,
    DecisionRecordResponse,
    DecisionListResponse,
    HealthResponse,
)
from continuum.retrieval import hybrid_retrieve
from continuum.synthesis import synthesize_answer
from continuum.vector_store import get_all_records, get_record_by_id, get_record_count

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check — returns service status and record count."""
    try:
        count = get_record_count()
        return HealthResponse(
            status="healthy",
            record_count=count,
            message=f"Continuum is operational with {count} indexed decision records",
        )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            record_count=0,
            message=f"Supabase connection issue: {str(e)}",
        )


@router.post("/query", response_model=QueryResponse, tags=["Query"])
async def query_decisions(request: QueryRequest):
    """
    Main query endpoint — ask a 'why' question about a past engineering decision.

    The system retrieves relevant decision records via hybrid (semantic + keyword)
    search, then synthesizes a citation-grounded answer. Every claim in the response
    is linked to a specific PR/issue/commit. When evidence is insufficient, the
    system explicitly says so rather than guessing.
    """
    from api.main import bm25_index

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    logger.info(f"Query: {request.question}")

    # Hybrid retrieval
    retrieved = hybrid_retrieve(
        query=request.question,
        bm25_index=bm25_index,
        final_top_k=5,
    )

    # Evidence-grounded synthesis
    response = synthesize_answer(request.question, retrieved)

    return QueryResponse(
        answer=response.answer,
        citations=[
            {
                "text": c.text,
                "source_url": c.source_url,
                "source_type": c.source_type,
                "source_id": c.source_id,
                "confidence": c.confidence.value,
            }
            for c in response.citations
        ],
        confidence_summary=response.confidence_summary,
        decision_records_used=response.decision_records_used,
        is_insufficient_evidence=response.is_insufficient_evidence,
    )


@router.get("/decisions", response_model=DecisionListResponse, tags=["Decisions"])
async def list_decisions(
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
):
    """List all indexed decision records (paginated)."""
    all_records = get_all_records()
    total = len(all_records)
    records = all_records[offset:offset + limit]

    return DecisionListResponse(
        records=[
            DecisionRecordResponse(
                id=r["id"],
                title=r["title"],
                decision_summary=r.get("decision_summary", ""),
                source_url=r.get("source_url", ""),
            )
            for r in records
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/decisions/{decision_id:path}", response_model=dict, tags=["Decisions"])
async def get_decision(decision_id: str):
    """Get a specific decision record by ID."""
    record = get_record_by_id(decision_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Decision record '{decision_id}' not found")
    return record
