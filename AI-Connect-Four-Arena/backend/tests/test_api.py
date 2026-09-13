from __future__ import annotations

import os
import tempfile
import unittest


class ArenaApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.database = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
        cls.database.close()
        os.environ["CONNECT_FOUR_DB"] = cls.database.name
        from fastapi.testclient import TestClient
        from app import app

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        os.unlink(cls.database.name)
        os.environ.pop("CONNECT_FOUR_DB", None)

    def test_benchmark_run_is_persisted(self) -> None:
        run = self.client.post("/api/benchmarks", params={"depth": 2})
        self.assertEqual(run.status_code, 200)
        self.assertEqual(run.json()["depth"], 2)
        self.assertEqual(len(self.client.get("/api/benchmarks").json()), 1)

    def test_match_record_is_validated_and_persisted(self) -> None:
        record = {
            "match_id": "match-test-001", "result": "ai", "moves": 12, "depth": 4,
            "challenge_id": "block-threat", "ended_at": "2026-09-13T00:00:00+00:00", "board_key": "0" * 42,
        }
        response = self.client.post("/api/matches", json=record)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/matches").json()[0]["match_id"], "match-test-001")
        invalid = {**record, "result": "invalid"}
        self.assertEqual(self.client.post("/api/matches", json=invalid).status_code, 422)

    def test_static_app_entry_is_served(self) -> None:
        self.assertEqual(self.client.get("/web/index.html").status_code, 200)


if __name__ == "__main__":
    unittest.main()
