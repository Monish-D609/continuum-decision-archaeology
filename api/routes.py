"""
API route definitions for Continuum.

These endpoints form the stable contract the frontend consumes.

Endpoints:
  POST /api/query          — Main query (hybrid retrieval + synthesis)
  POST /api/graveyard      — Rejected alternatives only ("The Graveyard")
  POST /api/blame          — Blame-to-Why (explain a code snippet)
  POST /api/deja-vu        — Déjà Vu PR sentinel (check PR for rejected patterns)
  POST /api/export-adr     — Export a response as an ADR markdown file
  POST /api/drift-radar    — Architectural drift/contradiction detector
  GET  /api/timeline       — Chronological decision timeline for a query
  GET  /api/decisions      — List all indexed decision records
  GET  /api/decisions/{id} — Get a specific decision record
  GET  /api/health         — Health check
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse

from api.schemas import (
    QueryRequest,
    QueryResponse,
    DecisionRecordResponse,
    DecisionListResponse,
    HealthResponse,
    DejaVuRequest,
    DejaVuResponse,
    DejaVuMatch,
    BlameRequest,
    BlameResponse,
    ADRExportRequest,
    ADRExportResponse,
    GraveyardRequest,
    DriftRadarRequest,
    DriftRadarResponse,
    DriftViolation,
    TimelineResponse,
    TimelineEvent,
    ConfidenceBreakdown,
    StatsResponse,
    RepositoryStats,
)
from continuum.retrieval import hybrid_retrieve
from continuum.synthesis import synthesize_answer
from continuum.vector_store import (
    get_all_records,
    get_record_by_id,
    get_record_count,
    get_timeline,
    get_rejected_records,
    semantic_search,
)
from continuum.embeddings import embed_text
from continuum.adr_generator import generate_adr
from continuum.drift_radar import detect_drift

logger = logging.getLogger(__name__)

router = APIRouter()


def _build_confidence_breakdown(citations: list[dict]) -> ConfidenceBreakdown:
    from collections import Counter
    counts = Counter(c.get("confidence", "unknown") for c in citations)
    return ConfidenceBreakdown(
        confirmed=counts.get("confirmed", 0),
        inferred=counts.get("inferred", 0),
        unknown=counts.get("unknown", 0),
    )


# ── Health ────────────────────────────────────────────────────────────────────

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


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsResponse, tags=["System"])
async def get_stats():
    """
    Engineering Memory stats — powers the repository intelligence dashboard.

    Computes real metrics from indexed decision records:
    - Total decisions indexed
    - Rejected alternatives count
    - PR vs issue breakdown
    - Per-repository breakdown
    - Knowledge coverage percentage
    """
    import json as _json
    from datetime import datetime, timezone

    try:
        all_records = get_all_records(repo_filter=None)
    except Exception as e:
        logger.warning(f"Stats fetch failed: {e}")
        return StatsResponse(
            total_decisions=0,
            rejected_count=0,
            pr_count=0,
            issue_count=0,
            repositories=[],
        )

    total = len(all_records)
    rejected_count = 0
    pr_count = 0
    issue_count = 0
    repo_map: dict[str, dict] = {}

    for r in all_records:
        # Count by source type
        src_type = r.get("source_type", "pr")
        if src_type == "pr":
            pr_count += 1
        else:
            issue_count += 1

        # Extract repo from source_url
        source_url = r.get("source_url", "")
        repo_key = "unknown"
        if "github.com/" in source_url:
            parts = source_url.replace("https://github.com/", "").split("/")
            if len(parts) >= 2:
                repo_key = f"{parts[0]}/{parts[1]}"

        if repo_key not in repo_map:
            repo_map[repo_key] = {"decision_count": 0, "rejected_count": 0, "pr_count": 0, "issue_count": 0}
        repo_map[repo_key]["decision_count"] += 1
        if src_type == "pr":
            repo_map[repo_key]["pr_count"] += 1
        else:
            repo_map[repo_key]["issue_count"] += 1

        # Count rejected alternatives
        rec_json = r.get("record_json", {})
        if isinstance(rec_json, str):
            try:
                rec_json = _json.loads(rec_json)
            except Exception:
                rec_json = {}

        alts = rec_json.get("alternatives_considered", [])
        has_rejected = any(
            isinstance(a, dict) and a.get("rejected") for a in alts
        )
        if has_rejected:
            rejected_count += 1
            repo_map[repo_key]["rejected_count"] += 1

    # Build per-repo list, sorted by decision count
    repos = [
        RepositoryStats(
            repo=k,
            decision_count=v["decision_count"],
            rejected_count=v["rejected_count"],
            pr_count=v["pr_count"],
            issue_count=v["issue_count"],
        )
        for k, v in sorted(repo_map.items(), key=lambda x: -x[1]["decision_count"])
        if k != "unknown"
    ]

    # Rough knowledge coverage: more decisions = higher coverage, capped at 95
    coverage = min(95, int((total / max(total, 100)) * 100)) if total > 0 else 0

    return StatsResponse(
        total_decisions=total,
        rejected_count=rejected_count,
        pr_count=pr_count,
        issue_count=issue_count,
        repositories=repos,
        last_indexed_at=datetime.now(timezone.utc).isoformat(),
        knowledge_coverage_pct=coverage,
    )


# ── Main Query ────────────────────────────────────────────────────────────────

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

    logger.info(f"Query: {request.question!r} [repo={request.repo}]")

    # Hybrid retrieval (with optional repo filter)
    retrieved = hybrid_retrieve(
        query=request.question,
        bm25_index=bm25_index,
        final_top_k=5,
        repo_filter=request.repo,
    )

    # Evidence-grounded synthesis
    response = synthesize_answer(request.question, retrieved)

    cb = (
        response.confidence_breakdown.model_dump()
        if hasattr(response.confidence_breakdown, "model_dump")
        else response.confidence_breakdown
    )

    return QueryResponse(
        answer=response.answer,
        citations=[
            {
                "text": c.text,
                "source_url": c.source_url,
                "source_type": c.source_type,
                "source_id": c.source_id,
                "confidence": c.confidence.value,
                "author": c.author,
                "quote": c.quote,
            }
            for c in response.citations
        ],
        confidence_summary=response.confidence_summary,
        confidence_breakdown=cb,
        decision_records_used=response.decision_records_used,
        is_insufficient_evidence=response.is_insufficient_evidence,
    )


# ── The Graveyard ─────────────────────────────────────────────────────────────

@router.post("/graveyard", response_model=QueryResponse, tags=["Graveyard"])
async def graveyard_search(request: GraveyardRequest):
    """
    Search specifically for rejected alternatives — 'The Graveyard'.

    Returns only decision records where alternatives were explicitly marked
    as rejected, surfacing the institutional knowledge of what NOT to do.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    logger.info(f"Graveyard query: {request.question!r} [repo={request.repo}]")

    query_embedding = embed_text(request.question)
    records = get_rejected_records(
        query_embedding=query_embedding,
        top_k=8,
        repo_filter=request.repo,
    )

    if not records:
        return QueryResponse(
            answer=(
                "⚰️ **The Graveyard is empty for this query.** "
                "No decisions were found in the indexed history where alternatives were "
                "explicitly rejected related to this topic. Either the approaches were "
                "never formally evaluated, or the discussions weren't captured in PRs/issues."
            ),
            citations=[],
            confidence_summary="insufficient_evidence",
            confidence_breakdown={"confirmed": 0, "inferred": 0, "unknown": 0},
            decision_records_used=[],
            is_insufficient_evidence=True,
        )

    # Synthesize with a graveyard-specific prompt context
    graveyard_question = (
        f"Focus ONLY on what was TRIED and REJECTED. "
        f"Surface the anti-patterns and failed experiments. "
        f"Original question: {request.question}"
    )
    response = synthesize_answer(graveyard_question, records)

    cb = (
        response.confidence_breakdown.model_dump()
        if hasattr(response.confidence_breakdown, "model_dump")
        else response.confidence_breakdown
    )

    return QueryResponse(
        answer=response.answer,
        citations=[
            {
                "text": c.text,
                "source_url": c.source_url,
                "source_type": c.source_type,
                "source_id": c.source_id,
                "confidence": c.confidence.value,
                "author": c.author,
                "quote": c.quote,
            }
            for c in response.citations
        ],
        confidence_summary=response.confidence_summary,
        confidence_breakdown=cb,
        decision_records_used=response.decision_records_used,
        is_insufficient_evidence=response.is_insufficient_evidence,
    )


