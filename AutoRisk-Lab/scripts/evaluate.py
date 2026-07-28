from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "data" / "scenes.json"
LEVELS = ["low", "medium", "high"]


def load_scenes() -> list[dict]:
    with DATASET.open("r", encoding="utf-8") as stream:
        return json.load(stream)


def evaluate(scenes: list[dict]) -> dict:
    total = len(scenes)
    correct = 0
    matrix = defaultdict(Counter)
    high_expected = 0
    high_hit = 0

    for scene in scenes:
        expected = scene["risk_level"]
        predicted = scene["model_output"]["risk_level"]
        matrix[expected][predicted] += 1
        if expected == predicted:
            correct += 1
        if expected == "high":
            high_expected += 1
            if predicted == "high":
                high_hit += 1

    return {
        "samples": total,
        "risk_accuracy": correct / total if total else 0,
        "high_risk_recall": high_hit / high_expected if high_expected else 0,
        "confusion_matrix": {
            expected: {predicted: matrix[expected][predicted] for predicted in LEVELS}
            for expected in LEVELS
        },
    }


def main() -> None:
    result = evaluate(load_scenes())
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
