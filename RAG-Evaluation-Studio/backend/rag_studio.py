from __future__ import annotations

import json
import math
import re
import time
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "data"
TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+|[\u4e00-\u9fff]")
STOPWORDS = {"的", "了", "和", "与", "或", "应", "在", "是", "为", "及", "把", "对", "如何", "什么"}
DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_corpus() -> list[dict[str, Any]]:
    return load_json(DATA_DIR / "knowledge_base.json")


def load_cases() -> list[dict[str, Any]]:
    return load_json(DATA_DIR / "eval_cases.json")


def tokenize(text: str) -> list[str]:
    return [token for token in (match.group(0).lower() for match in TOKEN_RE.finditer(text)) if token not in STOPWORDS]


def sentence_split(text: str) -> list[str]:
    return [sentence.strip() for sentence in re.split(r"(?<=[。！？.!?])\s*", text) if sentence.strip()]


def build_index(corpus: list[dict[str, Any]]) -> dict[str, Any]:
    docs = []
    doc_frequency: Counter[str] = Counter()
    total_length = 0
    for item in corpus:
        tokens = tokenize(f"{item['title']} {item['category']} {item['text']}")
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


def bm25_score_details(query_tokens: list[str], doc: dict[str, Any], index: dict[str, Any]) -> tuple[float, dict[str, float]]:
    score = 0.0
    contributions: dict[str, float] = {}
    doc_len = max(len(doc["tokens"]), 1)
    avg_len = max(index["avg_length"], 1)
    doc_count = max(index["doc_count"], 1)
    k1, b = 1.4, 0.75
    for token in sorted(set(query_tokens)):
        tf = doc["counts"].get(token, 0)
        if not tf:
            continue
        df = index["doc_frequency"].get(token, 0)
        idf = math.log(1 + (doc_count - df + 0.5) / (df + 0.5))
        denom = tf + k1 * (1 - b + b * doc_len / avg_len)
        contribution = idf * (tf * (k1 + 1)) / denom
        contributions[token] = round(contribution, 4)
        score += contribution
    return round(score, 4), contributions


def bm25_score(query_tokens: list[str], doc: dict[str, Any], index: dict[str, Any]) -> float:
    return bm25_score_details(query_tokens, doc, index)[0]


def best_snippet(question_tokens: list[str], text: str) -> str:
    sentences = sentence_split(text)
    if not sentences:
        return text[:120]
    ranked = sorted(
        enumerate(sentences),
        key=lambda pair: (-len(set(question_tokens) & set(tokenize(pair[1]))), pair[0]),
    )
    return ranked[0][1][:160]


class RetrievalIndex:
    """Reusable BM25 index; corpus statistics are built once per evaluation run."""

    def __init__(self, corpus: list[dict[str, Any]]):
        self.corpus = corpus
        self.data = build_index(corpus)

    def search(self, question: str, top_k: int = 3, min_score: float = 0) -> list[dict[str, Any]]:
        query_tokens = tokenize(question)
        ranked = []
        for doc in self.data["docs"]:
            score, contributions = bm25_score_details(query_tokens, doc, self.data)
            matched_tokens = sorted({token for token in query_tokens if doc["counts"].get(token)})
            ranked.append({
                "id": doc["id"], "title": doc["title"], "category": doc["category"], "score": score,
                "snippet": best_snippet(query_tokens, doc["text"]), "matched_tokens": matched_tokens,
                "contributions": contributions,
            })
        ranked.sort(key=lambda item: (-item["score"], item["id"]))
        filtered = [item for item in ranked if item["score"] >= min_score]
        results = filtered[:top_k]
        for rank, item in enumerate(results, start=1):
            item["rank"] = rank
            item["truncated"] = len(filtered) > rank
            item["query_tokens"] = query_tokens
        return results


def retrieve(
    question: str,
    top_k: int = 3,
    corpus: list[dict[str, Any]] | None = None,
    min_score: float = 0,
    index: RetrievalIndex | None = None,
) -> list[dict[str, Any]]:
    return (index or RetrievalIndex(corpus or load_corpus())).search(question, top_k=top_k, min_score=min_score)


def synthesize_answer(question: str, retrieved: list[dict[str, Any]]) -> str:
    if not retrieved or retrieved[0]["score"] <= 0:
        return "检索材料不足，暂不能给出可靠答案。"
    supporting = "；".join(f"{item['snippet']} [{item['id']}]" for item in retrieved[:2])
    return f"根据 {retrieved[0]['title']}，可以先回答：{supporting}"


def generate_with_ollama(
    question: str,
    retrieved: list[dict[str, Any]],
    model: str = "llama3.2:3b",
    base_url: str = DEFAULT_OLLAMA_URL,
    timeout: float = 45,
) -> dict[str, Any]:
    context = "\n".join(f"[{item['id']}] {item['title']}\n{item['snippet']}" for item in retrieved)
    prompt = (
        "你是一个严谨的知识库问答助手。只能根据给定资料回答问题。"
        "答案必须包含实际使用的文档 ID 引用；资料不足时明确拒答，不要补充资料外的事实。\n\n"
        f"问题：{question}\n\n资料：\n{context}\n\n请用简洁中文回答，并在相关句末保留 [kb-xxx] 引用。"
    )
    request = Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=json.dumps({"model": model, "prompt": prompt, "stream": False}).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    started = time.perf_counter()
    try:
        with urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
        prompt_tokens = body.get("prompt_eval_count")
        completion_tokens = body.get("eval_count")
        return {
            "answer": body.get("response", "").strip(), "provider": "ollama", "model": model,
            "latency_ms": round((time.perf_counter() - started) * 1000, 1),
            "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
            "total_tokens": (prompt_tokens or 0) + (completion_tokens or 0), "error": None,
        }
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        return {
            "answer": "", "provider": "ollama", "model": model,
            "latency_ms": round((time.perf_counter() - started) * 1000, 1),
            "prompt_tokens": None, "completion_tokens": None, "total_tokens": None,
            "error": f"{type(exc).__name__}: {exc}",
        }


