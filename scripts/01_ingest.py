#!/usr/bin/env python3
"""
Stage 1 — Ingest a GitHub repo's PRs, issues, and commits.
Caches all raw and normalized data locally.

Usage:
    python scripts/01_ingest.py --repo facebook/react --max-prs 200
    python scripts/01_ingest.py --repo facebook/react --max-prs 5   # smoke test
"""

import argparse
import json
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from continuum.config import validate_config, GITHUB_TOKEN
from continuum.github_ingest import ingest_repo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Ingest a GitHub repo for Continuum")
    parser.add_argument("--repo", required=True, help="owner/repo, e.g. facebook/react")
    parser.add_argument("--max-prs", type=int, default=200, help="Max PRs to ingest")
    parser.add_argument("--max-issues", type=int, default=200, help="Max issues to ingest")
    parser.add_argument("--force", action="store_true", help="Re-ingest even if cached data exists")
    args = parser.parse_args()

    # Validate
    if not GITHUB_TOKEN:
        logger.warning(
            "GITHUB_TOKEN not set — unauthenticated requests are limited to 60/hour. "
            "Set GITHUB_TOKEN in .env for 5,000/hour."
        )

    owner, repo = args.repo.split("/")

    if args.force:
        # Clear cache
        from continuum.config import RAW_DATA_DIR
        cache_dir = RAW_DATA_DIR / f"{owner}_{repo}"
        cache_file = cache_dir / "normalized_threads.json"
        if cache_file.exists():
            cache_file.unlink()
            logger.info(f"Cleared cached data at {cache_file}")

    threads = ingest_repo(owner, repo, max_prs=args.max_prs, max_issues=args.max_issues)

    # Summary
    pr_threads = [t for t in threads if t["type"] == "pr"]
    issue_threads = [t for t in threads if t["type"] == "issue"]

    print(f"\n{'='*60}")
    print(f"  Ingestion Complete: {owner}/{repo}")
    print(f"{'='*60}")
    print(f"  PRs ingested:    {len(pr_threads)}")
    print(f"  Issues ingested: {len(issue_threads)}")
    print(f"  Total threads:   {len(threads)}")
    print()

    # Spot-check: print top 5 most-discussed threads
    threads_sorted = sorted(threads, key=lambda t: t.get("comment_count", 0), reverse=True)
    print("  Top 5 most-discussed threads:")
    for t in threads_sorted[:5]:
        print(f"    [{t['type'].upper():5}] #{t['id']:>6} ({t['comment_count']:>3} comments) {t['title'][:60]}")

    print(f"\n  Data cached at: data/raw/{owner}_{repo}/")
    print()


if __name__ == "__main__":
    main()
