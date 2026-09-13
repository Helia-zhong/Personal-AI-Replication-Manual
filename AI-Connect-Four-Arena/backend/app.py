from __future__ import annotations

import sys
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(str(Path(__file__).resolve().parent))

from connect_four import AI, analyze_board, apply_move, build_report, deserialize_board, get_sample, load_samples
from contracts import MatchRecord
from store import ArenaStore


app = FastAPI(title="AI Connect Four Arena", version="2.0.0")
store = ArenaStore(os.environ.get("CONNECT_FOUR_DB", str(Path(__file__).resolve().parents[1] / ".arena/arena.sqlite3")))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_board(board_key: str) -> list[list[int]]:
    return deserialize_board(board_key)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-connect-four-arena"}


@app.get("/api/samples")
def samples() -> list[dict]:
    return load_samples()


@app.get("/api/analyze/{sample_id}")
def analyze_sample(sample_id: str, depth: int = Query(default=4, ge=1, le=6)) -> dict:
    try:
        sample = get_sample(sample_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "sample": sample,
        "analysis": analyze_board(sample["board"], depth=depth),
    }


@app.get("/api/recommend")
def recommend(board: str, depth: int = Query(default=4, ge=1, le=6)) -> dict:
    try:
        parsed = parse_board(board)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return analyze_board(parsed, depth=depth)


@app.get("/api/move")
def move(board: str, column: int, piece: int = Query(default=AI, ge=1, le=2)) -> dict:
    try:
        parsed = parse_board(board)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if column < 0 or column > 6:
        raise HTTPException(status_code=400, detail="Column out of range.")
    try:
        return apply_move(parsed, column, piece)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/report/{sample_id}", response_class=PlainTextResponse)
def report_sample(sample_id: str, depth: int = Query(default=4, ge=1, le=6)) -> str:
    try:
        sample = get_sample(sample_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    analysis = analyze_board(sample["board"], depth=depth)
    return build_report(sample["title"], analysis, history=[sample["note"]])


@app.get("/api/export", response_class=PlainTextResponse)
def export_board(board: str, depth: int = Query(default=4, ge=1, le=6), title: str = "Custom Position") -> str:
    try:
        parsed = parse_board(board)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    analysis = analyze_board(parsed, depth=depth)
    return build_report(title, analysis)


@app.post("/api/benchmarks")
def run_benchmark(depth: int = Query(default=4, ge=1, le=6)) -> dict:
    results = []
    for sample in load_samples():
        analysis = analyze_board(sample["board"], depth=depth)
        actual = analysis["best_move"]["column"]
        expected = int(sample["expected_best_column"])
        results.append({"sample_id": sample["id"], "expected_column": expected, "actual_column": actual, "score": analysis["best_move"]["score"], "passed": actual == expected})
    record = {
        "run_id": f"benchmark-{uuid4().hex}",
        "depth": depth,
        "pass_count": sum(item["passed"] for item in results),
        "total_count": len(results),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payload": {"depth": depth, "results": results},
    }
    return store.add_benchmark(record)


@app.get("/api/benchmarks")
def benchmark_history() -> list[dict]:
    return store.benchmarks()


@app.post("/api/matches")
def save_match(record: MatchRecord) -> dict:
    return store.add_match(record.model_dump())


@app.get("/api/matches")
def match_history() -> list[dict]:
    return store.matches()


@app.get("/")
def home():
    from fastapi.responses import RedirectResponse

    return RedirectResponse("/web/index.html")


app.mount("/data", StaticFiles(directory=Path(__file__).resolve().parents[1] / "data"), name="data")
app.mount("/web", StaticFiles(directory=Path(__file__).resolve().parents[1] / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8080)