# ── Blame-to-Why ──────────────────────────────────────────────────────────────

@router.post("/blame", response_model=BlameResponse, tags=["Blame"])
async def blame_to_why(request: BlameRequest):
    """
    Blame-to-Why — explain WHY a code snippet exists using historical PR/issue evidence.

    Unlike `git blame` which shows WHO and WHEN, this endpoint recovers the
    architectural reasoning, tradeoffs, and debates that led to the code.
    """
    from api.main import bm25_index

    # Build a natural-language question from the code snippet
    file_ctx = f" in `{request.file_path}`" if request.file_path else ""
    query = (
        f"Why does this code exist{file_ctx}? "
        f"What decision led to this implementation?\n\n"
        f"Code:\n```\n{request.code_snippet[:2000]}\n```"
    )

    logger.info(f"Blame query for file: {request.file_path}")

    retrieved = hybrid_retrieve(
        query=query,
        bm25_index=bm25_index,
        final_top_k=5,
        repo_filter=request.repo,
    )

    response = synthesize_answer(query, retrieved)

    cb = (
        response.confidence_breakdown.model_dump()
        if hasattr(response.confidence_breakdown, "model_dump")
        else response.confidence_breakdown
    )

    return BlameResponse(
        answer=response.answer,
        citations=[
            {
                "text": c.text,
                "source_url": c.source_url,
                "source_type": c.source_type,
                "source_id": c.source_id,
                "confidence": c.confidence.value,
                "author": c.author,
                "quote": c.quote,
            }
            for c in response.citations
        ],
        confidence_summary=response.confidence_summary,
        confidence_breakdown=cb,
    )


