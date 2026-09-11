"""Run real local inference, preserve failures, and optionally publish synthetic results."""
import argparse
import asyncio
import hashlib
import json
import os
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.contracts import Settings
from backend.evaluation import evaluate_case, summarize, validate_dataset


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, result):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


async def main(args):
    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    prompts_path = ROOT / "evals" / "prompts.json"
    prompts = json.loads(prompts_path.read_text(encoding="utf-8"))
    validate_dataset(dataset)
    variants = [variant for variant in prompts["variants"] if args.model or variant["mode"] == "rules"]
    model_info, version = None, None
    if args.model:
        host = os.environ.get("AGENTFLOW_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
        async with httpx.AsyncClient(base_url=host, timeout=10, trust_env=False) as client:
            tags = await client.get("/api/tags")
            tags.raise_for_status()
            model_info = next((item for item in tags.json()["models"] if item["name"] == args.model), None)
            if model_info is None:
                raise ValueError("Model is not installed; run ollama pull with this exact model name first")
            response = await client.get("/api/version")
            response.raise_for_status()
            version = response.json()["version"]
    result = {"format_version": 1, "status": "running", "created_at": datetime.now(timezone.utc).isoformat(),
              "dataset": dataset, "dataset_sha256": digest(args.dataset), "prompts_sha256": digest(prompts_path),
              "repeats": args.repeats, "model": model_info, "ollama_version": version,
              "environment": {"os": platform.system(), "python": platform.python_version(),
                              "cpu": platform.processor(), "logical_cpus": os.cpu_count()},
              "implementation_sha256": {name: digest(ROOT / name) for name in [
                  "backend/contracts.py", "backend/runtime.py", "backend/evaluation.py", "scripts/evaluate.py"]},
              "scope": "Author-labeled synthetic regression cases; no blind test set, no judge model, no general accuracy claim.",
              "variants": [{**variant, "settings": Settings(mode=variant["mode"], model=args.model if variant["mode"] == "ollama" else "",
                  prompt=variant["prompt"], max_items=12, timeout_seconds=args.timeout, retry_limit=0).model_dump(), "rows": []} for variant in variants]}
    total = len(dataset["cases"]) * len(variants) * args.repeats
    done = 0
    # Alternate variant order to reduce a fixed advantage from warm-up and request order.
    for repeat in range(1, args.repeats + 1):
        for number, case in enumerate(dataset["cases"]):
            order = result["variants"] if (number + repeat) % 2 else list(reversed(result["variants"]))
            for variant in order:
                row = await evaluate_case(case, Settings.model_validate(variant["settings"]))
                row["repeat"] = repeat
                variant["rows"].append(row)
                done += 1
                save(args.output, result)
                print(f"[{done}/{total}] {variant['id']} / {case['id']} / {repeat}: "
                      f"{'pass' if row['score']['passed'] else 'fail'} ({row['elapsed_ms']:.0f} ms)", flush=True)
    for variant in result["variants"]:
        variant["summary"] = summarize(variant["rows"])
    result["status"] = "completed"
    result["completed_at"] = datetime.now(timezone.utc).isoformat()
    save(args.output, result)
    if args.publish:
        if args.dataset.resolve() != (ROOT / "evals" / "cases.json").resolve():
            raise ValueError("Publishing is limited to the repository's synthetic dataset")
        save(ROOT / "evals" / "published.json", result)
        content = json.dumps(result, ensure_ascii=False).replace("<", "\\u003c")
        (ROOT / "assets" / "evaluation-data.js").write_text("globalThis.AgentFlowEvaluation = " + content + ";\n", encoding="utf-8")
    print(json.dumps({item["id"]: item["summary"] for item in result["variants"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="", help="Exact installed Ollama tag; omit to run only rules")
    parser.add_argument("--dataset", type=Path, default=ROOT / "evals" / "cases.json")
    parser.add_argument("--repeats", type=int, choices=range(1, 6), default=2)
    parser.add_argument("--timeout", type=int, choices=range(1, 181), default=120)
    parser.add_argument("--output", type=Path, default=ROOT / ".agentflow" / "evaluations" / "latest.json")
    parser.add_argument("--publish", action="store_true", help="Update the bundled synthetic evaluation in the website")
    asyncio.run(main(parser.parse_args()))
