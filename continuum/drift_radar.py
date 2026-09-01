"""
Architectural Drift Radar — detects when recent decisions silently violate
a stated architectural principle or invariant.

Given a principle (e.g. "All DB writes must go through the event bus"),
it scans recent decision records and asks the LLM to flag contradictions.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from continuum.llm_client import LLMClient, LLMError

logger = logging.getLogger(__name__)

DRIFT_SYSTEM_PROMPT = """You are an architectural invariant checker for the Continuum decision-archaeology system.

You will be given:
1. An **architectural principle** (a rule the team wants to maintain)
2. A list of **decision records** extracted from the repo's GitHub history

Your job: identify which decisions CONTRADICT or VIOLATE the stated principle.

For each violation, output:
- decision_id: the record's id
- title: the decision title
- source_url: the source URL
- violation_reason: a clear, specific explanation of HOW it contradicts the principle
- severity: "high" (direct, clear violation), "medium" (partial or indirect), "low" (minor concern)

OUTPUT FORMAT (valid JSON array only, no prose):
[
  {
    "decision_id": "...",
    "title": "...",
    "source_url": "...",
    "violation_reason": "...",
    "severity": "high|medium|low"
  }
]

If NO decisions violate the principle, return an empty array: []
Do NOT invent violations. Only flag clear contradictions with evidence in the records."""


def detect_drift(
    principle: str,
    records: list[dict],
    llm: Optional[LLMClient] = None,
) -> list[dict]:
    """
    Scan a list of decision records for contradictions against a given principle.

    Args:
        principle: The architectural rule to enforce.
        records: List of decision record dicts (from vector_store).
        llm: Optional shared LLMClient instance.

    Returns:
        List of violation dicts with keys: decision_id, title, source_url,
        violation_reason, severity.
    """
    if not records:
        return []

    own_llm = llm is None
    if own_llm:
        llm = LLMClient()

    try:
        records_text = _format_records(records)

        messages = [
            {"role": "system", "content": DRIFT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"ARCHITECTURAL PRINCIPLE:\n{principle}\n\n"
                    f"DECISION RECORDS TO SCAN:\n{records_text}"
                ),
            },
        ]

        try:
            response = llm.complete(messages, temperature=0.1, max_tokens=4096, require_json=True)
        except LLMError as e:
            logger.error(f"LLM error during drift detection: {e}")
            return []

        return _parse_violations(response, records)

    finally:
        if own_llm:
            llm.close()


def _format_records(records: list[dict]) -> str:
    """Format decision records for the drift detection prompt."""
    parts = []
    for i, r in enumerate(records, 1):
        rec = r.get("record_json", r)
        if isinstance(rec, str):
            try:
                rec = json.loads(rec)
            except json.JSONDecodeError:
                rec = r

        decision = rec.get("decision", {})
        if isinstance(decision, dict):
            decision_text = decision.get("summary", "")
        else:
            decision_text = str(decision)

        alts = rec.get("alternatives_considered", [])
        alt_text = ""
        for alt in alts:
            if isinstance(alt, dict) and alt.get("rejected"):
                alt_text += f"\n  - Rejected: {alt.get('option', '')} — {alt.get('rejection_reason', 'no reason')}"

        parts.append(
            f"[{i}] ID: {r.get('id', rec.get('decision_id', 'unknown'))}\n"
            f"    Title: {r.get('title', rec.get('title', 'Untitled'))}\n"
            f"    Source: {r.get('source_url', '')}\n"
            f"    Decision: {decision_text}"
            + (f"\n  Rejected alternatives:{alt_text}" if alt_text else "")
        )

    return "\n\n".join(parts)


def _parse_violations(raw: str, records: list[dict]) -> list[dict]:
    """Parse the LLM's JSON response into a list of violation dicts."""
    import re

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
        return []
    except json.JSONDecodeError:
        # Try to extract JSON array
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
                return parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                pass

    logger.warning("Could not parse drift radar response as JSON")
    return []
