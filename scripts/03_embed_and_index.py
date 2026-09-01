#!/usr/bin/env python3
"""
Stage 3 — Embed decision records and index into Supabase pgvector.

Usage:
    python scripts/03_embed_and_index.py --repo facebook/react
    python scripts/03_embed_and_index.py --repo facebook/react --test-query "Why were hooks introduced?"
"""

import argparse
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from continuum.config import validate_config, DECISIONS_DIR
from continuum.embeddings import embed_texts, decision_record_to_text
from continuum.vector_store import upsert_batch, semantic_search, get_record_count, SETUP_SQL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Embed and index decisions into Supabase")
    parser.add_argument("--repo", required=True, help="owner/repo")
    parser.add_argument("--test-query", type=str, default=None, help="Test query after indexing")
    args = parser.parse_args()

    missing = validate_config()
    supabase_missing = [m for m in missing if m.startswith("SUPABASE")]
    if supabase_missing:
        logger.error(f"Missing Supabase env vars: {supabase_missing}")
        print("\nBefore running this script, you need to:")
        print("1. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
        print("2. Run the following SQL in your Supabase SQL Editor:")
        print(f"\n{SETUP_SQL}")
        sys.exit(1)

    owner, repo = args.repo.split("/")

    # Load decision records
    cache_file = DECISIONS_DIR / f"{owner}_{repo}" / "decision_records.json"
    if not cache_file.exists():
        logger.error(f"No decision records found at {cache_file}. Run 02_extract.py first.")
        sys.exit(1)

    with open(cache_file) as f:
        records = json.load(f)

    print(f"\n{'='*60}")
    print(f"  Embedding & Indexing: {owner}/{repo}")
    print(f"{'='*60}")
    print(f"  Records to index: {len(records)}")

    # Generate text for embedding
    texts = [decision_record_to_text(r) for r in records]
    print(f"  Generating embeddings...")

    # Batch embed
    embeddings = embed_texts(texts)
    print(f"  Generated {len(embeddings)} embeddings (dim={len(embeddings[0]) if embeddings else 0})")

    # Prepare records for Supabase upsert
    supabase_records = []
    for record, embedding, text in zip(records, embeddings, texts):
        decision = record.get("decision", {})
        source_artifacts = record.get("source_artifacts", [])
        first_source = source_artifacts[0] if source_artifacts else {}

        supabase_records.append({
            "id": record.get("decision_id", "unknown"),
            "title": record.get("title", ""),
            "decision_summary": decision.get("summary", "") if isinstance(decision, dict) else "",
            "record_json": record,
            "source_url": first_source.get("url", ""),
            "source_type": first_source.get("type", ""),
            "source_id": str(first_source.get("id", "")),
            "embedding": embedding,
            "text_content": text,
        })

    # Upsert to Supabase
    print(f"  Upserting to Supabase...")
    count = upsert_batch(supabase_records)
    print(f"  Upserted {count} records")

    # Verify
    total = get_record_count()
    print(f"  Total records in Supabase: {total}")

    # Optional test query
    if args.test_query:
        from continuum.embeddings import embed_text
        print(f"\n  Test query: \"{args.test_query}\"")
        query_embedding = embed_text(args.test_query)
        results = semantic_search(query_embedding, top_k=3)
        print(f"  Top {len(results)} results:")
        for i, r in enumerate(results, 1):
            print(f"    {i}. [{r.get('similarity', 0):.3f}] {r.get('title', 'Untitled')}")
            print(f"       {r.get('source_url', '')}")

    print()


if __name__ == "__main__":
    main()
