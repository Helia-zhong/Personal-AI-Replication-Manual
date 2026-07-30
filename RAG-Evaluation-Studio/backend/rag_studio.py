from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "data"
TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+|[\u4e00-\u9fff]")
STOPWORDS = {
    "的",
    "了",
    "和",
    "与",
    "或",
    "应",
    "在",
    "是",
    "为",
    "及",
    "把",
    "对",
    "如何",
    "什么",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_corpus() -> list[dict[str, Any]]:
    return load_json(DATA_DIR / "knowledge_base.json")


def load_cases() -> list[dict[str, Any]]:
    return load_json(DATA_DIR / "eval_cases.json")


def tokenize(text: str) -> list[str]:
    tokens = [match.group(0).lower() for match in TOKEN_RE.finditer(text)]
    return [token for token in tokens if token not in STOPWORDS]


def sentence_split(text: str) -> list[str]:
    sentences = re.split(r"(?<=[。！？.!?])\s*", text)
    return [sentence.strip() for sentence in sentences if sentence.strip()]


def build_index(corpus: list[dict[str, Any]]) -> dict[str, Any]:
    docs = []
    doc_frequency: Counter[str] = Counter()
    total_length = 0

    for item in corpus:
        body = f"{item['title']} {item['category']} {item['text']}"
        tokens = tokenize(body)
        counts = Counter(tokens)
        docs.append({**item, "tokens": tokens, "counts": counts})
        total_length += len(tokens)
        doc_frequency.update(counts.keys())

    return {
        "docs": docs,
        "doc_frequency": doc_frequency,
        "avg_length": total_length / max(len(docs), 1),
        "doc_count": len(docs),
    }


def bm25_score(query_tokens: list[str], doc: dict[str, Any], index: dict[str, Any]) -> float:
    score = 0.0
    doc_len = max(len(doc["tokens"]), 1)
    avg_len = max(index["avg_length"], 1)
    doc_count = max(index["doc_count"], 1)
    k1 = 1.4
    b = 0.75

    for token in set(query_tokens):
        tf = doc["counts"].get(token, 0)
        if not tf:
            continue
        df = index["doc_frequency"].get(token, 0)
        idf = math.log(1 + (doc_count - df + 0.5) / (df + 0.5))
        denom = tf + k1 * (1 - b + b * doc_len / avg_len)
        score += idf * (tf * (k1 + 1)) / denom
    return round(score, 4)


def best_snippet(question_tokens: list[str], text: str) -> str:
    sentences = sentence_split(text)
    if not sentences:
        return text[:120]
    ranked = sorted(
        sentences,
        key=lambda sentence: len(set(question_tokens) & set(tokenize(sentence))),
        reverse=True,
    )
    return ranked[0][:160]


def retrieve(question: str, top_k: int = 3, corpus: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    corpus = corpus or load_corpus()
    index = build_index(corpus)
    query_tokens = tokenize(question)
    ranked = []

    for doc in index["docs"]:
        score = bm25_score(query_tokens, doc, index)
        ranked.append(
            {
                "id": doc["id"],
                "title": doc["title"],
                "category": doc["category"],
                "score": score,
                "snippet": best_snippet(query_tokens, doc["text"]),
            }
        )

    return sorted(ranked, key=lambda item: item["score"], reverse=True)[:top_k]


def synthesize_answer(question: str, retrieved: list[dict[str, Any]]) -> str:
    if not retrieved or retrieved[0]["score"] <= 0:
        return "检索材料不足，暂不能给出可靠答案。"

    lead = retrieved[0]
    supporting = "；".join(f"{item['snippet']} [{item['id']}]" for item in retrieved[:2])
    return f"根据 {lead['title']}，可以先回答：{supporting}"


def evaluate_case(case: dict[str, Any], top_k: int = 3, corpus: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    retrieved = retrieve(case["question"], top_k=top_k, corpus=corpus)
    answer = synthesize_answer(case["question"], retrieved)
    expected_ids = set(case["expected_doc_ids"])
    retrieved_ids = [item["id"] for item in retrieved]
    hits = expected_ids & set(retrieved_ids)

    answer_blob = answer.lower()
    keyword_hits = [term for term in case["expected_terms"] if term.lower() in answer_blob]
    citation_recall = len(hits) / max(len(expected_ids), 1)
    citation_precision = len(hits) / max(len(retrieved_ids), 1)
    keyword_coverage = len(keyword_hits) / max(len(case["expected_terms"]), 1)
    top_hit = 1.0 if retrieved_ids and retrieved_ids[0] in expected_ids else 0.0
    overall = 0.35 * citation_recall + 0.2 * citation_precision + 0.3 * keyword_coverage + 0.15 * top_hit

    return {
        "id": case["id"],
        "question": case["question"],
        "expected_doc_ids": sorted(expected_ids),
        "retrieved": retrieved,
        "answer": answer,
        "metrics": {
            "top_hit": round(top_hit, 4),
            "citation_recall": round(citation_recall, 4),
            "citation_precision": round(citation_precision, 4),
            "keyword_coverage": round(keyword_coverage, 4),
            "overall": round(overall, 4),
        },
        "keyword_hits": keyword_hits,
    }


def evaluate_all(top_k: int = 3) -> dict[str, Any]:
    corpus = load_corpus()
    results = [evaluate_case(case, top_k=top_k, corpus=corpus) for case in load_cases()]
    aggregate = {
        key: round(sum(item["metrics"][key] for item in results) / max(len(results), 1), 4)
        for key in ["top_hit", "citation_recall", "citation_precision", "keyword_coverage", "overall"]
    }
    return {
        "top_k": top_k,
        "aggregate": aggregate,
        "results": results,
    }


def evaluate_question(question: str, top_k: int = 3) -> dict[str, Any]:
    retrieved = retrieve(question, top_k=top_k)
    return {
        "question": question,
        "retrieved": retrieved,
        "answer": synthesize_answer(question, retrieved),
    }
