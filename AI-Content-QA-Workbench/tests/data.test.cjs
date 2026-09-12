const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(project, 'web/app.js'), 'utf8');

test('browser bundle parses and keeps the content data contract', () => {
  assert.doesNotThrow(() => new Function(app));
  const sandbox = { document: { addEventListener() {} }, window: {}, localStorage: { getItem() { return null; }, setItem() {} } };
  vm.createContext(sandbox);
  vm.runInContext(app, sandbox);
  const result = vm.runInContext("validateSamples([{id:'sample-1',title:'A',content:'这是一个足够长的内容句子。',sources:[]}])", sandbox);
  assert.equal(result[0].source, 'imported');
  assert.throws(() => vm.runInContext("validateSamples([{id:'bad id',title:'A',content:'这是一个足够长的内容句子。',sources:[]}])", sandbox));
});

test('all pages include the shared data-source toolbar hooks', () => {
  for (const page of ['index', 'review', 'sources', 'report']) {
    const html = fs.readFileSync(path.join(project, `web/${page}.html`), 'utf8');
    assert.match(html, /app\.js\?v=6\.0\.0/);
  }
});
