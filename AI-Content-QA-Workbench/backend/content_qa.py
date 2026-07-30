from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "data"
TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+|[\u4e00-\u9fff]")
CITATION_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")
NUMBER_RE = re.compile(r"\d+(?:\.\d+)?%?|\d+\s*(?:天|秒|条|个|次)")
ABSOLUTE_TERMS = ["所有", "任何", "完全", "永远", "一定", "保证", "零错误", "没有任何"]
STOPWORDS = {"的", "了", "和", "与", "或", "在", "是", "为", "并", "会", "可", "可以", "当"}


def load_samples() -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / "content_samples.json").read_text(encoding="utf-8"))


def get_sample(sample_id: str) -> dict[str, Any]:
    for sample in load_samples():
        if sample["id"] == sample_id:
            return sample
    raise KeyError(f"Sample not found: {sample_id}")


def tokenize(text: str) -> set[str]:
    return {
        match.group(0).lower()
        for match in TOKEN_RE.finditer(text)
        if match.group(0).lower() not in STOPWORDS
    }


def split_claims(content: str) -> list[str]:
    parts = re.split(r"(?<=[。！？!?])\s*", content.strip())
    return [part.strip() for part in parts if len(part.strip()) >= 8]


def citation_ids(claim: str) -> list[str]:
    return CITATION_RE.findall(claim)


def cited_sources(sample: dict[str, Any], ids: list[str]) -> list[dict[str, str]]:
    source_map = {source["id"]: source for source in sample["sources"]}
    return [source_map[source_id] for source_id in ids if source_id in source_map]


def support_score(claim: str, sources: list[dict[str, str]]) -> float:
    claim_tokens = tokenize(CITATION_RE.sub("", claim))
    if not claim_tokens or not sources:
        return 0.0
    source_tokens = set()
    for source in sources:
        source_tokens |= tokenize(f"{source['title']} {source['text']}")
    return round(len(claim_tokens & source_tokens) / len(claim_tokens), 4)


def audit_claim(sample: dict[str, Any], claim: str) -> dict[str, Any]:
    ids = citation_ids(claim)
    sources = cited_sources(sample, ids)
    score = support_score(claim, sources)
    issues = []

    if not ids:
        issues.append({"severity": "medium", "type": "missing_citation", "message": "声明缺少来源引用。"})
    if NUMBER_RE.search(claim) and not ids:
        issues.append({"severity": "high", "type": "number_without_source", "message": "数字声明需要可追溯来源。"})
    if any(term in claim for term in ABSOLUTE_TERMS):
        issues.append({"severity": "medium", "type": "absolute_language", "message": "存在绝对化表达，建议改为有边界的描述。"})
    if ids and score < 0.2:
        issues.append({"severity": "medium", "type": "weak_source_match", "message": "引用来源与声明匹配不足。"})
    if ids and len(sources) != len(ids):
        issues.append({"severity": "high", "type": "unknown_source", "message": "存在无法匹配的引用 ID。"})

    severity_rank = {"low": 1, "medium": 2, "high": 3}
    severity = "ok"
    if issues:
        severity = max((issue["severity"] for issue in issues), key=lambda item: severity_rank[item])

    return {
        "claim": claim,
        "citations": ids,
        "support_score": score,
        "severity": severity,
        "issues": issues,
    }


def audit_sample(sample: dict[str, Any]) -> dict[str, Any]:
    claims = [audit_claim(sample, claim) for claim in split_claims(sample["content"])]
    cited_count = sum(1 for claim in claims if claim["citations"])
    issue_count = sum(len(claim["issues"]) for claim in claims)
    high_count = sum(1 for claim in claims for issue in claim["issues"] if issue["severity"] == "high")
    average_support = sum(claim["support_score"] for claim in claims) / max(cited_count, 1)

    if high_count:
        risk_level = "high"
    elif issue_count >= 2:
        risk_level = "medium"
    elif issue_count:
        risk_level = "low"
    else:
        risk_level = "ok"

    return {
        "id": sample["id"],
        "title": sample["title"],
        "metrics": {
            "claim_count": len(claims),
            "citation_coverage": round(cited_count / max(len(claims), 1), 4),
            "average_support": round(average_support, 4),
            "issue_count": issue_count,
            "risk_level": risk_level,
        },
        "claims": claims,
        "sources": sample["sources"],
    }


def audit_all() -> dict[str, Any]:
    samples = [audit_sample(sample) for sample in load_samples()]
    aggregate = {
        "sample_count": len(samples),
        "avg_citation_coverage": round(
            sum(sample["metrics"]["citation_coverage"] for sample in samples) / max(len(samples), 1),
            4,
        ),
        "avg_support": round(
            sum(sample["metrics"]["average_support"] for sample in samples) / max(len(samples), 1),
            4,
        ),
        "total_issues": sum(sample["metrics"]["issue_count"] for sample in samples),
        "high_risk_samples": [sample["id"] for sample in samples if sample["metrics"]["risk_level"] == "high"],
    }
    return {"aggregate": aggregate, "samples": samples}
