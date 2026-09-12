from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_DIR / "backend"))

from contracts import RunBatch
from run_monitor import load_runs, summarize_all, summarize_run


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze AI agent run traces.")
    parser.add_argument("--run-id", default="")
    parser.add_argument("--input", type=Path, help="Trace JSON: {runs: [...]} or a run array")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    raw = json.loads(args.input.read_text(encoding="utf-8")) if args.input else load_runs()
    batch = RunBatch.model_validate({"runs": raw} if isinstance(raw, list) else raw)
    runs = [run.model_dump(mode="json") for run in batch.runs]
    selected = next((run for run in runs if run["run_id"] == args.run_id), None)
    if args.run_id and selected is None:
        parser.error("run-id not found in input")
    payload = summarize_run(selected) if selected else summarize_all(runs)

    rendered = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
