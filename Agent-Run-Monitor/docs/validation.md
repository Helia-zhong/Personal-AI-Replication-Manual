# Validation

Validated on 2026-09-12 with Python 3.12 and the dependencies in requirements.lock.

- 14 Python tests: atomic ingest, idempotency, conflicts, persistence, invalid input, local API, parallel timing, unknown usage, incident identities and exception recording.
- 4 Node tests: import validation, timing, JSON round trips and Python/browser baseline parity.
- Actual RAG baseline capture: 8 measured steps; controlled error injection records a failed validation step. No LLM or token estimates are involved.
- Browser checks: SQLite source, local JSON import, rejection of an empty batch without losing existing data, navigation to a failed step, unknown-cost budget state, sample-mode regression and responsive layout.
- The sample regression still produces 3 runs, 7 incidents and a P95 of 40,900 ms. This is fixture data, not a production latency measurement.

## Reproduce

Run from Agent-Run-Monitor with the virtual environment activated:

```bash
python -m pip install -r requirements.lock
python -m unittest discover -s backend -p 'test_*.py' -v
node --test tests/data.test.cjs
python scripts/capture_rag.py --inject-failure --output .monitor/check.json
python scripts/analyze_runs.py --input .monitor/check.json --output .monitor/analysis.json
```

The CI workflow uploads these generated reports. Run IDs, timestamps and measured durations change each run. Timing tests use fixed offsets to verify the algorithm independently of machine speed.

## Scope

These checks cover the local terminal-trace workflow. They do not establish production throughput, model quality, authentication, OTLP compatibility or a guarantee that imported source labels are truthful.
