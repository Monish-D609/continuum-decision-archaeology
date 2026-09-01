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

SYNTHESIS_SYSTEM_PROMPT = """You are Continuum — the specialized Decision Archaeology and Engineering Institutional Memory system.

Your mission is NOT to act like a generic AI chatbot or textbook. You are an **engineering archaeologist and architectural forensic investigator** unearthing the hidden history, human debates, rejected anti-patterns, and architectural crossroads of this codebase.

## CORE ARCHAEOLOGICAL PHILOSOPHY:
- Code shows WHAT was built. Git log shows WHEN it changed. **Continuum unearths WHY.**
- You treat GitHub PRs, issues, and commit discussions as **primary historical artifacts**.
- You reconstruct the high-stakes architectural drama: the crisis that forced change, the discarded alternatives in the "Graveyard", the maintainer debates, and the lasting architectural invariants.

## REQUIRED ANSWER STRUCTURE (Use these exact markdown sections):

Your answer MUST follow this structured, forensic excavation format:

### 🏛️ Archaeological Context & The Problem Stratum
Set the historical scene. What was the exact state and pain point of the codebase prior to this decision? What architectural bottleneck or friction forced the engineering team to act? Cite the originating issue/discussion ([Issue #N](url) or [PR #N](url)).

### 📜 The Core Decision & Author Rationale
Excavate the primary thesis settled upon. Explain the deep technical reasoning — not just surface features. Highlight the authors (@username) and quote their core arguments directly where recorded. Clearly distinguish between **[CONFIRMED]** statements (explicitly stated in records) and **[INFERRED]** rationales (deduced from commit topography and review debates).

### ⚰️ The Graveyard: Discarded Alternatives & Tradeoffs
Detail the roads not taken. What other patterns, libraries, or architectural prototypes were proposed, evaluated, and rejected? Why did the team reject them? (e.g., wrapper hell, performance overhead, naming collisions, cognitive burden).

### 🧬 Architectural Drift & Historical Legacy
Trace what happened after this decision landed. How did this choice reshape the repository's trajectory? Did subsequent pull requests adhere to this principle, or has architectural drift occurred over time?

## STRICT CITATION & INTEGRITY MANDATES:
1. Every factual claim MUST carry an inline markdown citation to its primary artifact: `[PR #N](url)` or `[Issue #N](url)`.
2. Explicitly cite author usernames when available from the artifacts (e.g. `as noted by @gaearon in [PR #13795]...`).
3. Preserve confidence levels honestly in your language:
   - "Confirmed": State as historical fact supported by direct record.
   - "Inferred": Explicitly qualify as archaeological inference based on diffs/comments.
4. If records are sparse, explicitly state the archaeological boundary: "The indexed stratum contains limited records for this transition; the primary evidence centers on [PR #N]."

## RESPONSE FORMAT:
Return a single JSON object with this exact structure:
{
  "answer": "<your complete archaeological excavation report in Markdown using the sections above>",
  "citations": [
    {
      "text": "<the specific claim being cited>",
      "source_url": "<GitHub URL>",
      "source_type": "pr|issue|commit",
      "source_id": "<number or SHA>",
      "confidence": "confirmed|inferred|unknown",
      "author": "<GitHub username, or null>",
      "quote": "<short verbatim or near-verbatim quote (max 150 chars), or null>"
    }
  ],
  "confidence_summary": "strong_evidence|partial_evidence|insufficient_evidence",
  "is_insufficient_evidence": true|false
}

Output valid JSON only — no markdown fences around the JSON, no extra text outside the JSON object."""


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


def _fix_json_strings(text: str) -> str:
    """Escape literal newlines/tabs inside JSON string values without a full parser."""
    result: list[str] = []
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            result.append(ch)
            escape_next = False
            continue
        if ch == '\\':
            result.append(ch)
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
            continue
        if in_string:
            if ch == '\n':
                result.append('\\n')
                continue
            if ch == '\r':
                result.append('\\r')
                continue
            if ch == '\t':
                result.append('\\t')
                continue
        result.append(ch)
    return ''.join(result)


