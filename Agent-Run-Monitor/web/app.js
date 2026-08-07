const RUNS = [
  {
    run_id: 'run-2026-07-qa-001', workflow: 'content_quality_agent', status: 'completed', objective: '检查一篇 AI 产品发布稿的事实、引用和语气风险', started_at: '2026-07-29T10:05:00+08:00',
    steps: [
      { id: 's1', name: '解析任务', agent: 'planner', tool: 'none', type: 'reasoning', status: 'success', duration_ms: 1320, tokens_in: 980, tokens_out: 240, cost_usd: 0.0021, retries: 0, notes: '识别需要检查事实、引用、语气三个维度' },
      { id: 's2', name: '抽取声明', agent: 'claim_extractor', tool: 'text_parser', type: 'tool', status: 'success', duration_ms: 2860, tokens_in: 1840, tokens_out: 610, cost_usd: 0.0048, retries: 0, notes: '抽取 8 条待核验声明' },
      { id: 's3', name: '检索依据', agent: 'retriever', tool: 'local_search', type: 'tool', status: 'success', duration_ms: 12140, tokens_in: 1320, tokens_out: 520, cost_usd: 0.0035, retries: 1, notes: '第二次检索补齐产品版本说明' },
      { id: 's4', name: '风险打分', agent: 'qa_judge', tool: 'none', type: 'reasoning', status: 'success', duration_ms: 5740, tokens_in: 3100, tokens_out: 780, cost_usd: 0.0094, retries: 0, notes: '识别 2 条无引用声明和 1 条绝对化表达' },
      { id: 's5', name: '生成报告', agent: 'reporter', tool: 'markdown_writer', type: 'tool', status: 'success', duration_ms: 2410, tokens_in: 1760, tokens_out: 950, cost_usd: 0.0061, retries: 0, notes: '输出分级问题和修改建议' }
    ]
  },
  {
    run_id: 'run-2026-07-research-002', workflow: 'research_brief_agent', status: 'completed_with_warnings', objective: '整理一组 AI 评估方法并形成对比摘要', started_at: '2026-07-29T15:30:00+08:00',
    steps: [
      { id: 's1', name: '生成研究计划', agent: 'planner', tool: 'none', type: 'reasoning', status: 'success', duration_ms: 1580, tokens_in: 870, tokens_out: 310, cost_usd: 0.0023, retries: 0, notes: '确定评估维度和输出结构' },
      { id: 's2', name: '读取材料', agent: 'researcher', tool: 'document_reader', type: 'tool', status: 'success', duration_ms: 18840, tokens_in: 4260, tokens_out: 1190, cost_usd: 0.0132, retries: 2, notes: '一次解析失败后降低批量大小' },
      { id: 's3', name: '归纳对比', agent: 'analyst', tool: 'none', type: 'reasoning', status: 'success', duration_ms: 9480, tokens_in: 5320, tokens_out: 1480, cost_usd: 0.0169, retries: 0, notes: '按准确性、成本、延迟和可解释性整理' },
      { id: 's4', name: '验证引用', agent: 'citation_checker', tool: 'source_matcher', type: 'tool', status: 'failed', duration_ms: 7680, tokens_in: 2400, tokens_out: 180, cost_usd: 0.0042, retries: 2, notes: '两条引用缺少匹配片段' },
      { id: 's5', name: '输出摘要', agent: 'writer', tool: 'markdown_writer', type: 'tool', status: 'success', duration_ms: 3320, tokens_in: 2850, tokens_out: 1240, cost_usd: 0.0084, retries: 0, notes: '保留引用警告' }
    ]
  },
  {
    run_id: 'run-2026-07-data-003', workflow: 'dataset_cleaning_agent', status: 'completed', objective: '清洗问答评测集并输出可用样本统计', started_at: '2026-07-30T09:12:00+08:00',
    steps: [
      { id: 's1', name: '读取数据', agent: 'loader', tool: 'csv_reader', type: 'tool', status: 'success', duration_ms: 2120, tokens_in: 420, tokens_out: 130, cost_usd: 0.0009, retries: 0, notes: '发现 128 条样本' },
      { id: 's2', name: '标准化字段', agent: 'cleaner', tool: 'python_transform', type: 'tool', status: 'success', duration_ms: 3860, tokens_in: 760, tokens_out: 280, cost_usd: 0.0018, retries: 0, notes: '统一 question、answer、source 字段' },
      { id: 's3', name: '质量检查', agent: 'validator', tool: 'rule_checker', type: 'tool', status: 'success', duration_ms: 4920, tokens_in: 1180, tokens_out: 420, cost_usd: 0.0026, retries: 0, notes: '标记 11 条低质量样本' },
      { id: 's4', name: '生成统计', agent: 'reporter', tool: 'json_writer', type: 'tool', status: 'success', duration_ms: 1670, tokens_in: 690, tokens_out: 360, cost_usd: 0.0017, retries: 0, notes: '输出可用率和问题类型分布' }
    ]
  }
];

