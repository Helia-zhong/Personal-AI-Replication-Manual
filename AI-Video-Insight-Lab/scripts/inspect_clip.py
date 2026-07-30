from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from video_lab import get_clip, inspect_all, inspect_clip


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect AI video clip structure.")
    parser.add_argument("--clip-id", default="")
    args = parser.parse_args()

    if args.clip_id:
        payload = inspect_clip(get_clip(args.clip_id))
    else:
        payload = inspect_all()

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
