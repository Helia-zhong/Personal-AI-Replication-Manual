const STORAGE_KEYS = {
  runs: 'agentflow.runs.v4',
  settings: 'agentflow.settings.v4',
  selectedFlow: 'agentflow.selected-flow.v4',
  theme: 'agentflow.theme.v4',
  replay: 'agentflow.replay.v4'
};

const WORKFLOWS = {
  rag_qa: {
    id: 'rag_qa',
    short: 'RAG',
    name: 'RAG Q&A',
    category: 'Knowledge retrieval',
    summary: '5 nodes · retrieval pipeline',
    description: 'Grounded answers with retrieval and citation checks.',
    output: '检索阶段命中 4 个相关片段，生成阶段已基于引用内容完成回答。工作流编排通过定义节点、依赖关系与运行状态，把复杂任务拆成可观测、可重试的执行单元。',
    nodes: [
      { id: 'input', name: 'Input contract', type: 'input', detail: 'Normalize query and context', duration: 0.2, model: 'Schema v2', tokens: 0 },
      { id: 'embed', name: 'Embed query', type: 'llm', detail: 'Create semantic representation', duration: 0.8, model: 'text-embed-3', tokens: 142 },
      { id: 'retrieve', name: 'Retrieve context', type: 'tool', detail: 'Top-k hybrid knowledge search', duration: 0.5, model: 'Vector store', tokens: 860 },
      { id: 'answer', name: 'Generate answer', type: 'llm', detail: 'Compose grounded response', duration: 1.5, model: 'gpt-4.1-mini', tokens: 1240 },
      { id: 'guard', name: 'Citation guard', type: 'agent', detail: 'Verify coverage and claims', duration: 0.4, model: 'Rule + LLM', tokens: 310 }
    ]
  },
  research: {
    id: 'research',
    short: 'RS',
    name: 'Research Agent',
    category: 'Agentic research',
    summary: '6 nodes · parallel tools',
    description: 'Plan, search, synthesize and review a research brief.',
    output: '研究计划已拆解为 3 个检索方向，共整理 8 条证据并完成交叉核验。最终简报包含结论、证据强度和需要进一步验证的开放问题。',
    nodes: [
      { id: 'scope', name: 'Scope request', type: 'input', detail: 'Define goal and constraints', duration: 0.2, model: 'Schema v2', tokens: 0 },
      { id: 'plan', name: 'Plan research', type: 'agent', detail: 'Break down evidence questions', duration: 0.9, model: 'gpt-4.1-mini', tokens: 420 },
      { id: 'search', name: 'Search sources', type: 'tool', detail: 'Collect candidate evidence', duration: 1.2, model: 'Search adapter', tokens: 690 },
      { id: 'extract', name: 'Extract claims', type: 'llm', detail: 'Normalize facts and citations', duration: 1.1, model: 'gpt-4.1-mini', tokens: 1040 },
      { id: 'synthesize', name: 'Synthesize brief', type: 'agent', detail: 'Compose structured report', duration: 1.6, model: 'gpt-4.1', tokens: 1460 },
      { id: 'review', name: 'Evidence review', type: 'agent', detail: 'Check gaps and conflicts', duration: 0.7, model: 'Review policy', tokens: 510 }
    ]
  },
  qa_review: {
    id: 'qa_review',
    short: 'QA',
    name: 'Content Review',
    category: 'Quality assurance',
    summary: '5 nodes · policy checks',
    description: 'Inspect generated content for claims, sources and risk.',
    output: '内容审查完成：12 条陈述中 10 条有明确来源，2 条需要弱化措辞。整体风险为低，建议在发布前补充一处时间范围说明。',
    nodes: [
      { id: 'ingest', name: 'Ingest draft', type: 'input', detail: 'Parse content and metadata', duration: 0.2, model: 'Document parser', tokens: 0 },
      { id: 'claims', name: 'Extract claims', type: 'llm', detail: 'Identify verifiable statements', duration: 0.8, model: 'gpt-4.1-mini', tokens: 720 },
      { id: 'sources', name: 'Match sources', type: 'tool', detail: 'Resolve supporting evidence', duration: 0.7, model: 'Citation index', tokens: 480 },
      { id: 'risk', name: 'Classify risk', type: 'agent', detail: 'Apply content policy', duration: 0.6, model: 'QA policy', tokens: 360 },
      { id: 'decision', name: 'Review decision', type: 'agent', detail: 'Return fixes and verdict', duration: 0.9, model: 'gpt-4.1-mini', tokens: 590 }
    ]
  },
  multi_agent: {
    id: 'multi_agent',
    short: 'MA',
    name: 'Multi-Agent',
    category: 'Collaborative agents',
    summary: '6 nodes · supervisor loop',
    description: 'Coordinate planning, execution and independent review.',
    output: 'Supervisor 已完成任务分派。Researcher 提供事实材料，Writer 生成结构化结果，Reviewer 给出通过结论；本次执行没有触发重试。',
    nodes: [
      { id: 'intake', name: 'Task intake', type: 'input', detail: 'Validate task contract', duration: 0.2, model: 'Schema v2', tokens: 0 },
      { id: 'supervisor', name: 'Supervisor', type: 'agent', detail: 'Plan and route work', duration: 0.8, model: 'gpt-4.1-mini', tokens: 390 },
      { id: 'researcher', name: 'Researcher', type: 'agent', detail: 'Collect task evidence', duration: 1.3, model: 'gpt-4.1-mini', tokens: 980 },
      { id: 'writer', name: 'Writer', type: 'agent', detail: 'Create final artifact', duration: 1.5, model: 'gpt-4.1', tokens: 1360 },
      { id: 'reviewer', name: 'Reviewer', type: 'agent', detail: 'Evaluate against rubric', duration: 0.9, model: 'gpt-4.1-mini', tokens: 610 },
      { id: 'finalize', name: 'Finalize output', type: 'tool', detail: 'Package result and trace', duration: 0.3, model: 'Output adapter', tokens: 0 }
    ]
  }
};

