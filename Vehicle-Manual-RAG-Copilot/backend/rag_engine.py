from __future__ import annotations

import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
MANUAL_PATH = ROOT / "docs" / "manual.md"


@dataclass
class Chunk:
    title: str
    text: str
    tokens: list[str]


def tokenize(text: str) -> list[str]:
    text = text.lower()
    words = re.findall(r"[a-z0-9]+", text)
    chars = re.findall(r"[\u4e00-\u9fff]", text)
    bigrams = ["".join(chars[i : i + 2]) for i in range(max(0, len(chars) - 1))]
    return words + chars + bigrams


def load_chunks(path: Path = MANUAL_PATH) -> list[Chunk]:
    raw = path.read_text(encoding="utf-8")
    sections = re.split(r"\n## ", raw)
    chunks: list[Chunk] = []
    for section in sections:
        section = section.strip()
        if not section or section.startswith("# "):
            continue
        lines = section.splitlines()
        title = lines[0].strip("# ").strip()
        body = "\n".join(lines[1:]).strip()
        chunks.append(Chunk(title=title, text=body, tokens=tokenize(title + "\n" + body)))
    return chunks


def build_idf(chunks: Iterable[Chunk]) -> dict[str, float]:
    chunks = list(chunks)
    doc_count = len(chunks)
    df: dict[str, int] = {}
    for chunk in chunks:
        for token in set(chunk.tokens):
            df[token] = df.get(token, 0) + 1
    return {token: math.log((doc_count + 1) / (count + 1)) + 1 for token, count in df.items()}


def retrieve(query: str, chunks: list[Chunk] | None = None, top_k: int = 3) -> list[dict]:
    chunks = chunks or load_chunks()
    idf = build_idf(chunks)
    query_tokens = tokenize(query)
    if not query_tokens:
        return []
    query_counts = {token: query_tokens.count(token) for token in set(query_tokens)}
    results: list[dict] = []

    for chunk in chunks:
        chunk_counts = {token: chunk.tokens.count(token) for token in set(chunk.tokens)}
        score = 0.0
        for token, q_count in query_counts.items():
          if token in chunk_counts:
              score += q_count * chunk_counts[token] * idf.get(token, 1.0)
        score = score / max(len(chunk.tokens), 1) ** 0.45
        if score > 0:
            results.append({"title": chunk.title, "text": chunk.text, "score": round(score, 4)})

    return sorted(results, key=lambda item: item["score"], reverse=True)[:top_k]


def answer(query: str) -> dict:
    hits = retrieve(query)
    if not hits or hits[0]["score"] < 0.2:
        return {
            "answer": "手册资料中没有找到足够相关的内容。请换一种问法，或补充车辆型号、报警提示和具体场景。",
            "confidence": "low",
            "sources": hits,
        }

    top = hits[0]
    answer_text = f"根据《{top['title']}》部分：{top['text']}"
    if len(hits) > 1:
        answer_text += f"\n\n另可参考《{hits[1]['title']}》部分，以确认相关系统是否同时报警。"
    confidence = "high" if top["score"] >= 1.0 else "medium"
    return {"answer": answer_text, "confidence": confidence, "sources": hits}


def main() -> None:
    query = " ".join(sys.argv[1:]) or "胎压报警怎么办"
    print(json.dumps(answer(query), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
