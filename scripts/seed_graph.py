#!/usr/bin/env python3
"""
Standalone seed script — can be run directly without starting the full backend.
Usage:
  cd patchpilot/backend
  ../venv/bin/python ../../scripts/seed_graph.py [--clear]
"""
import sys
import os
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

def main():
    parser = argparse.ArgumentParser(description="Seed PatchPilot synthetic graph data")
    parser.add_argument('--clear', action='store_true', help='Clear graph before seeding')
    args = parser.parse_args()

    from app.db.connection import ping
    from app.graph.queries import seed_graph

    if not ping():
        print("ERROR: Cannot connect to FalkorDB. Is it running on localhost:6379?")
        sys.exit(1)

    print(f"Seeding graph data (clear_first={args.clear})…")
    counts = seed_graph(clear_first=args.clear)
    print("Seed complete:")
    for k, v in counts.items():
        print(f"  {k}: {v}")


if __name__ == '__main__':
    main()
