"""
Evidence-grounded synthesis — generates user-facing answers from
retrieved decision records, following the evidence-grounded-synthesis
skill exactly.

See .claude/evidence-grounded-synthesis/SKILL.md for the spec.

Every factual claim must trace to a specific retrieved record.
Every claim must carry its citation (PR/issue/commit link).
Confidence labels must be preserved in the answer's tone.
Insufficient evidence triggers an honest gap response.
"""

from __future__ import annotations

import json
import logging
from typing import Optional
from collections import Counter

from continuum.llm_client import LLMClient, LLMError
from continuum.models import QueryResponse, Citation, ConfidenceLevel

logger = logging.getLogger(__name__)

SYNTHESIS_SYSTEM_PROMPT = """You are the Continuum Decision Archaeology assistant — a senior engineering historian who deeply understands software architecture, open-source project history, and the human dynamics behind technical decisions.

Your role is to answer the user's question in a **rich, conversational, multi-paragraph narrative**, as if you are a knowledgeable colleague sitting across the table explaining a decision in depth — not a search engine returning a snippet.

## ANSWER STYLE REQUIREMENTS (non-negotiable):

1. **LENGTH**: Your answer MUST be at least 4–6 paragraphs. Never give a one-liner. The user deserves a thorough explanation.

2. **NARRATIVE STRUCTURE**: Structure your answer like a compelling story:
   - **Opening paragraph**: Set the context — what was the situation before this decision? What problem was being solved?
   - **Core reasoning**: Walk through the actual technical and organizational reasoning in depth. Explain the WHY, not just the WHAT.
   - **Tradeoffs & alternatives**: What other approaches were considered? What were their pros and cons? Why were they rejected?
   - **Consequences**: What happened as a result of this decision? How did it shape the architecture going forward?
   - **Historical nuance**: Were there disagreements? Did the decision evolve over time? Were there follow-up changes that amended it?

3. **CONVERSATIONAL TONE**: Write like a thoughtful senior engineer or technical historian, not a documentation bot. Use natural language. Say "The team realized..." or "Interestingly, the original proposal actually went in the opposite direction..." — bring the decision to life.

4. **INLINE CITATIONS**: Every factual claim must carry its citation inline as a markdown link — [PR #N](url) or [Issue #N](url). Citations should feel naturally woven into the prose, not bolted on at the end.

5. **CONFIDENCE HONESTY**:
   - "confirmed" claims: state directly ("X was chosen because Y")
   - "inferred" claims: flag naturally ("Based on the discussion in [PR #N], it appears that..." or "Reading between the lines of [Issue #N]...")
   - NEVER dress up an "inferred" claim as if it were "confirmed"

6. **SURFACE CONFLICTS AND EVOLUTION**: If decisions changed or records conflict, call that out explicitly — "This was originally designed as X in [PR #A], but the team reversed course in [PR #B] because..."

7. **INSUFFICIENT EVIDENCE**: If the evidence is thin, say so honestly — but still explain what you *do* know from the available records, what questions remain unanswered, and what the user could look at to dig deeper.

## STRICT CITATION RULES:
- Every factual claim must trace to a specific retrieved record. Do NOT invent reasoning not present in the records.
- Do NOT pad with plausible-sounding guesses if evidence is missing.

## RESPONSE FORMAT:
Return a single JSON object with this exact structure:
{
  "answer": "<your synthesized multi-paragraph answer with inline citations in markdown link format>",
  "citations": [
    {
      "text": "<the specific claim being cited>",
      "source_url": "<GitHub URL>",
      "source_type": "pr|issue|commit",
      "source_id": "<number or SHA>",
      "confidence": "confirmed|inferred|unknown",
      "author": "<GitHub username of the person who made this statement, or null if unknown>",
      "quote": "<short verbatim or near-verbatim quote (max 150 chars) from the source, or null if no clear quote>"
    }
  ],
  "confidence_summary": "strong_evidence|partial_evidence|insufficient_evidence",
  "is_insufficient_evidence": true|false
}

Output valid JSON only — no markdown fences, no explanation outside the JSON object."""