def _failure_reasons(metrics: dict[str, float], retrieved_ids: list[str], missing_terms: list[str]) -> list[str]:
    reasons = []
    if metrics["citation_recall"] < 1:
        reasons.append("expected_source_missing")
    if metrics["citation_precision"] < 1:
        reasons.append("irrelevant_source_retrieved")
    if metrics["mrr"] == 0:
        reasons.append("expected_source_not_retrieved")
    if missing_terms:
        reasons.append("answer_keyword_missing")
    if not retrieved_ids:
        reasons.append("no_candidate")
    return reasons


def evaluate_case(
    case: dict[str, Any], top_k: int = 3, corpus: list[dict[str, Any]] | None = None,
    provider: str = "deterministic", model: str = "llama3.2:3b",
    ollama_url: str = DEFAULT_OLLAMA_URL, index: RetrievalIndex | None = None,
) -> dict[str, Any]:
    retrieved = retrieve(case["question"], top_k=top_k, corpus=corpus, index=index)
    expected_ids = set(case["expected_doc_ids"])
    retrieved_ids = [item["id"] for item in retrieved]
    hits = expected_ids & set(retrieved_ids)
    if provider == "ollama":
        generation = generate_with_ollama(case["question"], retrieved, model=model, base_url=ollama_url)
        answer = generation["answer"] or "模型未返回可用答案。"
    else:
        generation = {"provider": "deterministic", "model": None, "latency_ms": None, "prompt_tokens": None,
                      "completion_tokens": None, "total_tokens": None, "error": None}
        answer = synthesize_answer(case["question"], retrieved)
    answer_blob = answer.lower()
    keyword_hits = [term for term in case["expected_terms"] if term.lower() in answer_blob]
    missing_terms = [term for term in case["expected_terms"] if term not in keyword_hits]
    citation_recall = len(hits) / max(len(expected_ids), 1)
    citation_precision = len(hits) / max(len(retrieved_ids), 1)
    keyword_coverage = len(keyword_hits) / max(len(case["expected_terms"]), 1)
    top_hit = 1.0 if retrieved_ids and retrieved_ids[0] in expected_ids else 0.0
    reciprocal_rank = next((1 / rank for rank, doc_id in enumerate(retrieved_ids, start=1) if doc_id in expected_ids), 0.0)
    overall = 0.3 * citation_recall + 0.2 * citation_precision + 0.3 * keyword_coverage + 0.1 * top_hit + 0.1 * reciprocal_rank
    metrics = {
        "top_hit": round(top_hit, 4), "recall_at_k": round(citation_recall, 4),
        "precision_at_k": round(citation_precision, 4), "mrr": round(reciprocal_rank, 4),
        "citation_recall": round(citation_recall, 4), "citation_precision": round(citation_precision, 4),
        "keyword_coverage": round(keyword_coverage, 4), "overall": round(overall, 4),
    }
    return {
        "id": case["id"], "question": case["question"], "expected_doc_ids": sorted(expected_ids),
        "retrieved": retrieved, "answer": answer, "generation": generation, "metrics": metrics,
        "keyword_hits": keyword_hits,
        "diagnostics": {
            "first_expected_rank": next((rank for rank, doc_id in enumerate(retrieved_ids, start=1) if doc_id in expected_ids), None),
            "missing_expected_doc_ids": sorted(expected_ids - set(retrieved_ids)),
            "unexpected_doc_ids": sorted(set(retrieved_ids) - expected_ids), "missing_terms": missing_terms,
            "failure_reasons": _failure_reasons(metrics, retrieved_ids, missing_terms),
        },
    }


def evaluate_all(
    top_k: int = 3, provider: str = "deterministic", model: str = "llama3.2:3b",
    ollama_url: str = DEFAULT_OLLAMA_URL,
) -> dict[str, Any]:
    corpus = load_corpus()
    index = RetrievalIndex(corpus)
    results = [evaluate_case(case, top_k=top_k, provider=provider, model=model, ollama_url=ollama_url, index=index) for case in load_cases()]
    metric_keys = ["top_hit", "recall_at_k", "precision_at_k", "mrr", "citation_recall", "citation_precision", "keyword_coverage", "overall"]
    aggregate = {key: round(sum(item["metrics"][key] for item in results) / max(len(results), 1), 4) for key in metric_keys}
    return {
        "top_k": top_k, "provider": provider, "model": model if provider == "ollama" else None,
        "corpus_size": len(corpus), "case_count": len(results),
        "failed_generations": sum(1 for item in results if item["generation"].get("error")),
        "aggregate": aggregate, "results": results,
    }


def evaluate_question(
    question: str, top_k: int = 3, provider: str = "deterministic", model: str = "llama3.2:3b",
    ollama_url: str = DEFAULT_OLLAMA_URL, min_score: float = 0,
) -> dict[str, Any]:
    retrieved = retrieve(question, top_k=top_k, min_score=min_score)
    if provider == "ollama":
        generation = generate_with_ollama(question, retrieved, model=model, base_url=ollama_url)
        answer = generation["answer"] or "模型未返回可用答案。"
    else:
        generation = {"provider": "deterministic", "model": None, "error": None, "latency_ms": None}
        answer = synthesize_answer(question, retrieved)
    return {"question": question, "top_k": top_k, "min_score": min_score, "provider": provider,
            "retrieved": retrieved, "answer": answer, "generation": generation}
