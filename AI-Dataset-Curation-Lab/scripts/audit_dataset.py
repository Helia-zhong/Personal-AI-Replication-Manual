from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from dataset_lab import audit_all, audit_dataset, get_dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit AI dataset curation quality.")
    parser.add_argument("--dataset-id", default="")
    args = parser.parse_args()

    if args.dataset_id:
        payload = audit_dataset(get_dataset(args.dataset_id))
    else:
        payload = audit_all()

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
