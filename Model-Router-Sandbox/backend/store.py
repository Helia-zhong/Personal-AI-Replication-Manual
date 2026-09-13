from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path


class ExperimentStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS experiments (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, body TEXT NOT NULL)")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def add(self, record: dict) -> dict:
        body = json.dumps(record, sort_keys=True, ensure_ascii=False)
        with self.connect() as db:
            db.execute("INSERT INTO experiments VALUES (?, ?, ?)", (record["experiment_id"], record["created_at"], body))
        return record

    def all(self) -> list[dict]:
        with self.connect() as db:
            rows = db.execute("SELECT body FROM experiments ORDER BY created_at DESC, id DESC").fetchall()
        return [json.loads(row[0]) for row in rows]

    def get(self, experiment_id: str) -> dict:
        with self.connect() as db:
            row = db.execute("SELECT body FROM experiments WHERE id=?", (experiment_id,)).fetchone()
        if row is None:
            raise KeyError(experiment_id)
        return json.loads(row[0])
