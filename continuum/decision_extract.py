"""
Decision extraction — converts raw GitHub artifacts into structured
decision records following the decision-extraction skill schema.

See .claude/decision-extraction/SKILL.md for the authoritative spec.

Each PR/issue thread is processed into one (or more, if it contains
multiple unrelated decisions) DecisionRecord objects with mandatory
confidence tagging on every field.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Optional

from tqdm import tqdm

from continuum.config import DECISIONS_DIR
from continuum.llm_client import LLMClient, LLMError
from continuum.models import (
    DecisionRecord,
    DecisionSummary,
    Alternative,
    Evidence,
    Relationship,
    SourceArtifact,
    ConfidenceLevel,
)

logger = logging.getLogger(__name__)

# Maximum text length to send to the LLM (free-tier context limits)
MAX_INPUT_CHARS = 12000

EXTRACTION_SYSTEM_PROMPT = """You are a decision-extraction system for the Continuum project.
Your job is to analyze a GitHub PR or issue thread and extract structured decision records.

For each decision found in the thread, output a JSON object with EXACTLY this schema:

{
  "decision_id": "<repo-slug/type-number, e.g. react/pr-1234>",
  "title": "<short, one-line description of the decision>",
  "status": "confirmed|inferred|unknown",
  "decision": {
    "summary": "<what was decided, in plain language>",
    "status": "confirmed|inferred|unknown"
  },
  "alternatives_considered": [
    {
      "option": "<alternative approach>",
      "status": "confirmed|inferred|unknown",
      "rejected": true|false,
      "rejection_reason": "<why rejected, or null>",
      "rejection_reason_status": "confirmed|inferred|unknown"
    }
  ],
  "evidence": [
    {
      "quote_or_paraphrase": "<short paraphrase, not verbatim>",
      "source": "<PR/issue URL>",
      "status": "confirmed|inferred|unknown"
    }
  ],
  "relationships": {
    "supersedes": [],
    "superseded_by": [],
    "related_to": []
  },
  "source_artifacts": [
    {
      "type": "pr|issue|commit",
      "id": "<number or SHA>",
      "url": "<full GitHub URL>"
    }
  ]
}

CRITICAL RULES:
1. CONFIDENCE TAGGING IS MANDATORY on every field that has a status:
   - "confirmed" = explicitly stated in the text by a person
   - "inferred" = reasonably deduced from context, note what it was inferred from
   - "unknown" = no supporting evidence, DO NOT guess
2. If the thread shows THAT something was decided but not WHY, set the reason to null and status to "unknown"
3. Do NOT invent alternatives that were never mentioned
4. Do NOT summarize narratively — extract into the schema
5. If the thread contains NO clear decision, return a record with status "unknown" and a minimal record
6. Output valid JSON only — no markdown formatting, no explanation text

