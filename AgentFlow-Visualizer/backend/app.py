"""Run with: python -m uvicorn backend.app:app --host 127.0.0.1 --port 8091"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .contracts import Review, RunInput, Settings
from .runtime import Conflict, Runner, Store

ROOT = Path(__file__).resolve().parents[1]


def create_app(db_path=None, extractor=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(Path(db_path or os.environ.get("AGENTFLOW_DB", ROOT / ".agentflow" / "runs.sqlite3")))
        app.state.store.recover()
        app.state.runner = Runner(app.state.store, **({"extractor": extractor} if extractor else {}))
        yield
        await app.state.runner.close()

    app = FastAPI(title="AgentFlow", version="1.0.0", lifespan=lifespan)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "[::1]", "testserver"])

    @app.middleware("http")
    async def same_origin(request: Request, call_next):
        origin = request.headers.get("origin")
        expected = str(request.base_url).rstrip("/")
        if request.url.path.startswith("/api/") and origin and origin != expected:
            return JSONResponse({"detail": "请在本服务页面中执行操作"}, status_code=403)
        if request.method in {"POST", "PUT"} and not request.headers.get("content-type", "").startswith("application/json"):
            return JSONResponse({"detail": "需要 application/json"}, status_code=415)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(KeyError)
    async def missing(request, exc):
        return JSONResponse({"detail": "运行不存在"}, status_code=404)

    @app.exception_handler(Conflict)
    async def conflict(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=409)

    @app.exception_handler(ValueError)
    async def invalid(request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=422)

    @app.get("/api/health")
    def health():
        return {"service": "agentflow", "version": "1.0.0", "storage": "sqlite", "modes": ["rules", "ollama"]}

    @app.get("/api/settings")
    def settings():
        return app.state.store.settings().model_dump()

    @app.put("/api/settings")
    def save_settings(value: Settings):
        return app.state.store.settings(value).model_dump()

    @app.get("/api/runs")
    def runs():
        return [{k: v for k, v in run.items() if k not in {"source", "draft", "original_draft", "report", "events"}} for run in app.state.store.list()]

    @app.post("/api/runs", status_code=201)
    async def submit(data: RunInput):
        return app.state.runner.submit(data)

    @app.get("/api/runs/{run_id}")
    def run(run_id: str):
        return app.state.store.get(run_id)

    @app.post("/api/runs/{run_id}/cancel")
    async def cancel(run_id: str):
        return app.state.runner.cancel(run_id)

    @app.post("/api/runs/{run_id}/retry", status_code=201)
    async def retry(run_id: str):
        return app.state.runner.retry(run_id)

    @app.post("/api/runs/{run_id}/review")
    def review(run_id: str, data: Review):
        return app.state.runner.review(run_id, data)

    @app.get("/api/runs/{run_id}/report")
    def report(run_id: str):
        run = app.state.store.get(run_id)
        if run["status"] != "succeeded":
            raise HTTPException(409, "报告需人工审核通过后生成")
        return PlainTextResponse(run["report"], headers={"Content-Disposition": f'attachment; filename="{run_id}.md"'})

    app.mount("/assets", StaticFiles(directory=ROOT / "assets", check_dir=False), name="assets")

    @app.get("/")
    def index():
        return FileResponse(ROOT / "index.html")

    @app.get("/{filename}")
    def page(filename: str):
        if filename not in {"index.html", "runs.html", "review.html", "prompts.html", "settings.html", "app.js", "engine.js", "styles.css"}:
            raise HTTPException(404)
        return FileResponse(ROOT / filename)

    return app


app = create_app()
