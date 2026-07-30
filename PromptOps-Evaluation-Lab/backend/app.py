from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parent))

from promptops import compare_templates, evaluate_template, load_cases, load_templates


app = FastAPI(title="PromptOps Evaluation Lab", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/cases")
def cases() -> list[dict]:
    return load_cases()


@app.get("/api/templates")
def templates() -> list[dict]:
    return load_templates()


@app.get("/api/evaluate/{template_id}")
def evaluate(template_id: str) -> dict:
    return evaluate_template(template_id)


@app.get("/api/compare")
def compare() -> dict:
    return compare_templates()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8020)