If the thread contains multiple UNRELATED decisions, output a JSON array of records.
If it contains one decision (the common case), output a single JSON object (not an array)."""


def _truncate_thread(text: str, max_chars: int = MAX_INPUT_CHARS) -> str:
    """Truncate a thread to fit within LLM context limits."""
    if len(text) <= max_chars:
        return text
    # Keep the first part (title, description) and last part (recent discussion)
    half = max_chars // 2
    return (
        text[:half]
        + "\n\n[... middle of thread truncated for length ...]\n\n"
        + text[-half:]
    )


def _repair_truncated_json(text: str) -> str:
    """
    Attempt to repair JSON truncated mid-output by the LLM's max_tokens limit.
    Strategy: find the last complete JSON object boundary and close open structures.
    """
    # Count open brackets/braces to determine what needs closing
    stack = []
    last_valid_pos = 0
    in_string = False
    escape_next = False

    for i, ch in enumerate(text):
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"' and not escape_next:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ('{', '['):
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
                if not stack:
                    last_valid_pos = i + 1
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()
                if not stack:
                    last_valid_pos = i + 1

    if not stack:
        return text  # Already valid

    # Truncate to last fully-closed top-level object
    if last_valid_pos > 0:
        truncated = text[:last_valid_pos]
        # If we started with an array, close it
        if text.lstrip().startswith('['):
            # Remove trailing comma if present before closing
            truncated = truncated.rstrip().rstrip(',')
            return truncated + ']'
        return truncated

    return text


def _parse_extraction_response(raw: str, thread: dict) -> list[dict]:
    """Parse the LLM's JSON response into a list of raw decision record dicts."""
    # Strip any markdown code fences
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        cleaned = cleaned.strip()

    # Also strip json language tag without fences
    if cleaned.lower().startswith("json\n"):
        cleaned = cleaned[5:].strip()

    def try_parse(text: str):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None

    parsed = try_parse(cleaned)

    if parsed is None:
        # Try extracting the outermost JSON structure
        json_match = re.search(r'[\[{].*[\]}]', cleaned, re.DOTALL)
        if json_match:
            parsed = try_parse(json_match.group())

    if parsed is None:
        # Try repairing truncated JSON
        repaired = _repair_truncated_json(cleaned)
        parsed = try_parse(repaired)
        if parsed is not None:
            logger.info(f"Repaired truncated JSON for thread #{thread['id']}")

    if parsed is None:
        logger.warning(f"Failed to parse JSON for thread #{thread['id']}: no valid JSON found")
        return []

    if isinstance(parsed, dict):
        return [parsed]
    elif isinstance(parsed, list):
        return [r for r in parsed if isinstance(r, dict)]
    else:
        logger.warning(f"Unexpected response type for thread #{thread['id']}: {type(parsed)}")
        return []



def _raw_to_decision_record(raw: dict) -> Optional[DecisionRecord]:
    """Convert a raw dict from the LLM into a validated DecisionRecord."""
    try:
        # Parse nested objects
        decision_data = raw.get("decision", {})
        decision = DecisionSummary(
            summary=decision_data.get("summary", "No summary provided"),
            status=ConfidenceLevel(decision_data.get("status", "unknown")),
        )

        alternatives = []
        for alt_data in raw.get("alternatives_considered", []):
            alternatives.append(Alternative(
                option=alt_data.get("option", ""),
                status=ConfidenceLevel(alt_data.get("status", "unknown")),
                rejected=alt_data.get("rejected", False),
                rejection_reason=alt_data.get("rejection_reason"),
                rejection_reason_status=ConfidenceLevel(
                    alt_data.get("rejection_reason_status", "unknown")
                ),
            ))

        evidence_list = []
        for ev_data in raw.get("evidence", []):
            evidence_list.append(Evidence(
                quote_or_paraphrase=ev_data.get("quote_or_paraphrase", ""),
                source=ev_data.get("source", ""),
                status=ConfidenceLevel(ev_data.get("status", "unknown")),
            ))

        rel_data = raw.get("relationships", {})
        relationships = Relationship(
            supersedes=rel_data.get("supersedes", []),
            superseded_by=rel_data.get("superseded_by", []),
            related_to=rel_data.get("related_to", []),
        )

        source_artifacts = []
        for sa_data in raw.get("source_artifacts", []):
            source_artifacts.append(SourceArtifact(
                type=sa_data.get("type", "pr"),
                id=str(sa_data.get("id", "")),
                url=sa_data.get("url", ""),
            ))

        return DecisionRecord(
            decision_id=raw.get("decision_id", "unknown"),
            title=raw.get("title", "Untitled decision"),
            status=ConfidenceLevel(raw.get("status", "unknown")),
            decision=decision,
            alternatives_considered=alternatives,
            evidence=evidence_list,
            relationships=relationships,
            source_artifacts=source_artifacts,
        )
    except Exception as e:
        logger.warning(f"Failed to parse decision record: {e}")
        return None


