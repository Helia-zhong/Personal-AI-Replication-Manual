from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI
from pydantic import BaseModel

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parent))

from rag_engine import answer, retrieve


class QueryRequest(BaseModel):
    query: str


app = FastAPI(title="Vehicle Manual RAG Copilot", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/query")
def query_manual(payload: QueryRequest) -> dict:
    return answer(payload.query)


@app.get("/api/search")
def search_manual(q: str) -> dict:
    return {"query": q, "hits": retrieve(q)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8010)
