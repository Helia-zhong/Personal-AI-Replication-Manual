from __future__ import annotations

import json
import statistics
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "data"


def load_runs() -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / "sample_runs.json").read_text(encoding="utf-8"))


def get_run(run_id: str) -> dict[str, Any]:
    for run in load_runs():
        if run["run_id"] == run_id:
            return run
    raise KeyError(f"Run not found: {run_id}")


def summarize_run(run: dict[str, Any]) -> dict[str, Any]:
    steps = run["steps"]
    total_duration = sum(step["duration_ms"] for step in steps)
    total_tokens = sum(step["tokens_in"] + step["tokens_out"] for step in steps)
    total_cost = sum(step["cost_usd"] for step in steps)
    retry_count = sum(step["retries"] for step in steps)
    success_count = sum(1 for step in steps if step["status"] == "success")
    bottleneck = max(steps, key=lambda step: step["duration_ms"])
    tool_mix = Counter(step["tool"] for step in steps)

    elapsed = 0
    timeline = []
    for step in steps:
        start = elapsed
        elapsed += step["duration_ms"]
        timeline.append(
            {
                "id": step["id"],
                "name": step["name"],
                "agent": step["agent"],
                "tool": step["tool"],
                "status": step["status"],
                "start_ms": start,
                "end_ms": elapsed,
                "duration_ms": step["duration_ms"],
                "retries": step["retries"],
                "cost_usd": step["cost_usd"],
                "notes": step["notes"],
            }
        )

    return {
        "run_id": run["run_id"],
        "workflow": run["workflow"],
        "status": run["status"],
        "objective": run["objective"],
        "metrics": {
            "total_duration_ms": total_duration,
            "total_tokens": total_tokens,
            "estimated_cost_usd": round(total_cost, 4),
            "step_success_rate": round(success_count / max(len(steps), 1), 4),
            "retry_count": retry_count,
            "bottleneck_step": bottleneck["name"],
        },
        "tool_mix": dict(tool_mix),
        "timeline": timeline,
        "incidents": detect_incidents(run),
        "recommendations": recommend_actions(run),
    }


def detect_incidents(run: dict[str, Any]) -> list[dict[str, Any]]:
    steps = run["steps"]
    durations = [step["duration_ms"] for step in steps]
    median_duration = statistics.median(durations) if durations else 0
    incidents = []

    for step in steps:
        if step["status"] != "success":
            incidents.append(
                {
                    "severity": "high",
                    "step": step["name"],
                    "reason": "步骤失败",
                    "detail": step["notes"],
                }
            )
        if step["retries"] >= 2:
            incidents.append(
                {
                    "severity": "medium",
                    "step": step["name"],
                    "reason": "重试次数偏高",
                    "detail": f"重试 {step['retries']} 次",
                }
            )
        if median_duration and step["duration_ms"] > median_duration * 2:
            incidents.append(
                {
                    "severity": "medium",
                    "step": step["name"],
                    "reason": "耗时瓶颈",
                    "detail": f"{step['duration_ms']} ms",
                }
            )
        if step["cost_usd"] >= 0.015:
            incidents.append(
                {
                    "severity": "low",
                    "step": step["name"],
                    "reason": "成本偏高",
                    "detail": f"${step['cost_usd']:.4f}",
                }
            )
    return incidents


def recommend_actions(run: dict[str, Any]) -> list[str]:
    summary = {
        "failed": any(step["status"] != "success" for step in run["steps"]),
        "retry_heavy": any(step["retries"] >= 2 for step in run["steps"]),
        "expensive": sum(step["cost_usd"] for step in run["steps"]) >= 0.04,
        "slow_tool": max(run["steps"], key=lambda step: step["duration_ms"])["type"] == "tool",
    }
    actions = []
    if summary["failed"]:
        actions.append("为失败工具增加输入校验、降级路径和可复用错误样本。")
    if summary["retry_heavy"]:
        actions.append("把高重试步骤拆成更小批次，并记录每次重试的输入差异。")
    if summary["expensive"]:
        actions.append("对长上下文步骤增加摘要缓存或模型分层调用。")
    if summary["slow_tool"]:
        actions.append("检查最慢工具是否可以预索引、并行化或缓存结果。")
    if not actions:
        actions.append("当前运行稳定，可继续积累同类任务的趋势数据。")
    return actions


def summarize_all() -> dict[str, Any]:
    runs = [summarize_run(run) for run in load_runs()]
    aggregate = {
        "run_count": len(runs),
        "avg_duration_ms": round(sum(run["metrics"]["total_duration_ms"] for run in runs) / max(len(runs), 1), 2),
        "avg_cost_usd": round(sum(run["metrics"]["estimated_cost_usd"] for run in runs) / max(len(runs), 1), 4),
        "warning_runs": [run["run_id"] for run in runs if run["incidents"]],
    }
    return {"aggregate": aggregate, "runs": runs}