const PROMPT_SAMPLES = [
  {
    id: 'grounded',
    name: 'Grounded answer',
    template: '你是一个严谨的知识助手。\n\n上下文：\n{{context}}\n\n问题：{{query}}\n\n仅依据上下文回答，并在每个关键结论后标注引用编号。若信息不足，明确说明缺口。',
    variables: { query: '工作流编排的核心价值是什么？', context: '[1] 工作流编排用于协调多个任务、工具和服务的执行顺序。\n[2] 可观测性能够记录节点状态、延迟与错误。' }
  },
  {
    id: 'reviewer',
    name: 'Quality reviewer',
    template: '审查以下 AI 输出。\n\n任务目标：{{goal}}\n输出内容：{{content}}\n\n按准确性、完整性、可验证性评分，并返回最多 3 条具体修改建议。',
    variables: { goal: '解释 RAG 的工作机制', content: 'RAG 会先检索外部知识，再把相关内容提供给生成模型。' }
  },
  {
    id: 'planner',
    name: 'Agent planner',
    template: '将任务拆解为可执行计划：{{task}}\n\n约束：{{constraints|无额外约束}}\n\n返回 JSON，字段包含 steps、dependencies、success_criteria。',
    variables: { task: '整理一份 AI 产品竞品研究报告', constraints: '24 小时内完成，最多使用 5 个来源' }
  }
];

const DEFAULT_SETTINGS = {
  model: 'gpt-4.1-mini',
  temperature: 0.2,
  maxTokens: 2200,
  retryLimit: 2,
  traces: true,
  cache: true,
  failFast: false,
  theme: 'dark'
};

function storageGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast('浏览器未开放本地存储，本次更改只在当前页面有效。');
  }
}

