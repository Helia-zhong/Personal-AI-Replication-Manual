from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

sys.path.append(str(Path(__file__).resolve().parent))

from video_lab import clip_report_markdown, get_clip, inspect_all, inspect_clip, load_clips


app = FastAPI(title="AI Video Insight Lab", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/clips")
def clips() -> list[dict]:
    return load_clips()


@app.get("/api/report")
def report() -> dict:
    return inspect_all()


@app.get("/api/inspect/{clip_id}")
def inspect_one(clip_id: str) -> dict:
    try:
        return inspect_clip(get_clip(clip_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/clips/{clip_id}/report", response_class=PlainTextResponse)
def report_one(clip_id: str) -> str:
    try:
        clip = get_clip(clip_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return clip_report_markdown(clip)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8090)
