from __future__ import annotations

import os
import tempfile
import unittest


class RAGStudioApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.database = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
        cls.database.close()
        os.environ["RAG_STUDIO_DB"] = cls.database.name
        from fastapi.testclient import TestClient
        from app import app

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        os.unlink(cls.database.name)
        os.environ.pop("RAG_STUDIO_DB", None)

    def test_evaluation_run_is_persisted(self) -> None:
        before = len(self.client.get("/api/runs").json())
        response = self.client.post("/api/runs/evaluate?top_k=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mode"], "evaluate")
        self.assertEqual(response.json()["top_k"], 2)
        self.assertEqual(len(self.client.get("/api/runs").json()), before + 1)

    def test_query_run_and_validation(self) -> None:
        response = self.client.post("/api/runs/query", params={"q": "BM25 适合什么场景？", "top_k": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mode"], "query")
        self.assertEqual(response.json()["question"], "BM25 适合什么场景？")
        self.assertEqual(self.client.post("/api/runs/query", params={"q": ""}).status_code, 422)

    def test_static_entry_and_root_redirect(self) -> None:
        self.assertEqual(self.client.get("/web/index.html").status_code, 200)
        response = self.client.get("/", follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers["location"], "/web/index.html")


if __name__ == "__main__":
    unittest.main()
