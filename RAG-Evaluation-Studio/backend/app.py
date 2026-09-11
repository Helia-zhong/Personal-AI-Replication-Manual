from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).resolve().parent))

from rag_studio import evaluate_all, evaluate_question, load_cases, load_corpus


app = FastAPI(title="RAG Evaluation Studio", version="1.0.0")
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8030)
