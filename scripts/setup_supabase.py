#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
Supabase Setup — prints the SQL migration to run in the Supabase SQL Editor.
Also validates connectivity if credentials are set.

Usage:
    python scripts/setup_supabase.py
    python scripts/setup_supabase.py --verify  # also test connectivity
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from continuum.vector_store import SETUP_SQL
from continuum.config import SUPABASE_URL, SUPABASE_SERVICE_KEY


def main():
    parser = argparse.ArgumentParser(description="Supabase setup helper")
    parser.add_argument("--verify", action="store_true", help="Test connectivity after setup")
    args = parser.parse_args()

    print("=" * 60)
    print("  Supabase Setup for Continuum")
    print("=" * 60)
    print()
    print("Copy and run this SQL in your Supabase SQL Editor")
    print("(Dashboard > SQL Editor > New query):")
    print()
    print("-" * 60)
    print(SETUP_SQL)
    print("-" * 60)
    print()

    if args.verify:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            print("⚠️  SUPABASE_URL and SUPABASE_SERVICE_KEY not set in .env")
            print("   Set them and run again with --verify")
            sys.exit(1)

        print("Testing connectivity...")
        try:
            from continuum.vector_store import get_record_count
            count = get_record_count()
            print(f"[OK] Connected to Supabase at {SUPABASE_URL}")
            print(f"[OK] Found {count} existing decision records")
        except Exception as e:
            print(f"[FAIL] Connection failed: {e}")
            print()
            print("If you haven't run the SQL migration yet, do that first,")
            print("then run this again with --verify.")
            sys.exit(1)


if __name__ == "__main__":
    main()
