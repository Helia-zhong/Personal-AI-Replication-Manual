"""Small synchronous instrumentation API for terminal Python workflows."""

import json
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from contracts import Run


class Recorder:
    def __init__(self, workflow, objective):
        self.started = time.perf_counter()
        self.lock = Lock()
        self.run = {
            "run_id": f"run-{uuid4().hex}", "workflow": workflow, "objective": objective,
            "started_at": datetime.now(timezone.utc).isoformat(), "source": "measured",
            "status": "completed", "steps": [],
        }

    @contextmanager
    def step(self, name, *, agent="worker", tool="none", kind="tool"):
        start = time.perf_counter()
        span = {
            "id": f"s-{uuid4().hex[:12]}", "name": name, "agent": agent, "tool": tool,
            "type": kind, "status": "success", "start_ms": (start - self.started) * 1000,
            "duration_ms": 0, "tokens_in": None, "tokens_out": None,
            "cost_usd": None, "retries": 0, "notes": "",
        }
        try:
            yield span
        except Exception as exc:
            span["status"] = "failed"
            # Capture the error class without recording potentially sensitive inputs.
            span["notes"] = type(exc).__name__
            raise
        finally:
            span["duration_ms"] = (time.perf_counter() - start) * 1000
            with self.lock:
                self.run["steps"].append(span)
                if span["status"] == "failed":
                    self.run["status"] = "completed_with_warnings"

    def export(self, path):
        with self.lock:
            data = {**self.run, "steps": sorted(self.run["steps"], key=lambda step: step["start_ms"])}
            validated = Run.model_validate(data).model_dump(mode="json")
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps({"runs": [validated]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return validated
