from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from model_router import get_task, route_all, route_task


def main() -> None:
    parser = argparse.ArgumentParser(description="Route AI tasks to model profiles.")
    parser.add_argument("--task-id", default="")
    args = parser.parse_args()

    if args.task_id:
        payload = route_task(get_task(args.task_id))
    else:
        payload = route_all()

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
