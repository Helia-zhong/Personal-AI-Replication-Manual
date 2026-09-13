from __future__ import annotations

import os
import tempfile
import unittest


class VideoInsightApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.database = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
        cls.database.close()
        os.environ["VIDEO_INSIGHT_DB"] = cls.database.name
        from fastapi.testclient import TestClient
        from app import app

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        os.unlink(cls.database.name)
        os.environ.pop("VIDEO_INSIGHT_DB", None)

    def test_inspection_run_is_persisted(self) -> None:
        response = self.client.post("/api/inspection-runs", params={"clip_id": "launch-teaser"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["clip_id"], "launch-teaser")
        self.assertEqual(len(self.client.get("/api/inspection-runs").json()), 1)

    def test_highlight_version_is_saved_and_validated(self) -> None:
        payload = {"clip_id": "launch-teaser", "highlights": [{"start": 3, "end": 12, "reason": "opening"}]}
        response = self.client.post("/api/highlights", json=payload)
        self.assertEqual(response.status_code, 200)
        history = self.client.get("/api/highlights", params={"clip_id": "launch-teaser"})
        self.assertEqual(history.json()[0]["payload"]["highlights"][0]["start"], 3)
        invalid = {"clip_id": "launch-teaser", "highlights": [{"start": 70, "end": 90, "reason": "outside"}]}
        self.assertEqual(self.client.post("/api/highlights", json=invalid).status_code, 422)

    def test_static_app_entry_is_served(self) -> None:
        self.assertEqual(self.client.get("/web/index.html").status_code, 200)


if __name__ == "__main__":
    unittest.main()
