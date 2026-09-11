const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

test('different documents produce their own evidence and preserve source line numbers', () => {
  const source = '# 标题\n\n- 决定：采用本地存储。\n- [ ] TODO: finish tests.\n一般说明';
  const draft = E.extract(source, 2);
  assert.deepEqual(draft.items.map(x => [x.kind, x.line]), [['decision', 3], ['action', 4]]);
  assert.equal(E.validate(draft, source), true);
  assert.notDeepEqual(draft, E.extract('待办：另一份资料。', 12));
});
test('reject invented evidence, duplicate citations, malformed data, and heading-only input', () => {
  assert.throws(() => E.extract('# Title', 12));
  for (const item of [{ kind: 'finding', text: 'fabricated', line: 1 }, { kind: 'finding', text: 'source', line: 0 }, { kind: 'tool', text: 'source', line: 1 }]) {
    assert.throws(() => E.validate({ items: [item] }, 'source'));
  }
  const item = { kind: 'finding', text: 'source', line: 1 };
  assert.throws(() => E.validate({ items: [item, item] }, 'source'));
  assert.throws(() => E.validate({ items: [] }, 'source'));
});
test('reports escape source HTML and keep reference links as text', () => {
  const source = 'TODO: <script>alert(1)</script> [unsafe](https://example.com)';
  const run = { title: '# unsafe', id: 'demo-1', source, draft: E.extract(source, 12), review_note: '' };
  const report = E.report(run);
  assert.ok(report.includes('browser-rules'));
  assert.ok(report.includes('[L1]'));
  assert.ok(!report.includes('<script>'));
});