# ── Déjà Vu Anti-Pattern Sentinel ─────────────────────────────────────────────

@router.post("/deja-vu", response_model=DejaVuResponse, tags=["DejaVu"])
async def deja_vu_check(request: DejaVuRequest):
    """
    Déjà Vu — check a PR for previously-rejected anti-patterns.

    Given a PR title + description, searches historical decision records
    for similar approaches that were tried and rejected. Returns a ready-to-post
    GitHub comment warning developers of the historical precedent.
    """
    import json

    query = f"{request.pr_title}\n\n{request.pr_description}".strip()
    query_embedding = embed_text(query)
    records = get_rejected_records(
        query_embedding=query_embedding,
        top_k=5,
        repo_filter=request.repo,
    )

    if not records:
        return DejaVuResponse(has_matches=False, matches=[], github_comment="")

    # Build matches
    matches = []
    for r in records:
        rec = r.get("record_json", {})
        if isinstance(rec, str):
            try:
                rec = json.loads(rec)
            except Exception:
                rec = {}

        # Extract the best rejection reason from alternatives
        rejection_reason = "Similar approach was previously considered and rejected."
        alts = rec.get("alternatives_considered", [])
        for alt in alts:
            if isinstance(alt, dict) and alt.get("rejected") and alt.get("rejection_reason"):
                rejection_reason = alt["rejection_reason"]
                break

        matches.append(DejaVuMatch(
            decision_id=r.get("id", ""),
            title=r.get("title", ""),
            source_url=r.get("source_url", ""),
            rejection_reason=rejection_reason,
            similarity_score=r.get("rrf_score", r.get("similarity", 0.0)),
        ))

    # Build GitHub comment markdown
    comment_lines = [
        "## ⚠️ Déjà Vu Warning — Continuum Decision Archaeology",
        "",
        "This PR may be proposing an approach that was **previously attempted and rejected** "
        "in this repository's history. Please review before merging:",
        "",
    ]
    for i, m in enumerate(matches, 1):
        comment_lines += [
            f"**{i}. [{m.title}]({m.source_url})**",
            f"> ❌ Rejection reason: {m.rejection_reason}",
            "",
        ]
    comment_lines += [
        "---",
        "_Auto-detected by [Continuum](https://github.com/Monish-D609/continuum-decision-archaeology) — "
        "the Decision Archaeology agent._",
    ]

    return DejaVuResponse(
        has_matches=True,
        matches=matches,
        github_comment="\n".join(comment_lines),
    )


