import json
import unittest

from promptops import evaluate_template, ollama_response, score_response


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return json.dumps(self.payload, ensure_ascii=False).encode("utf-8")


class PromptOpsTests(unittest.TestCase):
    def test_mock_evaluation_keeps_runtime_explicit(self):
        result = evaluate_template("guarded")
        self.assertEqual(result["provider"], "mock")
        self.assertEqual(len(result["results"]), 5)
        self.assertIsNone(result["results"][0]["runtime"]["latency_ms"])

    def test_ollama_adapter_sends_rendered_prompt_and_usage(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"model": "fixture", "message": {"content": "{\"ok\":true}"},
                                 "prompt_eval_count": 12, "eval_count": 4})

        result = ollama_response("上下文：{{context}}\n输入：{{input}}", {
            "input": "测试问题", "context": "测试上下文"
        }, "fixture", opener=opener)
        payload = json.loads(calls[0][0].data.decode("utf-8"))
        self.assertEqual(result["usage"]["output_tokens"], 4)
        self.assertIn("测试问题", payload["messages"][1]["content"])
        self.assertEqual(calls[0][1], 120)

    def test_quality_score_penalizes_forbidden_content(self):
        case = {"expected_keywords": ["安全"], "forbidden_keywords": ["密码"], "format": "refusal", "should_refuse": True}
        score = score_response(case, "不能提供密码。")
        self.assertEqual(score["refusal_score"], 1.0)
        self.assertEqual(score["forbidden_penalty"], 1.0)

    def test_ollama_failure_is_kept_as_a_case_error(self):
        result = evaluate_template("guarded", provider="ollama", model="fixture", timeout=1)
        self.assertEqual(result["failed_cases"], len(result["results"]))
        self.assertTrue(all(item["error"] for item in result["results"]))
        self.assertEqual(result["results"][0]["response"], "")


if __name__ == "__main__":
    unittest.main()