def _extract_prose_before_json(raw: str) -> str:
    """
    Extract the prose answer the LLM wrote BEFORE any JSON code block.
    Falls back to stripping the JSON block from the tail of the response.
    """
    import re
    # Find the first occurrence of a JSON fence or lone '{'  at the start of a line
    fence_idx = raw.find('```json')
    if fence_idx == -1:
        fence_idx = raw.find('```')
    # Also look for lines that start with '{'  and contain '"answer"' or '"citations"'
    block_match = re.search(r'\n\s*\{[^\n]*"(?:answer|citations)"', raw)
    if block_match:
        fence_idx = block_match.start() if fence_idx == -1 else min(fence_idx, block_match.start())

    if fence_idx > 80:
        prose = raw[:fence_idx].strip()
        # Strip trailing instruction echoes AND citations section
        for stop_phrase in [
            '## Strict', '## Response Format', '## Response',
            'Output valid JSON', 'Citations:', '## Citations', '### Citations',
        ]:
            idx = prose.lower().find(stop_phrase.lower())
            if idx != -1:
                prose = prose[:idx].strip()
        return prose

    # Fallback: strip any JSON fences from the full text
    return re.sub(r'```(?:json)?\s*\{[\s\S]*?\}\s*```', '', raw, flags=re.DOTALL).strip()


def _strip_answer_citations(answer: str) -> str:
    """
    Remove any 'Citations:' section the LLM embedded inside the answer string,
    and strip bullet lines that are raw JSON citation objects.
    """
    import re
    # Cut at Citations: heading (case-insensitive)
    for trigger in ['citations:', '## citations', '### citations', '**citations**']:
        idx = answer.lower().find(trigger)
        if idx != -1:
            answer = answer[:idx].strip()
            break

    # Strip bullet lines that are raw JSON objects
    cleaned_lines = []
    for line in answer.split('\n'):
        t = line.strip()
        is_json_bullet = (
            (t.startswith('- {') or t.startswith('* {') or t.startswith('{ "'))
            and any(k in t for k in ('"text"', '"source_url"', '"confidence"', '"source_type"'))
        )
        if not is_json_bullet:
            cleaned_lines.append(line)
    return '\n'.join(cleaned_lines).strip()


def _parse_synthesis_response(raw: str, records: list[dict]) -> QueryResponse:
    """Parse the LLM's JSON response into a QueryResponse."""
    import re

    cleaned = raw.strip()
    parsed = None

    # --- Attempt 1: direct parse ---
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # --- Attempt 2: fix literal newlines then parse directly ---
    if not parsed:
        try:
            parsed = json.loads(_fix_json_strings(cleaned))
        except json.JSONDecodeError:
            pass

    # --- Attempt 3: extract from ```json ... ``` code fence ---
    if not parsed:
        fence_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', raw, re.DOTALL)
        if fence_match:
            candidate = fence_match.group(1)
            for attempt in (candidate, _fix_json_strings(candidate)):
                try:
                    parsed = json.loads(attempt)
                    break
                except json.JSONDecodeError:
                    pass

    # --- Attempt 4: first '{' to last '}' with newline fix ---
    if not parsed:
        first_brace = cleaned.find('{')
        last_brace = cleaned.rfind('}')
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            candidate = cleaned[first_brace:last_brace + 1]
            for attempt in (candidate, _fix_json_strings(candidate)):
                try:
                    parsed = json.loads(attempt)
                    break
                except json.JSONDecodeError:
                    pass

    # --- Fallback: no valid JSON; return prose-only answer cleanly ---
    if not parsed or not isinstance(parsed, dict):
        logger.warning("Could not parse synthesis response as JSON; extracting prose answer")
        prose = _extract_prose_before_json(raw)
        if not prose:
            prose = raw.strip()
        prose = _strip_answer_citations(prose)
        return QueryResponse(
            answer=prose,
            citations=[],
            confidence_summary="partial_evidence",
            decision_records_used=[r.get("id", "") for r in records if r.get("id")],
            is_insufficient_evidence=False,
        )

    # --- Build citations ---
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

    # --- Build confidence breakdown ---
    conf_counts = Counter(c.confidence.value for c in citations)
    from continuum.models import ConfidenceBreakdown
    breakdown = ConfidenceBreakdown(
        confirmed=conf_counts.get("confirmed", 0),
        inferred=conf_counts.get("inferred", 0),
        unknown=conf_counts.get("unknown", 0),
    )

    return QueryResponse(
        answer=_strip_answer_citations(parsed.get("answer", raw)),
        citations=citations,
        confidence_summary=parsed.get("confidence_summary", "partial_evidence"),
        confidence_breakdown=breakdown,
        decision_records_used=[r.get("id", "") for r in records if r.get("id")],
        is_insufficient_evidence=parsed.get("is_insufficient_evidence", False),
    )
