from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(str(Path(__file__).resolve().parent))

from video_lab import clip_report_markdown, get_clip, inspect_all, inspect_clip, load_clips
from contracts import HighlightEditRequest
from store import VideoInsightStore


app = FastAPI(title="AI Video Insight Lab", version="2.0.0")
store = VideoInsightStore(os.environ.get("VIDEO_INSIGHT_DB", str(Path(__file__).resolve().parents[1] / ".video-insight/lab.sqlite3")))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-video-insight-lab"}


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


@app.post("/api/inspection-runs")
def create_inspection_run(clip_id: str | None = None) -> dict:
    if clip_id:
        try:
            payload = inspect_clip(get_clip(clip_id))
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        quality = payload["metrics"]["overall_quality"]
        issue_count = len(payload["issues"])
    else:
        payload = inspect_all()
        quality = payload["aggregate"]["avg_quality"]
        issue_count = sum(len(clip["issues"]) for clip in payload["clips"])
        clip_id = "portfolio"
    return store.add_inspection({
        "run_id": f"inspect-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "clip_id": clip_id,
        "quality": quality,
        "issue_count": issue_count,
        "payload": payload,
    })


@app.get("/api/inspection-runs")
def inspection_history() -> list[dict]:
    return store.inspections()


@app.post("/api/highlights")
def save_highlights(request: HighlightEditRequest) -> dict:
    try:
        clip = get_clip(request.clip_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    highlights = [item.model_dump() for item in request.highlights]
    if any(item["end"] > clip["duration_sec"] or item["start"] >= item["end"] for item in highlights):
        raise HTTPException(status_code=422, detail="Highlight windows must fit inside the clip duration.")
    return store.add_highlight_edit({
        "edit_id": f"edit-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "clip_id": request.clip_id,
        "editor": request.editor,
        "payload": {"clip_id": request.clip_id, "highlights": highlights},
    })


@app.get("/api/highlights")
def highlight_history(clip_id: str | None = None) -> list[dict]:
    return store.highlight_edits(clip_id)


@app.get("/")
def home():
    from fastapi.responses import RedirectResponse

    return RedirectResponse("/web/index.html")


app.mount("/data", StaticFiles(directory=Path(__file__).resolve().parents[1] / "data"), name="data")
app.mount("/web", StaticFiles(directory=Path(__file__).resolve().parents[1] / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8090)
