from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).resolve().parent))

from run_monitor import get_run, load_runs, summarize_all, summarize_run


app = FastAPI(title="Agent Run Monitor", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/runs")
def runs() -> list[dict]:
    return load_runs()


@app.get("/api/summary")
def summary() -> dict:
    return summarize_all()


@app.get("/api/runs/{run_id}/summary")
def run_summary(run_id: str) -> dict:
    try:
        return summarize_run(get_run(run_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8040)
