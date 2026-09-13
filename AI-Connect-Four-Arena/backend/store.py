from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class ArenaStore:
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
                CREATE TABLE IF NOT EXISTS matches (
                    match_id TEXT PRIMARY KEY,
                    result TEXT NOT NULL,
                    moves INTEGER NOT NULL,
                    depth INTEGER NOT NULL,
                    challenge_id TEXT NOT NULL,
                    ended_at TEXT NOT NULL,
                    board_key TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS benchmark_runs (
                    run_id TEXT PRIMARY KEY,
                    depth INTEGER NOT NULL,
                    pass_count INTEGER NOT NULL,
                    total_count INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                """
            )

    def add_match(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO matches (match_id, result, moves, depth, challenge_id, ended_at, board_key) VALUES (?, ?, ?, ?, ?, ?, ?)",
                tuple(record[key] for key in ("match_id", "result", "moves", "depth", "challenge_id", "ended_at", "board_key")),
            )
        return record

    def matches(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM matches ORDER BY ended_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(row) for row in rows]

    def add_benchmark(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO benchmark_runs VALUES (?, ?, ?, ?, ?, ?)",
                (record["run_id"], record["depth"], record["pass_count"], record["total_count"], record["created_at"], json.dumps(record["payload"], ensure_ascii=False)),
            )
        return record

    def benchmarks(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM benchmark_runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        records = []
        for row in rows:
            record = dict(row)
            record["payload"] = json.loads(record["payload"])
            records.append(record)
        return records
