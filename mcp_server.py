"""
Continuum MCP Server — exposes decision-archaeology tools to AI coding agents.

Run with:
    python mcp_server.py

Then add to your MCP client config (Cursor, Claude Code, Windsurf, etc.):
    {
        "mcpServers": {
            "continuum": {
                "command": "python",
                "args": ["<path-to-project>/mcp_server.py"],
                "env": {
                    "CONTINUUM_API_URL": "http://localhost:8000"
                }
            }
        }
    }

Tools exposed:
  - query_decisions      : Ask a 'why' question, get a cited answer
  - check_graveyard      : Search for rejected alternatives ('what NOT to do')
  - blame_to_why         : Explain why a code snippet exists
  - check_deja_vu        : Check if a PR idea was previously rejected
  - detect_drift         : Check if code violates an architectural principle
  - get_decision_timeline: Get chronological decision history for a topic
"""

from __future__ import annotations

import os
import json
import logging
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The running Continuum API base URL (configurable via env)
API_URL = os.environ.get("CONTINUUM_API_URL", "http://localhost:8000")

# ── Try to import mcp; fall back to a clear error message ────────────────────
try:
    from mcp.server import FastMCP  # type: ignore
    mcp = FastMCP("continuum", description="Decision Archaeology — recovers the WHY behind engineering decisions")
except ImportError:
    raise SystemExit(
        "ERROR: 'mcp' package not found. Install it with:\n"
        "    pip install mcp\n"
        "Then re-run: python mcp_server.py"
    )


def _post(endpoint: str, payload: dict) -> dict:
    """POST to the Continuum API and return the parsed JSON response."""
    with httpx.Client(timeout=30.0) as client:
        r = client.post(f"{API_URL}/api/{endpoint}", json=payload)
        r.raise_for_status()
        return r.json()


def _get(endpoint: str, params: dict = None) -> dict:
    """GET from the Continuum API and return the parsed JSON response."""
    with httpx.Client(timeout=30.0) as client:
        r = client.get(f"{API_URL}/api/{endpoint}", params=params or {})
        r.raise_for_status()
        return r.json()


# ── Tool 1: Query Decisions ────────────────────────────────────────────────────

@mcp.tool()
def query_decisions(question: str, repo: str = None) -> str:
    """
    Ask a 'why' question about a past engineering decision.

    Returns a citation-grounded answer sourced from PR/issue history.
    Every factual claim links to a specific PR, issue, or commit.

    Args:
        question: A natural-language 'why' question, e.g. 'Why were React Hooks introduced?'
        repo: Optional repository filter in 'owner/repo' format (e.g. 'facebook/react')
    """
    payload = {"question": question}
    if repo:
        payload["repo"] = repo
    data = _post("query", payload)

    answer = data.get("answer", "No answer returned.")
    confidence = data.get("confidence_summary", "unknown")
    breakdown = data.get("confidence_breakdown", {})
    citations = data.get("citations", [])

    result_lines = [
        f"## Answer\n{answer}",
        f"\n**Confidence:** {confidence}",
        f"**Evidence breakdown:** {breakdown.get('confirmed', 0)} confirmed, "
        f"{breakdown.get('inferred', 0)} inferred, {breakdown.get('unknown', 0)} unknown",
    ]

    if citations:
        result_lines.append("\n## Citations")
        for c in citations[:5]:
            author = f" (@{c['author']})" if c.get("author") else ""
            result_lines.append(
                f"- [{c['source_type'].upper()} #{c['source_id']}]({c['source_url']}) "
                f"[{c['confidence']}]{author}: {c['text']}"
            )

    return "\n".join(result_lines)


# ── Tool 2: The Graveyard ──────────────────────────────────────────────────────

@mcp.tool()
def check_graveyard(question: str, repo: str = None) -> str:
    """
    Search 'The Graveyard' — find approaches that were explicitly tried and REJECTED.

    Use this before proposing a new approach to ensure it wasn't already
    attempted and discarded for known reasons.

    Args:
        question: What you want to know about (e.g. 'REST API vs GraphQL')
        repo: Optional repository filter in 'owner/repo' format
    """
    payload = {"question": question}
    if repo:
        payload["repo"] = repo
    data = _post("graveyard", payload)

    answer = data.get("answer", "No rejected alternatives found.")
    citations = data.get("citations", [])

    result_lines = [f"## ⚰️ Graveyard Results\n{answer}"]
    if citations:
        result_lines.append("\n## Rejected Alternatives (Sources)")
        for c in citations[:5]:
            result_lines.append(
                f"- [{c['source_type'].upper()} #{c['source_id']}]({c['source_url']}): {c['text']}"
            )

    return "\n".join(result_lines)


# ── Tool 3: Blame-to-Why ───────────────────────────────────────────────────────

