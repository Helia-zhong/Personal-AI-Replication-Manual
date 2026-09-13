from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class VideoInsightStore:
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
                CREATE TABLE IF NOT EXISTS inspection_runs (
                    run_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    clip_id TEXT NOT NULL,
                    quality REAL NOT NULL,
                    issue_count INTEGER NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS highlight_edits (
                    edit_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    clip_id TEXT NOT NULL,
                    editor TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_highlight_edits_clip_time
                    ON highlight_edits(clip_id, created_at);
                """
            )

    def add_inspection(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO inspection_runs VALUES (?, ?, ?, ?, ?, ?)",
                (record["run_id"], record["created_at"], record["clip_id"], record["quality"], record["issue_count"], json.dumps(record["payload"], ensure_ascii=False)),
            )
        return record

    def inspections(self, limit: int = 30) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM inspection_runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [self._decode(row) for row in rows]

    def add_highlight_edit(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO highlight_edits VALUES (?, ?, ?, ?, ?)",
                (record["edit_id"], record["created_at"], record["clip_id"], record["editor"], json.dumps(record["payload"], ensure_ascii=False)),
            )
        return record

    def highlight_edits(self, clip_id: str | None = None, limit: int = 30) -> list[dict[str, Any]]:
        query = "SELECT * FROM highlight_edits"
        params: tuple[Any, ...] = ()
        if clip_id:
            query += " WHERE clip_id = ?"
            params = (clip_id,)
        query += " ORDER BY created_at DESC LIMIT ?"
        params += (limit,)
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [self._decode(row) for row in rows]

    @staticmethod
    def _decode(row: sqlite3.Row) -> dict[str, Any]:
        record = dict(row)
        record["payload"] = json.loads(record["payload"])
        return record
