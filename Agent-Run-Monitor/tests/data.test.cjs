const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const data = require('../web/trace-data.js');
const project = path.join(__dirname, '..');
const samples = JSON.parse(fs.readFileSync(path.join(project, 'data/sample_runs.json')));

test('import validates each record before accepting a batch', () => {
  assert.equal(data.validate(samples).length, 3);
  assert.throws(() => data.validate([...samples, samples[0]]));
  assert.throws(() => data.validate([]));
  const accumulated = Array.from({ length: 101 }, (_, i) => ({ ...samples[0], run_id: `run-${i}` }));
  assert.throws(() => data.validate(accumulated));
  assert.equal(data.validate(accumulated, Infinity).length, 101);
  const missingId = structuredClone(samples);
  delete missingId[0].run_id;
  assert.throws(() => data.validate(missingId));
  for (const invalid of [-1, NaN, Infinity, '100']) {
    const copy = structuredClone(samples);
    copy[0].steps[0].duration_ms = invalid;
    assert.throws(() => data.validate(copy));
  }
  const copy = structuredClone(samples);
  copy[0].steps[0].start_ms = 0;
  assert.throws(() => data.validate(copy));
});

test('parallel and sequential timings retain their meaning', () => {
  const copy = structuredClone(samples[0]);
  copy.steps = copy.steps.slice(0, 2).map(step => ({ ...step, duration_ms: 100, start_ms: 20 }));
  assert.equal(data.timing(copy).total, 120);
  assert.equal(data.timing(copy).work, 200);
  assert.equal(data.timing(samples[0]).total, 24470);
});

test('browser and Python agree on baseline metrics and incident identities', () => {
  const sandbox = { document: { addEventListener() {} }, TraceData: data };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(project, 'web/app.js'), 'utf8'), sandbox);
  const summaries = vm.runInContext('SAMPLE_RUNS.map(summarizeRun)', sandbox);
  const python = JSON.parse(execFileSync(process.env.MONITOR_PYTHON || 'python',
    ['scripts/analyze_runs.py'], { cwd: project, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }));
  for (const [index, item] of summaries.entries()) {
    const backend = python.runs[index];
    assert.equal(item.totalDuration, backend.metrics.total_duration_ms);
    assert.equal(Number(item.totalCost.toFixed(4)), backend.metrics.estimated_cost_usd);
    assert.equal(item.totalTokens, backend.metrics.total_tokens);
    assert.deepEqual(Array.from(item.incidents, incident => incident.id),
      backend.incidents.map(incident => incident.id));
    assert.deepEqual(Array.from(item.incidents, incident => incident.stepId),
      backend.incidents.map(incident => incident.step_id));
    assert.deepEqual(Array.from(item.incidents, incident => incident.severity),
      backend.incidents.map(incident => incident.severity));
  }
});

test('unrecorded usage stays null after import and export', () => {
  const copy = structuredClone(samples[0]);
  delete copy.steps[0].cost_usd;
  delete copy.steps[0].tokens_in;
  const imported = data.validate([copy]);
  assert.equal(imported[0].steps[0].cost_usd, null);
  assert.equal(imported[0].steps[0].tokens_in, null);
  assert.deepEqual(data.validate(JSON.parse(JSON.stringify({ runs: imported }))), imported);
});
