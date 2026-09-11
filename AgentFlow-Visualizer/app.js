(function () {
  'use strict';
  const E = globalThis.AgentFlowEngine;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
  const icon = name => '<i data-lucide="' + name + '" aria-hidden="true"></i>';
  const labels = { queued: '排队中', running: '处理中', awaiting_review: '待审核', succeeded: '已完成', failed: '失败', cancelled: '已取消', rejected: '已退回', pending: '待执行' };
  const stageNames = ['资料接收', '结构化提取', '引用校验', '人工审核', '报告导出'];
  const stageIcons = ['file-input', 'scan-text', 'list-checks', 'user-check', 'file-down'];
  const page = document.body.dataset.page;
  const keys = { runs: 'agentflow.v1.runs', settings: 'agentflow.v1.settings', input: 'agentflow.v1.input' };
  const sample = { title: '知识库产品周会', source: '# 知识库产品周会\n日期：2026-09-10\n\n现状：当前用户反馈集中在文档导入和引用定位。\n决定：本轮采用按段落切分，保留文件名和原始行号。\n待办：林同学在周五前补充 20 个带来源的问题。\n待办：陈同学负责回归测试，覆盖空文档和引用缺失。\n风险：扫描 PDF 的文字识别仍需单独验证。\n决定：先完成文本资料导入，再评估扫描件支持。' };
  let online = false, config = { ...E.defaults }, allRuns = [], pollTimer, pending = false;
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('show'), 4500);
  }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { throw new Error('本地存储不可用或已满，请释放空间后重试'); }
  }
  async function api(path, method = 'GET', body) {
    const res = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12000) });
    const data = await res.json().catch(() => ({ detail: '服务没有返回有效 JSON' }));
    if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : '输入格式有误，请检查字段及长度');
    return data;
  }
  const badge = status => '<span class="badge ' + esc(status) + '">' + esc(labels[status] || status) + '</span>';
  const modeName = run => run.settings.mode === 'ollama' ? 'Ollama · ' + run.settings.model : run.settings.mode === 'browser-rules' ? '浏览器规则演示' : '本地规则处理';
  const date = value => new Date(value).toLocaleString('zh-CN', { hour12: false });
  const duration = run => {
    const ms = run.steps.reduce((total, step) => total + (step.duration_ms || 0), 0);
    return ms < 1000 ? ms.toFixed(1) + ' ms' : (ms / 1000).toFixed(2) + ' s';
  };
  const icons = () => globalThis.lucide?.createIcons();
  const empty = (title, text) => '<div class="empty">' + icon('inbox') + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div>';
  function bind(id, event, fn) {
    $(id)?.addEventListener(event, async e => {
      try { await fn(e); } catch (error) { toast(error.message || '操作失败'); }
    });
  }
  function heading(kicker, title, actions = '') {
    return '<header class="page-heading"><div><p class="eyebrow">' + kicker + '</p><h1>' + title + '</h1></div><div class="actions">' + actions + '</div></header>';
  }
  function renderShell() {
    const nav = [['workspace', 'index.html', '工作台', 'workflow'], ['runs', 'runs.html', '运行记录', 'history'], ['review', 'review.html', '审核与报告', 'clipboard-check'], ['prompts', 'prompts.html', '提取指令', 'square-terminal'], ['settings', 'settings.html', '运行设置', 'settings-2']];
    $('shell').innerHTML = '<aside class="sidebar"><a class="brand" href="index.html"><span class="brand-mark">' + icon('workflow') + '</span><span>AgentFlow<small>DOCUMENT OPERATIONS</small></span></a><p class="nav-caption">WORKSPACE / 01</p><nav aria-label="主导航">' + nav.map(([key, href, text, sym]) => '<a href="' + href + '" class="' + (key === page ? 'active' : '') + '"' + (key === page ? ' aria-current="page"' : '') + '>' + icon(sym) + '<span>' + text + '</span></a>').join('') + '</nav><div class="sidebar-foot"><span class="signal"></span><span>' + (online ? 'SQLite · 已连接' : '本机浏览器存储') + '</span><a href="https://github.com/Helia-zhong/Personal-AI-Replication-Manual/tree/main/AgentFlow-Visualizer" target="_blank" rel="noreferrer" aria-label="项目源码" title="项目源码">' + icon('github') + '</a></div></aside><div class="content"><header class="topbar"><span>PERSONAL LAB <b>/</b> ' + nav.find(item => item[0] === page)[2] + '</span><span class="runtime-chip">' + icon(online ? 'server' : 'monitor') + (online ? '本地服务' : '浏览器规则演示') + '</span></header><main id="main"></main><footer class="page-footer"><span>AGENTFLOW / 1.0</span><span>INGEST → EXTRACT → VALIDATE → REVIEW → EXPORT</span></footer></div>';
  }
  function stats() {
    const completed = allRuns.filter(run => run.status === 'succeeded').length;
    const awaiting = allRuns.filter(run => run.status === 'awaiting_review').length;
    const failures = allRuns.filter(run => run.status === 'failed').length;
    return '<section class="metrics" aria-label="最近 100 条运行统计">' + [['最近运行', allRuns.length, 'layers'], ['待人工审核', awaiting, 'user-check'], ['已生成报告', completed, 'files'], ['失败记录', failures, 'circle-alert']].map(([text, count, sym]) => '<article>' + icon(sym) + '<span>' + text + '</span><strong>' + count + '</strong></article>').join('') + '</section>';
  }
  function flow(steps) {
    return '<ol class="flow-map">' + E.stages.map((id, index) => {
      const step = steps?.[index] || { status: 'pending' };
      return '<li class="' + esc(step.status) + '"><span class="node-icon">' + icon(stageIcons[index]) + '</span><span class="node-number">0' + (index + 1) + '</span><strong>' + stageNames[index] + '</strong><small>' + (step.duration_ms != null ? (step.duration_ms < 1 ? '&lt; 1' : step.duration_ms.toFixed(1)) + ' ms' : labels[step.status]) + '</small></li>';
    }).join('') + '</ol>';
  }
  function runRows(runs) {
    if (!runs.length) return empty('还没有运行记录', '新建资料任务后，运行状态与报告会出现在这里。');
    return '<div class="run-table"><div class="table-head"><span>任务 / 执行方式</span><span>状态</span><span>处理耗时</span><span>创建时间</span><span></span></div>' + runs.map(run => '<a class="run-row" href="review.html?id=' + encodeURIComponent(run.id) + '"><div><strong>' + esc(run.title) + '</strong><small>' + esc(modeName(run)) + '</small></div>' + badge(run.status) + '<span class="mono">' + duration(run) + '</span><time>' + date(run.created_at) + '</time>' + icon('arrow-up-right') + '</a>').join('') + '</div>';
  }
  async function loadRuns() { allRuns = online ? await api('runs') : read(keys.runs, []); return allRuns; }
  async function getRun(id) {
    const run = online ? await api('runs/' + encodeURIComponent(id)) : read(keys.runs, []).find(run => run.id === id);
    if (!run) throw new Error('运行不存在，请从运行记录重新选择');
    return run;
  }
  function saveLocalRun(run, add = false) {
    const runs = read(keys.runs, []);
    if (add) runs.unshift(run); else {
      const index = runs.findIndex(item => item.id === run.id);
      if (index < 0) throw new Error('运行不存在');
      runs[index] = run;
    }
    if (runs.length > 100) throw new Error('演示记录已达 100 条，请导出后使用本地后端继续');
    write(keys.runs, runs);
  }
  async function submit(data, parent = null) {
    if (online) return parent ? api('runs/' + parent + '/retry', 'POST', {}) : api('runs', 'POST', data);
    const run = { id: 'demo-' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)), title: data.title, source: data.source, settings: { ...data.settings, mode: 'browser-rules' }, parent_id: parent, created_at: new Date().toISOString(), version: 1, status: 'running', draft: null, original_draft: null, review_note: '', error: null, report: null, usage: null, steps: E.stages.map(id => ({ id, status: 'pending', duration_ms: null })), events: [] };
    let current = 0;
    try {
      for (current = 0; current < 3; current++) {
        const start = performance.now();
        if (current === 1) run.draft = E.extract(run.source, data.settings.max_items);
        if (current === 2) E.validate(run.draft, run.source, data.settings.max_items);
        run.steps[current] = { id: E.stages[current], status: 'succeeded', duration_ms: performance.now() - start };
        run.events.push({ at: new Date().toISOString(), type: 'succeeded', message: stageNames[current] });
      }
      run.original_draft = structuredClone(run.draft);
      run.status = 'awaiting_review'; run.steps[3].status = 'awaiting_review';
    } catch (error) { run.status = 'failed'; run.error = error.message; run.steps[current].status = 'failed'; }
    saveLocalRun(run, true);
    return run;
  }
  function workspace() {
    const draft = read(keys.input, sample);
    $('main').innerHTML = heading('DOCUMENT PIPELINE', '资料处理工作台', '<a class="button" href="runs.html">' + icon('history') + '运行记录</a>') + stats() +
      '<section class="flow-section"><div class="section-head"><h2>证据整理与审核</h2><span class="subtle">5 个步骤 · 人工审核后导出</span></div>' + flow() + '</section>' +
      '<section class="workspace-grid"><form id="runForm" class="input-workbench"><div class="section-head"><h2>新建任务</h2><button type="button" id="loadSample" class="text-button">' + icon('rotate-ccw') + '示例资料</button></div><label>任务标题<input id="title" name="title" required maxlength="120" value="' + esc(draft.title) + '"></label><div class="source-heading"><label for="source">原始资料</label><label class="upload button">' + icon('upload') + '导入文本<input id="upload" type="file" accept=".txt,.md,text/plain,text/markdown" aria-label="导入文本"></label></div><textarea id="source" name="source" required maxlength="30000" rows="12" spellcheck="false">' + esc(draft.source) + '</textarea><div class="source-meta"><span id="charCount"></span><span>TXT / Markdown</span></div><div class="form-footer"><span class="mode-label">' + icon('cpu') + esc(online ? config.mode === 'ollama' ? 'Ollama · ' + (config.model || '未配置模型') : '本地规则处理' : '浏览器规则演示') + '</span><button class="button primary" id="execute" type="submit">' + icon('play') + '开始处理</button></div></form><aside class="contract-panel"><p class="eyebrow">OUTPUT CONTRACT</p><h2>让每条结果有据可查</h2><div class="contract-row">' + icon('quote') + '<div><strong>资料要点</strong><p>保留原文与对应行号</p></div></div><div class="contract-row">' + icon('git-branch') + '<div><strong>决定与待办</strong><p>分类整理，逐条复核</p></div></div><div class="contract-row">' + icon('shield-check') + '<div><strong>人工审核</strong><p>确认引用、调整分类、移除条目</p></div></div><div class="contract-row">' + icon('file-down') + '<div><strong>可追踪报告</strong><p>Markdown 正文与运行轨迹</p></div></div><div class="contract-bottom"><span>每次最多</span><strong>' + config.max_items + ' 条</strong><a href="settings.html" title="调整设置" aria-label="调整设置">' + icon('sliders-horizontal') + '</a></div></aside></section><section class="recent-section"><div class="section-head"><h2>最近运行</h2><span class="subtle">最近 5 条</span></div>' + runRows(allRuns.slice(0, 5)) + '</section>';
    const persist = () => { $('charCount').textContent = $('source').value.length + ' / 30000 字符'; write(keys.input, { title: $('title').value, source: $('source').value }); };
    $('charCount').textContent = $('source').value.length + ' / 30000 字符';
    bind('title', 'input', persist); bind('source', 'input', persist);
    bind('loadSample', 'click', () => { $('title').value = sample.title; $('source').value = sample.source; persist(); });
    bind('upload', 'change', async event => {
      const file = event.target.files[0]; if (!file) return;
      if (!/\.(txt|md)$/i.test(file.name) || file.size > 120000) throw new Error('请选择 120 KB 以内的 TXT 或 Markdown 文件');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()).replace(/\r\n?/g, '\n');
      if (!text.trim() || text.length > 30000 || text.includes('\0')) throw new Error('资料需为 UTF-8 文本，正文 1–30000 字符');
      $('source').value = text; $('title').value = file.name.replace(/\.[^.]+$/, '').slice(0, 120); persist();
    });
    bind('runForm', 'submit', async event => {
      event.preventDefault(); if (pending) return;
      const title = $('title').value.trim(), source = $('source').value.replace(/\r\n?/g, '\n');
      if (!title || !source.trim() || source.includes('\0')) throw new Error('请填写标题和有效正文');
      pending = true; $('execute').disabled = true;
      try { const run = await submit({ title, source, settings: config }); location.href = 'review.html?id=' + encodeURIComponent(run.id); }
      finally { pending = false; $('execute').disabled = false; }
    });
    icons();
  }
  function runsPage() {
    $('main').innerHTML = heading('RUN HISTORY', '运行记录', '<a href="index.html" class="button primary">' + icon('plus') + '新建任务</a>') + stats() + '<section><div class="filter-bar"><label class="search">' + icon('search') + '<input id="search" type="search" placeholder="搜索标题或运行 ID" aria-label="搜索运行"></label><select id="statusFilter" aria-label="筛选状态"><option value="">全部状态</option>' + Object.entries(labels).filter(([key]) => key !== 'pending').map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('') + '</select><button id="refresh" class="icon-button" title="刷新" aria-label="刷新">' + icon('refresh-cw') + '</button></div><div id="runList"></div><p class="subtle list-note">最近 100 条记录 · 耗时仅统计已测量的处理步骤</p></section>';
    const render = () => { const query = $('search').value.toLowerCase(); $('runList').innerHTML = runRows(allRuns.filter(run => (run.title + run.id).toLowerCase().includes(query) && (!$('statusFilter').value || run.status === $('statusFilter').value))); icons(); };
    bind('search', 'input', render); bind('statusFilter', 'change', render); bind('refresh', 'click', async () => { await loadRuns(); document.querySelector('.metrics').outerHTML = stats(); render(); }); render();
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function reviewPage() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { $('main').innerHTML = heading('HUMAN REVIEW', '审核与报告') + runRows(allRuns.filter(run => run.status === 'awaiting_review')); icons(); return; }
    const run = await getRun(id);
    const editable = run.status === 'awaiting_review';
    const actions = (['queued', 'running', 'awaiting_review'].includes(run.status) ? '<button class="button" id="cancel">' + icon('square') + '取消运行</button>' : '') + (['failed', 'cancelled', 'rejected'].includes(run.status) ? '<button class="button primary" id="retry">' + icon('rotate-cw') + '重新运行</button>' : '') + (run.status === 'succeeded' ? '<button class="button primary" id="reportDownload">' + icon('download') + '下载报告</button>' : '') + '<button class="icon-button" id="traceDownload" title="导出完整运行 JSON" aria-label="导出完整运行 JSON">' + icon('braces') + '</button>';
    $('main').innerHTML = heading('RUN / ' + esc(run.id), esc(run.title), actions) + '<div class="run-meta">' + badge(run.status) + '<span>' + esc(modeName(run)) + '</span><span class="mono">' + duration(run) + '</span><time>' + date(run.created_at) + '</time>' + (run.parent_id ? '<a href="review.html?id=' + esc(run.parent_id) + '">原始运行 ' + esc(run.parent_id) + '</a>' : '') + '</div><section class="flow-section">' + flow(run.steps) + '</section>' +
      (run.error ? '<div class="error-message" role="alert">' + icon('circle-alert') + '<span>' + esc(run.error) + '</span></div>' : '') +
      '<section class="review-grid"><div><div class="section-head"><h2>原始资料</h2><span class="subtle">' + run.source.length + ' 字符</span></div><div class="source-lines">' + run.source.split('\n').map((line, index) => '<div id="line-' + (index + 1) + '"><a href="#line-' + (index + 1) + '">L' + (index + 1) + '</a><span>' + esc(line) + '</span></div>').join('') + '</div>' + (run.source_hash ? '<p class="hash">SHA-256 · ' + esc(run.source_hash) + '</p>' : '') + '</div><div class="review-workbench"><div class="section-head"><h2>提取结果</h2><span class="subtle">' + (run.draft?.items.length || 0) + ' 条引用</span></div><form id="reviewForm">' +
      (run.draft ? '<div id="items">' + run.draft.items.map((item, index) => '<article class="evidence-item" data-index="' + index + '"><div class="evidence-heading"><select aria-label="第 ' + (index + 1) + ' 条分类" data-kind ' + (!editable ? 'disabled' : '') + '>' + [['finding', '资料要点'], ['decision', '决定'], ['action', '待办']].map(([value, label]) => '<option value="' + value + '"' + (value === item.kind ? ' selected' : '') + '>' + label + '</option>').join('') + '</select><a href="#line-' + item.line + '" class="citation">' + icon('link') + 'L' + item.line + '</a>' + (editable ? '<button class="icon-button" type="button" data-remove="' + index + '" aria-label="移除第 ' + (index + 1) + ' 条" title="移除条目">' + icon('trash-2') + '</button>' : '') + '</div><textarea data-text rows="2" maxlength="2000" aria-label="第 ' + (index + 1) + ' 条引用" ' + (!editable ? 'readonly' : '') + '>' + esc(item.text) + '</textarea></article>').join('') + '</div>' : empty('尚无提取结果', ['queued', 'running'].includes(run.status) ? '处理进度会自动更新。' : '检查错误后可重新运行。')) +
      (editable ? '<label class="review-note">审核备注<textarea id="reviewNote" maxlength="2000" rows="2" placeholder="记录调整或退回原因"></textarea></label><label class="check-row"><input id="reviewConfirmed" type="checkbox">我已核对引用与分类</label><div class="actions review-actions"><button id="reject" class="button" type="button">' + icon('corner-up-left') + '退回</button><button id="approve" class="button primary" type="submit" disabled>' + icon('check') + '通过并生成报告</button></div>' : (run.review_note ? '<p class="review-note">' + esc(run.review_note) + '</p>' : '')) + '</form></div></section>' +
      (run.report ? '<section class="report-section"><div class="section-head"><h2>最终报告</h2>' + badge('succeeded') + '</div><pre class="report-preview">' + esc(run.report) + '</pre></section>' : '') +
      '<section class="events-section"><div class="section-head"><h2>执行事件</h2><span class="subtle">' + (run.usage ? '输入 ' + esc(run.usage.input_tokens ?? '未返回') + ' / 输出 ' + esc(run.usage.output_tokens ?? '未返回') + ' tokens' : '未调用模型时不统计 Token') + '</span></div><ol class="events">' + run.events.map(event => '<li><time>' + date(event.at) + '</time><span class="mono">' + esc(event.type) + '</span><span>' + esc(event.message) + '</span></li>').join('') + '</ol></section>';
    bind('traceDownload', 'click', () => download(run.id + '.json', JSON.stringify(run, null, 2), 'application/json'));
    bind('reportDownload', 'click', () => download(run.id + '.md', run.report, 'text/markdown'));
    bind('cancel', 'click', async () => {
      clearTimeout(pollTimer);
      if (online) await api('runs/' + id + '/cancel', 'POST', {});
      else {
        const current = await getRun(id);
        if (current.status !== 'awaiting_review' || current.version !== run.version) throw new Error('运行已发生变化，请刷新');
        run.status = 'cancelled'; run.steps[3].status = 'cancelled'; run.version++;
        run.events.push({ at: new Date().toISOString(), type: 'cancelled', message: '用户取消了运行' }); saveLocalRun(run);
      }
      await reviewPage();
    });
    bind('retry', 'click', async () => {
      if (pending) return; pending = true; $('retry').disabled = true;
      try { const next = await submit({ title: run.title, source: run.source, settings: { ...run.settings, mode: run.settings.mode === 'browser-rules' ? 'rules' : run.settings.mode } }, id); location.href = 'review.html?id=' + next.id; }
      finally { pending = false; if ($('retry')) $('retry').disabled = false; }
    });
    bind('items', 'click', event => { const button = event.target.closest('[data-remove]'); if (button) button.closest('.evidence-item').remove(); });
    bind('reviewConfirmed', 'change', () => { $('approve').disabled = !$('reviewConfirmed').checked; });
    async function decide(decision) {
      if (pending) return;
      const items = Array.from(document.querySelectorAll('.evidence-item')).map(el => ({ kind: el.querySelector('[data-kind]').value, text: el.querySelector('[data-text]').value, line: run.draft.items[Number(el.dataset.index)].line }));
      E.validate({ items }, run.source, run.settings.max_items);
      if (decision === 'approve' && !$('reviewConfirmed').checked) throw new Error('请先确认已核对引用与分类');
      const body = { decision, version: run.version, draft: { items }, note: $('reviewNote').value };
      pending = true; $('approve').disabled = true; $('reject').disabled = true;
      try {
        if (online) await api('runs/' + id + '/review', 'POST', body);
        else {
          const current = await getRun(id);
          if (current.version !== run.version || current.status !== 'awaiting_review') throw new Error('审核状态已改变，请刷新后重试');
          run.draft = body.draft; run.review_note = body.note; run.version++;
          run.status = decision === 'approve' ? 'succeeded' : 'rejected';
          run.steps[3].status = run.status;
          if (decision === 'approve') { const start = performance.now(); run.report = E.report(run); run.steps[4] = { id: 'export', status: 'succeeded', duration_ms: performance.now() - start }; }
          run.events.push({ at: new Date().toISOString(), type: decision, message: '人工审核' }); saveLocalRun(run);
        }
        await reviewPage();
      } finally { pending = false; if ($('approve')) $('approve').disabled = !$('reviewConfirmed').checked; if ($('reject')) $('reject').disabled = false; }
    }
    bind('reviewForm', 'submit', event => { event.preventDefault(); return decide('approve'); });
    bind('reject', 'click', () => decide('reject'));
    icons(); clearTimeout(pollTimer);
    if (['queued', 'running'].includes(run.status)) pollTimer = setTimeout(() => reviewPage().catch(error => {
      toast('连接中断：' + error.message);
      const retry = document.createElement('button'); retry.className = 'button'; retry.textContent = '重新连接'; retry.onclick = () => reviewPage().catch(error => toast(error.message)); $('main').prepend(retry);
    }), 600);
  }
  async function saveConfig(next) {
    if (online) config = await api('settings', 'PUT', next);
    else { config = { ...next, mode: 'rules' }; write(keys.settings, config); }
    toast('配置已保存，应用于下一次运行');
  }
  function promptsPage() {
    $('main').innerHTML = heading('EXTRACTION CONTRACT', '提取指令') + '<section class="prompt-layout"><form id="promptForm"><div class="section-head"><h2>模型提取指令</h2><span class="subtle">仅用于 Ollama 模式</span></div><label>系统指令<textarea id="prompt" required maxlength="4000" rows="12">' + esc(config.prompt) + '</textarea></label><div class="actions"><button id="defaultPrompt" type="button" class="button">' + icon('rotate-ccw') + '恢复默认</button><button class="button primary" type="submit">' + icon('save') + '保存指令</button></div></form><aside><p class="eyebrow">EVIDENCE SCHEMA</p><h2>输出约定</h2><pre class="schema-preview">{\n  "items": [\n    {\n      "kind": "action",\n      "text": "待办：补充回归测试。",\n      "line": 3\n    }\n  ]\n}</pre><dl class="definitions"><dt>kind</dt><dd>finding / decision / action</dd><dt>text</dt><dd>对应行中的连续原文片段</dd><dt>line</dt><dd>从 1 开始的原文行号</dd></dl></aside></section>';
    bind('defaultPrompt', 'click', () => { $('prompt').value = E.defaults.prompt; });
    bind('promptForm', 'submit', event => { event.preventDefault(); if (!$('prompt').value.trim()) throw new Error('提取指令不能为空'); return saveConfig({ ...config, prompt: $('prompt').value }); }); icons();
  }
  function settingsPage() {
    $('main').innerHTML = heading('RUNTIME CONFIGURATION', '运行设置') + '<section class="settings-layout"><form id="settingsForm"><div class="section-head"><h2>执行方式</h2><span class="subtle">' + (online ? '配置保存在本地服务' : '配置保存在当前浏览器') + '</span></div><div class="mode-options"><label><input type="radio" name="mode" value="rules"' + (config.mode === 'rules' ? ' checked' : '') + '><span><strong>规则处理</strong><small>按原文规则提取，无需模型</small></span></label><label><input type="radio" name="mode" value="ollama"' + (config.mode === 'ollama' ? ' checked' : '') + (!online ? ' disabled' : '') + '><span><strong>Ollama 模型</strong><small>使用本地已安装的语言模型</small></span></label></div><label>模型名称<input id="model" maxlength="120" value="' + esc(config.model) + '" placeholder="填写本地已安装模型的名称"></label><div class="settings-fields"><label>提取上限<input id="maxItems" type="number" min="1" max="30" required value="' + config.max_items + '"></label><label>超时 / 秒<input id="timeout" type="number" min="1" max="180" required value="' + config.timeout_seconds + '"></label><label>连接重试次数<input id="retryLimit" type="number" min="0" max="2" required value="' + config.retry_limit + '"></label></div><div class="actions"><button class="button primary" type="submit">' + icon('save') + '保存设置</button></div></form><aside class="environment"><p class="eyebrow">ENVIRONMENT</p><h2>工作区状态</h2><dl class="definitions"><dt>运行环境</dt><dd>' + (online ? '本地后端' : '浏览器规则演示') + '</dd><dt>记录保存</dt><dd>' + (online ? 'SQLite' : 'LocalStorage') + '</dd><dt>模型调用</dt><dd>' + (online ? 'Ollama 可选' : '需启动本地服务') + '</dd><dt>报告生成</dt><dd>人工审核通过后</dd></dl><a class="button" href="https://github.com/Helia-zhong/Personal-AI-Replication-Manual/tree/main/AgentFlow-Visualizer#本地运行" target="_blank" rel="noreferrer">' + icon('book-open') + '启动文档</a></aside></section>';
    const modeFields = () => { const enabled = document.querySelector('[name=mode]:checked').value === 'ollama'; for (const id of ['model', 'timeout', 'retryLimit']) $(id).disabled = !enabled; };
    document.querySelectorAll('[name=mode]').forEach(el => el.addEventListener('change', modeFields)); modeFields();
    bind('settingsForm', 'submit', event => {
      event.preventDefault();
      const next = { ...config, mode: document.querySelector('[name=mode]:checked').value, model: $('model').value.trim(), max_items: Number($('maxItems').value), timeout_seconds: Number($('timeout').value), retry_limit: Number($('retryLimit').value) };
      if (next.mode === 'ollama' && !next.model) throw new Error('请填写 Ollama 模型名称');
      return saveConfig(next);
    }); icons();
  }
  async function start() {
    if (location.protocol !== 'file:') {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) online = (await res.json()).service === 'agentflow';
      } catch { /* Static hosting and file previews have no backend. */ }
    }
    config = online ? await api('settings') : { ...E.defaults, ...read(keys.settings, {}), mode: 'rules' };
    await loadRuns(); renderShell();
    if (page === 'workspace') workspace();
    if (page === 'runs') runsPage();
    if (page === 'review') await reviewPage();
    if (page === 'prompts') promptsPage();
    if (page === 'settings') settingsPage();
  }
  start().catch(error => { if (!$('main')) renderShell(); $('main').innerHTML = empty('工作区暂时无法打开', error.message) + '<a class="button" href="index.html">返回工作台</a>'; icons(); });
  window.addEventListener('pagehide', () => clearTimeout(pollTimer));
})();
