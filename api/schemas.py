"""
API request/response schemas — the stable contract the frontend consumes.

These are separate from the internal models (continuum/models.py) to allow
the API contract to evolve independently of internal data structures.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request body for POST /api/query."""
    question: str = Field(
        description="A natural-language question about a past engineering decision. "
        "Best results with 'why' questions — e.g., 'Why is auth handled in the gateway?'",
        min_length=3,
        max_length=1000,
        json_schema_extra={"examples": ["Why were React Hooks introduced instead of keeping class components?"]},
    )
    repo: Optional[str] = Field(
        default=None,
        description="Optional repo filter in 'owner/repo' format, e.g. 'facebook/react'. "
        "When provided, only decisions from that repository are searched.",
    )
    mode: Optional[str] = Field(
        default="query",
        description="Query mode: 'query' (default) or 'graveyard' (rejected alternatives only).",
    )


class CitationResponse(BaseModel):
    """A single citation linking a claim to its GitHub source."""
    text: str = Field(description="The claim being cited")
    source_url: str = Field(description="GitHub URL the user can click to verify")
    source_type: str = Field(description="Type: pr, issue, or commit")
    source_id: str = Field(description="PR/issue number or commit SHA")
    confidence: str = Field(description="Confidence level: confirmed, inferred, or unknown")
    author: Optional[str] = Field(
        default=None,
        description="GitHub username of the person who made this statement",
    )
    quote: Optional[str] = Field(
        default=None,
        description="Short verbatim or near-verbatim quote from the source",
    )


class ConfidenceBreakdown(BaseModel):
    """Per-claim evidence classification breakdown."""
    confirmed: int = Field(default=0, description="Number of confirmed claims")
    inferred: int = Field(default=0, description="Number of inferred claims")
    unknown: int = Field(default=0, description="Number of unknown/insufficient claims")


class QueryResponse(BaseModel):
    """Response body for POST /api/query — always citation-grounded."""
    answer: str = Field(
        description="The synthesized answer with inline citations. "
        "Every factual claim traces to a specific PR/issue/commit."
    )
    citations: list[CitationResponse] = Field(
        default_factory=list,
        description="All citations referenced in the answer, with verification links"
    )
    confidence_summary: str = Field(
        description="Overall evidence quality: strong_evidence, partial_evidence, or insufficient_evidence"
    )
    confidence_breakdown: ConfidenceBreakdown = Field(
        default_factory=ConfidenceBreakdown,
        description="Per-claim breakdown of confirmed / inferred / unknown citations",
    )
    decision_records_used: list[str] = Field(
        default_factory=list,
        description="IDs of decision records that contributed to this answer"
    )
    is_insufficient_evidence: bool = Field(
        default=False,
        description="True if the system found insufficient evidence — the answer will explicitly state this"
    )


class DecisionRecordResponse(BaseModel):
    """Summary of a decision record for list endpoints."""
    id: str = Field(description="Unique decision record ID")
    title: str = Field(description="One-line description of the decision")
    decision_summary: str = Field(description="Plain-language summary of what was decided")
    source_url: str = Field(description="GitHub source URL")
    source_date: Optional[str] = Field(default=None, description="ISO date of the source PR/issue")


class DecisionListResponse(BaseModel):
    """Paginated list of decision records."""
    records: list[DecisionRecordResponse]
    total: int = Field(description="Total number of records")
    limit: int = Field(description="Max records per page")
    offset: int = Field(description="Current offset")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(description="Service status: healthy or degraded")
    record_count: int = Field(description="Number of indexed decision records")
    message: str = Field(description="Human-readable status message")


# ── Déjà Vu Anti-Pattern Sentinel ─────────────────────────────────────────────

class DejaVuRequest(BaseModel):
    """Request body for POST /api/deja-vu — check a PR for previously-rejected patterns."""
    pr_title: str = Field(
        description="Title of the pull request to check",
        min_length=3,
        max_length=500,
    )
    pr_description: str = Field(
        default="",
        description="Body/description of the pull request",
        max_length=5000,
    )
    repo: Optional[str] = Field(
        default=None,
        description="Repository in 'owner/repo' format to scope the search",
    )


class DejaVuMatch(BaseModel):
    """A single historical match found by the Déjà Vu sentinel."""
    decision_id: str = Field(description="ID of the matching historical decision record")
    title: str = Field(description="Title of the historical decision")
    source_url: str = Field(description="GitHub URL of the original PR/issue")
    rejection_reason: str = Field(description="Why the similar approach was rejected")
    similarity_score: float = Field(description="Relevance score (0–1)")


