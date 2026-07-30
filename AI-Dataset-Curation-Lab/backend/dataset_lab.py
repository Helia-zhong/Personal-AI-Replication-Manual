from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = PROJECT_DIR / "data" / "datasets.json"

TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+|[\u4e00-\u9fff]")
STOPWORDS = {
    "the",
    "and",
    "or",
    "a",
    "an",
    "to",
    "of",
    "in",
    "on",
    "for",
    "my",
    "i",
    "you",
    "is",
    "are",
    "be",
    "can",
    "do",
    "does",
    "how",
    "what",
    "if",
    "please",
}
REFUSAL_HINTS = ["cannot", "can not", "can't", "无法", "不能", "不可以", "不便", "拒绝", "抱歉"]
JSON_HINTS = ["{", "}", ":"]


def load_datasets() -> list[dict[str, Any]]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def get_dataset(dataset_id: str) -> dict[str, Any]:
    for dataset in load_datasets():
        if dataset["id"] == dataset_id:
            return dataset
    raise KeyError(f"Dataset not found: {dataset_id}")


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\u4e00-\u9fff]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text: str) -> set[str]:
    tokens = [match.group(0).lower() for match in TOKEN_RE.finditer(text)]
    return {token for token in tokens if token and token not in STOPWORDS}


def jaccard(left: str, right: str) -> float:
    left_tokens = tokenize(left)
    right_tokens = tokenize(right)
    if not left_tokens and not right_tokens:
        return 1.0
    union = left_tokens | right_tokens
    if not union:
        return 0.0
    return len(left_tokens & right_tokens) / len(union)


def response_is_refusal(text: str) -> bool:
    lowered = text.lower()
    return any(hint in lowered for hint in REFUSAL_HINTS)


def response_is_json_like(text: str) -> bool:
    stripped = text.strip()
    return stripped.startswith("{") and stripped.endswith("}") and all(hint in stripped for hint in JSON_HINTS)


def response_labels(text: str) -> list[str]:
    parts = re.split(r"[,/|;]+|\s+", text.strip().lower())
    return [part for part in parts if part]


def format_score(sample: dict[str, Any], dataset: dict[str, Any]) -> float:
    task_type = dataset["task_type"]
    response = sample["response"].strip()
    label = sample["label"].lower()
    allowed_labels = [item.lower() for item in dataset.get("allowed_labels", [])]

    if task_type == "qa":
        if label == "answerable":
            if response_is_refusal(response):
                return 0.15
            return 1.0 if response else 0.0
        if label == "abstain":
            return 1.0 if response_is_refusal(response) else 0.2
        return 0.5

    if task_type == "extraction":
        if response_is_json_like(response):
            return 1.0 if response.count("{") == 1 and response.count("}") == 1 else 0.75
        if ":" in response and ("\n" in response or response.startswith("-")):
            return 0.45
        return 0.1

    if task_type == "summarization":
        ratio = len(response) / max(len(sample["instruction"]), 1)
        if ratio > 1.0:
            return 0.25
        if 0.18 <= ratio <= 0.75:
            return 1.0
        if ratio < 0.12:
            return 0.35
        return 0.7

    if task_type == "classification":
        parsed = response_labels(response)
        if len(parsed) == 1 and parsed[0] == label:
            return 1.0
        if len(parsed) == 1 and parsed[0] in allowed_labels:
            return 0.55
        if label in parsed and len(parsed) == 1:
            return 0.85
        return 0.25 if parsed else 0.0

    return 0.5


def length_score(sample: dict[str, Any], dataset: dict[str, Any]) -> float:
    instruction_len = max(len(sample["instruction"].strip()), 1)
    response_len = len(sample["response"].strip())
    ratio = response_len / instruction_len
    task_type = dataset["task_type"]

    if task_type == "qa":
        if 0.25 <= ratio <= 1.05:
            return 1.0
        if ratio < 0.16:
            return 0.4
        return 0.7

    if task_type == "extraction":
        if response_is_json_like(sample["response"]):
            if 0.2 <= ratio <= 1.3:
                return 1.0
            return 0.75
        if 0.15 <= ratio <= 1.0:
            return 0.55
        return 0.25

    if task_type == "summarization":
        if 0.18 <= ratio <= 0.7:
            return 1.0
        if ratio > 1.0:
            return 0.2
        if ratio < 0.12:
            return 0.35
        return 0.7

    if task_type == "classification":
        if response_len <= 20:
            return 1.0
        if response_len <= 40:
            return 0.6
        return 0.2

    return 0.5


def support_score(sample: dict[str, Any]) -> float:
    source = sample.get("source", "").strip()
    if not source:
        return 0.0
    response = sample["response"]
    return round(0.7 * jaccard(response, source) + 0.3 * jaccard(response, sample["instruction"]), 4)