function seedRuns() {
  const now = Date.now();
  return [
    buildSeedRun('run-a73f2c', 'rag_qa', 'success', 3.4, 2552, now - 8 * 60 * 1000, '解释工作流编排如何提升 Agent 可观测性。'),
    buildSeedRun('run-3d91be', 'research', 'success', 5.7, 4120, now - 42 * 60 * 1000, '整理一份多 Agent 协作模式研究简报。'),
    buildSeedRun('run-f1c84d', 'qa_review', 'success', 3.2, 2180, now - 2.4 * 60 * 60 * 1000, '审查 AI 生成内容中的引用覆盖情况。'),
    buildSeedRun('run-8b4a11', 'multi_agent', 'failed', 2.9, 1640, now - 5.6 * 60 * 60 * 1000, '协作生成模型评估报告。'),
    buildSeedRun('run-42ce90', 'rag_qa', 'success', 3.1, 2380, now - 22 * 60 * 60 * 1000, 'RAG 在企业知识库中的主要风险是什么？')
  ];
}

function buildSeedRun(id, workflowId, status, duration, tokens, createdAt, query) {
  const flow = WORKFLOWS[workflowId];
  return {
    id,
    workflowId,
    workflow: flow.name,
    status,
    duration,
    tokens,
    createdAt,
    query,
    output: status === 'success' ? flow.output : 'Execution stopped after a simulated tool timeout.',
    steps: flow.nodes.map((node, index) => ({
      name: node.name,
      type: node.type,
      duration: node.duration,
      status: status === 'failed' && index === 3 ? 'failed' : index > 3 && status === 'failed' ? 'skipped' : 'success'
    }))
  };
}

function getRuns() {
  const stored = storageGet(STORAGE_KEYS.runs, null);
  if (Array.isArray(stored) && stored.length) return stored;
  const seeded = seedRuns();
  storageSet(STORAGE_KEYS.runs, seeded);
  return seeded;
}

function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, storageGet(STORAGE_KEYS.settings, {}));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRelative(timestamp) {
  const diff = Math.max(0, Date.now() - Number(timestamp));
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTokens(tokens) {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
  try { localStorage.setItem(STORAGE_KEYS.theme, theme); } catch {}
}

function initCommon() {
  const page = document.body.dataset.page;
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === page);
  });
  const count = document.getElementById('runCount');
  if (count) count.textContent = getRuns().length;

  let theme = 'dark';
  try { theme = localStorage.getItem(STORAGE_KEYS.theme) || getSettings().theme || 'dark'; } catch {}
  setTheme(theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      setTheme(next);
      showToast(next === 'light' ? '已切换到明亮界面。' : '已切换到深色界面。');
    });
  }
}

