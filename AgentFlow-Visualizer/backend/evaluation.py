"""Deterministic scoring for the document extraction contract, without a judge model."""
import asyncio
import math
import statistics
import time

import httpx

from .contracts import Draft, RunInput, Settings, extract_rules, validate_evidence
from .runtime import ollama_extract


def score_case(case, draft, error_code=None):
    items = draft.items if draft is not None else []
    gold = case["gold"]
    lines = case["source"].split("\n")
    issues, used = [], set()
    source_valid = 0
    matched = 0
    seen = set()
    for item in items:
        valid = item.line <= len(lines) and bool(item.text.strip()) and item.text in lines[item.line - 1]
        source_valid += int(valid)
        key = (item.line, item.text)
        if not valid:
            issues.append({"code": "invalid_citation", "line": item.line, "text": item.text})
        elif key in seen:
            issues.append({"code": "duplicate", "line": item.line, "text": item.text})
        else:
            match = next((i for i, expected in enumerate(gold) if i not in used and expected["line"] == item.line
                          and expected["kind"] == item.kind and expected["text"] in item.text), None)
            if match is not None:
                used.add(match)
                matched += 1
            else:
                same_line = [expected for expected in gold if expected["line"] == item.line]
                code = "unexpected_item" if not same_line else "wrong_class" if not any(
                    expected["kind"] == item.kind for expected in same_line) else "incomplete_quote"
                issues.append({"code": code, "line": item.line, "text": item.text})
        seen.add(key)
    for i, expected in enumerate(gold):
        if i not in used:
            issues.append({"code": "missing", **expected})
    if error_code:
        issues.insert(0, {"code": error_code})
    if case["expected"] == "reject":
        passed = error_code in {"schema", "evidence", "no_content"}
        if not error_code:
            issues.insert(0, {"code": "unexpected_acceptance"})
    else:
        passed = not issues and error_code is None
    return {"passed": passed, "tp": matched, "fp": len(items) - matched, "fn": len(gold) - matched,
            "returned_items": len(items), "source_valid_items": source_valid, "issues": issues}


async def evaluate_case(case, settings, extractor=ollama_extract):
    captured = []
    draft, error_code, error = None, None, None
    schema_valid, evidence_valid = False, False
    started = time.perf_counter()
    stage = "schema" if settings.mode == "ollama" else "no_content"
    try:
        data = RunInput(title=case["title"], source=case["source"], settings=settings)
        if settings.mode == "rules":
            draft = extract_rules(data.source, settings.max_items)
        else:
            async with asyncio.timeout(settings.timeout_seconds):
                draft, _ = await extractor(data.source, settings, capture=captured.append)
        schema_valid = True
        stage = "evidence"
        validate_evidence(draft, data.source)
        evidence_valid = True
    except (TimeoutError, httpx.TimeoutException) as exc:
        error_code, error = "timeout", str(exc) or "Model call exceeded the time limit"
    except httpx.ConnectError as exc:
        error_code, error = "connection", str(exc)
    except httpx.HTTPStatusError as exc:
        error_code, error = "http", f"HTTP {exc.response.status_code}"
    except (ValueError, KeyError, TypeError) as exc:
        error_code, error = stage, str(exc)[:2000]
    elapsed = round((time.perf_counter() - started) * 1000, 3)
    transcript = captured[-1] if captured else None
    response = transcript["response"] if transcript else {}
    def count(key):
        value = response.get(key)
        return value if type(value) is int and value >= 0 else None
    return {"case_id": case["id"], "expected": case["expected"], "elapsed_ms": elapsed,
            "schema_valid": schema_valid, "evidence_valid": evidence_valid,
            "draft": draft.model_dump() if draft is not None else None, "transcript": transcript,
            "error_code": error_code, "error": error,
            "usage": {"input_tokens": count("prompt_eval_count"), "output_tokens": count("eval_count"),
                      "load_ms": count("load_duration") / 1e6 if count("load_duration") is not None else None},
            "score": score_case(case, draft, error_code)}


def summarize(rows):
    if not rows:
        raise ValueError("Cannot score an empty evaluation")
    positive = [row for row in rows if row["expected"] == "extract"]
    negative = [row for row in rows if row["expected"] == "reject"]
    tp, fp, fn = (sum(row["score"][key] for row in rows) for key in ("tp", "fp", "fn"))
    def ratio(n, d):
        return round(n / d, 6) if d else None
    latency = sorted(row["elapsed_ms"] for row in rows)
    usage = {}
    for key in ["input_tokens", "output_tokens"]:
        counts = [row["usage"][key] for row in rows if row["usage"][key] is not None]
        usage[key] = sum(counts) if counts else None
    return {"runs": len(rows), "passed": sum(row["score"]["passed"] for row in rows),
            "document_pass_rate": ratio(sum(row["score"]["passed"] for row in rows), len(rows)),
            "precision": ratio(tp, tp + fp), "recall": ratio(tp, tp + fn), "f1": ratio(2 * tp, 2 * tp + fp + fn),
            "tp": tp, "fp": fp, "fn": fn,
            "schema_valid_rate": ratio(sum(row["schema_valid"] for row in positive), len(positive)),
            "evidence_valid_rate": ratio(sum(row["evidence_valid"] for row in positive), len(positive)),
            "rejection_correct_rate": ratio(sum(row["score"]["passed"] for row in negative), len(negative)),
            "p50_ms": round(statistics.median(latency), 3), "p95_ms": latency[math.ceil(len(latency) * .95) - 1],
            "usage": usage}


def validate_dataset(dataset):
    ids = set()
    if not dataset.get("cases"):
        raise ValueError("The dataset must contain cases")
    for case in dataset["cases"]:
        if case["id"] in ids or case["expected"] not in {"extract", "reject"}:
            raise ValueError("Duplicate case id or unsupported expected outcome")
        ids.add(case["id"])
        RunInput(title=case["title"], source=case["source"])
        if case["expected"] == "extract":
            gold = Draft.model_validate({"items": case["gold"]})
            validate_evidence(gold, case["source"])
            if len({item.line for item in gold.items}) != len(gold.items):
                raise ValueError("This benchmark labels one item per source line")
        elif case["gold"]:
            raise ValueError("A rejection case cannot have gold extraction items")
