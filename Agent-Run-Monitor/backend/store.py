import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from contracts import Run


class RunConflict(ValueError):
    pass


class RunStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, body TEXT NOT NULL)")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def ingest(self, runs: list[Run]):
        inserted = duplicates = 0
        # Compare and insert under one write lock; a conflict rolls back the batch.
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for run in runs:
                body = json.dumps(run.model_dump(mode="json"), sort_keys=True, ensure_ascii=False)
                row = db.execute("SELECT body FROM runs WHERE id=?", (run.run_id,)).fetchone()
                if row:
                    if row[0] != body:
                        raise RunConflict(f"run_id already exists with different data: {run.run_id}")
                    duplicates += 1
                else:
                    db.execute("INSERT INTO runs VALUES (?, ?)", (run.run_id, body))
                    inserted += 1
        return {"inserted": inserted, "duplicates": duplicates}

    def all(self):
        with self.connect() as db:
            rows = db.execute("SELECT body FROM runs ORDER BY id").fetchall()
        runs = [json.loads(row[0]) for row in rows]
        return sorted(runs, key=lambda run: (Run.model_validate(run).started_at, run["run_id"]), reverse=True)

    def get(self, run_id):
        with self.connect() as db:
            row = db.execute("SELECT body FROM runs WHERE id=?", (run_id,)).fetchone()
        if row is None:
            raise KeyError(run_id)
        return json.loads(row[0])
