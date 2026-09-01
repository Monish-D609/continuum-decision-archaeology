"""
GitHub ingestion — pulls PRs, issues, and commits from a public repo
via the GitHub REST API and caches the raw JSON locally.

Ingestion sources (per CLAUDE.md / SRS):
  - Closed PR threads (title, body, review comments)
  - Issue threads (title, body, comments)
  - Commit messages associated with merged PRs

All data is cached to data/raw/{owner}_{repo}/ so the demo never
depends on live GitHub API calls.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Optional

import httpx
from tqdm import tqdm

from continuum.config import GITHUB_TOKEN, RAW_DATA_DIR

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


def _headers() -> dict[str, str]:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def _rate_limit_wait(response: httpx.Response) -> None:
    """Check rate limit headers and sleep if we're about to hit the limit."""
    remaining = response.headers.get("X-RateLimit-Remaining")
    if remaining is not None and int(remaining) <= 2:
        reset_ts = int(response.headers.get("X-RateLimit-Reset", 0))
        wait = max(reset_ts - int(time.time()), 1) + 1
        logger.warning(f"Rate limit nearly exhausted, sleeping {wait}s")
        time.sleep(wait)


def _paginated_get(
    client: httpx.Client,
    url: str,
    params: Optional[dict] = None,
    max_pages: int = 100,
) -> list[dict]:
    """Fetch all pages from a paginated GitHub API endpoint."""
    results = []
    params = params or {}
    params.setdefault("per_page", 100)

    for _ in range(max_pages):
        response = client.get(url, params=params, headers=_headers())

        if response.status_code == 403:
            # Rate limited
            _rate_limit_wait(response)
            response = client.get(url, params=params, headers=_headers())

        response.raise_for_status()
        _rate_limit_wait(response)

        data = response.json()
        if not data:
            break

        results.extend(data)

        # Check for next page via Link header
        link = response.headers.get("Link", "")
        if 'rel="next"' not in link:
            break
        # Extract next URL
        for part in link.split(","):
            if 'rel="next"' in part:
                url = part.split(";")[0].strip().strip("<>")
                params = {}  # URL already has params
                break

    return results


