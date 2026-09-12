"""Measure the sibling RAG baseline; no simulated timing or token estimates."""

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "backend"))
sys.path.insert(0, str(PROJECT.parent / "RAG-Evaluation-Studio/backend"))

from rag_studio import RetrievalIndex, load_cases, load_corpus
from recorder import Recorder


def capture(output, inject_failure=False):
    objective = "Measure local BM25 retrieval and reference checks"
    if inject_failure:
        objective += " (controlled failure injection)"
    recorder = Recorder("rag_baseline_pipeline", objective)
    with recorder.step("Load corpus", tool="json_reader"):
        corpus, cases = load_corpus(), load_cases()
    with recorder.step("Build index", tool="bm25_index"):
        index = RetrievalIndex(corpus)

    def query(case):
        with recorder.step(case["id"], agent="retriever", tool="bm25_search") as span:
            hits = index.search(case["question"], top_k=3)
            span["notes"] = "Retrieved IDs: " + ", ".join(item["id"] for item in hits)
            return {item["id"] for item in hits}

    with ThreadPoolExecutor(max_workers=3) as pool:
        hits = list(pool.map(query, cases))
    try:
        with recorder.step("Validate references", agent="validator", tool="reference_check") as span:
            if inject_failure:
                raise ValueError("Controlled failure for diagnostic verification")
            missing = sum(len(set(case["expected_doc_ids"]) - result) for case, result in zip(cases, hits))
            span["notes"] = f"Missing expected references: {missing}"
    except ValueError:
        pass
    return recorder.export(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=PROJECT / ".monitor/captured.json")
    parser.add_argument("--inject-failure", action="store_true")
    args = parser.parse_args()
    run = capture(args.output, args.inject_failure)
    print(f"{run['run_id']}: {len(run['steps'])} measured steps -> {args.output}")
