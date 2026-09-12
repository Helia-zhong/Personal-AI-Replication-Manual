from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(str(Path(__file__).resolve().parent))

from contracts import ExperimentRequest
from model_router import get_task, load_models, load_tasks, route_all, route_task
from store import ExperimentStore


app = FastAPI(title="Model Router Sandbox", version="2.0.0")
store = ExperimentStore(os.environ.get("MODEL_ROUTER_DB", str(Path(__file__).resolve().parents[1] / ".router/experiments.sqlite3")))
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(127\.0\.0\.1|localhost)(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "model-router-sandbox"}


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


@app.post("/api/experiments")
def create_experiment(request: ExperimentRequest) -> dict:
    try:
        task = get_task(request.task_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    effective_task = {
        **task,
        "max_budget_usd": task["max_budget_usd"] * request.budget_multiplier,
        "min_quality": max(0, min(1, task["min_quality"] + request.quality_adjustment)),
    }
    raw_weights = request.weights.model_dump() if request.weights else None
    if raw_weights:
        total = sum(raw_weights.values())
        raw_weights = {key: value / total for key, value in raw_weights.items()}
    record = {
        "experiment_id": f"exp-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "request": request.model_dump(mode="json"),
        "result": route_task(effective_task, weights=raw_weights),
    }
    return store.add(record)


@app.get("/api/experiments")
def experiments() -> list[dict]:
    return store.all()


@app.get("/")
def home():
    return RedirectResponse("/web/index.html")


app.mount("/data", StaticFiles(directory=Path(__file__).resolve().parents[1] / "data"), name="data")
app.mount("/web", StaticFiles(directory=Path(__file__).resolve().parents[1] / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8060)