const STORAGE_KEY = 'agent-run-monitor.selected-run.v4';
const SEVERITY_LABELS = { high: '高危', medium: '中危', low: '低危' };
const REASON_ACTIONS = {
  '步骤失败': '为失败工具增加输入校验、降级路径和可复用错误样本。',
  '重试次数偏高': '把高重试步骤拆成更小批次，并记录每次重试的输入差异。',
  '耗时瓶颈': '检查最慢工具是否可以预索引、并行化或缓存结果。',
  '成本偏高': '对长上下文步骤增加摘要缓存或模型分层调用。'
};

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function detectIncidents(run) {
  const threshold = median(run.steps.map(step => step.duration_ms)) * 2;
  const incidents = [];
  run.steps.forEach((step, stepIndex) => {
    const base = { runId: run.run_id, workflow: run.workflow, stepId: step.id, stepIndex, step: step.name, notes: step.notes, startedAt: run.started_at };
    if (step.status !== 'success') incidents.push({ ...base, id: `${run.run_id}-${step.id}-failed`, severity: 'high', reason: '步骤失败', detail: step.notes });
    if (step.retries >= 2) incidents.push({ ...base, id: `${run.run_id}-${step.id}-retry`, severity: 'medium', reason: '重试次数偏高', detail: `重试 ${step.retries} 次` });
    if (threshold && step.duration_ms > threshold) incidents.push({ ...base, id: `${run.run_id}-${step.id}-latency`, severity: 'medium', reason: '耗时瓶颈', detail: `${step.duration_ms} ms` });
    if (step.cost_usd >= 0.015) incidents.push({ ...base, id: `${run.run_id}-${step.id}-cost`, severity: 'low', reason: '成本偏高', detail: `$${step.cost_usd.toFixed(4)}` });
  });
  return incidents;
}

function summarizeRun(run) {
  const totalDuration = run.steps.reduce((sum, step) => sum + step.duration_ms, 0);
  const totalTokens = run.steps.reduce((sum, step) => sum + step.tokens_in + step.tokens_out, 0);
  const totalCost = run.steps.reduce((sum, step) => sum + step.cost_usd, 0);
  const retryCount = run.steps.reduce((sum, step) => sum + step.retries, 0);
  const successCount = run.steps.filter(step => step.status === 'success').length;
  const bottleneck = [...run.steps].sort((a, b) => b.duration_ms - a.duration_ms)[0];
  return { run, totalDuration, totalTokens, totalCost, retryCount, successRate: successCount / Math.max(run.steps.length, 1), bottleneck, incidents: detectIncidents(run) };
}

const SUMMARIES = RUNS.map(summarizeRun);
const ALL_INCIDENTS = SUMMARIES.flatMap(summary => summary.incidents).sort((a, b) => {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return severityOrder[a.severity] - severityOrder[b.severity] || a.runId.localeCompare(b.runId) || a.stepIndex - b.stepIndex;
});

function formatDuration(ms) { return `${(ms / 1000).toFixed(1)}s`; }
function formatCost(value) { return `$${value.toFixed(4)}`; }
function formatNumber(value) { return Number(value).toLocaleString('zh-CN'); }
function formatDate(value) { return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)); }
function statusLabel(run) { return run.status === 'completed' ? 'COMPLETED' : 'WARNING'; }
function statusClass(run) { return run.status === 'completed' ? '' : 'warning'; }
function severityIcon(severity) { return severity === 'high' ? 'octagon-alert' : severity === 'medium' ? 'triangle-alert' : 'circle-dollar-sign'; }

function getSelectedRun() {
  const queryRun = new URLSearchParams(window.location.search).get('run');
  const stored = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
  return RUNS.find(run => run.run_id === queryRun) || RUNS.find(run => run.run_id === stored) || RUNS[0];
}

