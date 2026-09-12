from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from content_qa import audit_all, audit_sample, get_sample, load_samples


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit AI generated content samples.")
    parser.add_argument("--sample-id", default="")
    parser.add_argument("--input", type=Path, help="JSON file containing a sample array or {samples: [...]}")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    if args.input:
        raw = json.loads(args.input.read_text(encoding="utf-8"))
        samples = raw if isinstance(raw, list) else raw["samples"]
        selected = next((sample for sample in samples if sample["id"] == args.sample_id), None) if args.sample_id else None
        payload = audit_sample(selected) if selected else audit_all(samples)
    elif args.sample_id:
        payload = audit_sample(get_sample(args.sample_id))
    else:
        payload = audit_all()

    rendered = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
