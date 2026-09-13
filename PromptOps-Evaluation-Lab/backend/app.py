from __future__ import annotations

from pathlib import Path
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parent))

from promptops import compare_templates, evaluate_template, load_cases, load_templates
from store import PromptOpsStore


app = FastAPI(title="PromptOps Evaluation Lab", version="2.0.0")
store = PromptOpsStore(os.environ.get("PROMPTOPS_DB", str(Path(__file__).resolve().parents[1] / ".promptops/runs.sqlite3")))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "promptops-evaluation-lab"}


@app.get("/api/cases")
def cases() -> list[dict]:
    return load_cases()


@app.get("/api/templates")
def templates() -> list[dict]:
    return load_templates()


@app.get("/api/evaluate/{template_id}")
def evaluate(template_id: str, provider: str = Query("mock"), model: str = Query(""), timeout: int = Query(120, ge=1, le=300)) -> dict:
    return evaluate_template(template_id, provider=provider, model=model, timeout=timeout)


@app.get("/api/compare")
def compare(provider: str = Query("mock"), model: str = Query(""), timeout: int = Query(120, ge=1, le=300)) -> dict:
    return compare_templates(provider=provider, model=model, timeout=timeout)


def _save_run(mode: str, template_id: str, provider: str, model: str, payload: dict) -> dict:
    if mode == "evaluate":
        overall = payload["aggregate"]["overall"]
    else:
        values = [item["aggregate"]["overall"] for item in payload["templates"]]
        overall = sum(values) / max(len(values), 1)
    return store.add({
        "run_id": f"eval-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "template_id": template_id,
        "provider": provider,
        "model": model or None,
        "overall": round(overall, 4),
        "payload": payload,
    })


@app.post("/api/runs/evaluate/{template_id}")
def save_evaluation(template_id: str, provider: str = Query("mock"), model: str = Query(""), timeout: int = Query(120, ge=1, le=300)) -> dict:
    try:
        payload = evaluate_template(template_id, provider=provider, model=model, timeout=timeout)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _save_run("evaluate", template_id, provider, model, payload)


@app.post("/api/runs/compare")
def save_comparison(provider: str = Query("mock"), model: str = Query(""), timeout: int = Query(120, ge=1, le=300)) -> dict:
    try:
        payload = compare_templates(provider=provider, model=model, timeout=timeout)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _save_run("compare", "all", provider, model, payload)


@app.get("/api/runs")
def run_history() -> list[dict]:
    return store.all()


@app.get("/")
def home() -> RedirectResponse:
    return RedirectResponse("/web/index.html")


app.mount("/data", StaticFiles(directory=Path(__file__).resolve().parents[1] / "data"), name="data")
app.mount("/web", StaticFiles(directory=Path(__file__).resolve().parents[1] / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8020)
