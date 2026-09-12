from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from contracts import Sample


class SampleConflict(ValueError):
    pass


class SampleStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS samples (id TEXT PRIMARY KEY, body TEXT NOT NULL)")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def ingest(self, samples: list[Sample]) -> dict[str, int]:
        inserted = duplicates = 0
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for sample in samples:
                body = json.dumps(sample.model_dump(mode="json"), sort_keys=True, ensure_ascii=False)
                row = db.execute("SELECT body FROM samples WHERE id=?", (sample.id,)).fetchone()
                if row:
                    if row[0] != body:
                        raise SampleConflict(f"sample ID already exists with different data: {sample.id}")
                    duplicates += 1
                else:
                    db.execute("INSERT INTO samples VALUES (?, ?)", (sample.id, body))
                    inserted += 1
        return {"inserted": inserted, "duplicates": duplicates}

    def all(self) -> list[dict]:
        with self.connect() as db:
            rows = db.execute("SELECT body FROM samples ORDER BY id").fetchall()
        return [json.loads(row[0]) for row in rows]

    def get(self, sample_id: str) -> dict:
        with self.connect() as db:
            row = db.execute("SELECT body FROM samples WHERE id=?", (sample_id,)).fetchone()
        if row is None:
            raise KeyError(sample_id)
        return json.loads(row[0])
