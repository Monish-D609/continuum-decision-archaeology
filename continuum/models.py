"""
Pydantic models for Continuum's decision records.

These mirror the decision-extraction skill schema exactly — see
.claude/decision-extraction/SKILL.md for the authoritative spec.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    """How confident we are about a claim — mandatory on every field."""
    CONFIRMED = "confirmed"  # Directly stated in the source artifact
    INFERRED = "inferred"    # Reasonably deduced but not explicitly stated
    UNKNOWN = "unknown"      # No supporting evidence found


class Alternative(BaseModel):
    """An alternative approach that was considered (or is the selected approach)."""
    option: str = Field(description="Description of the alternative approach")
    status: ConfidenceLevel = Field(description="Confidence that this alternative was actually considered")
    rejected: bool = Field(description="Whether this alternative was rejected")
    rejection_reason: Optional[str] = Field(
        default=None,
        description="Why it was rejected, or null if not rejected"
    )
    rejection_reason_status: ConfidenceLevel = Field(
        default=ConfidenceLevel.UNKNOWN,
        description="Confidence in the rejection reason"
    )


class Evidence(BaseModel):
    """A piece of evidence supporting a claim in the decision record."""
    quote_or_paraphrase: str = Field(
        description="Short paraphrase of the evidence (not verbatim beyond a few words)"
    )
    source: str = Field(description="PR/issue/commit URL or ID")
    status: ConfidenceLevel = Field(description="Confidence in this evidence")


class Relationship(BaseModel):
    """Relationships between decision records (supersedes, related_to, etc.)."""
    supersedes: list[str] = Field(default_factory=list)
    superseded_by: list[str] = Field(default_factory=list)
    related_to: list[str] = Field(default_factory=list)


class SourceArtifact(BaseModel):
    """A GitHub artifact that this decision record was extracted from."""
    type: str = Field(description="pr, issue, or commit")
    id: str = Field(description="PR/issue number or commit SHA")
    url: str = Field(description="Full GitHub URL")


class DecisionRecord(BaseModel):
    """
    A single decision unit — the atomic unit Continuum embeds, retrieves,
    and cites. Produced by the decision-extraction skill from a single
    PR thread, issue thread, or commit.
    """
    decision_id: str = Field(description="Stable ID, e.g. repo-slug/pr-123")
    title: str = Field(description="Short, one-line description of the decision")
    status: ConfidenceLevel = Field(
        description="Overall confidence that a decision actually occurred here"
    )
    decision: DecisionSummary = Field(description="What was decided")
    alternatives_considered: list[Alternative] = Field(
        default_factory=list,
        description="Alternatives that were considered"
    )
    evidence: list[Evidence] = Field(
        default_factory=list,
        description="Evidence supporting the claims"
    )
    relationships: Relationship = Field(
        default_factory=Relationship,
        description="Relationships to other decision records"
    )
    source_artifacts: list[SourceArtifact] = Field(
        default_factory=list,
        description="The GitHub artifacts this record was extracted from"
    )


class DecisionSummary(BaseModel):
    """What was decided, in plain language."""
    summary: str = Field(description="Plain-language summary of the decision")
    status: ConfidenceLevel = Field(description="Confidence that this is what was decided")


# Rebuild DecisionRecord to resolve forward reference
DecisionRecord.model_rebuild()


# ── Query / Response models (used by the API) ────────────────────────────────

class QueryRequest(BaseModel):
    """A user's natural-language question."""
    question: str = Field(description="The user's question about a past decision")


class Citation(BaseModel):
    """A citation linking a claim to its source."""
    text: str = Field(description="The claim being cited")
    source_url: str = Field(description="GitHub URL for verification")
    source_type: str = Field(description="pr, issue, or commit")
    source_id: str = Field(description="PR/issue number or commit SHA")
    confidence: ConfidenceLevel = Field(description="Confidence level of this claim")


class QueryResponse(BaseModel):
    """The system's response to a user query — always citation-grounded."""
    answer: str = Field(description="The synthesized answer with inline citations")
    citations: list[Citation] = Field(
        default_factory=list,
        description="All citations referenced in the answer"
    )
    confidence_summary: str = Field(
        description="Overall assessment: strong evidence, partial evidence, or insufficient evidence"
    )
    decision_records_used: list[str] = Field(
        default_factory=list,
        description="IDs of decision records that contributed to this answer"
    )
    is_insufficient_evidence: bool = Field(
        default=False,
        description="True if the system found insufficient evidence to answer"
    )