def build_similarity_groups(samples: list[dict[str, Any]], threshold: float = 0.88) -> list[list[str]]:
    parent = {sample["id"]: sample["id"] for sample in samples}

    def find(node: str) -> str:
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(left: str, right: str) -> None:
        root_left = find(left)
        root_right = find(right)
        if root_left != root_right:
            parent[root_right] = root_left

    for index, left in enumerate(samples):
        for right in samples[index + 1 :]:
            if jaccard(left["instruction"], right["instruction"]) >= threshold:
                union(left["id"], right["id"])

    groups: dict[str, list[str]] = defaultdict(list)
    for sample in samples:
        groups[find(sample["id"])].append(sample["id"])

    return [group for group in groups.values() if len(group) > 1]


def build_leakage_pairs(samples: list[dict[str, Any]], threshold: float = 0.9) -> list[dict[str, Any]]:
    pairs = []
    for index, left in enumerate(samples):
        for right in samples[index + 1 :]:
            if left["split"] == right["split"]:
                continue
            if jaccard(left["instruction"], right["instruction"]) >= threshold:
                pairs.append(
                    {
                        "left_id": left["id"],
                        "right_id": right["id"],
                        "left_split": left["split"],
                        "right_split": right["split"],
                        "similarity": round(jaccard(left["instruction"], right["instruction"]), 4),
                    }
                )
    return pairs


