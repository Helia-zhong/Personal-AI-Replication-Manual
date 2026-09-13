from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

sys.path.append(str(Path(__file__).resolve().parent))

from dataset_lab import audit_all, audit_dataset, get_dataset, load_datasets
from contracts import AuditRunRequest, ReleaseRunRequest, ReviewRequest
from store import CurationStore


app = FastAPI(title="AI Dataset Curation Lab", version="2.0.0")
store = CurationStore(os.environ.get("DATASET_LAB_DB", str(Path(__file__).resolve().parents[1] / ".curation/lab.sqlite3")))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-dataset-curation-lab"}


@app.get("/api/datasets")
def datasets() -> list[dict]:
    return load_datasets()


@app.get("/api/audit")
def audit() -> dict:
    return audit_all()


@app.get("/api/audit/{dataset_id}")
def audit_one(dataset_id: str) -> dict:
    try:
        return audit_dataset(get_dataset(dataset_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/audit/runs")
def create_audit_run(request: AuditRunRequest) -> dict:
    if request.dataset_id:
        try:
            payload = audit_dataset(get_dataset(request.dataset_id))
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        dataset_id = request.dataset_id
        risk_level = payload["metrics"]["risk_level"]
        sample_count = payload["metrics"]["sample_count"]
    else:
        payload = audit_all()
        dataset_id = "portfolio"
        risk_level = "high" if payload["aggregate"]["risky_datasets"] else "low"
        sample_count = payload["aggregate"]["sample_count"]
    return store.add_audit_run({
        "run_id": f"audit-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dataset_id": dataset_id,
        "risk_level": risk_level,
        "sample_count": sample_count,
        "payload": payload,
    })


@app.get("/api/audit/runs")
def audit_run_history() -> list[dict]:
    return store.audit_runs()


@app.post("/api/reviews")
def create_review(request: ReviewRequest) -> dict:
    try:
        dataset = get_dataset(request.dataset_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if not any(sample["id"] == request.sample_id for sample in dataset["samples"]):
        raise HTTPException(status_code=404, detail=f"Sample not found: {request.sample_id}")
    return store.add_review({
        "review_id": f"review-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        **request.model_dump(),
    })


@app.get("/api/reviews")
def review_history(dataset_id: str | None = None) -> list[dict]:
    return store.reviews(dataset_id)


@app.post("/api/release/runs")
def create_release_run(request: ReleaseRunRequest) -> dict:
    try:
        payload = audit_dataset(get_dataset(request.dataset_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    metrics = payload["metrics"]
    checks = [
        metrics["overall_quality"] >= request.quality_threshold,
        metrics["source_coverage_rate"] >= request.source_threshold,
        metrics["duplicate_rate"] <= request.duplicate_threshold,
        metrics["leakage_count"] <= request.leakage_threshold,
    ]
    record_payload = {"dataset_id": request.dataset_id, "policy": request.model_dump(), "metrics": metrics, "checks": checks, "audit": payload}
    return store.add_release_run({
        "run_id": f"release-{uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dataset_id": request.dataset_id,
        "decision": "ready" if all(checks) else "blocked",
        "passed": sum(checks),
        "total": len(checks),
        "payload": record_payload,
    })


@app.get("/api/release/runs")
def release_run_history() -> list[dict]:
    return store.release_runs()


@app.get("/")
def home() -> RedirectResponse:
    return RedirectResponse("/web/index.html")


app.mount("/data", StaticFiles(directory=Path(__file__).resolve().parents[1] / "data"), name="data")
app.mount("/web", StaticFiles(directory=Path(__file__).resolve().parents[1] / "web", html=True), name="web")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8070)
