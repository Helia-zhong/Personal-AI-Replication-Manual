from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class PromptOpsStore:
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
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS evaluation_runs (
                    run_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT,
                    overall REAL NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )

    def add(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO evaluation_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (record["run_id"], record["created_at"], record["mode"], record["template_id"], record["provider"], record["model"], record["overall"], json.dumps(record["payload"], ensure_ascii=False)),
            )
        return record

    def all(self, limit: int = 40) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM evaluation_runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        records = []
        for row in rows:
            record = dict(row)
            record["payload"] = json.loads(record["payload"])
            records.append(record)
        return records
