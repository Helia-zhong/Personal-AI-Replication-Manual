from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).resolve().parent))

from model_router import get_task, load_models, load_tasks, route_all, route_task


app = FastAPI(title="Model Router Sandbox", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/models")
def models() -> list[dict]:
    return load_models()


@app.get("/api/tasks")
def tasks() -> list[dict]:
    return load_tasks()


@app.get("/api/routes")
def routes() -> dict:
    return route_all()


@app.get("/api/routes/{task_id}")
def route_one(task_id: str) -> dict:
    try:
        return route_task(get_task(task_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8060)