class DejaVuResponse(BaseModel):
    """Response for POST /api/deja-vu."""
    has_matches: bool = Field(description="True if similar rejected patterns were found")
    matches: list[DejaVuMatch] = Field(
        default_factory=list,
        description="List of similar historical decisions where alternatives were rejected",
    )
    github_comment: str = Field(
        default="",
        description="Ready-to-post GitHub PR comment markdown (populated when has_matches=True)",
    )


# ── Blame-to-Why ───────────────────────────────────────────────────────────────

class BlameRequest(BaseModel):
    """Request body for POST /api/blame — explain the WHY behind a code snippet."""
    code_snippet: str = Field(
        description="The code snippet to explain",
        min_length=10,
        max_length=5000,
    )
    file_path: Optional[str] = Field(
        default=None,
        description="Optional file path for additional context (e.g. 'src/auth/gateway.py')",
    )
    repo: Optional[str] = Field(
        default=None,
        description="Repository in 'owner/repo' format to scope the search",
    )


class BlameResponse(BaseModel):
    """Response for POST /api/blame."""
    answer: str = Field(description="Explanation of why this code exists, with citations")
    citations: list[CitationResponse] = Field(default_factory=list)
    confidence_summary: str = Field(default="insufficient_evidence")
    confidence_breakdown: ConfidenceBreakdown = Field(default_factory=ConfidenceBreakdown)


# ── ADR Export ─────────────────────────────────────────────────────────────────

class ADRExportRequest(BaseModel):
    """Request body for POST /api/export-adr."""
    question: str = Field(description="The original question asked")
    answer: str = Field(description="The synthesized answer")
    citations: list[CitationResponse] = Field(default_factory=list)
    confidence_summary: str = Field(default="partial_evidence")
    title: Optional[str] = Field(default=None, description="Optional ADR title override")


class ADRExportResponse(BaseModel):
    """Response for POST /api/export-adr."""
    filename: str = Field(description="Suggested filename for the ADR file")
    content: str = Field(description="Full Markdown content of the ADR")


# ── Graveyard ─────────────────────────────────────────────────────────────────

class GraveyardRequest(BaseModel):
    """Request body for POST /api/graveyard — search rejected alternatives only."""
    question: str = Field(
        description="A question about what approaches were tried and discarded",
        min_length=3,
        max_length=1000,
    )
    repo: Optional[str] = Field(default=None)


# ── Timeline ─────────────────────────────────────────────────────────────────

class TimelineEvent(BaseModel):
    """A single event in the decision timeline."""
    id: str
    title: str
    decision_summary: str
    source_url: str
    source_date: Optional[str] = None
    source_type: str = "pr"


class TimelineResponse(BaseModel):
    """Response for GET /api/timeline."""
    events: list[TimelineEvent]
    query: str
    total: int


# ── Drift Radar ───────────────────────────────────────────────────────────────

class DriftRadarRequest(BaseModel):
    """Request body for POST /api/drift-radar."""
    principle: str = Field(
        description="An architectural principle or invariant to check against. "
        "E.g. 'All DB mutations must go through the event bus'",
        min_length=10,
        max_length=1000,
    )
    repo: Optional[str] = Field(default=None)
    recent_n: int = Field(
        default=20,
        ge=5,
        le=100,
        description="How many recent decisions to scan",
    )


class DriftViolation(BaseModel):
    """A single detected contradiction against the stated principle."""
    decision_id: str
    title: str
    source_url: str
    violation_reason: str
    severity: str = Field(description="high, medium, or low")


class DriftRadarResponse(BaseModel):
    """Response for POST /api/drift-radar."""
    principle: str
    violations: list[DriftViolation]
    clean_count: int = Field(description="Number of decisions that DON'T violate the principle")
    total_scanned: int


# ── Stats ─────────────────────────────────────────────────────────────────────

class RepositoryStats(BaseModel):
    """Per-repository breakdown for the engineering memory overview."""
    repo: str
    decision_count: int
    rejected_count: int
    pr_count: int
    issue_count: int


class StatsResponse(BaseModel):
    """Response for GET /api/stats — powers the Engineering Memory dashboard."""
    total_decisions: int = Field(description="Total indexed decision records")
    rejected_count: int = Field(description="Records with explicitly rejected alternatives")
    pr_count: int = Field(description="Total pull requests analyzed")
    issue_count: int = Field(description="Total issues analyzed")
    repositories: list[RepositoryStats] = Field(default_factory=list)
    last_indexed_at: Optional[str] = Field(default=None, description="ISO timestamp of last indexing")
    knowledge_coverage_pct: int = Field(default=0, description="Rough decision coverage percentage (0-100)")

