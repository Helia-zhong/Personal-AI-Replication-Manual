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
    allow_origins=["*"],
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
def evaluate(top_k: int = Query(default=3, ge=1, le=5)) -> dict:
    return evaluate_all(top_k=top_k)


@app.get("/api/query")
def query(q: str, top_k: int = Query(default=3, ge=1, le=5)) -> dict:
    return evaluate_question(q, top_k=top_k)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8030)
