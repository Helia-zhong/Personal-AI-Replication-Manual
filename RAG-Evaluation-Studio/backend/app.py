from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(str(Path(__file__).resolve().parent))

from rag_studio import evaluate_all, evaluate_question, load_cases, load_corpus
from store import RAGRunStore


PROJECT_DIR = Path(__file__).resolve().parents[1]
app = FastAPI(title="RAG Evaluation Studio", version="2.0.0")
store = RAGRunStore(os.environ.get("RAG_STUDIO_DB", str(PROJECT_DIR / ".ragstudio/runs.sqlite3")))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000", "http://127.0.0.1:8030", "http://localhost:8030"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/corpus")
def corpus() -> list[dict]:
    return load_corpus()


@app.get("/api/cases")
def cases() -> list[dict]:
    return load_cases()


@app.get("/api/evaluate")
def evaluate(
    top_k: int = Query(default=3, ge=1, le=5),
    provider: str = Query(default="deterministic", pattern="^(deterministic|ollama)$"),
    model: str = Query(default="llama3.2:3b", min_length=1, max_length=80),
    ollama_url: str = Query(default="http://127.0.0.1:11434", max_length=200),
) -> dict:
    return evaluate_all(top_k=top_k, provider=provider, model=model, ollama_url=ollama_url)


@app.get("/api/query")
def query(
    q: str, top_k: int = Query(default=3, ge=1, le=5), min_score: float = Query(default=0, ge=0),
    provider: str = Query(default="deterministic", pattern="^(deterministic|ollama)$"),
    model: str = Query(default="llama3.2:3b", min_length=1, max_length=80),
    ollama_url: str = Query(default="http://127.0.0.1:11434", max_length=200),
) -> dict:
    return evaluate_question(q, top_k=top_k, min_score=min_score, provider=provider, model=model, ollama_url=ollama_url)


def _save_run(mode: str, payload: dict, top_k: int, provider: str, model: str | None, question: str | None = None) -> dict:
    aggregate = payload.get("aggregate", {})
    return store.add({
        "run_id": f"rag-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "question": question,
        "top_k": top_k,
        "provider": provider,
        "model": model if provider == "ollama" else None,
        "overall": round(float(aggregate.get("overall", 0)), 4),
        "payload": payload,
    })


@app.post("/api/runs/evaluate")
def save_evaluation(
    top_k: int = Query(default=3, ge=1, le=5),
    provider: str = Query(default="deterministic", pattern="^(deterministic|ollama)$"),
    model: str = Query(default="llama3.2:3b", min_length=1, max_length=80),
    ollama_url: str = Query(default="http://127.0.0.1:11434", max_length=200),
) -> dict:
    try:
        payload = evaluate_all(top_k=top_k, provider=provider, model=model, ollama_url=ollama_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _save_run("evaluate", payload, top_k, provider, model)


@app.post("/api/runs/query")
def save_query(
    q: str = Query(min_length=1, max_length=500),
    top_k: int = Query(default=3, ge=1, le=5),
    min_score: float = Query(default=0, ge=0),
    provider: str = Query(default="deterministic", pattern="^(deterministic|ollama)$"),
    model: str = Query(default="llama3.2:3b", min_length=1, max_length=80),
    ollama_url: str = Query(default="http://127.0.0.1:11434", max_length=200),
) -> dict:
    try:
        payload = evaluate_question(q, top_k=top_k, min_score=min_score, provider=provider, model=model, ollama_url=ollama_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _save_run("query", payload, top_k, provider, model, question=q)


@app.get("/api/runs")
def run_history() -> list[dict]:
    return store.all()


@app.get("/")
def home() -> RedirectResponse:
    return RedirectResponse("/web/index.html")


app.mount("/data", StaticFiles(directory=PROJECT_DIR / "data"), name="data")
app.mount("/web", StaticFiles(directory=PROJECT_DIR / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8030)
