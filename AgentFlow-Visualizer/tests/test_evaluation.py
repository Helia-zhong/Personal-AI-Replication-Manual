import json
import unittest
from pathlib import Path

from backend.contracts import Draft
from backend.evaluation import score_case, summarize, validate_dataset


ROOT = Path(__file__).resolve().parents[1]


class EvaluationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = json.loads((ROOT / "evals" / "cases.json").read_text(encoding="utf-8"))

    def test_repository_dataset_is_self_consistent(self):
        validate_dataset(self.dataset)

    def test_wrong_class_and_missing_quote_are_diagnosed(self):
        case = next(item for item in self.dataset["cases"] if item["id"] == "negation")
        draft = Draft.model_validate({"items": [
            {"kind": "action", "line": 1, "text": "本周不需要跟进旧工单。"},
            {"kind": "decision", "line": 2, "text": "决定：停止旧版数据同步。"},
        ]})
        result = score_case(case, draft)
        self.assertFalse(result["passed"])
        self.assertEqual(result["tp"], 1)
        self.assertEqual({issue["code"] for issue in result["issues"]}, {"wrong_class", "missing"})

    def test_rejection_is_scored_separately_from_extraction(self):
        case = next(item for item in self.dataset["cases"] if item["expected"] == "reject")
        result = score_case(case, None, "no_content")
        summary = summarize([{"score": result, "expected": "reject", "schema_valid": False, "evidence_valid": False,
                              "elapsed_ms": 1, "usage": {"input_tokens": None, "output_tokens": None}}])
        self.assertTrue(result["passed"])
        self.assertEqual(summary["rejection_correct_rate"], 1.0)


if __name__ == "__main__":
    unittest.main()