def _format_records_for_prompt(records: list[dict]) -> str:
    """Format retrieved decision records into a readable prompt section."""
    parts = []
    for i, record in enumerate(records, 1):
        rec = record.get("record_json", record)
        if isinstance(rec, str):
            try:
                rec = json.loads(rec)
            except json.JSONDecodeError:
                rec = record

        parts.append(f"--- Record {i} ---")
        parts.append(f"Decision ID: {rec.get('decision_id', 'unknown')}")
        parts.append(f"Title: {rec.get('title', 'Untitled')}")

        decision = rec.get("decision", {})
        if isinstance(decision, dict):
            parts.append(f"Decision: {decision.get('summary', 'N/A')} [{decision.get('status', 'unknown')}]")

        for alt in rec.get("alternatives_considered", []):
            if isinstance(alt, dict):
                status = "rejected" if alt.get("rejected") else "selected"
                parts.append(
                    f"Alternative ({status}): {alt.get('option', '')} "
                    f"[{alt.get('status', 'unknown')}]"
                )
                if alt.get("rejection_reason"):
                    parts.append(
                        f"  Rejection reason: {alt['rejection_reason']} "
                        f"[{alt.get('rejection_reason_status', 'unknown')}]"
                    )

        for ev in rec.get("evidence", []):
            if isinstance(ev, dict):
                parts.append(
                    f"Evidence: {ev.get('quote_or_paraphrase', '')} "
                    f"(source: {ev.get('source', 'unknown')}) [{ev.get('status', 'unknown')}]"
                )

        for sa in rec.get("source_artifacts", []):
            if isinstance(sa, dict):
                parts.append(f"Source: [{sa.get('type', '')} #{sa.get('id', '')}]({sa.get('url', '')})")

        # Include retrieval scores for context
        if "similarity" in record:
            parts.append(f"Semantic similarity: {record['similarity']:.3f}")
        if "bm25_score" in record:
            parts.append(f"BM25 score: {record['bm25_score']:.3f}")
        if "rrf_score" in record:
            parts.append(f"Combined RRF score: {record['rrf_score']:.3f}")

        parts.append("")

    return "\n".join(parts)


def synthesize_answer(
    question: str,
    retrieved_records: list[dict],
    llm: Optional[LLMClient] = None,
) -> QueryResponse:
    """
    Generate a citation-grounded answer from retrieved decision records.

    Implements the evidence-grounded-synthesis skill:
    - Every claim cites its source
    - Confidence levels are preserved in tone
    - Insufficient evidence triggers honest gap response
    """
    own_llm = llm is None
    if own_llm:
        llm = LLMClient()

    try:
        # Handle the case where retrieval found nothing
        if not retrieved_records:
            return QueryResponse(
                answer=(
                    "I don't have any evidence in the indexed decision history that addresses "
                    "this question. The repository's indexed PRs and issues don't appear to "
                    "contain discussion about this topic."
                ),
                citations=[],
                confidence_summary="insufficient_evidence",
                decision_records_used=[],
                is_insufficient_evidence=True,
            )

        formatted_records = _format_records_for_prompt(retrieved_records)

        messages = [
            {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"QUESTION: {question}\n\n"
                    f"RETRIEVED DECISION RECORDS:\n{formatted_records}"
                ),
            },
        ]

        try:
            response = llm.complete(messages, temperature=0.4, max_tokens=8192)
        except LLMError as e:
            logger.error(f"All LLMs failed during synthesis: {e}")
            return QueryResponse(
                answer="I was unable to generate an answer due to a service error. Please try again.",
                citations=[],
                confidence_summary="insufficient_evidence",
                decision_records_used=[],
                is_insufficient_evidence=True,
            )

        # Parse the response
        return _parse_synthesis_response(response, retrieved_records)

    finally:
        if own_llm:
            llm.close()


def _parse_synthesis_response(raw: str, records: list[dict]) -> QueryResponse:
    """Parse the LLM's JSON response into a QueryResponse."""
    import re

    # Strip any markdown code fences
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to extract JSON from the response
        json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
            except json.JSONDecodeError:
                # Fallback: treat the whole response as the answer
                logger.warning("Could not parse synthesis response as JSON, using raw text")
                return QueryResponse(
                    answer=raw,
                    citations=[],
                    confidence_summary="partial_evidence",
                    decision_records_used=[
                        r.get("id", "") for r in records if r.get("id")
                    ],
                    is_insufficient_evidence=False,
                )
        else:
            return QueryResponse(
                answer=raw,
                citations=[],
                confidence_summary="partial_evidence",
                decision_records_used=[
                    r.get("id", "") for r in records if r.get("id")
                ],
                is_insufficient_evidence=False,
            )

    # Build citations
    citations = []
    for c in parsed.get("citations", []):
        try:
            citations.append(Citation(
                text=c.get("text", ""),
                source_url=c.get("source_url", ""),
                source_type=c.get("source_type", "pr"),
                source_id=str(c.get("source_id", "")),
                confidence=ConfidenceLevel(c.get("confidence", "unknown")),
                author=c.get("author"),
                quote=c.get("quote"),
            ))
        except Exception as e:
            logger.warning(f"Failed to parse citation: {e}")

    # Build confidence breakdown
    conf_counts = Counter(c.confidence.value for c in citations)
    from continuum.models import ConfidenceBreakdown
    breakdown = ConfidenceBreakdown(
        confirmed=conf_counts.get("confirmed", 0),
        inferred=conf_counts.get("inferred", 0),
        unknown=conf_counts.get("unknown", 0),
    )

    return QueryResponse(
        answer=parsed.get("answer", raw),
        citations=citations,
        confidence_summary=parsed.get("confidence_summary", "partial_evidence"),
        confidence_breakdown=breakdown,
        decision_records_used=[
            r.get("id", "") for r in records if r.get("id")
        ],
        is_insufficient_evidence=parsed.get("is_insufficient_evidence", False),
    )
