from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from rag_studio import evaluate_all, evaluate_question


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a reproducible RAG retrieval and generation evaluation.")
    parser.add_argument("--top-k", type=int, choices=range(1, 6), default=3)
    parser.add_argument("--question", type=str, default="")
    parser.add_argument("--provider", choices=("deterministic", "ollama"), default="deterministic")
    parser.add_argument("--model", default="llama3.2:3b")
    parser.add_argument("--ollama-url", default="http://127.0.0.1:11434")
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    if args.question:
        payload = evaluate_question(args.question, top_k=args.top_k, provider=args.provider, model=args.model, ollama_url=args.ollama_url)
    else:
        payload = evaluate_all(top_k=args.top_k, provider=args.provider, model=args.model, ollama_url=args.ollama_url)

    rendered = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
