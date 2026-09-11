"""Reproduce rule parity and full workflow measurements on synthetic documents."""
import asyncio
import json
import platform
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.contracts import Review, RunInput, Settings
from backend.runtime import Runner, Store

CASES = [
    {"id": "chinese-minutes", "source": "# 会议记录\n决定：采用原文引用。\n待办：周五补充测试。\n风险：资料仍需核验。", "expected": [["decision", 2], ["action", 3], ["finding", 4]]},
    {"id": "english-actions", "source": "# Release\nDecision: keep evidence.\nTODO: verify restart.\nFeature: import text.", "expected": [["decision", 2], ["action", 3], ["finding", 4]]},
    {"id": "markdown-lines", "source": "\n# 工作项\n\n- [ ] TODO: add tests.\n1. 决定：使用本地数据库。\n- 一般说明", "expected": [["action", 4], ["decision", 5], ["finding", 6]]},
    {"id": "literal-markup", "source": 'TODO: display <script>alert(1)</script> as text.\n[example](https://example.com)', "expected": [["action", 1], ["finding", 2]]},
]


async def main():
    rows = []
    with tempfile.TemporaryDirectory() as directory:
        store = Store(Path(directory) / "benchmark.sqlite3")
        runner = Runner(store)
        for case in CASES:
            start = time.perf_counter()
            run = runner.submit(RunInput(title=case["id"], source=case["source"], settings=Settings()))
            await runner.tasks[run["id"]]
            run = store.get(run["id"])
            if run["status"] != "awaiting_review":
                raise AssertionError(run["error"])
            actual = [[item["kind"], item["line"]] for item in run["draft"]["items"]]
            assert actual == case["expected"], (case["id"], actual)
            js = subprocess.run(
                ["node", "-e", "const E=require('./engine.js');let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify(E.extract(JSON.parse(s).source,12))));"],
                input=json.dumps(case, ensure_ascii=False), text=True, encoding="utf-8", cwd=ROOT, capture_output=True, check=True,
            )
            assert json.loads(js.stdout) == run["draft"], case["id"]
            completed = runner.review(run["id"], Review(version=run["version"], decision="approve", draft=run["draft"], note="Synthetic benchmark verification"))
            assert completed["status"] == "succeeded"
            rows.append({"case": case["id"], "items": len(actual), "status": completed["status"], "rule_parity": True,
                         "processing_ms": round(sum(step["duration_ms"] or 0 for step in completed["steps"]), 3),
                         "verification_wall_ms": round((time.perf_counter() - start) * 1000, 3)})
        await runner.close()
    result = {"python": platform.python_version(), "platform": platform.system(), "mode": "rules", "synthetic_cases": len(rows),
              "scope": "Correctness/parity smoke set; not model-quality or production-performance evidence.",
              "median_processing_ms": round(statistics.median(row["processing_ms"] for row in rows), 3),
              "cases": rows}
    destination = ROOT / "docs" / "validation-results.json"
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