function setSelectedRun(runId) {
  try { localStorage.setItem(STORAGE_KEY, runId); } catch { /* local state is optional */ }
}

function sizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function drawGrid(context, width, height, left, right, top, bottom) {
  const plotHeight = height - top - bottom;
  [0, 25, 50, 75, 100].forEach(value => {
    const y = top + plotHeight - plotHeight * value / 100;
    context.strokeStyle = '#e3e8e4';
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
    context.fillStyle = '#8a958d'; context.font = '8px Segoe UI'; context.textAlign = 'right'; context.fillText(String(value), left - 7, y + 3);
  });
}

function drawOverviewChart() {
  const canvas = document.getElementById('overviewChart');
  if (!canvas) return;
  const sized = sizeCanvas(canvas); if (!sized) return;
  const { context, width, height } = sized;
  const left = 38, right = 22, top = 28, bottom = 48;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.clearRect(0, 0, width, height); drawGrid(context, width, height, left, right, top, bottom);
  const maxDuration = Math.max(...SUMMARIES.map(item => item.totalDuration));
  const maxCost = Math.max(...SUMMARIES.map(item => item.totalCost));
  const cell = plotWidth / SUMMARIES.length;
  SUMMARIES.forEach((item, index) => {
    const center = left + cell * (index + 0.5);
    const barWidth = Math.min(54, cell * 0.36);
    const barHeight = plotHeight * item.totalDuration / maxDuration;
    context.fillStyle = item.run.status === 'completed' ? '#23694f' : '#b77716';
    context.fillRect(center - barWidth / 2, top + plotHeight - barHeight, barWidth, barHeight);
    const dotY = top + plotHeight - plotHeight * item.totalCost / maxCost;
    context.fillStyle = '#dd6650'; context.beginPath(); context.arc(center, dotY, 4, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#69756f'; context.font = '8px Segoe UI'; context.textAlign = 'center'; context.fillText(item.run.workflow.replace('_agent', ''), center, top + plotHeight + 22);
    context.fillStyle = '#172019'; context.font = '700 9px Segoe UI'; context.fillText(formatDuration(item.totalDuration), center, top + plotHeight + 36);
  });
}

function aggregateTools() {
  const tools = new Map();
  RUNS.flatMap(run => run.steps).forEach(step => {
    const key = step.tool === 'none' ? 'reasoning' : step.tool;
    const current = tools.get(key) || { name: key, calls: 0, duration: 0, tokens: 0, cost: 0, retries: 0 };
    current.calls += 1; current.duration += step.duration_ms; current.tokens += step.tokens_in + step.tokens_out; current.cost += step.cost_usd; current.retries += step.retries;
    tools.set(key, current);
  });
  return [...tools.values()].sort((a, b) => b.cost - a.cost);
}

function initOverview() {
  const statusSelect = document.getElementById('overviewStatus');
  if (!statusSelect) return;
  const totalDuration = SUMMARIES.reduce((sum, item) => sum + item.totalDuration, 0);
  const totalCost = SUMMARIES.reduce((sum, item) => sum + item.totalCost, 0);
  const highRuns = new Set(ALL_INCIDENTS.filter(item => item.severity === 'high').map(item => item.runId));
  document.getElementById('runCountMetric').textContent = RUNS.length;
  document.getElementById('healthyMetric').textContent = RUNS.length - highRuns.size;
  document.getElementById('averageLatencyMetric').textContent = formatDuration(totalDuration / RUNS.length);
  document.getElementById('totalCostMetric').textContent = formatCost(totalCost);
  document.getElementById('incidentMetric').textContent = ALL_INCIDENTS.length;

  const successHealth = SUMMARIES.reduce((sum, item) => sum + item.successRate, 0) / SUMMARIES.length * 100;
  const retryHealth = Math.max(0, 100 - SUMMARIES.reduce((sum, item) => sum + item.retryCount, 0) / RUNS.flatMap(run => run.steps).length * 100);
  const incidentHealth = Math.max(0, 100 - ALL_INCIDENTS.reduce((sum, item) => sum + ({ high: 25, medium: 8, low: 3 }[item.severity]), 0));
  const healthScore = Math.round((successHealth + retryHealth + incidentHealth) / 3);
  document.getElementById('healthScore').textContent = healthScore;
  document.getElementById('healthStatus').textContent = healthScore >= 80 ? 'HEALTHY' : 'REVIEW';
  document.getElementById('healthStatus').className = `status-chip ${healthScore >= 80 ? '' : 'warning'}`;
  document.getElementById('healthBars').innerHTML = [['步骤成功率', successHealth], ['重试稳定性', retryHealth], ['异常控制', incidentHealth]].map(([label, value]) => `<div class="health-bar"><header><span>${label}</span><b>${Math.round(value)}</b></header><div class="health-track"><i style="width:${Math.max(0, value)}%"></i></div></div>`).join('');
  document.getElementById('healthNote').textContent = highRuns.size ? 'research_brief_agent 存在引用验证失败，当前运行需要复核。' : '当前没有高危异常。';

  function renderRows() {
    const filtered = SUMMARIES.filter(item => statusSelect.value === 'all' || (statusSelect.value === 'healthy' ? !item.incidents.length : item.incidents.length));
    document.getElementById('overviewResultCount').textContent = `${filtered.length} RUNS`;
    document.getElementById('overviewRows').innerHTML = filtered.length ? filtered.map(item => `<tr><td class="run-cell"><strong>${escapeHtml(item.run.workflow)}</strong><small>${escapeHtml(item.run.objective)}</small></td><td><span class="status-chip ${statusClass(item.run)}">${statusLabel(item.run)}</span></td><td>${item.run.steps.length}</td><td class="table-score">${formatDuration(item.totalDuration)}</td><td>${formatNumber(item.totalTokens)}</td><td>${formatCost(item.totalCost)}</td><td>${item.incidents.length}</td><td><a class="run-link" href="trace.html?run=${encodeURIComponent(item.run.run_id)}" aria-label="查看 ${escapeHtml(item.run.workflow)}"><i data-lucide="arrow-up-right"></i></a></td></tr>`).join('') : '<tr><td colspan="8"><div class="empty-state">没有匹配的运行记录。</div></td></tr>';
    refreshIcons();
  }

  const signals = [...ALL_INCIDENTS].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - ({ high: 0, medium: 1, low: 2 }[b.severity]))).slice(0, 4);
  document.getElementById('signalList').innerHTML = signals.map(item => `<div class="signal-row"><span class="signal-icon ${item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'warning' : ''}"><i data-lucide="${severityIcon(item.severity)}"></i></span><span><strong>${escapeHtml(item.step)} · ${item.reason}</strong><small>${escapeHtml(item.workflow)} · ${escapeHtml(item.detail)}</small></span><small>${formatDate(item.startedAt)}</small></div>`).join('');
  const tools = aggregateTools().slice(0, 5), maxCalls = Math.max(...tools.map(item => item.calls));
  document.getElementById('toolCountNote').textContent = `${aggregateTools().length} TOOLS`;
  document.getElementById('toolActivity').innerHTML = tools.map(item => `<div class="tool-row"><span class="tool-icon"><i data-lucide="wrench"></i></span><span><strong>${escapeHtml(item.name)}</strong><small>${item.calls} calls · ${formatDuration(item.duration)}</small></span><span class="mini-track"><i style="width:${item.calls / maxCalls * 100}%"></i></span><strong>${item.calls}</strong></div>`).join('');
  statusSelect.addEventListener('change', renderRows);
  document.getElementById('refreshOverview').addEventListener('click', event => {
    const icon = event.currentTarget.querySelector('svg'); if (icon) icon.style.transform = 'rotate(180deg)';
    setTimeout(() => { if (icon) icon.style.transform = ''; showToast('运行数据已刷新。'); }, 380);
  });
  window.addEventListener('resize', drawOverviewChart); renderRows(); drawOverviewChart(); refreshIcons();
}

