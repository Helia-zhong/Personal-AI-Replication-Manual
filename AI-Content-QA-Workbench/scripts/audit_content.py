from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from content_qa import audit_all, audit_sample, get_sample


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit AI generated content samples.")
    parser.add_argument("--sample-id", default="")
    args = parser.parse_args()

    if args.sample_id:
        payload = audit_sample(get_sample(args.sample_id))
    else:
        payload = audit_all()

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