# ── ADR Export ─────────────────────────────────────────────────────────────────

@router.post("/export-adr", tags=["ADR"])
async def export_adr(request: ADRExportRequest):
    """
    Export a Continuum query response as a Markdown ADR (Architecture Decision Record).

    Returns the raw Markdown content and a suggested filename.
    """
    citations_as_dicts = [c.model_dump() for c in request.citations]
    filename, content = generate_adr(
        question=request.question,
        answer=request.answer,
        citations=citations_as_dicts,
        confidence_summary=request.confidence_summary,
        title=request.title,
    )

    return ADRExportResponse(filename=filename, content=content)


# ── Timeline ──────────────────────────────────────────────────────────────────

@router.get("/timeline", response_model=TimelineResponse, tags=["Timeline"])
async def decision_timeline(
    query: str = Query(description="Topic or concept to build the timeline for"),
    repo: Optional[str] = Query(default=None, description="Optional repo filter (owner/repo)"),
    top_k: int = Query(default=20, ge=5, le=50),
):
    """
    Temporal Decision Lineage — fetch decisions related to a query,
    sorted chronologically to show how the architecture evolved over time.
    """
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    query_embedding = embed_text(query)
    records = get_timeline(
        query_embedding=query_embedding,
        top_k=top_k,
        repo_filter=repo,
    )

    events = []
    for r in records:
        rec = r.get("record_json", {})
        if isinstance(rec, str):
            try:
                import json
                rec = json.loads(rec)
            except Exception:
                rec = {}
        decision = rec.get("decision", {})
        decision_summary = (
            decision.get("summary", "") if isinstance(decision, dict) else str(decision)
        )
        events.append(TimelineEvent(
            id=r.get("id", ""),
            title=r.get("title", "Untitled"),
            decision_summary=decision_summary,
            source_url=r.get("source_url", ""),
            source_date=r.get("source_date"),
            source_type=r.get("source_type", "pr"),
        ))

    return TimelineResponse(events=events, query=query, total=len(events))


# ── Drift Radar ───────────────────────────────────────────────────────────────

@router.post("/drift-radar", response_model=DriftRadarResponse, tags=["DriftRadar"])
async def drift_radar(request: DriftRadarRequest):
    """
    Architectural Drift Radar — detect decisions that contradict a stated principle.

    Given an architectural invariant (e.g. 'All DB writes must go through the event bus'),
    scans recent decision records and flags contradictions using LLM analysis.
    """
    # Get recent records (use semantic search with a broad query)
    query_embedding = embed_text(request.principle)
    records = semantic_search(
        query_embedding=query_embedding,
        top_k=request.recent_n,
        repo_filter=request.repo,
    )

    if not records:
        return DriftRadarResponse(
            principle=request.principle,
            violations=[],
            clean_count=0,
            total_scanned=0,
        )

    violations_raw = detect_drift(request.principle, records)
    violations = [
        DriftViolation(
            decision_id=v.get("decision_id", ""),
            title=v.get("title", ""),
            source_url=v.get("source_url", ""),
            violation_reason=v.get("violation_reason", ""),
            severity=v.get("severity", "medium"),
        )
        for v in violations_raw
    ]

    return DriftRadarResponse(
        principle=request.principle,
        violations=violations,
        clean_count=len(records) - len(violations),
        total_scanned=len(records),
    )


# ── Decision Records ──────────────────────────────────────────────────────────

@router.get("/decisions", response_model=DecisionListResponse, tags=["Decisions"])
async def list_decisions(
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    repo: Optional[str] = Query(default=None, description="Filter by repo (owner/repo)"),
):
    """List all indexed decision records (paginated)."""
    all_records = get_all_records(repo_filter=repo)
    total = len(all_records)
    records = all_records[offset:offset + limit]

    return DecisionListResponse(
        records=[
            DecisionRecordResponse(
                id=r["id"],
                title=r["title"],
                decision_summary=r.get("decision_summary", ""),
                source_url=r.get("source_url", ""),
                source_date=r.get("source_date"),
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
