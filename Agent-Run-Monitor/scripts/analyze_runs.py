from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from run_monitor import get_run, summarize_all, summarize_run


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze AI agent run traces.")
    parser.add_argument("--run-id", default="")
    args = parser.parse_args()

    if args.run_id:
        payload = summarize_run(get_run(args.run_id))
    else:
        payload = summarize_all()

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