function initWorkspace() {
  const picker = document.getElementById('workflowPicker');
  if (!picker) return;
  let currentId = storageGet(STORAGE_KEYS.selectedFlow, 'rag_qa');
  if (!WORKFLOWS[currentId]) currentId = 'rag_qa';
  let selectedNode = 0;
  let isRunning = false;

  function currentFlow() {
    return WORKFLOWS[currentId];
  }

  function renderPicker() {
    picker.innerHTML = Object.values(WORKFLOWS).map(flow => `
      <button class="workflow-choice ${flow.id === currentId ? 'active' : ''}" type="button" data-flow="${flow.id}">
        <strong>${escapeHtml(flow.name)}</strong><span>${escapeHtml(flow.category)}</span>
      </button>`).join('');
  }

  function renderFlow() {
    const flow = currentFlow();
    const stage = document.getElementById('flowStage');
    stage.innerHTML = `<div class="flow-rail">${flow.nodes.map((node, index) => `
      <button class="flow-node ${index === selectedNode ? 'selected' : ''}" type="button" data-node="${index}">
        <span class="node-sequence">${String(index + 1).padStart(2, '0')}</span>
        <span class="node-main"><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.detail)}</small></span>
        <span class="node-type ${node.type}">${escapeHtml(node.type)}</span>
      </button>`).join('')}</div>`;
    document.getElementById('flowSummary').textContent = flow.summary;
    document.getElementById('activeFlowMetric').textContent = flow.name;
    renderInspector(selectedNode);
  }

  function renderSelectedFlow() {
    const flow = currentFlow();
    document.getElementById('selectedFlow').innerHTML = `
      <span class="flow-monogram">${escapeHtml(flow.short)}</span>
      <span><strong>${escapeHtml(flow.name)}</strong><small>${escapeHtml(flow.description)}</small></span>
      <b>READY</b>`;
  }

  function renderInspector(index) {
    const node = currentFlow().nodes[index] || currentFlow().nodes[0];
    selectedNode = Math.max(0, index);
    document.getElementById('inspectorId').textContent = `NODE-${String(selectedNode + 1).padStart(2, '0')}`;
    document.getElementById('inspectorContent').innerHTML = `
      <div class="inspector-title"><span class="flow-monogram">${escapeHtml(node.type.slice(0, 2).toUpperCase())}</span><span><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.detail)}</small></span></div>
      <div class="inspector-grid">
        <div class="inspector-stat"><small>Node type</small><strong>${escapeHtml(node.type)}</strong></div>
        <div class="inspector-stat"><small>Runtime</small><strong>${node.duration.toFixed(1)} sec</strong></div>
        <div class="inspector-stat"><small>Adapter</small><strong>${escapeHtml(node.model)}</strong></div>
        <div class="inspector-stat"><small>Token budget</small><strong>${formatTokens(node.tokens || 0)}</strong></div>
      </div>`;
  }

  function renderMetrics() {
    const runs = getRuns();
    const recent = runs.slice(0, 20);
    const successful = recent.filter(run => run.status === 'success');
    const today = runs.filter(run => Date.now() - run.createdAt < 24 * 60 * 60 * 1000);
    const average = successful.length ? successful.reduce((sum, run) => sum + Number(run.duration), 0) / successful.length : 0;
    document.getElementById('runsTodayMetric').textContent = today.length;
    document.getElementById('avgLatencyMetric').textContent = average ? `${average.toFixed(1)}s` : '—';
    document.getElementById('successRateMetric').textContent = recent.length ? `${Math.round(successful.length / recent.length * 100)}%` : '—';
    const count = document.getElementById('runCount');
    if (count) count.textContent = runs.length;
  }

  function renderRecentRuns() {
    const runs = getRuns().slice(0, 4);
    const target = document.getElementById('recentRuns');
    if (!runs.length) {
      target.innerHTML = '<div class="empty-state">No runs recorded.</div>';
      return;
    }
    target.innerHTML = runs.map(run => `
      <div class="recent-item">
        <span class="run-state-icon ${run.status}">${run.status === 'success' ? '✓' : '!'}</span>
        <span class="recent-copy"><strong>${escapeHtml(run.workflow)}</strong><small>${escapeHtml(run.id)} · ${escapeHtml(run.query)}</small></span>
        <span class="recent-duration">${Number(run.duration).toFixed(1)}s</span>
        <span class="recent-time">${formatRelative(run.createdAt)}</span>
      </div>`).join('');
  }

  function selectFlow(id) {
    if (!WORKFLOWS[id] || isRunning) return;
    currentId = id;
    selectedNode = 0;
    storageSet(STORAGE_KEYS.selectedFlow, id);
    renderPicker();
    renderFlow();
    renderSelectedFlow();
    document.getElementById('runResult').hidden = true;
  }

  async function runWorkflow() {
    if (isRunning) return;
    const query = document.getElementById('varQuery').value.trim();
    if (!query) {
      showToast('query 不能为空。');
      document.getElementById('varQuery').focus();
      return;
    }

    isRunning = true;
    const flow = currentFlow();
    const button = document.getElementById('runButton');
    const result = document.getElementById('runResult');
    const status = document.getElementById('resultStatus');
    result.hidden = false;
    status.textContent = 'RUNNING';
    status.className = 'result-status running';
    document.getElementById('outputBox').textContent = 'Waiting for node output…';
    document.getElementById('resultMetrics').innerHTML = '<div class="result-metric"><strong>—</strong><small>steps</small></div><div class="result-metric"><strong>—</strong><small>latency</small></div><div class="result-metric"><strong>—</strong><small>tokens</small></div>';
    button.disabled = true;
    button.innerHTML = '<span>■</span> Executing…';
    document.querySelectorAll('.flow-node').forEach(node => node.classList.remove('running', 'success', 'failed'));

    const logs = [];
    for (let index = 0; index < flow.nodes.length; index += 1) {
      selectedNode = index;
      document.querySelectorAll('.flow-node').forEach(node => node.classList.remove('selected', 'running'));
      const nodeElement = document.querySelectorAll('.flow-node')[index];
      if (nodeElement) nodeElement.classList.add('selected', 'running');
      renderInspector(index);
      logs.push(`[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] START ${flow.nodes[index].name}`);
      await new Promise(resolve => setTimeout(resolve, 260 + Math.min(flow.nodes[index].duration * 130, 360)));
      if (nodeElement) {
        nodeElement.classList.remove('running');
        nodeElement.classList.add('success');
      }
      logs.push(`[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] OK    ${flow.nodes[index].name} ${flow.nodes[index].duration.toFixed(1)}s`);
    }

    const duration = flow.nodes.reduce((sum, node) => sum + node.duration, 0);
    const tokens = flow.nodes.reduce((sum, node) => sum + node.tokens, 0) + query.length * 2;
    const run = {
      id: `run-${Math.random().toString(16).slice(2, 8)}`,
      workflowId: flow.id,
      workflow: flow.name,
      status: 'success',
      duration,
      tokens,
      createdAt: Date.now(),
      query,
      output: flow.output,
      steps: flow.nodes.map(node => ({ name: node.name, type: node.type, duration: node.duration, status: 'success' }))
    };
    const runs = getRuns();
    runs.unshift(run);
    storageSet(STORAGE_KEYS.runs, runs.slice(0, 50));

    status.textContent = 'SUCCESS';
    status.className = 'result-status';
    document.getElementById('resultMetrics').innerHTML = `
      <div class="result-metric"><strong>${flow.nodes.length}</strong><small>steps</small></div>
      <div class="result-metric"><strong>${duration.toFixed(1)}s</strong><small>latency</small></div>
      <div class="result-metric"><strong>${formatTokens(tokens)}</strong><small>tokens</small></div>`;
    document.getElementById('outputBox').textContent = flow.output;
    document.getElementById('logBox').textContent = [`RUN ${run.id}`, `FLOW ${flow.name}`, `QUERY ${query}`, '', ...logs, '', `DONE ${duration.toFixed(1)}s · ${tokens} tokens`].join('\n');
    button.disabled = false;
    button.innerHTML = '<span>▶</span> Execute flow';
    isRunning = false;
    renderRecentRuns();
    renderMetrics();
    showToast(`${flow.name} 执行完成，运行记录已保存。`);
  }

  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-flow]');
    if (button) selectFlow(button.dataset.flow);
  });
  document.getElementById('flowStage').addEventListener('click', event => {
    const node = event.target.closest('[data-node]');
    if (!node || isRunning) return;
    selectedNode = Number(node.dataset.node);
    document.querySelectorAll('.flow-node').forEach(item => item.classList.remove('selected'));
    node.classList.add('selected');
    renderInspector(selectedNode);
  });
  document.getElementById('runButton').addEventListener('click', runWorkflow);
  document.getElementById('focusRun').addEventListener('click', () => {
    document.getElementById('runPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('varQuery').focus({ preventScroll: true });
  });
  document.getElementById('resetWorkspace').addEventListener('click', () => {
    document.getElementById('varQuery').value = '什么是工作流编排？请解释其核心原理。';
    document.getElementById('varTask').value = '完成一个复杂的多步骤数据分析任务';
    document.getElementById('varContext').value = '工作流编排是一种协调多个任务或服务执行的模式。';
    document.getElementById('runResult').hidden = true;
    selectFlow('rag_qa');
    showToast('Workspace 已恢复默认状态。');
  });
  document.getElementById('clearInputs').addEventListener('click', () => {
    ['varQuery', 'varTask', 'varContext'].forEach(id => { document.getElementById(id).value = ''; });
  });
  document.getElementById('inspectFlow').addEventListener('click', () => {
    document.getElementById('inspectorContent').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.getElementById('logToggle').addEventListener('click', event => {
    const log = document.getElementById('logBox');
    log.hidden = !log.hidden;
    event.currentTarget.querySelector('b').textContent = log.hidden ? '+' : '−';
  });

  const replay = storageGet(STORAGE_KEYS.replay, null);
  if (replay && WORKFLOWS[replay.workflowId]) {
    currentId = replay.workflowId;
    document.getElementById('varQuery').value = replay.query || '';
    try { localStorage.removeItem(STORAGE_KEYS.replay); } catch {}
  }
  renderPicker();
  renderFlow();
  renderSelectedFlow();
  renderRecentRuns();
  renderMetrics();
}

function initRunsPage() {
  const tableBody = document.getElementById('runTableBody');
  if (!tableBody) return;
  let runs = getRuns();
  let selectedId = runs[0] ? runs[0].id : null;

  function filteredRuns() {
    const search = document.getElementById('runSearch').value.trim().toLowerCase();
    const status = document.getElementById('statusFilter').value;
    return runs.filter(run => {
      const matchesSearch = !search || `${run.id} ${run.workflow} ${run.query}`.toLowerCase().includes(search);
      const matchesStatus = status === 'all' || run.status === status;
      return matchesSearch && matchesStatus;
    });
  }

  function renderSummary() {
    const successful = runs.filter(run => run.status === 'success');
    const avg = successful.length ? successful.reduce((sum, run) => sum + Number(run.duration), 0) / successful.length : 0;
    const tokenTotal = runs.reduce((sum, run) => sum + Number(run.tokens || 0), 0);
    document.getElementById('totalRunsMetric').textContent = runs.length;
    document.getElementById('runSuccessMetric').textContent = runs.length ? `${Math.round(successful.length / runs.length * 100)}%` : '—';
    document.getElementById('runLatencyMetric').textContent = avg ? `${avg.toFixed(1)}s` : '—';
    document.getElementById('runTokensMetric').textContent = formatTokens(tokenTotal);
  }

  function renderTable() {
    const data = filteredRuns();
    if (!data.length) {
      tableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No matching runs.</div></td></tr>';
      document.getElementById('runDetailBody').innerHTML = '<div class="empty-state">Select a run to inspect.</div>';
      return;
    }
    if (!data.some(run => run.id === selectedId)) selectedId = data[0].id;
    tableBody.innerHTML = data.map(run => `
      <tr data-run="${escapeHtml(run.id)}" class="${run.id === selectedId ? 'selected' : ''}">
        <td class="run-id">${escapeHtml(run.id)}</td>
        <td><strong>${escapeHtml(run.workflow)}</strong></td>
        <td><span class="status-pill ${run.status}">${escapeHtml(run.status.toUpperCase())}</span></td>
        <td>${Number(run.duration).toFixed(1)}s</td>
        <td>${formatTokens(run.tokens)}</td>
        <td>${formatRelative(run.createdAt)}</td>
        <td>→</td>
      </tr>`).join('');
    renderDetail(selectedId);
  }

  function renderDetail(id) {
    const run = runs.find(item => item.id === id);
    if (!run) return;
    const flow = WORKFLOWS[run.workflowId] || WORKFLOWS.rag_qa;
    document.getElementById('detailRunId').textContent = run.id;
    document.getElementById('runDetailBody').innerHTML = `
      <div class="selected-flow"><span class="flow-monogram">${escapeHtml(flow.short)}</span><span><strong>${escapeHtml(run.workflow)}</strong><small>${formatRelative(run.createdAt)} · ${formatTokens(run.tokens)} tokens</small></span><span class="status-pill ${run.status}">${run.status.toUpperCase()}</span></div>
      <p class="detail-query">${escapeHtml(run.query)}</p>
      <div class="step-list">${run.steps.map((step, index) => `
        <div class="step-row"><b class="${step.status}">${step.status === 'success' ? '✓' : step.status === 'failed' ? '!' : '–'}</b><span><strong>${String(index + 1).padStart(2, '0')} · ${escapeHtml(step.name)}</strong><small>${escapeHtml(step.type)} node</small></span><small>${Number(step.duration).toFixed(1)}s</small></div>`).join('')}</div>
      <div class="output-box">${escapeHtml(run.output)}</div>
      <div class="heading-actions" style="margin-top:14px;"><button class="button button-quiet" type="button" id="copyRunOutput"><span>□</span> Copy output</button><button class="button button-primary" type="button" id="replayRun"><span>▶</span> Replay</button></div>`;
    document.getElementById('copyRunOutput').addEventListener('click', () => copyText(run.output, '输出已复制。'));
    document.getElementById('replayRun').addEventListener('click', () => {
      storageSet(STORAGE_KEYS.replay, { workflowId: run.workflowId, query: run.query });
      window.location.href = 'index.html';
    });
  }

  tableBody.addEventListener('click', event => {
    const row = event.target.closest('[data-run]');
    if (!row) return;
    selectedId = row.dataset.run;
    renderTable();
  });
  document.getElementById('runSearch').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);
  document.getElementById('clearRunFilters').addEventListener('click', () => {
    document.getElementById('runSearch').value = '';
    document.getElementById('statusFilter').value = 'all';
    renderTable();
  });
  document.getElementById('exportRuns').addEventListener('click', () => downloadJson('agentflow-runs.json', runs));
  renderSummary();
  renderTable();
}

function initPromptPage() {
  const templateInput = document.getElementById('promptTemplate');
  if (!templateInput) return;
  let activeId = PROMPT_SAMPLES[0].id;

  function activeSample() {
    return PROMPT_SAMPLES.find(sample => sample.id === activeId) || PROMPT_SAMPLES[0];
  }

  function loadSample(id) {
    activeId = id;
    const sample = activeSample();
    templateInput.value = sample.template;
    document.getElementById('promptVariables').value = JSON.stringify(sample.variables, null, 2);
    renderSamples();
    previewPrompt();
  }

  function renderSamples() {
    document.getElementById('promptSamples').innerHTML = PROMPT_SAMPLES.map(sample => `<button class="sample-button ${sample.id === activeId ? 'active' : ''}" type="button" data-sample="${sample.id}">${escapeHtml(sample.name)}</button>`).join('');
  }

  function previewPrompt() {
    const template = templateInput.value;
    let variables;
    try {
      variables = JSON.parse(document.getElementById('promptVariables').value || '{}');
    } catch {
      showToast('变量 JSON 格式有误。');
      return false;
    }
    const variableNames = [];
    template.replace(/\{\{(\w+)(?:\|[^}]*)?\}\}/g, (_, key) => {
      if (!variableNames.includes(key)) variableNames.push(key);
      return _;
    });
    let rendered = template.replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (_, key, fallback) => {
      if (Object.prototype.hasOwnProperty.call(variables, key)) return String(variables[key]);
      return fallback !== undefined ? fallback : `{{${key}}}`;
    });
    document.getElementById('promptPreview').textContent = rendered;
    document.getElementById('variableList').innerHTML = variableNames.length ? variableNames.map(name => `<span class="variable-chip">{{${escapeHtml(name)}}}</span>`).join('') : '<span class="variable-chip">no variables</span>';
    document.getElementById('charMetric').textContent = template.length;
    document.getElementById('varMetric').textContent = variableNames.length;
    document.getElementById('tokenMetric').textContent = Math.ceil(rendered.length / 2.2);
    return true;
  }

  function runEvaluation() {
    if (!previewPrompt()) return;
    const button = document.getElementById('evaluatePrompt');
    button.disabled = true;
    button.innerHTML = '<span>■</span> Evaluating…';
    setTimeout(() => {
      const scores = [
        ['Instruction clarity', 94],
        ['Variable coverage', activeId === 'planner' ? 89 : 96],
        ['Output constraints', activeId === 'reviewer' ? 91 : 86],
        ['Safety boundary', 88]
      ];
      document.getElementById('scoreList').innerHTML = scores.map(score => `<div class="score-row"><span>${score[0]}</span><div class="score-bar"><i style="width:${score[1]}%"></i></div><strong>${score[1]}</strong></div>`).join('');
      const average = Math.round(scores.reduce((sum, score) => sum + score[1], 0) / scores.length);
      document.getElementById('promptScore').textContent = average;
      button.disabled = false;
      button.innerHTML = '<span>▶</span> Run evaluation';
      showToast(`Prompt evaluation completed · ${average}/100`);
    }, 700);
  }

  document.getElementById('promptSamples').addEventListener('click', event => {
    const button = event.target.closest('[data-sample]');
    if (button) loadSample(button.dataset.sample);
  });
  document.getElementById('renderPrompt').addEventListener('click', previewPrompt);
  document.getElementById('evaluatePrompt').addEventListener('click', runEvaluation);
  document.getElementById('copyPrompt').addEventListener('click', () => copyText(document.getElementById('promptPreview').textContent, '渲染结果已复制。'));
  document.getElementById('resetPrompt').addEventListener('click', () => loadSample(activeId));
  renderSamples();
  loadSample(activeId);
}

