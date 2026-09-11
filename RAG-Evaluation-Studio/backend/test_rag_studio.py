import unittest

from rag_studio import RetrievalIndex, evaluate_all, evaluate_case, load_cases, load_corpus, retrieve


class RetrievalIndexTests(unittest.TestCase):
    def setUp(self):
        self.corpus = load_corpus()
        self.index = RetrievalIndex(self.corpus)

    def test_search_exposes_explainability_fields(self):
        results = retrieve("Embedding 和 BM25 适合什么场景？", top_k=2, index=self.index)
        self.assertEqual(results[0]["id"], "kb-004")
        self.assertEqual(results[0]["rank"], 1)
        self.assertIn("embedding", results[0]["matched_tokens"])
        self.assertIn("embedding", results[0]["contributions"])
        self.assertEqual(results[0]["query_tokens"], ["embedding", "bm25", "适", "合", "什", "么", "场", "景"])

    def test_min_score_filters_candidates_before_top_k(self):
        results = retrieve("zzzz_unique", top_k=3, min_score=0.1, index=self.index)
        self.assertEqual(results, [])


class EvaluationTests(unittest.TestCase):
    def test_aggregate_contains_rank_metrics(self):
        result = evaluate_all(top_k=3)
        self.assertEqual(result["case_count"], len(load_cases()))
        self.assertIn("mrr", result["aggregate"])
        self.assertIn("recall_at_k", result["aggregate"])
        self.assertIn("diagnostics", result["results"][0])

    def test_ollama_failure_is_recorded(self):
        result = evaluate_case(
            load_cases()[0], top_k=2, corpus=load_corpus(), provider="ollama",
            model="test", ollama_url="http://127.0.0.1:1",
        )
        self.assertEqual(result["generation"]["provider"], "ollama")
        self.assertIsNotNone(result["generation"]["error"])
        self.assertIn("模型未返回", result["answer"])


if __name__ == "__main__":
    unittest.main()
