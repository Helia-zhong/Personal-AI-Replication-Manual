import copy
import importlib
import json
import os
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from content_qa import audit_all, audit_sample, load_samples, release_gate
from contracts import Sample, SampleBatch
from store import SampleConflict, SampleStore


def fixture(sample_id="content-test"):
    sample = copy.deepcopy(load_samples()[0])
    sample["id"] = sample_id
    return sample


class EngineTests(unittest.TestCase):
    def test_baseline_metrics_and_stable_claim_ids(self):
        report = audit_all()
        self.assertEqual(report["aggregate"]["sample_count"], 3)
        self.assertEqual(report["aggregate"]["total_issues"], 5)
        first = audit_sample(fixture())
        self.assertEqual(first["claims"][0]["claim_id"], "content-test:claim-001")
        self.assertEqual(first["gate"]["passed"], False)

    def test_gate_passes_for_supported_content(self):
        sample = fixture()
        sample["content"] = "系统支持统一检索并附带来源引用 [S1]。"
        report = audit_sample(sample)
        self.assertTrue(report["gate"]["passed"])
        self.assertEqual(release_gate(report["metrics"]), report["gate"])


class ContractTests(unittest.TestCase):
    def test_unique_ids_and_strict_fields(self):
        sample = fixture()
        sample["sources"] = [sample["sources"][0], sample["sources"][0]]
        with self.assertRaises(ValidationError):
            Sample.model_validate(sample)
        with self.assertRaises(ValidationError):
            Sample.model_validate({**fixture(), "unexpected": True})
        with self.assertRaises(ValidationError):
            SampleBatch.model_validate({"samples": [fixture(), fixture()]})


class StoreTests(unittest.TestCase):
    def test_idempotency_conflict_and_rollback(self):
        with TemporaryDirectory() as directory:
            store = SampleStore(Path(directory) / "samples.db")
            original = Sample.model_validate(fixture())
            self.assertEqual(store.ingest([original]), {"inserted": 1, "duplicates": 0})
            self.assertEqual(store.ingest([original]), {"inserted": 0, "duplicates": 1})
            changed = original.model_copy(update={"title": "changed"})
            with self.assertRaises(SampleConflict):
                store.ingest([Sample.model_validate(fixture("new")), changed])
            self.assertEqual(len(store.all()), 1)


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = TemporaryDirectory()
        with patch.dict(os.environ, {"CONTENT_QA_DB": str(Path(cls.directory.name) / "initial.db")}):
            cls.module = importlib.import_module("app")

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def setUp(self):
        self.temp = TemporaryDirectory()
        self.patch = patch.object(self.module, "store", SampleStore(Path(self.temp.name) / "samples.db"))
        self.patch.start()
        self.client = TestClient(self.module.app)

    def tearDown(self):
        self.client.close()
        self.patch.stop()
        self.temp.cleanup()

    def test_import_query_conflict_and_static_pages(self):
        payload = {"samples": [fixture()]}
        self.assertEqual(self.client.get("/health").json()["service"], "content-qa-workbench")
        self.assertEqual(self.client.post("/api/samples", json=payload).json()["inserted"], 1)
        self.assertEqual(self.client.post("/api/samples", json=payload).json()["duplicates"], 1)
        self.assertEqual(self.client.get("/api/samples").json()[0]["id"], "content-test")
        self.assertEqual(self.client.get("/api/samples/content-test").json()["id"], "content-test")
        self.assertEqual(self.client.get("/api/samples/missing").status_code, 404)
        self.assertEqual(self.client.get("/api/audit").json()["aggregate"]["sample_count"], 1)
        self.assertEqual(self.client.get("/api/audit/content-test").status_code, 200)
        payload["samples"][0]["title"] = "conflict"
        self.assertEqual(self.client.post("/api/samples", json=payload).status_code, 409)
        self.assertEqual(self.client.get("/web/index.html").status_code, 200)

    def test_invalid_batch_and_foreign_origin_do_not_mutate(self):
        invalid = {"samples": [fixture(), {"id": "bad", "title": "x"}]}
        self.assertEqual(self.client.post("/api/samples", json=invalid).status_code, 422)
        self.assertEqual(self.client.get("/api/samples").json(), [])
        self.assertEqual(self.client.post("/api/samples", json={"samples": [fixture()]}, headers={"origin": "https://example.org"}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
