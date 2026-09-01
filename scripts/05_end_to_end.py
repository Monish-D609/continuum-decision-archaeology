#!/usr/bin/env python3
"""
Stage 5 — End-to-end pipeline test.

Runs 3 pre-selected test queries:
  1. A question expected to produce a strong, cited answer
  2. A question about rejected alternatives
  3. A question expected to trigger the "insufficient evidence" fallback

Usage:
    python scripts/05_end_to_end.py
"""

import json
import logging
import sys
import time
from pathlib import Path

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

# Pre-selected test queries — adjust based on actual demo repo
TEST_QUERIES = [
    {
        "question": "Why were React Hooks introduced instead of keeping class components?",
        "expected_behavior": "strong_evidence",
        "description": "Should produce a cited answer with PR/issue links about Hooks motivation",
    },
    {
        "question": "Has anyone proposed removing the virtual DOM before?",
        "expected_behavior": "partial_evidence",
        "description": "Should surface any discussions about virtual DOM alternatives, with appropriate confidence",
    },
    {
        "question": "Why does React use a blockchain-based state management system?",
        "expected_behavior": "insufficient_evidence",
        "description": "Should trigger the honest gap — React does NOT use blockchain, so no evidence should exist",
    },
]


def run_tests():
    missing = validate_config()
    critical = [m for m in missing if m in ("OPENROUTER_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY")]
    if critical:
        logger.error(f"Missing required env vars: {critical}")
        sys.exit(1)

    # Load records and build BM25 index
    print("Loading decision records from Supabase...")
    all_records = get_all_records()
    if not all_records:
        logger.error("No records found in Supabase. Run the full pipeline first.")
        sys.exit(1)

    print(f"Building BM25 index over {len(all_records)} records...")
    bm25 = BM25Index()
    bm25.build(all_records)

    results = []

    for i, test in enumerate(TEST_QUERIES, 1):
        print(f"\n{'='*70}")
        print(f"  TEST {i}/3: {test['description']}")
        print(f"{'='*70}")
        print(f"  Question: {test['question']}")
        print(f"  Expected: {test['expected_behavior']}")
        print()

        start = time.time()

        # Retrieval
        retrieved = hybrid_retrieve(
            query=test["question"],
            bm25_index=bm25,
            final_top_k=5,
        )

        # Synthesis
        response = synthesize_answer(test["question"], retrieved)

        elapsed = time.time() - start

        # Print results
        print(f"  Answer ({elapsed:.1f}s):")
        print(f"  {response.answer[:200]}{'...' if len(response.answer) > 200 else ''}")
        print()
        print(f"  Confidence: {response.confidence_summary}")
        print(f"  Insufficient evidence: {response.is_insufficient_evidence}")
        print(f"  Citations: {len(response.citations)}")
        print(f"  Records used: {len(response.decision_records_used)}")

        # Validate behavior
        passed = True
        if test["expected_behavior"] == "insufficient_evidence":
            if not response.is_insufficient_evidence:
                print(f"  ⚠️  UNEXPECTED: Expected insufficient evidence, got {response.confidence_summary}")
                passed = False
            else:
                print(f"  ✓ Correctly identified insufficient evidence")
        elif test["expected_behavior"] == "strong_evidence":
            if response.is_insufficient_evidence:
                print(f"  ⚠️  UNEXPECTED: Expected evidence, got insufficient_evidence")
                passed = False
            elif len(response.citations) == 0:
                print(f"  ⚠️  UNEXPECTED: Expected citations, got none")
                passed = False
            else:
                print(f"  ✓ Returned cited evidence as expected")

        # Check citations resolve to real URLs
        for c in response.citations:
            if c.source_url and "github.com" in c.source_url:
                print(f"  ✓ Citation URL looks valid: {c.source_url}")
            elif c.source_url:
                print(f"  ⚠️  Citation URL might be invalid: {c.source_url}")

        results.append({
            "test": i,
            "question": test["question"],
            "expected": test["expected_behavior"],
            "actual_confidence": response.confidence_summary,
            "is_insufficient": response.is_insufficient_evidence,
            "citation_count": len(response.citations),
            "elapsed_seconds": elapsed,
            "passed": passed,
        })

    # Summary
    print(f"\n{'='*70}")
    print(f"  END-TO-END TEST SUMMARY")
    print(f"{'='*70}")

    passed_count = sum(1 for r in results if r["passed"])
    print(f"  Passed: {passed_count}/{len(results)}")

    for r in results:
        status = "✓ PASS" if r["passed"] else "✗ FAIL"
        print(
            f"  [{status}] Test {r['test']}: "
            f"{r['actual_confidence']} ({r['elapsed_seconds']:.1f}s, "
            f"{r['citation_count']} citations)"
        )

    print()

    if passed_count < len(results):
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
