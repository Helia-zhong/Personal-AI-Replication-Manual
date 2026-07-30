from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).resolve().parent))

from content_qa import audit_all, audit_sample, get_sample, load_samples


app = FastAPI(title="AI Content QA Workbench", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/samples")
def samples() -> list[dict]:
    return load_samples()


@app.get("/api/audit")
def audit() -> dict:
    return audit_all()


@app.get("/api/audit/{sample_id}")
def audit_one(sample_id: str) -> dict:
    try:
        return audit_sample(get_sample(sample_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8050)
