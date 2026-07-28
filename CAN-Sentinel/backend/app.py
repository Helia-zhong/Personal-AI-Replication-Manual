from __future__ import annotations

from pathlib import Path
import sys
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parent))

from can_sentinel import detect_anomalies, generate_trace


class TraceRequest(BaseModel):
    frames: list[dict[str, Any]] = Field(default_factory=list)


app = FastAPI(title="CAN Sentinel API", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/sample-stream")
def sample_stream(scenario: str = "normal", count: int = 180, seed: int = 42) -> dict:
    frames = generate_trace(scenario=scenario, count=count, seed=seed)
    return {"scenario": scenario, "frames": frames, "analysis": detect_anomalies(frames)}


@app.post("/api/analyze")
def analyze_trace(payload: TraceRequest) -> dict:
    return detect_anomalies(payload.frames)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
