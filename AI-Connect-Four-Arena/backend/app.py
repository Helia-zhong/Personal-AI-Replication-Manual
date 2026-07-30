from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).resolve().parent))

from connect_four import AI, HUMAN, analyze_board, apply_move, get_sample, load_samples, new_board


app = FastAPI(title="AI Connect Four Arena", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_board(board_key: str) -> list[list[int]]:
    digits = [int(char) for char in board_key.strip() if char.isdigit()]
    if len(digits) != 42:
        raise ValueError("Board key must contain 42 digits.")
    return [digits[index : index + 7] for index in range(0, 42, 7)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8080)