def extract_decisions_from_thread(
    llm: LLMClient,
    thread: dict,
    repo_slug: str,
) -> list[DecisionRecord]:
    """
    Extract decision records from a single normalized thread.
    Returns a list of DecisionRecord objects (usually just one).
    """
    text = _truncate_thread(thread["text"])

    messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Analyze this GitHub {thread['type']} thread and extract decision records.\n"
                f"Repository: {repo_slug}\n\n"
                f"--- THREAD START ---\n{text}\n--- THREAD END ---"
            ),
        },
    ]

    try:
        response = llm.complete(messages, temperature=0.1, max_tokens=8192, require_json=True)
    except LLMError as e:
        logger.error(f"All LLMs failed for thread #{thread['id']}: {e}")
        return []

    raw_records = _parse_extraction_response(response, thread)
    records = []

    for raw in raw_records:
        record = _raw_to_decision_record(raw)
        if record:
            # Ensure source artifacts include the source thread
            if not record.source_artifacts:
                record.source_artifacts = [
                    SourceArtifact(
                        type=thread["type"],
                        id=thread["id"],
                        url=thread["url"],
                    )
                ]
            records.append(record)

    # If a thread yielded multiple records, append -1, -2, ... suffix to
    # make each decision_id unique (prevents duplicate PKs in Supabase)
    if len(records) > 1:
        for i, record in enumerate(records, 1):
            record.decision_id = f"{record.decision_id}-{i}"

    return records



def extract_all_decisions(
    owner: str,
    repo: str,
    threads: Optional[list[dict]] = None,
    max_threads: Optional[int] = None,
    min_comments: int = 1,
) -> list[DecisionRecord]:
    """
    Extract decision records from all cached threads for a repo.
    Caches results to data/decisions/{owner}_{repo}/.

    min_comments: Skip threads with fewer than this many comments (default 1).
    """
    import time

    repo_slug = f"{owner}/{repo}"
    cache_dir = DECISIONS_DIR / f"{owner}_{repo}"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / "decision_records.json"

    # Check cache
    if cache_file.exists():
        logger.info(f"Loading cached decision records from {cache_file}")
        with open(cache_file) as f:
            raw_list = json.load(f)
        return [DecisionRecord.model_validate(r) for r in raw_list]

    # Load threads if not provided
    if threads is None:
        from continuum.config import RAW_DATA_DIR
        threads_file = RAW_DATA_DIR / f"{owner}_{repo}" / "normalized_threads.json"
        if not threads_file.exists():
            raise FileNotFoundError(
                f"No cached threads found at {threads_file}. Run ingestion first."
            )
        with open(threads_file) as f:
            threads = json.load(f)

    # Skip threads with no discussion — nothing meaningful to extract
    threads = [t for t in threads if t.get("comment_count", 0) >= min_comments]
    logger.info(f"Filtered to {len(threads)} threads with >= {min_comments} comment(s)")

    if max_threads:
        threads = sorted(
            threads,
            key=lambda t: t.get("comment_count", 0),
            reverse=True,
        )[:max_threads]

    all_records: list[DecisionRecord] = []
    # Proactive pacing: free OpenRouter Gemma 4 allows ~10 req/min = 6s minimum.
    # Use 10s to stay comfortably under and avoid burning backoff retries.
    PACING_SLEEP = 10.0

    with LLMClient() as llm:
        for i, thread in enumerate(tqdm(threads, desc="Extracting decisions")):
            records = extract_decisions_from_thread(llm, thread, repo_slug)
            all_records.extend(records)

            # Incremental save after every thread
            with open(cache_file, "w") as f:
                json.dump([r.model_dump() for r in all_records], f, indent=2)

            # Pacing between calls (skip after last)
            if i < len(threads) - 1:
                time.sleep(PACING_SLEEP)

    logger.info(f"Extracted {len(all_records)} decision records from {len(threads)} threads")
    return all_records


