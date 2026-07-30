from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from video_lab import clip_report_markdown, get_clip, inspect_all, inspect_clip, load_clips


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect AI video clip structure.")
    parser.add_argument("--clip-id", default="")
    parser.add_argument("--format", choices=["json", "markdown"], default="json")
    args = parser.parse_args()

    if args.clip_id:
        clip = get_clip(args.clip_id)
        payload = inspect_clip(clip)
        if args.format == "markdown":
            print(clip_report_markdown(clip, payload))
            return
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    if args.format == "markdown":
        reports = [clip_report_markdown(clip, inspect_clip(clip)) for clip in load_clips()]
        print("\n\n---\n\n".join(reports))
        return

    payload = inspect_all()
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
