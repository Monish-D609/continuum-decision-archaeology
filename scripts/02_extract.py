#!/usr/bin/env python3
"""
Stage 2 — Extract decision records from cached GitHub threads.

Usage:
    python scripts/02_extract.py --repo facebook/react
    python scripts/02_extract.py --repo facebook/react --max-threads 10  # subset
"""

import argparse
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from continuum.config import validate_config
from continuum.decision_extract import extract_all_decisions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Extract decisions from cached threads")
    parser.add_argument("--repo", required=True, help="owner/repo")
    parser.add_argument("--max-threads", type=int, default=None, help="Process only N threads")
    parser.add_argument("--force", action="store_true", help="Re-extract even if cached")
    args = parser.parse_args()

    missing = validate_config()
    critical = [m for m in missing if m == "OPENROUTER_API_KEY"]
    if critical:
        logger.error(f"Missing required env vars: {critical}")
        sys.exit(1)

    owner, repo = args.repo.split("/")

    if args.force:
        from continuum.config import DECISIONS_DIR
        cache = DECISIONS_DIR / f"{owner}_{repo}" / "decision_records.json"
        if cache.exists():
            cache.unlink()
            logger.info(f"Cleared cache at {cache}")

    records = extract_all_decisions(owner, repo, max_threads=args.max_threads)

    print(f"\n{'='*60}")
    print(f"  Decision Extraction Complete: {owner}/{repo}")
    print(f"{'='*60}")
    print(f"  Total records extracted: {len(records)}")
    print()

    # Show stats
    confirmed = sum(1 for r in records if r.status == "confirmed")
    inferred = sum(1 for r in records if r.status == "inferred")
    unknown = sum(1 for r in records if r.status == "unknown")
    print(f"  Confidence breakdown:")
    print(f"    Confirmed: {confirmed}")
    print(f"    Inferred:  {inferred}")
    print(f"    Unknown:   {unknown}")
    print()

    # Show 3 sample records
    print("  Sample decision records:")
    for r in records[:3]:
        print(f"\n  [{r.status.upper():9}] {r.title}")
        print(f"    Decision: {r.decision.summary[:80]}...")
        if r.alternatives_considered:
            print(f"    Alternatives: {len(r.alternatives_considered)} considered")
            for alt in r.alternatives_considered[:2]:
                rejected = "REJECTED" if alt.rejected else "selected"
                print(f"      - [{rejected}] {alt.option[:60]}")
        print(f"    Evidence: {len(r.evidence)} pieces")
        for sa in r.source_artifacts:
            print(f"    Source: {sa.type} #{sa.id} — {sa.url}")

    print()


if __name__ == "__main__":
    main()
