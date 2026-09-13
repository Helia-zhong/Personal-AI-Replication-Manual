import copy
import importlib
import os
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from contracts import ExperimentRequest, ModelProfile, RoutingTask, WeightProfile
from model_router import load_models, load_tasks, route_all, route_task
from store import ExperimentStore


class RoutingTests(unittest.TestCase):
    def test_baseline_shape_and_blocked_task(self):
        result = route_all()
        self.assertEqual(result["route_count"], 5)
        self.assertEqual(result["routes"][1]["recommended"], None)
        self.assertEqual(result["routes"][0]["recommended"]["model_id"], "balanced-pro")
        self.assertEqual(sum(len(route["rejected"]) for route in result["routes"]), 17)

    def test_weight_override_changes_score_but_not_constraints(self):
        task = copy.deepcopy(load_tasks()[0])
        baseline = route_task(task)
        changed = route_task(task, weights={"quality": 0, "safety": 0, "latency": 1, "cost": 0, "context": 0})
        self.assertEqual({item["model_id"] for item in baseline["candidates"]}, {item["model_id"] for item in changed["candidates"]})
        self.assertNotEqual(baseline["recommended"]["score"], changed["recommended"]["score"])


class ContractTests(unittest.TestCase):
    def test_strict_profiles_and_nonzero_weights(self):
        self.assertEqual(ModelProfile.model_validate(load_models()[0]).id, "fast-mini")
        self.assertEqual(RoutingTask.model_validate(load_tasks()[0]).id, "task-001")
        with self.assertRaises(ValidationError):
            WeightProfile.model_validate({"quality": 0, "safety": 0, "latency": 0, "cost": 0, "context": 0})
        with self.assertRaises(ValidationError):
            ExperimentRequest.model_validate({"task_id": "task-001", "budget_multiplier": 0})


class StoreTests(unittest.TestCase):
    def test_experiment_persistence(self):
        with TemporaryDirectory() as directory:
            store = ExperimentStore(Path(directory) / "experiments.db")
            record = {"experiment_id": "exp-1", "created_at": "2026-09-12T00:00:00+00:00", "request": {"task_id": "task-001"}, "result": {"recommended": None}}
            store.add(record)
            self.assertEqual(store.all()[0]["experiment_id"], "exp-1")


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = TemporaryDirectory()
        with patch.dict(os.environ, {"MODEL_ROUTER_DB": str(Path(cls.directory.name) / "initial.db")}):
            cls.module = importlib.import_module("app")

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def setUp(self):
        self.temp = TemporaryDirectory()
        self.patch = patch.object(self.module, "store", ExperimentStore(Path(self.temp.name) / "experiments.db"))
        self.patch.start()
        self.client = TestClient(self.module.app)

    def tearDown(self):
        self.client.close()
        self.patch.stop()
        self.temp.cleanup()

    def test_routes_experiment_and_static_data(self):
        self.assertEqual(self.client.get("/health").json()["service"], "model-router-sandbox")
        self.assertEqual(self.client.get("/api/routes/task-002").json()["recommended"], None)
        payload = {"task_id": "task-002", "budget_multiplier": 1, "quality_adjustment": -0.1, "weights": {"quality": 0.42, "safety": 0.28, "latency": 0.1, "cost": 0.1, "context": 0.1}}
        response = self.client.post("/api/experiments", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["result"]["recommended"]["model_id"], "local-private")
        experiment_id = response.json()["experiment_id"]
        self.assertEqual(len(self.client.get("/api/experiments").json()), 1)
        self.assertEqual(self.client.get(f"/api/experiments/{experiment_id}").json()["experiment_id"], experiment_id)
        self.assertEqual(self.client.get("/api/experiments/missing").status_code, 404)
        self.assertEqual(self.client.get("/data/models.json").status_code, 200)
        self.assertEqual(self.client.get("/web/index.html").status_code, 200)

    def test_invalid_experiment(self):
        self.assertEqual(self.client.post("/api/experiments", json={"task_id": "missing"}).status_code, 404)
        self.assertEqual(self.client.post("/api/experiments", json={"task_id": "task-001", "weights": {"quality": 0, "safety": 0, "latency": 0, "cost": 0, "context": 0}}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
