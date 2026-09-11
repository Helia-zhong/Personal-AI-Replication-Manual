(function (root) {
  'use strict';
  const defaults = { mode: 'rules', model: '', prompt: '提取资料中的事实、决定和待办。逐条保留原文引用及其行号，不补充原文没有的信息。', max_items: 12, timeout_seconds: 60, retry_limit: 1 };
  const stages = ['ingest', 'extract', 'validate', 'review', 'export'];
  function extract(source, maxItems) {
    const candidates = source.split('\n').map((line, index) => {
      const text = line.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)/, '').trim();
      const kind = /待办|TODO|action:|负责人|截止|需要|跟进/i.test(text) ? 'action' : /决定|决策|同意|采用|decision:|agreed/i.test(text) ? 'decision' : 'finding';
      return { kind, text: text.slice(0, 2000), line: index + 1, skip: !text || line.trimStart().startsWith('#') };
    }).filter(item => !item.skip);
    if (!candidates.length) throw new Error('没有可提取的正文，请在标题之外添加资料');
    candidates.sort((a, b) => Number(a.kind === 'finding') - Number(b.kind === 'finding') || a.line - b.line);
    return { items: candidates.slice(0, maxItems).sort((a, b) => a.line - b.line).map(({ kind, text, line }) => ({ kind, text, line })) };
  }
  function validate(draft, source, limit = 30) {
    if (!draft || !Array.isArray(draft.items) || !draft.items.length || draft.items.length > limit) throw new Error('请保留至少 1 条、且不超过配置数量的引用');
    const lines = source.split('\n'), seen = new Set();
    for (const item of draft.items) {
      if (!['finding', 'decision', 'action'].includes(item.kind) || !Number.isInteger(item.line) || item.line < 1 || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 2000 || !lines[item.line - 1]?.includes(item.text)) throw new Error(`L${item.line}：引用必须出现在对应原文行中`);
      const key = JSON.stringify([item.line, item.text]);
      if (seen.has(key)) throw new Error(`L${item.line}：重复引用`);
      seen.add(key);
    }
    return true;
  }
  function report(run) {
    const plain = value => String(value).replace(/([\\`*_{}\[\]<>()#!|])/g, '\\$1');
    const rows = [`# ${plain(run.title)}`, '', `Run: ${run.id}`, 'Mode: browser-rules (演示)', '', '引用经原文匹配校验；分类由人工审核确认，不代表事实真实性认证。', ''];
    for (const [kind, label] of [['finding', '资料要点'], ['decision', '决定'], ['action', '待办']]) {
      const items = run.draft.items.filter(item => item.kind === kind);
      rows.push(`## ${label}`, '', ...(items.length ? items.map(item => `- ${plain(item.text)} [L${item.line}]`) : ['无']), '');
    }
    if (run.review_note) rows.push('## 人工审核备注', '', plain(run.review_note), '');
    rows.push('## 原始资料', '', ...run.source.split('\n').map((line, index) => `> L${index + 1}: ${plain(line)}`));
    return rows.join('\n') + '\n';
  }
  root.AgentFlowEngine = { defaults, stages, extract, validate, report };
  if (typeof module !== 'undefined') module.exports = root.AgentFlowEngine;
})(globalThis);
