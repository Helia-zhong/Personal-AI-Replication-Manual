from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(str(Path(__file__).resolve().parent))

from contracts import RunBatch
from run_monitor import summarize_all, summarize_run
from store import RunConflict, RunStore


app = FastAPI(title="Agent Run Monitor", version="2.0.0")
store = RunStore(os.environ.get("MONITOR_DB", str(Path(__file__).resolve().parents[1] / ".monitor/runs.sqlite3")))
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(127\.0\.0\.1|localhost)(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@app.middleware("http")
async def limit_import(request: Request, call_next):
    if request.method == "POST":
        from fastapi.responses import JSONResponse
        origin = request.headers.get("origin")
        if origin:
            from urllib.parse import urlsplit
            parsed = urlsplit(origin)
            if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost"):
                return JSONResponse({"detail": "Local origins only"}, status_code=403)
        if len(await request.body()) > 2_000_000:
            return JSONResponse({"detail": "Import exceeds 2 MB"}, status_code=413)
    return await call_next(request)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "agent-run-monitor"}


@app.get("/api/runs")
def runs() -> list[dict]:
    return store.all()


@app.post("/api/runs")
def ingest(batch: RunBatch) -> dict:
    try:
        return store.ingest(batch.runs)
    except RunConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/api/runs/{run_id}")
def run_detail(run_id: str) -> dict:
    try:
        return store.get(run_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/summary")
def summary() -> dict:
    return summarize_all(store.all())


@app.get("/api/runs/{run_id}/summary")
def run_summary(run_id: str) -> dict:
    try:
        return summarize_run(store.get(run_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/")
def home():
    return RedirectResponse("/web/index.html")


app.mount("/web", StaticFiles(directory=Path(__file__).resolve().parents[1] / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8040)
