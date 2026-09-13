from __future__ import annotations

import os
import tempfile
import unittest

from dataset_lab import audit_dataset, get_dataset


class AuditTests(unittest.TestCase):
    def test_audit_has_quality_and_integrity_signals(self) -> None:
        report = audit_dataset(get_dataset("support-qa-playbook"))
        self.assertEqual(report["metrics"]["sample_count"], 5)
        self.assertGreaterEqual(report["metrics"]["leakage_count"], 1)
        self.assertTrue(report["recommendations"])


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.database = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
        cls.database.close()
        os.environ["DATASET_LAB_DB"] = cls.database.name
        from fastapi.testclient import TestClient
        from app import app

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        os.unlink(cls.database.name)
        os.environ.pop("DATASET_LAB_DB", None)

    def test_health_and_audit_run(self) -> None:
        self.assertEqual(self.client.get("/health").status_code, 200)
        run = self.client.post("/api/audit/runs", json={})
        self.assertEqual(run.status_code, 200)
        self.assertTrue(run.json()["run_id"].startswith("audit-"))
        self.assertEqual(len(self.client.get("/api/audit/runs").json()), 1)

    def test_review_is_persisted_and_validated(self) -> None:
        review = self.client.post("/api/reviews", json={"dataset_id": "support-qa-playbook", "sample_id": "qa-003", "status": "keep"})
        self.assertEqual(review.status_code, 200)
        self.assertEqual(review.json()["status"], "keep")
        reviews = self.client.get("/api/reviews", params={"dataset_id": "support-qa-playbook"})
        self.assertEqual(reviews.json()[0]["sample_id"], "qa-003")
        missing = self.client.post("/api/reviews", json={"dataset_id": "support-qa-playbook", "sample_id": "missing", "status": "drop"})
        self.assertEqual(missing.status_code, 404)

    def test_release_run_captures_decision(self) -> None:
        run = self.client.post("/api/release/runs", json={"dataset_id": "support-qa-playbook"})
        self.assertEqual(run.status_code, 200)
        self.assertEqual(run.json()["decision"], "blocked")
        history = self.client.get("/api/release/runs")
        self.assertEqual(history.json()[0]["total"], 4)


if __name__ == "__main__":
    unittest.main()