def fetch_closed_prs(
    client: httpx.Client,
    owner: str,
    repo: str,
    max_prs: int = 200,
    sort_by_comments: bool = True,
) -> list[dict]:
    """
    Fetch closed PRs sorted by most discussion (comments).
    Returns enriched PR data with review comments included.
    """
    logger.info(f"Fetching closed PRs from {owner}/{repo} (max={max_prs})...")

    # Only fetch enough pages to get max_prs PRs (100 per page)
    max_pages = (max_prs // 100) + 2  # Extra page for safety margin
    prs = _paginated_get(
        client,
        f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
        params={"state": "closed", "sort": "updated", "direction": "desc"},
        max_pages=max_pages,
    )

    if sort_by_comments:
        # Re-sort by comment count to prioritize discussion-rich PRs
        prs.sort(key=lambda p: p.get("comments", 0) + p.get("review_comments", 0), reverse=True)

    prs = prs[:max_prs]
    logger.info(f"Selected {len(prs)} most-discussed closed PRs")

    # Enrich each PR with its review comments
    enriched = []
    for pr in tqdm(prs, desc="Enriching PRs with comments"):
        pr_number = pr["number"]

        # Fetch review comments (code-level)
        try:
            review_comments = _paginated_get(
                client,
                f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/comments",
            )
        except Exception as e:
            logger.warning(f"Failed to fetch review comments for PR #{pr_number}: {e}")
            review_comments = []

        # Fetch issue-style comments (conversation)
        try:
            issue_comments = _paginated_get(
                client,
                f"{GITHUB_API}/repos/{owner}/{repo}/issues/{pr_number}/comments",
            )
        except Exception as e:
            logger.warning(f"Failed to fetch issue comments for PR #{pr_number}: {e}")
            issue_comments = []

        pr["_review_comments"] = review_comments
        pr["_issue_comments"] = issue_comments
        enriched.append(pr)

    return enriched


def fetch_issues(
    client: httpx.Client,
    owner: str,
    repo: str,
    max_issues: int = 200,
) -> list[dict]:
    """
    Fetch closed issues (excluding PRs) with their comment threads.
    """
    logger.info(f"Fetching closed issues from {owner}/{repo} (max={max_issues})...")

    # GitHub issues endpoint mixes PRs and issues (~50/50),
    # so we need ~2x the pages. Cap at a reasonable upper bound.
    max_pages = (max_issues // 50) + 4
    all_items = _paginated_get(
        client,
        f"{GITHUB_API}/repos/{owner}/{repo}/issues",
        params={"state": "closed", "sort": "comments", "direction": "desc"},
        max_pages=max_pages,
    )

    # Filter out pull requests (they have a pull_request key)
    issues = [i for i in all_items if "pull_request" not in i]
    issues = issues[:max_issues]
    logger.info(f"Selected {len(issues)} most-discussed closed issues")

    # Enrich with comments
    enriched = []
    for issue in tqdm(issues, desc="Enriching issues with comments"):
        try:
            comments = _paginated_get(
                client,
                issue["comments_url"],
            )
        except Exception as e:
            logger.warning(f"Failed to fetch comments for issue #{issue['number']}: {e}")
            comments = []
        issue["_comments"] = comments
        enriched.append(issue)

    return enriched


def fetch_commits_for_prs(
    client: httpx.Client,
    owner: str,
    repo: str,
    prs: list[dict],
) -> dict[int, list[dict]]:
    """
    Fetch commit messages for each PR.
    Returns a dict mapping PR number → list of commit data.
    """
    logger.info(f"Fetching commits for {len(prs)} PRs...")
    commits_by_pr: dict[int, list[dict]] = {}

    for pr in tqdm(prs, desc="Fetching PR commits"):
        pr_number = pr["number"]
        try:
            commits = _paginated_get(
                client,
                f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/commits",
            )
            commits_by_pr[pr_number] = commits
        except Exception as e:
            logger.warning(f"Failed to fetch commits for PR #{pr_number}: {e}")
            commits_by_pr[pr_number] = []

    return commits_by_pr


def normalize_pr_thread(pr: dict, commits: list[dict], owner: str, repo: str) -> dict:
    """
    Normalize a PR into a decision-unit text block for extraction.
    Combines title, body, review comments, issue comments, and commit messages
    into a single coherent thread.
    """
    pr_number = pr["number"]
    url = f"https://github.com/{owner}/{repo}/pull/{pr_number}"

    parts = [
        f"# PR #{pr_number}: {pr.get('title', 'Untitled')}",
        f"URL: {url}",
        f"State: {pr.get('state', 'unknown')} | Merged: {pr.get('merged_at') is not None}",
        f"Author: {pr.get('user', {}).get('login', 'unknown')}",
        f"Created: {pr.get('created_at', '')} | Closed: {pr.get('closed_at', '')}",
        "",
        "## Description",
        pr.get("body") or "(no description)",
        "",
    ]

    # Issue-style comments (main conversation)
    issue_comments = pr.get("_issue_comments", [])
    if issue_comments:
        parts.append("## Discussion")
        for c in issue_comments:
            author = c.get("user", {}).get("login", "unknown")
            parts.append(f"\n**{author}** ({c.get('created_at', '')}):")
            parts.append(c.get("body", "(empty)"))

    # Code review comments
    review_comments = pr.get("_review_comments", [])
    if review_comments:
        parts.append("\n## Code Review Comments")
        for c in review_comments:
            author = c.get("user", {}).get("login", "unknown")
            path = c.get("path", "")
            parts.append(f"\n**{author}** on `{path}` ({c.get('created_at', '')}):")
            parts.append(c.get("body", "(empty)"))

    # Commit messages
    if commits:
        parts.append("\n## Commits")
        for c in commits:
            msg = c.get("commit", {}).get("message", "(no message)")
            sha = c.get("sha", "")[:8]
            parts.append(f"- [{sha}] {msg.split(chr(10))[0]}")

    return {
        "type": "pr",
        "id": str(pr_number),
        "url": url,
        "title": pr.get("title", ""),
        "text": "\n".join(parts),
        "comment_count": len(issue_comments) + len(review_comments),
    }


def normalize_issue_thread(issue: dict, owner: str, repo: str) -> dict:
    """
    Normalize an issue into a decision-unit text block.
    """
    issue_number = issue["number"]
    url = f"https://github.com/{owner}/{repo}/issues/{issue_number}"

    parts = [
        f"# Issue #{issue_number}: {issue.get('title', 'Untitled')}",
        f"URL: {url}",
        f"State: {issue.get('state', 'unknown')}",
        f"Author: {issue.get('user', {}).get('login', 'unknown')}",
        f"Labels: {', '.join(l.get('name', '') for l in issue.get('labels', []))}",
        f"Created: {issue.get('created_at', '')} | Closed: {issue.get('closed_at', '')}",
        "",
        "## Description",
        issue.get("body") or "(no description)",
        "",
    ]

    comments = issue.get("_comments", [])
    if comments:
        parts.append("## Discussion")
        for c in comments:
            author = c.get("user", {}).get("login", "unknown")
            parts.append(f"\n**{author}** ({c.get('created_at', '')}):")
            parts.append(c.get("body", "(empty)"))

    return {
        "type": "issue",
        "id": str(issue_number),
        "url": url,
        "title": issue.get("title", ""),
        "text": "\n".join(parts),
        "comment_count": len(comments),
    }


def ingest_repo(
    owner: str,
    repo: str,
    max_prs: int = 200,
    max_issues: int = 200,
) -> list[dict]:
    """
    Full ingestion pipeline: fetch PRs + issues + commits, normalize into
    decision-unit text blocks, cache to disk, and return the normalized data.
    """
    cache_dir = RAW_DATA_DIR / f"{owner}_{repo}"
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Check for cached data
    cache_file = cache_dir / "normalized_threads.json"
    if cache_file.exists():
        logger.info(f"Loading cached data from {cache_file}")
        with open(cache_file) as f:
            return json.load(f)

    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        # Fetch raw data
        prs = fetch_closed_prs(client, owner, repo, max_prs=max_prs)
        issues = fetch_issues(client, owner, repo, max_issues=max_issues)
        commits_by_pr = fetch_commits_for_prs(client, owner, repo, prs)

        # Cache raw data
        with open(cache_dir / "raw_prs.json", "w") as f:
            json.dump(prs, f, indent=2, default=str)
        with open(cache_dir / "raw_issues.json", "w") as f:
            json.dump(issues, f, indent=2, default=str)
        with open(cache_dir / "raw_commits.json", "w") as f:
            json.dump(commits_by_pr, f, indent=2, default=str)

        # Normalize into decision-unit threads
        threads = []
        for pr in prs:
            commits = commits_by_pr.get(pr["number"], [])
            threads.append(normalize_pr_thread(pr, commits, owner, repo))
        for issue in issues:
            threads.append(normalize_issue_thread(issue, owner, repo))

        # Cache normalized data
        with open(cache_file, "w") as f:
            json.dump(threads, f, indent=2)

        logger.info(
            f"Ingestion complete: {len(prs)} PRs, {len(issues)} issues, "
            f"{len(threads)} total threads"
        )

    return threads
