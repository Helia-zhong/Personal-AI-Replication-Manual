from __future__ import annotations

import os
import tempfile
import unittest


class PromptOpsApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.database = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
        cls.database.close()
        os.environ["PROMPTOPS_DB"] = cls.database.name
        from fastapi.testclient import TestClient
        from app import app

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        os.unlink(cls.database.name)
        os.environ.pop("PROMPTOPS_DB", None)

    def test_evaluation_run_is_persisted(self) -> None:
        before = len(self.client.get("/api/runs").json())
        response = self.client.post("/api/runs/evaluate/guarded")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["template_id"], "guarded")
        self.assertEqual(len(self.client.get("/api/runs").json()), before + 1)

    def test_compare_run_and_unknown_template(self) -> None:
        response = self.client.post("/api/runs/compare")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mode"], "compare")
        self.assertEqual(self.client.post("/api/runs/evaluate/missing").status_code, 400)

    def test_static_app_entry_is_served(self) -> None:
        self.assertEqual(self.client.get("/web/index.html").status_code, 200)


if __name__ == "__main__":
    unittest.main()
