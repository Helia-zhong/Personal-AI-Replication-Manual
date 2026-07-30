from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from connect_four import analyze_board, get_sample, load_samples


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze Connect Four board positions.")
    parser.add_argument("--sample-id", default="")
    parser.add_argument("--depth", type=int, default=4)
    args = parser.parse_args()

    if args.sample_id:
        sample = get_sample(args.sample_id)
        payload = {"sample": sample, "analysis": analyze_board(sample["board"], depth=args.depth)}
    else:
        payload = {
            "samples": [
                {
                    "sample": sample,
                    "analysis": analyze_board(sample["board"], depth=args.depth),
                }
                for sample in load_samples()
            ]
        }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