function drawResourceChart(run) {
  const canvas = document.getElementById('resourceChart'); if (!canvas) return;
  const sized = sizeCanvas(canvas); if (!sized) return;
  const { context, width, height } = sized;
  const left = 36, right = 20, top = 25, bottom = 42, plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.clearRect(0, 0, width, height); drawGrid(context, width, height, left, right, top, bottom);
  const maxTokens = Math.max(...run.steps.map(step => step.tokens_in + step.tokens_out));
  const maxCost = Math.max(...run.steps.map(step => step.cost_usd));
  const cell = plotWidth / run.steps.length;
  run.steps.forEach((step, index) => {
    const center = left + cell * (index + .5), barWidth = Math.min(40, cell * .46), tokens = step.tokens_in + step.tokens_out;
    const barHeight = plotHeight * tokens / maxTokens;
    context.fillStyle = '#4778a8'; context.fillRect(center - barWidth / 2, top + plotHeight - barHeight, barWidth, barHeight);
    const dotY = top + plotHeight - plotHeight * step.cost_usd / maxCost;
    context.fillStyle = '#dd6650'; context.beginPath(); context.arc(center, dotY, 3.5, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#69756f'; context.font = '8px Segoe UI'; context.textAlign = 'center'; context.fillText(step.id.toUpperCase(), center, top + plotHeight + 22);
  });
}

function initTrace() {
  const runSelect = document.getElementById('traceRunSelect'); if (!runSelect) return;
  runSelect.innerHTML = RUNS.map(run => `<option value="${run.run_id}">${escapeHtml(run.workflow)} · ${run.run_id}</option>`).join('');
  runSelect.value = getSelectedRun().run_id;
  let activeStepId = null;
  let activeRun = getSelectedRun();

  function renderInspector(step) {
    document.getElementById('stepInspectorTitle').textContent = step.name;
    const state = document.getElementById('stepInspectorStatus'); state.textContent = step.status === 'success' ? 'SUCCESS' : 'FAILED'; state.className = `status-chip ${step.status === 'success' ? '' : 'danger'}`;
    document.getElementById('stepInspector').innerHTML = `<div class="inspector-summary"><p>${escapeHtml(step.notes)}</p><div class="inspector-grid"><div><span>AGENT</span><strong>${escapeHtml(step.agent)}</strong></div><div><span>TOOL</span><strong>${escapeHtml(step.tool)}</strong></div><div><span>DURATION</span><strong>${formatDuration(step.duration_ms)}</strong></div><div><span>RETRIES</span><strong>${step.retries}</strong></div><div><span>TOKENS IN</span><strong>${formatNumber(step.tokens_in)}</strong></div><div><span>TOKENS OUT</span><strong>${formatNumber(step.tokens_out)}</strong></div><div><span>COST</span><strong>${formatCost(step.cost_usd)}</strong></div><div><span>TYPE</span><strong>${escapeHtml(step.type)}</strong></div></div><div class="step-note"><span>STEP SIGNAL</span><strong>${step.status !== 'success' ? '工具执行失败，需要检查来源匹配输入与降级策略。' : step.retries ? `该步骤发生 ${step.retries} 次重试，建议检查批次大小与输入稳定性。` : '步骤执行稳定，未记录失败或重试。'}</strong></div></div>`;
  }

  function render() {
    activeRun = RUNS.find(run => run.run_id === runSelect.value) || RUNS[0]; setSelectedRun(activeRun.run_id);
    const summary = summarizeRun(activeRun);
    if (!activeRun.steps.some(step => step.id === activeStepId)) activeStepId = activeRun.steps.find(step => step.status !== 'success')?.id || summary.bottleneck.id;
    document.getElementById('traceObjective').textContent = activeRun.objective;
    document.getElementById('traceRunId').textContent = activeRun.run_id;
    document.getElementById('traceWorkflow').textContent = activeRun.workflow;
    document.getElementById('traceStarted').textContent = formatDate(activeRun.started_at);
    const status = document.getElementById('traceStatus'); status.textContent = statusLabel(activeRun); status.className = `status-chip ${statusClass(activeRun)}`;
    document.getElementById('traceDuration').textContent = formatDuration(summary.totalDuration);
    document.getElementById('traceSuccess').textContent = `${Math.round(summary.successRate * 100)}%`;
    document.getElementById('traceTokens').textContent = formatNumber(summary.totalTokens);
    document.getElementById('traceCost').textContent = formatCost(summary.totalCost);
    document.getElementById('traceRetries').textContent = summary.retryCount;
    document.getElementById('traceStepCount').textContent = `${activeRun.steps.length} STEPS`;
    let elapsed = 0;
    document.getElementById('waterfall').innerHTML = activeRun.steps.map(step => {
      const start = elapsed; elapsed += step.duration_ms;
      const stateClass = step.status !== 'success' ? 'failed' : step.retries ? 'retry' : '';
      return `<button class="waterfall-row ${stateClass} ${step.id === activeStepId ? 'active' : ''}" type="button" data-step="${step.id}"><span class="waterfall-label"><strong>${escapeHtml(step.name)}</strong><small>${escapeHtml(step.agent)}</small></span><span class="waterfall-track"><i class="waterfall-bar" style="left:${start / summary.totalDuration * 100}%;width:${step.duration_ms / summary.totalDuration * 100}%"></i></span><span class="waterfall-meta"><strong>${formatDuration(step.duration_ms)}</strong><small>${step.retries} retry</small></span></button>`;
    }).join('');
    renderInspector(activeRun.steps.find(step => step.id === activeStepId));
    document.getElementById('traceAttributes').innerHTML = [['Trace ID', activeRun.run_id], ['Workflow', activeRun.workflow], ['Started', formatDate(activeRun.started_at)], ['Bottleneck', summary.bottleneck.name], ['Tool calls', activeRun.steps.filter(step => step.type === 'tool').length], ['Incidents', summary.incidents.length]].map(([label, value]) => `<div class="attribute-row"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    drawResourceChart(activeRun); refreshIcons();
  }

  document.getElementById('waterfall').addEventListener('click', event => { const row = event.target.closest('[data-step]'); if (!row) return; activeStepId = row.dataset.step; render(); });
  runSelect.addEventListener('change', () => { activeStepId = null; render(); });
  document.getElementById('exportTrace').addEventListener('click', () => downloadFile(`${activeRun.run_id}.json`, JSON.stringify({ ...activeRun, summary: summarizeRun(activeRun) }, null, 2), 'application/json'));
  window.addEventListener('resize', () => drawResourceChart(activeRun)); render();
}

function initIncidents() {
  const filter = document.getElementById('severityFilter'); if (!filter) return;
  let severity = 'all';
  let activeIncidentId = ALL_INCIDENTS[0]?.id || null;
  document.getElementById('highIncidentMetric').textContent = ALL_INCIDENTS.filter(item => item.severity === 'high').length;
  document.getElementById('mediumIncidentMetric').textContent = ALL_INCIDENTS.filter(item => item.severity === 'medium').length;
  document.getElementById('lowIncidentMetric').textContent = ALL_INCIDENTS.filter(item => item.severity === 'low').length;
  document.getElementById('affectedRunMetric').textContent = new Set(ALL_INCIDENTS.map(item => item.runId)).size;

  function renderDetail(item) {
    if (!item) { document.getElementById('incidentDetail').innerHTML = '<div class="empty-state">当前筛选条件下没有异常。</div>'; return; }
    const run = RUNS.find(row => row.run_id === item.runId), step = run.steps.find(row => row.id === item.stepId);
    document.getElementById('incidentDetailTitle').textContent = `${item.step} · ${item.reason}`;
    const badge = document.getElementById('incidentDetailSeverity'); badge.textContent = SEVERITY_LABELS[item.severity].toUpperCase(); badge.className = `status-chip ${item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'warning' : ''}`;
    document.getElementById('incidentDetail').innerHTML = `<div class="diagnostic-body"><p class="diagnostic-lead">${escapeHtml(item.detail)}</p><div class="diagnostic-context"><div><span>WORKFLOW</span><strong>${escapeHtml(item.workflow)}</strong></div><div><span>STEP</span><strong>${escapeHtml(item.stepId)} · ${escapeHtml(item.step)}</strong></div><div><span>SEVERITY</span><strong>${SEVERITY_LABELS[item.severity]}</strong></div></div><div class="diagnostic-block"><h3>运行上下文</h3><p>${escapeHtml(step.notes)}</p></div><div class="diagnostic-block"><h3>建议动作</h3><p>${escapeHtml(REASON_ACTIONS[item.reason])}</p></div><a class="trace-link" href="trace.html?run=${encodeURIComponent(item.runId)}"><i data-lucide="workflow"></i><span>打开完整 Trace</span></a></div>`;
  }

  function render() {
    const items = ALL_INCIDENTS.filter(item => severity === 'all' || item.severity === severity);
    if (!items.some(item => item.id === activeIncidentId)) activeIncidentId = items[0]?.id || null;
    document.getElementById('incidentResultCount').textContent = `${items.length} ITEMS`;
    document.getElementById('incidentQueue').innerHTML = items.length ? items.map(item => `<button class="incident-item ${item.id === activeIncidentId ? 'active' : ''}" type="button" data-incident="${item.id}"><span class="severity-mark ${item.severity}"><i data-lucide="${severityIcon(item.severity)}"></i></span><span class="incident-copy"><strong>${escapeHtml(item.step)} · ${item.reason}</strong><small>${escapeHtml(item.workflow)} · ${escapeHtml(item.detail)}</small></span><span class="incident-time">${formatDate(item.startedAt)}</span></button>`).join('') : '<div class="empty-state">当前筛选条件下没有异常。</div>';
    renderDetail(items.find(item => item.id === activeIncidentId)); refreshIcons();
  }

  const reasonOrder = { '步骤失败': 0, '重试次数偏高': 1, '耗时瓶颈': 2, '成本偏高': 3 };
  const remediation = [...new Set(ALL_INCIDENTS.map(item => item.reason))].sort((a, b) => reasonOrder[a] - reasonOrder[b]);
  document.getElementById('remediationGrid').innerHTML = remediation.map((reason, index) => `<article class="remediation-item"><span>0${index + 1}</span><h3>${reason}</h3><p>${escapeHtml(REASON_ACTIONS[reason])}</p></article>`).join('');
  filter.addEventListener('click', event => { const button = event.target.closest('[data-severity]'); if (!button) return; severity = button.dataset.severity; filter.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button)); render(); });
  document.getElementById('incidentQueue').addEventListener('click', event => { const item = event.target.closest('[data-incident]'); if (!item) return; activeIncidentId = item.dataset.incident; render(); });
  document.getElementById('exportIncidents').addEventListener('click', () => downloadFile('agent-run-incidents.md', incidentMarkdown(), 'text/markdown'));
  render();
}

function incidentMarkdown() {
  return ['# Agent Run Incident Report', '', `- Generated: ${new Date().toISOString()}`, `- Runs: ${RUNS.length}`, `- Incidents: ${ALL_INCIDENTS.length}`, '', '| Severity | Workflow | Step | Reason | Detail |', '| --- | --- | --- | --- | --- |', ...ALL_INCIDENTS.map(item => `| ${item.severity} | ${item.workflow} | ${item.step} | ${item.reason} | ${item.detail} |`), '', '## Remediation', '', ...[...new Set(ALL_INCIDENTS.map(item => item.reason))].map(reason => `- **${reason}**: ${REASON_ACTIONS[reason]}`)].join('\n');
}

function drawEconomicsChart() {
  const canvas = document.getElementById('economicsChart'); if (!canvas) return;
  const sized = sizeCanvas(canvas); if (!sized) return;
  const { context, width, height } = sized;
  const left = 38, right = 20, top = 28, bottom = 48, plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.clearRect(0, 0, width, height); drawGrid(context, width, height, left, right, top, bottom);
  const maxTokens = Math.max(...SUMMARIES.map(item => item.totalTokens)), maxCost = Math.max(...SUMMARIES.map(item => item.totalCost));
  const cell = plotWidth / SUMMARIES.length;
  SUMMARIES.forEach((item, index) => {
    const center = left + cell * (index + .5), barWidth = Math.min(54, cell * .36), barHeight = plotHeight * item.totalTokens / maxTokens;
    context.fillStyle = '#4778a8'; context.fillRect(center - barWidth / 2, top + plotHeight - barHeight, barWidth, barHeight);
    const dotY = top + plotHeight - plotHeight * item.totalCost / maxCost;
    context.fillStyle = '#dd6650'; context.beginPath(); context.arc(center, dotY, 4, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#69756f'; context.font = '8px Segoe UI'; context.textAlign = 'center'; context.fillText(item.run.workflow.replace('_agent', ''), center, top + plotHeight + 22);
    context.fillStyle = '#172019'; context.font = '700 9px Segoe UI'; context.fillText(formatCost(item.totalCost), center, top + plotHeight + 36);
  });
}

function initEconomics() {
  const costBudget = document.getElementById('costBudget'); if (!costBudget) return;
  const latencyBudget = document.getElementById('latencyBudget');
  const totalCost = SUMMARIES.reduce((sum, item) => sum + item.totalCost, 0);
  const totalTokens = SUMMARIES.reduce((sum, item) => sum + item.totalTokens, 0);
  const totalSteps = RUNS.flatMap(run => run.steps).length;
  document.getElementById('economicsTotalCost').textContent = formatCost(totalCost);
  document.getElementById('averageStepCost').textContent = formatCost(totalCost / totalSteps);
  document.getElementById('costPerKToken').textContent = `$${(totalCost / totalTokens * 1000).toFixed(4)}`;

  const tools = aggregateTools();
  document.getElementById('economicsToolCount').textContent = `${tools.length} TOOLS`;
  document.getElementById('toolEconomicsRows').innerHTML = tools.map(item => { const share = item.cost / totalCost; const signal = share >= .25 ? 'WATCH' : item.retries ? 'RETRY' : 'NORMAL'; return `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${item.calls}</td><td>${formatDuration(item.duration / item.calls)}</td><td>${formatNumber(item.tokens)}</td><td class="table-score">${formatCost(item.cost)}</td><td>${Math.round(share * 100)}%</td><td><span class="status-chip ${signal === 'NORMAL' ? '' : 'warning'}">${signal}</span></td></tr>`; }).join('');

  const scenarios = [
    { title: '上下文摘要缓存', saving: RUNS.flatMap(run => run.steps).filter(step => step.tokens_in + step.tokens_out >= 5000).reduce((sum, step) => sum + step.cost_usd * .2, 0), copy: '针对长上下文推理步骤复用摘要，按 20% 成本缩减估算。' },
    { title: '推理模型分层', saving: RUNS.flatMap(run => run.steps).filter(step => step.type === 'reasoning').reduce((sum, step) => sum + step.cost_usd * .15, 0), copy: '将规划和轻量判断路由到低成本模型，按 15% 缩减估算。' },
    { title: '重试输入收敛', saving: RUNS.flatMap(run => run.steps).filter(step => step.retries).reduce((sum, step) => sum + step.cost_usd * .1, 0), copy: '缓存成功片段并缩小重试批次，按相关步骤 10% 缩减估算。' }
  ];
  const totalSaving = scenarios.reduce((sum, item) => sum + item.saving, 0);
  document.getElementById('savingsEstimate').textContent = `EST. SAVE ${formatCost(totalSaving)}`;
  document.getElementById('optimizationGrid').innerHTML = scenarios.map(item => `<article class="optimization-item"><header><h3>${item.title}</h3><strong>-${formatCost(item.saving).slice(1)}</strong></header><p>${item.copy}</p></article>`).join('');

  function renderBudgets() {
    const costLimit = Number(costBudget.value) / 1000, latencyLimit = Number(latencyBudget.value) * 1000;
    document.getElementById('costBudgetValue').textContent = `$${costLimit.toFixed(3)}`;
    document.getElementById('latencyBudgetValue').textContent = `${Number(latencyBudget.value)}s`;
    const over = SUMMARIES.filter(item => item.totalCost > costLimit || item.totalDuration > latencyLimit);
    document.getElementById('overBudgetMetric').textContent = over.length;
    document.getElementById('overBudgetMeta').textContent = `OF ${RUNS.length} RUNS`;
    const gate = document.getElementById('budgetGateStatus'); gate.textContent = over.length ? 'REVIEW' : 'PASS'; gate.className = `status-chip ${over.length ? 'warning' : ''}`;
    document.getElementById('budgetRunList').innerHTML = SUMMARIES.map(item => { const costRatio = item.totalCost / costLimit, latencyRatio = item.totalDuration / latencyLimit, ratio = Math.max(costRatio, latencyRatio), isOver = ratio > 1; return `<div class="budget-run ${isOver ? 'over' : ''}"><header><strong>${escapeHtml(item.run.workflow)}</strong><small>${isOver ? 'OVER BUDGET' : 'WITHIN BUDGET'}</small></header><div class="budget-meter"><i style="width:${Math.min(100, ratio * 100)}%"></i></div><small>${formatCost(item.totalCost)} · ${formatDuration(item.totalDuration)}</small></div>`; }).join('');
  }

  costBudget.addEventListener('input', renderBudgets); latencyBudget.addEventListener('input', renderBudgets); window.addEventListener('resize', drawEconomicsChart); renderBudgets(); drawEconomicsChart(); refreshIcons();
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href); showToast(`${filename} 已导出。`);
}

document.addEventListener('DOMContentLoaded', () => {
  refreshIcons(); window.addEventListener('load', refreshIcons, { once: true });
  initOverview(); initTrace(); initIncidents(); initEconomics();
});