@mcp.tool()
def blame_to_why(code_snippet: str, file_path: str = None, repo: str = None) -> str:
    """
    Explain WHY a code snippet exists using historical PR/issue evidence.

    Unlike `git blame` which shows WHO and WHEN, this recovers the architectural
    reasoning and debates that led to the code being written this way.

    Args:
        code_snippet: The code to explain (paste a function, class, or block)
        file_path: Optional file path for context (e.g. 'src/auth/gateway.py')
        repo: Optional repository filter in 'owner/repo' format
    """
    payload = {"code_snippet": code_snippet}
    if file_path:
        payload["file_path"] = file_path
    if repo:
        payload["repo"] = repo

    data = _post("blame", payload)
    answer = data.get("answer", "No historical evidence found for this code.")
    citations = data.get("citations", [])

    result_lines = [f"## Why This Code Exists\n{answer}"]
    if citations:
        result_lines.append("\n## Sources")
        for c in citations[:5]:
            author = f" (@{c['author']})" if c.get("author") else ""
            quote = f'\n  > "{c["quote"]}"' if c.get("quote") else ""
            result_lines.append(
                f"- [{c['source_type'].upper()} #{c['source_id']}]({c['source_url']})"
                f"{author}: {c['text']}{quote}"
            )

    return "\n".join(result_lines)


# ── Tool 4: Déjà Vu Check ─────────────────────────────────────────────────────

@mcp.tool()
def check_deja_vu(pr_title: str, pr_description: str = "", repo: str = None) -> str:
    """
    Check if a PR's proposed approach was previously attempted and rejected.

    Run this before opening a PR to see if the team has already tried
    this pattern and decided against it.

    Args:
        pr_title: The title of the pull request
        pr_description: The PR description/body
        repo: Optional repository filter in 'owner/repo' format
    """
    payload = {"pr_title": pr_title, "pr_description": pr_description}
    if repo:
        payload["repo"] = repo

    data = _post("deja-vu", payload)

    if not data.get("has_matches"):
        return "✅ No similar rejected patterns found. This approach appears novel for this repository."

    comment = data.get("github_comment", "")
    matches = data.get("matches", [])

    result_lines = [
        f"⚠️ **DÉJÀ VU DETECTED** — {len(matches)} similar rejected pattern(s) found!\n",
        comment,
    ]
    return "\n".join(result_lines)


# ── Tool 5: Detect Drift ───────────────────────────────────────────────────────

@mcp.tool()
def detect_drift(principle: str, repo: str = None, recent_n: int = 20) -> str:
    """
    Detect architectural drift — find decisions that contradict a stated principle.

    Use this to enforce architectural invariants and find where the codebase
    has silently deviated from its own rules.

    Args:
        principle: An architectural rule to enforce (e.g. 'All DB writes must go through the event bus')
        repo: Optional repository filter in 'owner/repo' format
        recent_n: How many recent decisions to scan (default 20, max 100)
    """
    payload = {"principle": principle, "recent_n": recent_n}
    if repo:
        payload["repo"] = repo

    data = _post("drift-radar", payload)
    violations = data.get("violations", [])
    total = data.get("total_scanned", 0)
    clean = data.get("clean_count", 0)

    if not violations:
        return (
            f"✅ No architectural drift detected.\n"
            f"Scanned {total} decisions — all {clean} are consistent with:\n"
            f"> {principle}"
        )

    result_lines = [
        f"🚨 **Architectural Drift Detected** — {len(violations)} violation(s) in {total} scanned decisions\n",
        f"**Principle:** {principle}\n",
        "## Violations",
    ]
    for v in violations:
        severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(v.get("severity", "medium"), "⚪")
        result_lines += [
            f"\n{severity_icon} **{v.get('title', 'Unknown')}** [{v.get('severity', 'medium').upper()}]",
            f"   {v.get('violation_reason', '')}",
            f"   Source: {v.get('source_url', '')}",
        ]

    return "\n".join(result_lines)


# ── Tool 6: Decision Timeline ──────────────────────────────────────────────────

@mcp.tool()
def get_decision_timeline(query: str, repo: str = None, top_k: int = 15) -> str:
    """
    Get a chronological timeline of decisions related to a topic.

    Shows how an architectural concept or component evolved over time —
    from its initial introduction through modifications and reversals.

    Args:
        query: The topic to build a timeline for (e.g. 'state management')
        repo: Optional repository filter in 'owner/repo' format
        top_k: Number of events to return (default 15)
    """
    params = {"query": query, "top_k": top_k}
    if repo:
        params["repo"] = repo

    data = _get("timeline", params)
    events = data.get("events", [])

    if not events:
        return f"No timeline events found for: '{query}'"

    result_lines = [f"## Decision Timeline: {query}\n"]
    for e in events:
        date = e.get("source_date") or "Unknown date"
        result_lines += [
            f"**{date}** — [{e.get('title', 'Untitled')}]({e.get('source_url', '')})",
            f"  {e.get('decision_summary', '')}",
            "",
        ]

    return "\n".join(result_lines)


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info(f"Starting Continuum MCP server (API: {API_URL})")
    mcp.run()
