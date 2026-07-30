from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "data"
PRIVACY_RANK = {"standard": 1, "enterprise": 2, "private": 3}
RISK_RANK = {"low": 1, "medium": 2, "high": 3}


def load_models() -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / "models.json").read_text(encoding="utf-8"))


def load_tasks() -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / "tasks.json").read_text(encoding="utf-8"))


def get_task(task_id: str) -> dict[str, Any]:
    for task in load_tasks():
        if task["id"] == task_id:
            return task
    raise KeyError(f"Task not found: {task_id}")


def estimate_cost(model: dict[str, Any], task: dict[str, Any]) -> float:
    input_cost = task["context_tokens"] / 1000 * model["input_cost_per_1k"]
    output_cost = task["expected_output_tokens"] / 1000 * model["output_cost_per_1k"]
    return round(input_cost + output_cost, 6)


def passes_hard_constraints(model: dict[str, Any], task: dict[str, Any]) -> tuple[bool, list[str]]:
    reasons = []
    required_privacy = "private" if task["privacy"] == "restricted" else task["privacy"]
    if PRIVACY_RANK[model["privacy_mode"]] < PRIVACY_RANK[required_privacy]:
        reasons.append("隐私模式不足")
    if model["context_window"] < task["context_tokens"]:
        reasons.append("上下文窗口不足")
    if estimate_cost(model, task) > task["max_budget_usd"]:
        reasons.append("超过预算上限")
    if model["quality"].get(task["task_type"], 0) < task["min_quality"]:
        reasons.append("任务质量低于要求")
    return not reasons, reasons


def score_model(model: dict[str, Any], task: dict[str, Any]) -> dict[str, Any]:
    quality_score = model["quality"].get(task["task_type"], 0)
    cost = estimate_cost(model, task)
    latency_score = min(task["latency_budget_ms"] / max(model["latency_ms_p95"], 1), 1.0)
    cost_score = min(task["max_budget_usd"] / max(cost, 0.000001), 1.0)
    context_score = min(model["context_window"] / max(task["context_tokens"], 1), 4.0) / 4.0
    safety_score = model["safety_score"]

    if RISK_RANK[task["risk_level"]] >= 3:
        weights = {"quality": 0.42, "safety": 0.28, "latency": 0.1, "cost": 0.1, "context": 0.1}
    else:
        weights = {"quality": 0.4, "safety": 0.18, "latency": 0.18, "cost": 0.17, "context": 0.07}

    total = (
        quality_score * weights["quality"]
        + safety_score * weights["safety"]
        + latency_score * weights["latency"]
        + cost_score * weights["cost"]
        + context_score * weights["context"]
    )
    return {
        "model_id": model["id"],
        "model_name": model["name"],
        "provider": model["provider"],
        "privacy_mode": model["privacy_mode"],
        "estimated_cost_usd": cost,
        "latency_ms_p95": model["latency_ms_p95"],
        "score": round(total, 4),
        "score_breakdown": {
            "quality_score": round(quality_score, 4),
            "safety_score": round(safety_score, 4),
            "latency_score": round(latency_score, 4),
            "cost_score": round(cost_score, 4),
            "context_score": round(context_score, 4),
        },
        "reasons": build_reasons(model, task, quality_score, cost, latency_score),
    }


def build_reasons(
    model: dict[str, Any],
    task: dict[str, Any],
    quality_score: float,
    cost: float,
    latency_score: float,
) -> list[str]:
    reasons = [f"{task['task_type']} 质量分 {quality_score:.2f}。"]
    if model["privacy_mode"] in {"enterprise", "private"}:
        reasons.append(f"满足 {task['privacy']} 隐私要求。")
    if model["context_window"] >= task["context_tokens"] * 2:
        reasons.append("上下文窗口余量充足。")
    if cost <= task["max_budget_usd"] * 0.5:
        reasons.append("成本低于预算的一半。")
    if latency_score >= 1:
        reasons.append("P95 延迟满足任务预算。")
    if RISK_RANK[task["risk_level"]] >= 3 and model["safety_score"] >= 0.9:
        reasons.append("高风险任务优先选择安全分更高的模型。")
    return reasons


def route_task(task: dict[str, Any]) -> dict[str, Any]:
    accepted = []
    rejected = []
    for model in load_models():
        passed, reasons = passes_hard_constraints(model, task)
        if passed:
            accepted.append(score_model(model, task))
        else:
            rejected.append({"model_id": model["id"], "model_name": model["name"], "reasons": reasons})

    accepted.sort(key=lambda item: item["score"], reverse=True)
    return {
        "task": task,
        "recommended": accepted[0] if accepted else None,
        "candidates": accepted,
        "rejected": rejected,
    }


def route_all() -> dict[str, Any]:
    routes = [route_task(task) for task in load_tasks()]
    return {
        "route_count": len(routes),
        "routes": routes,
    }
