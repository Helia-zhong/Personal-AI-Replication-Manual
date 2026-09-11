# Validation Notes

## Deterministic baseline

From `RAG-Evaluation-Studio/`:

```bash
python -m unittest discover -s backend -p 'test_*.py' -v
python scripts/run_eval.py --top-k 3 --output reports/baseline.json
python -m compileall -q backend scripts
```

The deterministic provider uses the checked-in corpus and evaluation cases. It is suitable for regression checks because the same question set, tokenizer, BM25 parameters and scoring formula are used on every run.

## Optional Ollama run

Start Ollama locally, make a model available, then run:

```bash
python scripts/run_eval.py --provider ollama --model llama3.2:3b --top-k 3 --output reports/ollama.json
```

The report records provider, model, latency and token counters. A model or network failure is recorded per case and does not silently become a deterministic answer.

## Interpretation boundary

This is a small, static benchmark for inspecting retrieval behavior and generation grounding. Its scores do not represent general model accuracy. Production validation should add representative data, access-control tests, adversarial queries, human review and a larger regression set.
