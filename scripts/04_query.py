#!/usr/bin/env python3
"""
Stage 4 & 5 — Full query pipeline: hybrid retrieval → synthesis → cited answer.

Usage:
    python scripts/04_query.py --question "Why were React Hooks introduced?"
    python scripts/04_query.py --question "What is the meaning of life?"  # should trigger honest gap
"""

import argparse
import io
import json
import logging
import sys
from pathlib import Path

# Force UTF-8 output on Windows (avoids cp1252 UnicodeEncodeError)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from continuum.config import validate_config
from continuum.bm25_index import BM25Index
from continuum.vector_store import get_all_records
from continuum.retrieval import hybrid_retrieve
from continuum.synthesis import synthesize_answer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Query the Continuum pipeline")
    parser.add_argument("--question", required=True, help="Your question about a past decision")
    parser.add_argument("--top-k", type=int, default=5, help="Number of records to retrieve")
    args = parser.parse_args()

    missing = validate_config()
    critical = [m for m in missing if m in ("OPENROUTER_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY")]
    if critical:
        logger.error(f"Missing required env vars: {critical}")
        sys.exit(1)

    # Build BM25 index from all records
    print("Loading decision records from Supabase...")
    all_records = get_all_records()
    if not all_records:
        logger.error("No records found in Supabase. Run 03_embed_and_index.py first.")
        sys.exit(1)

    print(f"Building BM25 index over {len(all_records)} records...")
    bm25 = BM25Index()
    bm25.build(all_records)

    # Hybrid retrieval
    print(f"\nQuery: \"{args.question}\"")
    print(f"{'='*60}")
    print("Running hybrid retrieval...")

    retrieved = hybrid_retrieve(
        query=args.question,
        bm25_index=bm25,
        final_top_k=args.top_k,
    )

    print(f"\nRetrieved {len(retrieved)} candidate records:")
    for i, r in enumerate(retrieved, 1):
        score = r.get("rrf_score", 0)
        print(f"  {i}. [RRF={score:.4f}] {r.get('title', 'Untitled')}")

    # Synthesis
    print(f"\n{'='*60}")
    print("Synthesizing evidence-grounded answer...")

    response = synthesize_answer(args.question, retrieved)

    # Display
    print(f"\n{'='*60}")
    print("  ANSWER")
    print(f"{'='*60}")
    print(f"\n{response.answer}\n")

    if response.citations:
        print(f"\n{'-'*60}")
        print("  CITATIONS")
        print(f"{'-'*60}")
        for c in response.citations:
            print(f"  [{c.confidence.upper():9}] {c.text[:70]}")
            print(f"             -> {c.source_url}")
            print()

    print(f"{'-'*60}")
    print(f"  Confidence: {response.confidence_summary}")
    print(f"  Insufficient evidence: {response.is_insufficient_evidence}")
    print(f"  Records used: {len(response.decision_records_used)}")
    print()


if __name__ == "__main__":
    main()
