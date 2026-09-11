"""Input contracts and evidence-grounded document extraction."""
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DEFAULT_PROMPT = "提取资料中的事实、决定和待办。逐条保留原文引用及其行号，不补充原文没有的信息。"
STAGES = ["ingest", "extract", "validate", "review", "export"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Settings(StrictModel):
    mode: Literal["rules", "ollama"] = "rules"
    model: str = Field(default="", max_length=120)
    prompt: str = Field(default=DEFAULT_PROMPT, min_length=1, max_length=4000)
    max_items: int = Field(default=12, ge=1, le=30)
    timeout_seconds: int = Field(default=60, ge=1, le=180)
    retry_limit: int = Field(default=1, ge=0, le=2)


class RunInput(StrictModel):
    title: str = Field(min_length=1, max_length=120)
    source: str = Field(min_length=1, max_length=30000)
    settings: Settings = Field(default_factory=Settings)

    @field_validator("title", "source")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip() or "\x00" in value:
            raise ValueError("资料与标题不能为空，也不能包含 NUL 字符")
        return value.replace("\r\n", "\n").replace("\r", "\n")


class Evidence(StrictModel):
    kind: Literal["finding", "decision", "action"]
    text: str = Field(min_length=1, max_length=2000)
    line: int = Field(ge=1)


class Draft(StrictModel):
    items: list[Evidence] = Field(min_length=1, max_length=30)


class Review(StrictModel):
    version: int = Field(ge=1)
    decision: Literal["approve", "reject"]
    draft: Draft
    note: str = Field(default="", max_length=2000)


def validate_evidence(draft: Draft, source: str) -> None:
    lines = source.split("\n")
    seen = set()
    for item in draft.items:
        if not item.text.strip() or item.line > len(lines) or item.text not in lines[item.line - 1]:
            raise ValueError(f"L{item.line}：引用必须出现在对应原文行中")
        key = (item.line, item.text)
        if key in seen:
            raise ValueError(f"L{item.line}：重复引用")
        seen.add(key)


def extract_rules(source: str, max_items: int) -> Draft:
    candidates = []
    for number, line in enumerate(source.split("\n"), 1):
        text = re.sub(r"^\s*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)", "", line).strip()
        if not text or line.lstrip().startswith("#"):
            continue
        kind = "finding"
        if re.search(r"待办|TODO|action:|负责人|截止|需要|跟进", text, re.I):
            kind = "action"
        elif re.search(r"决定|决策|同意|采用|decision:|agreed", text, re.I):
            kind = "decision"
        candidates.append({"kind": kind, "text": text[:2000], "line": number})
    if not candidates:
        raise ValueError("没有可提取的正文，请在标题之外添加资料")
    # Reserve capacity for actionable lines, then preserve original source order.
    candidates.sort(key=lambda item: (item["kind"] == "finding", item["line"]))
    selected = sorted(candidates[:max_items], key=lambda item: item["line"])
    return Draft.model_validate({"items": selected})


def markdown_report(run: dict) -> str:
    def plain(value: str) -> str:
        return re.sub(r"([\\`*_{}\[\]<>()#!|])", r"\\\1", value)

    rows = [f"# {plain(run['title'])}", "", f"Run: {run['id']}",
            f"Mode: {run['settings']['mode']}", f"Model: {plain(run['settings']['model']) or 'N/A'}",
            f"Source SHA-256: {run['source_hash']}", "",
            "引用经原文匹配校验；分类由人工审核确认，不代表事实真实性认证。", ""]
    for kind, label in [("finding", "资料要点"), ("decision", "决定"), ("action", "待办")]:
        rows += [f"## {label}", ""]
        items = [item for item in run["draft"]["items"] if item["kind"] == kind]
        rows += [f"- {plain(item['text'])} [L{item['line']}]" for item in items] or ["无"]
        rows.append("")
    if run.get("review_note"):
        rows += ["## 人工审核备注", "", plain(run["review_note"]), ""]
    rows += ["## 原始资料", ""]
    rows += [f"> L{i}: {plain(line)}" for i, line in enumerate(run["source"].split("\n"), 1)]
    return "\n".join(rows) + "\n"
