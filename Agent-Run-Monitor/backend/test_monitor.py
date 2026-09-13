import copy
import importlib
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from contracts import Run, RunBatch
from recorder import Recorder
from run_monitor import detect_incidents, load_runs, summarize_all, summarize_run
from store import RunConflict, RunStore


def fixture(run_id="test-run"):
    run = copy.deepcopy(load_runs()[0])
    run["run_id"] = run_id
    return run


class MetricsTests(unittest.TestCase):
    def test_parallel_offsets_are_not_added(self):
        run = fixture()
        run["steps"] = run["steps"][:3]
        for step, start, duration in zip(run["steps"], [0, 0, 120], [100, 80, 30]):
            step.update(start_ms=start, duration_ms=duration)
        report = summarize_run(run)
        self.assertEqual(report["metrics"]["total_duration_ms"], 150)
        self.assertEqual(report["metrics"]["step_work_ms"], 210)
        self.assertEqual(report["timeline"][1]["start_ms"], 0)

    def test_sample_regression(self):
        result = summarize_all()
        self.assertEqual(result["aggregate"]["run_count"], 3)
        self.assertEqual(sum(len(run["incidents"]) for run in result["runs"]), 7)
        self.assertEqual(result["aggregate"]["p95_duration_ms"], 40900)

    def test_unknown_cost_is_not_complete_zero(self):
        run = fixture()
        for step in run["steps"]:
            step["cost_usd"] = None
            step["tokens_in"] = None
        metrics = summarize_run(run)["metrics"]
        self.assertEqual(metrics["estimated_cost_usd"], 0)
        self.assertFalse(metrics["cost_complete"])
        self.assertFalse(metrics["tokens_complete"])

    def test_empty_workspace(self):
        self.assertEqual(summarize_all([])["aggregate"]["run_count"], 0)
        self.assertIsNone(summarize_all([])["aggregate"]["p95_duration_ms"])

    def test_incidents_identify_duplicate_step_names(self):
        run = fixture()
        for step in run["steps"]:
            step.update(name="same", status="failed")
        failures = [item for item in detect_incidents(run) if item["severity"] == "high"]
        self.assertEqual(len({item["id"] for item in failures}), 5)
        self.assertEqual(failures[0]["step_id"], "s1")


class ContractTests(unittest.TestCase):
    def test_reject_invalid_traces(self):
        for field, value in [("duration_ms", -1), ("duration_ms", float("nan")),
                             ("tokens_in", 1.5), ("retries", True), ("status", "running")]:
            with self.subTest(field=field, value=value):
                run = fixture()
                run["steps"][0][field] = value
                with self.assertRaises(ValidationError):
                    Run.model_validate(run)

    def test_reject_empty_duplicate_partial_offsets_and_timezone(self):
        cases = []
        run = fixture(); run["steps"] = []; cases.append(run)
        run = fixture(); run["steps"][1]["id"] = "s1"; cases.append(run)
        run = fixture(); run["steps"][0]["start_ms"] = 0; cases.append(run)
        run = fixture(); run["started_at"] = "2026-09-12T12:00:00"; cases.append(run)
        run = fixture(); run["steps"][0]["status"] = "failed"; cases.append(run)
        for run in cases:
            with self.assertRaises(ValidationError):
                Run.model_validate(run)

    def test_duplicate_batch(self):
        with self.assertRaises(ValidationError):
            RunBatch.model_validate({"runs": [fixture(), fixture()]})


class StoreTests(unittest.TestCase):
    def test_persistence_idempotency_and_atomic_conflict(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "runs.db"
            store = RunStore(path)
            original = Run.model_validate(fixture())
            self.assertEqual(store.ingest([original]), {"inserted": 1, "duplicates": 0})
            self.assertEqual(RunStore(path).get(original.run_id)["workflow"], original.workflow)
            self.assertEqual(store.ingest([original]), {"inserted": 0, "duplicates": 1})
            changed = original.model_copy(update={"objective": "Changed"})
            with self.assertRaises(RunConflict):
                store.ingest([Run.model_validate(fixture("new-run")), changed])
            self.assertEqual(len(store.all()), 1)
            with self.assertRaises(KeyError):
                store.get("new-run")


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = TemporaryDirectory()
        with patch.dict(os.environ, {"MONITOR_DB": str(Path(cls.directory.name) / "initial.db")}):
            cls.module = importlib.import_module("app")

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def setUp(self):
        self.temp = TemporaryDirectory()
        self.store_patch = patch.object(self.module, "store", RunStore(Path(self.temp.name) / "runs.db"))
        self.store_patch.start()
        self.client = TestClient(self.module.app)

    def tearDown(self):
        self.client.close()
        self.store_patch.stop()
        self.temp.cleanup()

    def test_import_query_duplicate_conflict(self):
        payload = {"runs": [fixture()]}
        self.assertEqual(self.client.post("/api/runs", json=payload).json()["inserted"], 1)
        self.assertEqual(self.client.post("/api/runs", json=payload).json()["duplicates"], 1)
        self.assertEqual(len(self.client.get("/api/runs").json()), 1)
        self.assertEqual(self.client.get("/api/runs/test-run").json()["run_id"], "test-run")
        self.assertEqual(self.client.get("/api/runs/test-run/summary").status_code, 200)
        self.assertEqual(self.client.get("/api/runs/missing").status_code, 404)
        self.assertEqual(self.client.get("/api/runs/missing/summary").status_code, 404)
        payload["runs"][0]["objective"] = "different"
        self.assertEqual(self.client.post("/api/runs", json=payload).status_code, 409)

    def test_invalid_import_does_not_mutate(self):
        response = self.client.post("/api/runs", json={"runs": [fixture(), {"run_id": "invalid"}]})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.get("/api/runs").json(), [])

    def test_foreign_origin_and_size_limit(self):
        self.assertEqual(self.client.post("/api/runs", json={"runs": [fixture()]},
                                         headers={"origin": "https://example.org"}).status_code, 403)
        self.assertEqual(self.client.post("/api/runs", content=b" " * 2_000_001).status_code, 413)

    def test_real_pages_and_empty_summary(self):
        self.assertEqual(self.client.get("/health").json()["service"], "agent-run-monitor")
        self.assertEqual(self.client.get("/api/summary").json()["aggregate"]["run_count"], 0)
        for page in ("index", "trace", "incidents", "economics"):
            self.assertEqual(self.client.get(f"/web/{page}.html").status_code, 200)


class RecorderTests(unittest.TestCase):
    def test_exception_is_recorded_and_reraised(self):
        recorder = Recorder("test", "Controlled test")
        with self.assertRaises(ValueError):
            with recorder.step("failure"):
                raise ValueError("sensitive input should not be logged")
        with TemporaryDirectory() as directory:
            path = Path(directory) / "trace.json"
            run = recorder.export(path)
            self.assertEqual(run["steps"][0]["notes"], "ValueError")
            self.assertEqual(run["status"], "completed_with_warnings")
            self.assertGreaterEqual(run["steps"][0]["duration_ms"], 0)
            self.assertIsNone(run["steps"][0]["cost_usd"])
            RunBatch.model_validate(json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