function initSettingsPage() {
  const form = document.getElementById('settingsForm');
  if (!form) return;
  let settings = getSettings();

  function populate() {
    document.getElementById('modelSetting').value = settings.model;
    document.getElementById('temperatureSetting').value = settings.temperature;
    document.getElementById('temperatureValue').textContent = Number(settings.temperature).toFixed(1);
    document.getElementById('maxTokensSetting').value = settings.maxTokens;
    document.getElementById('retrySetting').value = settings.retryLimit;
    document.getElementById('traceSetting').checked = settings.traces;
    document.getElementById('cacheSetting').checked = settings.cache;
    document.getElementById('failFastSetting').checked = settings.failFast;
    document.getElementById('themeSetting').value = settings.theme;
    renderDataStats();
  }

  function renderDataStats() {
    const runs = getRuns();
    const size = JSON.stringify(runs).length + JSON.stringify(settings).length;
    document.getElementById('storedRuns').textContent = runs.length;
    document.getElementById('storedDataSize').textContent = `${(size / 1024).toFixed(1)} KB`;
    document.getElementById('lastRunTime').textContent = runs[0] ? formatRelative(runs[0].createdAt) : 'Never';
  }

  document.getElementById('temperatureSetting').addEventListener('input', event => {
    document.getElementById('temperatureValue').textContent = Number(event.target.value).toFixed(1);
  });
  function saveSettings() {
    settings = {
      model: document.getElementById('modelSetting').value,
      temperature: Number(document.getElementById('temperatureSetting').value),
      maxTokens: Number(document.getElementById('maxTokensSetting').value),
      retryLimit: Number(document.getElementById('retrySetting').value),
      traces: document.getElementById('traceSetting').checked,
      cache: document.getElementById('cacheSetting').checked,
      failFast: document.getElementById('failFastSetting').checked,
      theme: document.getElementById('themeSetting').value
    };
    storageSet(STORAGE_KEYS.settings, settings);
    setTheme(settings.theme);
    showToast('Runtime settings saved.');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    saveSettings();
  });
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', () => {
    settings = Object.assign({}, DEFAULT_SETTINGS);
    populate();
    showToast('Settings restored to defaults.');
  });
  document.getElementById('resetDemoData').addEventListener('click', () => {
    storageSet(STORAGE_KEYS.runs, seedRuns());
    renderDataStats();
    const count = document.getElementById('runCount');
    if (count) count.textContent = getRuns().length;
    showToast('Demo run history restored.');
  });
  document.getElementById('exportSettings').addEventListener('click', () => downloadJson('agentflow-settings.json', settings));
  populate();
}

function copyText(value, successMessage) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(value).then(() => showToast(successMessage)).catch(() => fallbackCopy(value, successMessage));
  } else {
    fallbackCopy(value, successMessage);
  }
}

function fallbackCopy(value, successMessage) {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  showToast(successMessage);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`${filename} 已导出。`);
}

document.addEventListener('DOMContentLoaded', () => {
  initCommon();
  initWorkspace();
  initRunsPage();
  initPromptPage();
  initSettingsPage();
});
