import asyncio
import json
import tempfile
import time
import unittest
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.contracts import Draft, RunInput, Settings, extract_rules, validate_evidence
from backend.runtime import Runner, Store, ollama_extract

SOURCE = "# Release notes\nFeature: source references.\nDecision: keep the original text.\nTODO: add recovery tests.\n"


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "test.sqlite3"
        self.app = create_app(self.db)
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.temp.cleanup()

    def submit(self, source=SOURCE, settings=None):
        response = self.client.post("/api/runs", json={"title": "Review", "source": source, "settings": settings or {}})
        self.assertEqual(response.status_code, 201, response.text)
        run_id = response.json()["id"]
        for _ in range(100):
            run = self.client.get("/api/runs/" + run_id).json()
            if run["status"] not in {"queued", "running"}:
                return run
            time.sleep(0.01)
        self.fail("Run did not finish")

    def test_input_changes_output_and_report_requires_review(self):
        first = self.submit()
        second = self.submit("待办：周五完成界面测试。")
        self.assertEqual(first["status"], "awaiting_review")
        self.assertNotEqual(first["draft"], second["draft"])
        url = "/api/runs/" + first["id"]
        self.assertEqual(self.client.get(url + "/report").status_code, 409)
        body = {"version": first["version"], "decision": "approve", "draft": first["draft"], "note": "Checked"}
        response = self.client.post(url + "/review", json=body)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "succeeded")
        self.assertIn("Source SHA-256", self.client.get(url + "/report").text)
        self.assertEqual(self.client.post(url + "/review", json=body).status_code, 409)
        self.assertEqual(self.client.post(url + "/retry", json={}).status_code, 409)

    def test_fabricated_evidence_cannot_be_approved(self):
        run = self.submit()
        run["draft"]["items"][0]["text"] = "This never appeared in the source"
        response = self.client.post("/api/runs/" + run["id"] + "/review", json={
            "version": run["version"], "decision": "approve", "draft": run["draft"]
        })
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.get("/api/runs/" + run["id"]).json()["status"], "awaiting_review")

    def test_reject_retry_preserves_parent_and_configuration(self):
        run = self.submit(settings={"max_items": 2})
        url = "/api/runs/" + run["id"]
        self.client.post(url + "/review", json={"version": run["version"], "decision": "reject", "draft": run["draft"]})
        self.client.put("/api/settings", json={"max_items": 25})
        child = self.client.post(url + "/retry", json={}).json()
        self.assertEqual(child["parent_id"], run["id"])
        self.assertEqual(child["settings"]["max_items"], 2)
        self.assertEqual(self.client.get(url).json()["status"], "rejected")

    def test_cancel_review_and_version_conflict(self):
        run = self.submit()
        url = "/api/runs/" + run["id"]
        response = self.client.post(url + "/review", json={"version": 1, "decision": "approve", "draft": run["draft"]})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.client.post(url + "/cancel", json={}).json()["status"], "cancelled")
        response = self.client.post(url + "/review", json={"version": run["version"], "decision": "approve", "draft": run["draft"]})
        self.assertEqual(response.status_code, 409)

    def test_invalid_inputs_and_missing_run(self):
        for source in [" ", "\x00", "a" * 30001]:
            self.assertEqual(self.client.post("/api/runs", json={"title": "x", "source": source}).status_code, 422)
        self.assertEqual(self.client.post("/api/runs", json={"title": "x", "source": "a", "settings": {"max_items": True}}).status_code, 422)
        self.assertEqual(self.client.get("/api/runs/missing").status_code, 404)
        self.assertEqual(self.submit("# title only")["status"], "failed")

    def test_cross_origin_and_private_files_are_blocked(self):
        for name in [".agentflow/runs.sqlite3", "backend/runtime.py", ".env", "requirements.txt"]:
            self.assertEqual(self.client.get("/" + name).status_code, 404)
        self.assertEqual(self.client.post("/api/runs", json={}, headers={"Origin": "https://unrelated.example"}).status_code, 403)
        self.assertEqual(self.client.post("/api/runs", content="{}").status_code, 415)

    def test_audit_data_and_settings_survive_restart(self):
        self.client.put("/api/settings", json={"max_items": 7})
        run = self.submit()
        with TestClient(create_app(self.db)) as restarted:
            saved = restarted.get("/api/runs/" + run["id"]).json()
            self.assertEqual(saved["source_hash"], run["source_hash"])
            self.assertEqual(saved["status"], "awaiting_review")
            self.assertEqual(saved["events"], run["events"])
            self.assertEqual(restarted.get("/api/settings").json()["max_items"], 7)
            self.assertNotIn("source", restarted.get("/api/runs").json()[0])


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.temp.name) / "runs.sqlite3")
        self.runner = Runner(self.store)

    async def asyncTearDown(self):
        await self.runner.close()
        self.temp.cleanup()

    async def finish(self, run):
        await self.runner.tasks[run["id"]]
        return self.store.get(run["id"])

    async def test_running_cancel_does_not_publish_late_model_response(self):
        started = asyncio.Event()
        async def slow(source, settings):
            started.set()
            await asyncio.sleep(10)
            return extract_rules(source, 12), None
        self.runner.extractor = slow
        run = self.runner.submit(RunInput(title="cancel", source=SOURCE, settings=Settings(mode="ollama", model="fixture")))
        await asyncio.wait_for(started.wait(), 2)
        task = self.runner.tasks[run["id"]]
        self.runner.cancel(run["id"])
        await task
        saved = self.store.get(run["id"])
        self.assertEqual(saved["status"], "cancelled")
        self.assertIsNone(saved["report"])
        self.assertIsNone(saved["draft"])

    async def test_timeout_is_failed_with_no_mock_fallback(self):
        async def slow(source, settings):
            await asyncio.sleep(10)
        self.runner.extractor = slow
        run = self.runner.submit(RunInput(title="timeout", source=SOURCE, settings=Settings(mode="ollama", model="fixture", timeout_seconds=1, retry_limit=0)))
        saved = await self.finish(run)
        self.assertEqual(saved["status"], "failed")
        self.assertIn("超时", saved["error"])
        self.assertIsNone(saved["draft"])

    async def test_transient_retry_and_reported_usage(self):
        attempts = []
        async def flaky(source, settings):
            attempts.append(1)
            if len(attempts) == 1:
                raise httpx.ConnectError("unavailable")
            return extract_rules(source, 12), {"input_tokens": 10, "output_tokens": 20}
        self.runner.extractor = flaky
        run = self.runner.submit(RunInput(title="retry", source=SOURCE, settings=Settings(mode="ollama", model="fixture")))
        saved = await self.finish(run)
        self.assertEqual(saved["status"], "awaiting_review")
        self.assertEqual(len(attempts), 2)
        self.assertEqual(saved["usage"]["input_tokens"], 10)
        self.assertTrue(any(event["type"] == "retry" for event in saved["events"]))

    async def test_invalid_model_result_is_failed_at_validation(self):
        async def wrong(source, settings):
            return Draft.model_validate({"items": [{"kind": "finding", "text": "invented", "line": 1}]}), None
        self.runner.extractor = wrong
        run = self.runner.submit(RunInput(title="bad citation", source=SOURCE, settings=Settings(mode="ollama", model="fixture")))
        saved = await self.finish(run)
        self.assertEqual(saved["status"], "failed")
        self.assertEqual(saved["steps"][2]["status"], "failed")
        self.assertIsNotNone(saved["original_draft"])

    async def test_restart_marks_interrupted_work_retryable(self):
        run = self.runner.submit(RunInput(title="interrupted", source=SOURCE))
        await self.runner.close()
        self.store.recover()
        self.assertEqual(self.store.get(run["id"])["status"], "failed")
        child = self.runner.retry(run["id"])
        saved = await self.finish(child)
        self.assertEqual(saved["status"], "awaiting_review")

    async def test_ollama_http_contract_and_invalid_json(self):
        captured = []
        async def handler(request):
            captured.append(json.loads(request.content))
            return httpx.Response(200, json={"message": {"content": extract_rules(SOURCE, 12).model_dump_json()}, "prompt_eval_count": 9, "eval_count": 15})
        def factory(**kwargs):
            return httpx.AsyncClient(transport=httpx.MockTransport(handler), **kwargs)
        draft, usage = await ollama_extract(SOURCE, Settings(mode="ollama", model="fixture"), factory)
        validate_evidence(draft, SOURCE)
        self.assertEqual(usage["output_tokens"], 15)
        self.assertFalse(captured[0]["stream"])
        self.assertEqual(captured[0]["format"]["type"], "object")
        for count in ["<img src=x>", -1, True, 1.5]:
            with self.subTest(count=count):
                async def invalid_usage(request):
                    return httpx.Response(200, json={"message": {"content": draft.model_dump_json()}, "eval_count": count})
                with self.assertRaisesRegex(ValueError, "Token"):
                    await ollama_extract(SOURCE, Settings(mode="ollama", model="fixture"),
                                         lambda **kwargs: httpx.AsyncClient(transport=httpx.MockTransport(invalid_usage), **kwargs))
        async def broken(request):
            return httpx.Response(200, json={"message": {"content": "not JSON"}})
        with self.assertRaises(ValueError):
            await ollama_extract(SOURCE, Settings(mode="ollama", model="fixture"),
                                 lambda **kwargs: httpx.AsyncClient(transport=httpx.MockTransport(broken), **kwargs))


if __name__ == "__main__":
    unittest.main()