def review_issues(sample: dict[str, Any], dataset: dict[str, Any], duplicate_groups: list[list[str]], leakage_pairs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    issues = []
    sample_id = sample["id"]
    response = sample["response"].strip()
    source = sample.get("source", "").strip()
    task_type = dataset["task_type"]
    label = sample["label"].lower()
    allowed_labels = [item.lower() for item in dataset.get("allowed_labels", [])]

    in_duplicate_group = any(sample_id in group for group in duplicate_groups)
    in_leakage = any(sample_id in {pair["left_id"], pair["right_id"]} for pair in leakage_pairs)

    if not source:
        issues.append({"severity": "high", "type": "missing_source", "message": "缺少可追溯来源。"})

    if in_duplicate_group:
        issues.append({"severity": "medium", "type": "duplicate_sample", "message": "存在重复或近似重复样本。"})

    if in_leakage:
        issues.append({"severity": "high", "type": "split_leakage", "message": "样本与其他 split 的内容高度相似。"})

    if task_type == "qa":
        if label == "answerable" and response_is_refusal(response):
            issues.append({"severity": "high", "type": "over_refusal", "message": "应回答却出现了拒答。"})
        if label == "abstain" and not response_is_refusal(response):
            issues.append({"severity": "high", "type": "refusal_missing", "message": "应拒答却给出了实质答案。"})

    elif task_type == "extraction":
        if not response_is_json_like(response):
            issues.append({"severity": "medium", "type": "format_mismatch", "message": "抽取结果应保持 JSON 结构。"})

    elif task_type == "summarization":
        ratio = len(response) / max(len(sample["instruction"]), 1)
        if ratio > 1.0:
            issues.append({"severity": "medium", "type": "too_long", "message": "摘要过长，压缩率不足。"})
        elif ratio < 0.12:
            issues.append({"severity": "medium", "type": "too_short", "message": "摘要过短，信息压缩过头。"})

    elif task_type == "classification":
        parsed = response_labels(response)
        if len(parsed) != 1 or parsed[0] not in allowed_labels:
            issues.append({"severity": "high", "type": "label_mismatch", "message": "分类标签不唯一或不在允许集合内。"})
        elif parsed[0] != label:
            issues.append({"severity": "medium", "type": "label_swap", "message": "预测标签与样本标签不一致。"})

    support = support_score(sample)
    if source and support < 0.15:
        issues.append({"severity": "medium", "type": "weak_support", "message": "响应与来源材料重合度偏低。"})

    return issues


def sample_report(sample: dict[str, Any], dataset: dict[str, Any], duplicate_groups: list[list[str]], leakage_pairs: list[dict[str, Any]]) -> dict[str, Any]:
    source = sample.get("source", "").strip()
    format_value = format_score(sample, dataset)
    length_value = length_score(sample, dataset)
    support_value = support_score(sample)
    source_value = 1.0 if source else 0.0
    issues = review_issues(sample, dataset, duplicate_groups, leakage_pairs)
    duplicate_flag = any(sample["id"] in group for group in duplicate_groups)
    leakage_flag = any(sample["id"] in {pair["left_id"], pair["right_id"]} for pair in leakage_pairs)

    overall = (
        0.32 * format_value
        + 0.24 * source_value
        + 0.18 * length_value
        + 0.16 * support_value
        - (0.07 if duplicate_flag else 0.0)
        - (0.11 if leakage_flag else 0.0)
    )
    overall = max(0.0, min(1.0, round(overall, 4)))

    return {
        "id": sample["id"],
        "split": sample["split"],
        "label": sample["label"],
        "task_type": dataset["task_type"],
        "instruction": sample["instruction"],
        "response": sample["response"],
        "source": source,
        "tags": sample.get("tags", []),
        "metrics": {
            "format_fit": round(format_value, 4),
            "length_fit": round(length_value, 4),
            "source_coverage": round(source_value, 4),
            "support_score": round(support_value, 4),
            "overall": overall,
        },
        "issues": issues,
        "duplicate": duplicate_flag,
        "leakage": leakage_flag,
    }


def label_distribution(samples: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter()
    for sample in samples:
        counts[sample["label"]] += 1
    return dict(sorted(counts.items()))


def split_distribution(samples: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(sample["split"] for sample in samples)
    return dict(sorted(counts.items()))


def audit_dataset(dataset: dict[str, Any]) -> dict[str, Any]:
    samples = dataset["samples"]
    duplicate_groups = build_similarity_groups(samples)
    leakage_pairs = build_leakage_pairs(samples)
    reports = [sample_report(sample, dataset, duplicate_groups, leakage_pairs) for sample in samples]

    total = max(len(reports), 1)
    source_coverage_rate = sum(report["metrics"]["source_coverage"] for report in reports) / total
    format_pass_rate = sum(1 for report in reports if report["metrics"]["format_fit"] >= 0.7) / total
    duplicate_count = sum(1 for report in reports if report["duplicate"])
    leakage_count = len(leakage_pairs)
    average_quality = sum(report["metrics"]["overall"] for report in reports) / total
    high_issue_count = sum(1 for report in reports for issue in report["issues"] if issue["severity"] == "high")

    if leakage_count or high_issue_count >= 3:
        risk_level = "high"
    elif duplicate_count or high_issue_count:
        risk_level = "medium"
    else:
        risk_level = "low"

    issue_counts = Counter()
    for report in reports:
        for issue in report["issues"]:
            issue_counts[issue["type"]] += 1

    top_issues = [
        {"type": issue_type, "count": count}
        for issue_type, count in issue_counts.most_common()
    ]

    recommendations = []
    if issue_counts.get("missing_source"):
        recommendations.append("补齐缺失来源的样本，并保留原始参考材料。")
    if duplicate_groups:
        recommendations.append("合并重复或近似重复样本，避免训练集偏置。")
    if leakage_pairs:
        recommendations.append("重新分配跨 split 泄漏样本，确保训练和评测隔离。")
    if issue_counts.get("format_mismatch") or issue_counts.get("label_mismatch"):
        recommendations.append("统一输出模板和标签规范，降低格式噪声。")
    if not recommendations:
        recommendations.append("当前数据集结构稳定，可以继续扩充样本覆盖面。")

    return {
        "id": dataset["id"],
        "title": dataset["title"],
        "task_type": dataset["task_type"],
        "description": dataset["description"],
        "allowed_labels": dataset.get("allowed_labels", []),
        "metrics": {
            "sample_count": total,
            "split_distribution": split_distribution(samples),
            "label_distribution": label_distribution(samples),
            "source_coverage_rate": round(source_coverage_rate, 4),
            "format_pass_rate": round(format_pass_rate, 4),
            "duplicate_rate": round(duplicate_count / total, 4),
            "leakage_count": leakage_count,
            "overall_quality": round(average_quality, 4),
            "risk_level": risk_level,
        },
        "duplicate_groups": duplicate_groups,
        "leakage_pairs": leakage_pairs,
        "top_issues": top_issues,
        "recommendations": recommendations,
        "samples": reports,
    }


def audit_all() -> dict[str, Any]:
    datasets = [audit_dataset(dataset) for dataset in load_datasets()]
    total_samples = sum(dataset["metrics"]["sample_count"] for dataset in datasets)
    aggregate = {
        "dataset_count": len(datasets),
        "sample_count": total_samples,
        "avg_quality": round(sum(dataset["metrics"]["overall_quality"] for dataset in datasets) / max(len(datasets), 1), 4),
        "avg_source_coverage": round(sum(dataset["metrics"]["source_coverage_rate"] for dataset in datasets) / max(len(datasets), 1), 4),
        "total_leakage": sum(dataset["metrics"]["leakage_count"] for dataset in datasets),
        "risky_datasets": [dataset["id"] for dataset in datasets if dataset["metrics"]["risk_level"] == "high"],
    }
    return {"aggregate": aggregate, "datasets": datasets}
