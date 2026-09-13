from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class CurationStore:
    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS audit_runs (
                    run_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    dataset_id TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    sample_count INTEGER NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS curation_reviews (
                    review_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    dataset_id TEXT NOT NULL,
                    sample_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    note TEXT NOT NULL,
                    reviewer TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_reviews_dataset_sample
                    ON curation_reviews(dataset_id, sample_id, created_at);
                CREATE TABLE IF NOT EXISTS release_runs (
                    run_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    dataset_id TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    passed INTEGER NOT NULL,
                    total INTEGER NOT NULL,
                    payload TEXT NOT NULL
                );
                """
            )

    def add_audit_run(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO audit_runs VALUES (?, ?, ?, ?, ?, ?)",
                (record["run_id"], record["created_at"], record["dataset_id"], record["risk_level"], record["sample_count"], json.dumps(record["payload"], ensure_ascii=False)),
            )
        return record

    def audit_runs(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM audit_runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [self._decode_payload(row) for row in rows]

    def add_review(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO curation_reviews VALUES (?, ?, ?, ?, ?, ?, ?)",
                tuple(record[key] for key in ("review_id", "created_at", "dataset_id", "sample_id", "status", "note", "reviewer")),
            )
        return record

    def reviews(self, dataset_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        query = "SELECT * FROM curation_reviews"
        params: tuple[Any, ...] = ()
        if dataset_id:
            query += " WHERE dataset_id = ?"
            params = (dataset_id,)
        query += " ORDER BY created_at DESC LIMIT ?"
        params += (limit,)
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def add_release_run(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO release_runs VALUES (?, ?, ?, ?, ?, ?, ?)",
                (record["run_id"], record["created_at"], record["dataset_id"], record["decision"], record["passed"], record["total"], json.dumps(record["payload"], ensure_ascii=False)),
            )
        return record

    def release_runs(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM release_runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [self._decode_payload(row) for row in rows]

    @staticmethod
    def _decode_payload(row: sqlite3.Row) -> dict[str, Any]:
        record = dict(row)
        record["payload"] = json.loads(record["payload"])
        return record
