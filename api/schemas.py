"""
API request/response schemas — the stable contract the frontend consumes.

These are separate from the internal models (continuum/models.py) to allow
the API contract to evolve independently of internal data structures.
"""

from __future__ import annotations

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


class CitationResponse(BaseModel):
    """A single citation linking a claim to its GitHub source."""
    text: str = Field(description="The claim being cited")
    source_url: str = Field(description="GitHub URL the user can click to verify")
    source_type: str = Field(description="Type: pr, issue, or commit")
    source_id: str = Field(description="PR/issue number or commit SHA")
    confidence: str = Field(description="Confidence level: confirmed, inferred, or unknown")


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
