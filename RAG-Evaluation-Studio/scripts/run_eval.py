from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from rag_studio import evaluate_all, evaluate_question


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RAG retrieval evaluation.")
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--question", type=str, default="")
    args = parser.parse_args()

    if args.question:
        payload = evaluate_question(args.question, top_k=args.top_k)
    else:
        payload = evaluate_all(top_k=args.top_k)

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
