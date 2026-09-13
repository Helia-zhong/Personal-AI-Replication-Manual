from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(str(Path(__file__).resolve().parent))

from content_qa import audit_all, audit_sample
from contracts import SampleBatch
from store import SampleConflict, SampleStore


app = FastAPI(title="AI Content QA Workbench", version="2.0.0")
store = SampleStore(os.environ.get("CONTENT_QA_DB", str(Path(__file__).resolve().parents[1] / ".qa/samples.sqlite3")))
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(127\.0\.0\.1|localhost)(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def limit_import(request: Request, call_next):
    if request.method == "POST":
        origin = request.headers.get("origin")
        if origin:
            from urllib.parse import urlsplit
            parsed = urlsplit(origin)
            if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost"):
                return JSONResponse({"detail": "Local origins only"}, status_code=403)
        if len(await request.body()) > 4_000_000:
            return JSONResponse({"detail": "Import exceeds 4 MB"}, status_code=413)
    return await call_next(request)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "content-qa-workbench"}


@app.get("/api/samples")
def samples() -> list[dict]:
    return store.all()


@app.post("/api/samples")
def ingest(batch: SampleBatch) -> dict:
    try:
        return store.ingest(batch.samples)
    except SampleConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/api/samples/{sample_id}")
def sample_detail(sample_id: str) -> dict:
    try:
        return store.get(sample_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/audit")
def audit() -> dict:
    return audit_all(store.all())


@app.get("/api/audit/{sample_id}")
def audit_one(sample_id: str) -> dict:
    try:
        return audit_sample(store.get(sample_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/")
def home():
    return RedirectResponse("/web/index.html")


app.mount("/web", StaticFiles(directory=Path(__file__).resolve().parents[1] / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8050)
