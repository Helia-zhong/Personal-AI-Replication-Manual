const CORPUS = [
  { id: 'kb-001', title: '知识库切片策略', category: 'retrieval', text: '面向企业知识问答的 RAG 系统应优先使用语义完整的切片。每个 chunk 保留标题、章节、更新时间和来源链接。切片长度建议控制在 350 到 700 个中文字符，过短会丢失上下文，过长会降低检索精度。对于流程、规范和 FAQ，可以按问题或步骤拆分。' },
  { id: 'kb-002', title: '引用答案生成规范', category: 'generation', text: 'RAG 答案应先判断检索材料是否足够，再生成结论。答案必须引用支持性来源，引用格式使用文档 ID。若检索片段没有覆盖问题关键点，应明确提示信息不足，避免编造。摘要型答案应把结论、依据和下一步操作分开呈现。' },
  { id: 'kb-003', title: '权限与隐私处理', category: 'governance', text: '知识库检索需要遵守权限边界。用户只能检索自己有权访问的文档。日志中不应保存原始敏感信息，可以保留脱敏后的查询、命中文档 ID、评分和耗时。涉及个人信息、合同金额或内部策略时，应进行访问控制和审计记录。' },
  { id: 'kb-004', title: 'Embedding 与重排', category: 'retrieval', text: '检索链路可以采用关键词召回、向量召回和重排模型组合。Embedding 适合语义相近但字面不同的问题，BM25 适合精确术语匹配。reranker 用于对候选片段重新排序，通常能提升 Top-3 引用质量，但会增加延迟和成本。' },
  { id: 'kb-005', title: '人工反馈闭环', category: 'evaluation', text: 'RAG 系统上线后需要记录用户反馈、低分答案和未命中问题。人工标注可以补充正确引用、答案要点和错误类型。定期把这些样本加入评测集，可以观察召回率、答案覆盖率和幻觉风险是否改善。' },
  { id: 'kb-006', title: 'RAG 评估指标', category: 'evaluation', text: '常用 RAG 评估指标包括检索召回率、引用精度、答案相关性、事实一致性、拒答准确性和端到端延迟。评估时应把检索质量和生成质量分开记录。对于高风险业务，引用缺失或来源不匹配应触发人工复核。' }
];

const EVAL_CASES = [
  { id: 'rag-001', question: 'RAG 知识库切片为什么不能太短或太长？', expectedDocIds: ['kb-001'], expectedTerms: ['语义完整', '上下文', '检索精度'] },
  { id: 'rag-002', question: '如果检索材料没有覆盖问题关键点，答案应该怎么处理？', expectedDocIds: ['kb-002'], expectedTerms: ['信息不足', '避免编造', '引用'] },
  { id: 'rag-003', question: 'RAG 系统怎样处理用户权限和敏感日志？', expectedDocIds: ['kb-003'], expectedTerms: ['权限边界', '脱敏', '审计记录'] },
  { id: 'rag-004', question: 'Embedding、BM25 和 reranker 分别适合什么场景？', expectedDocIds: ['kb-004'], expectedTerms: ['语义相近', '精确术语', '重新排序'] },
  { id: 'rag-005', question: '上线后的 RAG 系统如何通过人工反馈持续改进？', expectedDocIds: ['kb-005', 'kb-006'], expectedTerms: ['用户反馈', '评测集', '召回率', '人工复核'] }
];

const STOPWORDS = new Set(['的', '了', '和', '与', '或', '应', '在', '是', '为', '及', '把', '对', '如何', '什么']);
const CATEGORY_LABELS = { retrieval: '检索工程', generation: '答案生成', governance: '权限治理', evaluation: '质量评估' };
const STORAGE_KEYS = { history: 'rag-studio.query-history.v3', evalTopK: 'rag-studio.eval-top-k.v3' };

function storageGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch { return fallback; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

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
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function score100(value) { return Math.round(Number(value || 0) * 100); }
function pct(value) { return `${score100(value)}%`; }
function signedScore(value) { const score = Math.round(value * 100); return `${score > 0 ? '+' : ''}${score}`; }
function formatRelative(timestamp) {
  const diff = Math.max(0, Date.now() - Number(timestamp));
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

function tokenize(text) {
  const matches = String(text).toLowerCase().match(/[a-zA-Z0-9_]+|[\u4e00-\u9fff]/g) || [];
  return matches.filter(token => !STOPWORDS.has(token));
}

function sentenceSplit(text) {
  return String(text).split(/(?<=[。！？.!?])\s*/).map(item => item.trim()).filter(Boolean);
}

function buildIndex(corpus = CORPUS) {
  const docFrequency = new Map();
  let totalLength = 0;
  const docs = corpus.map(item => {
    const tokens = tokenize(`${item.title} ${item.category} ${item.text}`);
    const counts = new Map();
    tokens.forEach(token => counts.set(token, (counts.get(token) || 0) + 1));
    [...counts.keys()].forEach(token => docFrequency.set(token, (docFrequency.get(token) || 0) + 1));
    totalLength += tokens.length;
    return { ...item, tokens, counts };
  });
  return { docs, docFrequency, avgLength: totalLength / Math.max(docs.length, 1), docCount: docs.length };
}

const SEARCH_INDEX = buildIndex();

function bm25Score(queryTokens, doc, index = SEARCH_INDEX) {
  let score = 0;
  const docLength = Math.max(doc.tokens.length, 1);
  const averageLength = Math.max(index.avgLength, 1);
  const docCount = Math.max(index.docCount, 1);
  const k1 = 1.4;
  const b = 0.75;
  [...new Set(queryTokens)].forEach(token => {
    const termFrequency = doc.counts.get(token) || 0;
    if (!termFrequency) return;
    const documentFrequency = index.docFrequency.get(token) || 0;
    const inverseFrequency = Math.log(1 + (docCount - documentFrequency + 0.5) / (documentFrequency + 0.5));
    const denominator = termFrequency + k1 * (1 - b + b * docLength / averageLength);
    score += inverseFrequency * (termFrequency * (k1 + 1)) / denominator;
  });
  return Number(score.toFixed(4));
}

function bestSnippet(questionTokens, text) {
  const sentences = sentenceSplit(text);
  if (!sentences.length) return text.slice(0, 120);
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    index,
    overlap: [...new Set(questionTokens)].filter(token => new Set(tokenize(sentence)).has(token)).length
  })).sort((a, b) => b.overlap - a.overlap || a.index - b.index);
  return ranked[0].sentence.slice(0, 160);
}

function retrieve(question, topK = 3, minScore = 0) {
  const queryTokens = tokenize(question);
  return SEARCH_INDEX.docs.map(doc => ({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    text: doc.text,
    score: bm25Score(queryTokens, doc),
    snippet: bestSnippet(queryTokens, doc.text)
  })).sort((a, b) => b.score - a.score).filter(item => item.score >= minScore).slice(0, topK);
}

function synthesizeAnswer(retrieved) {
  if (!retrieved.length || retrieved[0].score <= 0) return '检索材料不足，暂不能给出可靠答案。';
  const supporting = retrieved.slice(0, 2).map(item => `${item.snippet} [${item.id}]`).join('；');
  return `根据 ${retrieved[0].title}，可以先回答：${supporting}`;
}

function evaluateCase(testCase, topK = 3) {
  const retrieved = retrieve(testCase.question, topK);
  const answer = synthesizeAnswer(retrieved);
  const expectedIds = new Set(testCase.expectedDocIds);
  const retrievedIds = retrieved.map(item => item.id);
  const hits = retrievedIds.filter(id => expectedIds.has(id));
  const answerLower = answer.toLowerCase();
  const keywordHits = testCase.expectedTerms.filter(term => answerLower.includes(term.toLowerCase()));
  const citationRecall = hits.length / Math.max(expectedIds.size, 1);
  const citationPrecision = hits.length / Math.max(retrievedIds.length, 1);
  const keywordCoverage = keywordHits.length / Math.max(testCase.expectedTerms.length, 1);
  const topHit = retrievedIds.length && expectedIds.has(retrievedIds[0]) ? 1 : 0;
  const overall = 0.35 * citationRecall + 0.2 * citationPrecision + 0.3 * keywordCoverage + 0.15 * topHit;
  return { ...testCase, retrieved, answer, keywordHits, metrics: { topHit, citationRecall, citationPrecision, keywordCoverage, overall } };
}

function evaluateAll(topK = 3) {
  const results = EVAL_CASES.map(testCase => evaluateCase(testCase, topK));
  const average = key => results.reduce((sum, item) => sum + item.metrics[key], 0) / Math.max(results.length, 1);
  return { topK, aggregate: { topHit: average('topHit'), citationRecall: average('citationRecall'), citationPrecision: average('citationPrecision'), keywordCoverage: average('keywordCoverage'), overall: average('overall') }, results };
}

function queryLatency(question, topK) { return 12 + tokenize(question).length * 2 + topK * 5; }

function initQueryLab() {
  const queryInput = document.getElementById('queryInput');
  if (!queryInput) return;
  const topKSelect = document.getElementById('queryTopK');
  const minScoreInput = document.getElementById('minScore');
  let currentAnswer = '';
  let activeDocumentId = null;

  function getHistory() {
    const stored = storageGet(STORAGE_KEYS.history, null);
    if (Array.isArray(stored)) return stored;
    const initial = [
      { id: 'query-seed-1', question: 'RAG 系统如何处理权限和敏感日志？', topK: 3, topScore: 9.34, timestamp: Date.now() - 1000 * 60 * 45 },
      { id: 'query-seed-2', question: 'BM25 与 Embedding 分别适合什么场景？', topK: 2, topScore: 8.76, timestamp: Date.now() - 1000 * 60 * 60 * 4 }
    ];
    storageSet(STORAGE_KEYS.history, initial);
    return initial;
  }

  function renderHistory() {
    const history = getHistory().slice(0, 6);
    const container = document.getElementById('queryHistory');
    if (!history.length) { container.innerHTML = '<div class="empty-state">运行检索后，查询会保存在当前浏览器。</div>'; return; }
    container.innerHTML = history.map(item => `<button class="history-row" type="button" data-history="${escapeHtml(item.id)}">
      <span class="history-icon"><i data-lucide="history"></i></span>
      <span><strong>${escapeHtml(item.question)}</strong><small>${escapeHtml(item.id)}</small></span>
      <span class="history-meta">Top-${item.topK}</span><span class="history-meta">${formatRelative(item.timestamp)}</span>
    </button>`).join('');
  }

  function renderAnswer(retrieved) {
    const selected = retrieved.find(item => item.id === activeDocumentId) || retrieved[0];
    const citations = retrieved.slice(0, 2);
    document.getElementById('answerContent').innerHTML = `
      <p class="answer-copy">${escapeHtml(currentAnswer)}</p>
      <div class="citation-list">${citations.map(item => `<span class="citation-tag">[${escapeHtml(item.id)}]</span>`).join('')}</div>
      ${selected ? `<div class="selected-context"><span>SELECTED CONTEXT</span><strong>${escapeHtml(selected.id)} · ${escapeHtml(selected.title)}</strong></div>` : ''}`;
  }

  function renderResults(retrieved) {
    const list = document.getElementById('retrievalList');
    document.getElementById('resultCount').textContent = `${retrieved.length} CHUNKS`;
    if (!retrieved.length) { list.innerHTML = '<div class="empty-state">当前阈值下没有候选文档，请降低最低得分。</div>'; return; }
    const maxScore = Math.max(...retrieved.map(item => item.score), 1);
    list.innerHTML = retrieved.map((item, index) => `<button class="retrieval-item ${item.id === activeDocumentId ? 'active' : ''}" type="button" data-document="${item.id}">
      <span class="rank-box">${String(index + 1).padStart(2, '0')}</span>
      <span class="retrieval-copy"><header><h3>${escapeHtml(item.title)}</h3><span class="category-chip">${CATEGORY_LABELS[item.category]}</span></header><p>${escapeHtml(item.snippet)}</p></span>
      <span class="score-box"><strong>${item.score.toFixed(2)}</strong><small>BM25 SCORE</small><span class="score-track"><i style="width:${Math.max(3, item.score / maxScore * 100)}%"></i></span></span>
    </button>`).join('');
  }

  function renderTrace(question, retrieved) {
    const trace = [
      ['分词与清洗', `${tokenize(question).length} tokens`, 'braces'],
      ['BM25 召回', `${CORPUS.length} documents`, 'database'],
      ['Top-K 截断', `${retrieved.length} chunks`, 'list-filter'],
      ['答案合成', `${Math.min(2, retrieved.length)} citations`, 'quote']
    ];
    document.getElementById('traceList').innerHTML = trace.map(([name, meta, icon]) => `<div class="trace-row"><span class="trace-icon"><i data-lucide="${icon}"></i></span><span><strong>${name}</strong><small>completed</small></span><small>${meta}</small></div>`).join('');
  }

  function executeQuery(saveToHistory = true) {
    const question = queryInput.value.trim();
    if (!question) { queryInput.focus(); showToast('请输入检索问题。'); return; }
    const topK = Number(topKSelect.value);
    const minScore = Number(minScoreInput.value);
    const retrieved = retrieve(question, topK, minScore);
    activeDocumentId = retrieved[0]?.id || null;
    currentAnswer = synthesizeAnswer(retrieved);
    renderResults(retrieved);
    renderAnswer(retrieved);
    renderTrace(question, retrieved);
    document.getElementById('queryCandidateMetric').textContent = retrieved.length;
    document.getElementById('queryTopScoreMetric').textContent = retrieved[0] ? retrieved[0].score.toFixed(2) : '0.00';
    document.getElementById('queryCitationMetric').textContent = Math.min(2, retrieved.length);
    document.getElementById('queryLatencyMetric').textContent = `${queryLatency(question, topK)} ms`;
    if (saveToHistory) {
      const history = getHistory();
      history.unshift({ id: `query-${Math.random().toString(16).slice(2, 8)}`, question, topK, topScore: retrieved[0]?.score || 0, timestamp: Date.now() });
      storageSet(STORAGE_KEYS.history, history.slice(0, 30));
      renderHistory();
    }
    refreshIcons();
  }

  document.getElementById('runQuery').addEventListener('click', event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle"></i><span>检索中...</span>';
    refreshIcons();
    setTimeout(() => {
      executeQuery(true);
      button.disabled = false;
      button.innerHTML = '<i data-lucide="search"></i><span>运行检索</span>';
      refreshIcons();
      showToast('检索链路执行完成。');
    }, 520);
  });
  queryInput.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) executeQuery(true); });
  minScoreInput.addEventListener('input', () => { document.getElementById('minScoreValue').textContent = Number(minScoreInput.value).toFixed(2); });
  document.getElementById('retrievalList').addEventListener('click', event => {
    const item = event.target.closest('[data-document]');
    if (!item) return;
    activeDocumentId = item.dataset.document;
    const retrieved = retrieve(queryInput.value.trim(), Number(topKSelect.value), Number(minScoreInput.value));
    renderResults(retrieved); renderAnswer(retrieved);
  });
  document.getElementById('queryHistory').addEventListener('click', event => {
    const item = event.target.closest('[data-history]');
    if (!item) return;
    const record = getHistory().find(row => row.id === item.dataset.history);
    if (!record) return;
    queryInput.value = record.question; topKSelect.value = String(record.topK); executeQuery(false); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('clearQueryHistory').addEventListener('click', () => { storageSet(STORAGE_KEYS.history, []); renderHistory(); showToast('本地查询记录已清除。'); });
  document.getElementById('copyAnswer').addEventListener('click', () => copyText(currentAnswer, '答案已复制。'));
  renderHistory(); executeQuery(false);
}

function evaluationGate(result) {
  const passedCases = result.results.filter(item => item.metrics.overall >= 0.7).length;
  const gates = [
    { label: '综合评分不低于 65', value: score100(result.aggregate.overall), passed: result.aggregate.overall >= 0.65 },
    { label: '引用召回不低于 85', value: score100(result.aggregate.citationRecall), passed: result.aggregate.citationRecall >= 0.85 },
    { label: 'Top 命中必须为 100', value: score100(result.aggregate.topHit), passed: result.aggregate.topHit >= 1 },
    { label: '引用精度不低于 30', value: score100(result.aggregate.citationPrecision), passed: result.aggregate.citationPrecision >= 0.3 },
    { label: '至少 3 个用例达到 70', value: `${passedCases}/${result.results.length}`, passed: passedCases >= 3 }
  ];
  return { passed: gates.every(item => item.passed), passedCases, gates };
}

function initEvaluation() {
  const topKSelect = document.getElementById('evalTopK');
  if (!topKSelect) return;
  topKSelect.value = String(storageGet(STORAGE_KEYS.evalTopK, 3));
  let activeCaseId = EVAL_CASES[0].id;
  let currentResult;

  function renderMetrics(result) {
    document.getElementById('overallMetric').textContent = score100(result.aggregate.overall);
    document.getElementById('overallMeta').textContent = `TOP-${result.topK} · ${result.results.length} cases`;
    document.getElementById('topHitMetric').textContent = pct(result.aggregate.topHit);
    document.getElementById('recallMetric').textContent = pct(result.aggregate.citationRecall);
    document.getElementById('precisionMetric').textContent = pct(result.aggregate.citationPrecision);
    document.getElementById('coverageMetric').textContent = pct(result.aggregate.keywordCoverage);
  }

  function renderGate(result) {
    const gate = evaluationGate(result);
    const status = document.getElementById('evalGateStatus');
    status.textContent = gate.passed ? 'PASS' : 'REVIEW';
    status.className = `status-chip ${gate.passed ? '' : 'warning'}`;
    document.getElementById('passedCaseMetric').textContent = `${gate.passedCases}/${result.results.length}`;
    document.getElementById('evalGateList').innerHTML = gate.gates.map(item => `<div class="gate-row ${item.passed ? '' : 'failed'}"><i data-lucide="${item.passed ? 'circle-check' : 'circle-x'}"></i><span>${item.label}</span><b>${item.value}</b></div>`).join('');
  }

  function renderRows(result) {
    document.getElementById('evalCaseCount').textContent = `${result.results.length} CASES`;
    document.getElementById('evaluationRows').innerHTML = result.results.map(item => `<tr class="${item.id === activeCaseId ? 'selected' : ''}" data-case="${item.id}">
      <td class="question-cell"><strong>${escapeHtml(item.question)}</strong><small>${item.id}</small></td><td><span class="doc-id-list">${item.expectedDocIds.join(', ')}</span></td><td>${item.metrics.topHit ? 'YES' : 'NO'}</td><td>${pct(item.metrics.keywordCoverage)}</td><td><span class="table-score">${score100(item.metrics.overall)}</span></td>
    </tr>`).join('');
  }

  function renderDetail(result) {
    const item = result.results.find(row => row.id === activeCaseId) || result.results[0];
    activeCaseId = item.id;
    document.getElementById('evalDetailTitle').textContent = item.id;
    const status = document.getElementById('evalDetailStatus');
    status.textContent = item.metrics.overall >= 0.7 ? 'PASS' : 'REVIEW';
    status.className = `status-chip ${item.metrics.overall >= 0.7 ? '' : 'warning'}`;
    document.getElementById('evalDetail').innerHTML = `
      <div class="detail-metrics"><div><span>OVERALL</span><strong>${score100(item.metrics.overall)}</strong></div><div><span>TOP HIT</span><strong>${pct(item.metrics.topHit)}</strong></div><div><span>CITATION RECALL</span><strong>${pct(item.metrics.citationRecall)}</strong></div><div><span>CITATION PRECISION</span><strong>${pct(item.metrics.citationPrecision)}</strong></div></div>
      <div class="detail-block"><h3>问题</h3><p>${escapeHtml(item.question)}</p></div>
      <div class="detail-block"><h3>答案</h3><p>${escapeHtml(item.answer)}</p></div>
      <div class="detail-block"><h3>答案要点</h3><div class="chip-list">${item.expectedTerms.map(term => `<span class="term-chip ${item.keywordHits.includes(term) ? '' : 'missed'}">${escapeHtml(term)}</span>`).join('')}</div></div>
      <div class="detail-block"><h3>检索文档</h3><div class="retrieved-mini">${item.retrieved.map(doc => `<div><span><strong>${doc.id} · ${escapeHtml(doc.title)}</strong><small>${CATEGORY_LABELS[doc.category]}</small></span><b>${doc.score.toFixed(2)}</b></div>`).join('')}</div></div>`;
  }

  function drawCaseChart(result) {
    const canvas = document.getElementById('caseChart');
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext('2d'); context.setTransform(ratio,0,0,ratio,0,0);
    const width = rect.width, height = rect.height, left = 36, right = 12, top = 20, bottom = 38;
    const plotWidth = width-left-right, plotHeight = height-top-bottom;
    context.clearRect(0,0,width,height); context.font='8px Segoe UI'; context.textAlign='right';
    [0,25,50,75,100].forEach(value => { const y=top+plotHeight-plotHeight*value/100; context.strokeStyle='#e8ece9'; context.beginPath(); context.moveTo(left,y); context.lineTo(left+plotWidth,y); context.stroke(); context.fillStyle='#98a29c'; context.fillText(String(value),left-6,y+3); });
    const cell=plotWidth/result.results.length, barWidth=Math.min(52,cell*0.5);
    result.results.forEach((item,index)=>{ const value=score100(item.metrics.overall), x=left+cell*(index+0.5)-barWidth/2, barHeight=plotHeight*value/100; context.fillStyle=value>=70?'#22624b':value>=55?'#a97618':'#c84b59'; context.fillRect(x,top+plotHeight-barHeight,barWidth,barHeight); context.fillStyle='#17201b'; context.textAlign='center'; context.font='700 9px Segoe UI'; context.fillText(String(value),x+barWidth/2,top+plotHeight-barHeight-6); context.fillStyle='#6d7972'; context.font='8px Segoe UI'; context.fillText(item.id,x+barWidth/2,top+plotHeight+22); });
  }

  function render() {
    currentResult = evaluateAll(Number(topKSelect.value)); storageSet(STORAGE_KEYS.evalTopK,currentResult.topK);
    renderMetrics(currentResult); renderGate(currentResult); renderRows(currentResult); renderDetail(currentResult); drawCaseChart(currentResult); refreshIcons();
  }

  document.getElementById('evaluationRows').addEventListener('click', event => { const row=event.target.closest('[data-case]'); if(!row)return; activeCaseId=row.dataset.case; renderRows(currentResult); renderDetail(currentResult); });
  topKSelect.addEventListener('change', render);
  document.getElementById('runEvaluation').addEventListener('click', event => { const button=event.currentTarget; button.disabled=true; button.innerHTML='<i data-lucide="loader-circle"></i><span>评测中...</span>'; refreshIcons(); setTimeout(()=>{ render(); button.disabled=false; button.innerHTML='<i data-lucide="play"></i><span>运行评测</span>'; refreshIcons(); showToast(`TOP-${currentResult.topK} 评测完成，综合得分 ${score100(currentResult.aggregate.overall)}。`); },650); });
  window.addEventListener('resize',()=>drawCaseChart(currentResult)); render();
}

function initCorpus() {
  const list = document.getElementById('corpusList');
  if (!list) return;
  const search = document.getElementById('corpusSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  let activeId = CORPUS[0].id;
  const categories = [...new Set(CORPUS.map(item=>item.category))];
  categoryFilter.innerHTML += categories.map(category=>`<option value="${category}">${CATEGORY_LABELS[category]}</option>`).join('');

  function filteredCorpus() {
    const query=search.value.trim().toLowerCase();
    return CORPUS.filter(item=>(categoryFilter.value==='all'||item.category===categoryFilter.value)&&(!query||`${item.id} ${item.title} ${item.text}`.toLowerCase().includes(query)));
  }
  function renderSummary(){ document.getElementById('corpusDocMetric').textContent=CORPUS.length; document.getElementById('corpusCategoryMetric').textContent=categories.length; document.getElementById('corpusTokenMetric').textContent=SEARCH_INDEX.docs.reduce((sum,doc)=>sum+doc.tokens.length,0); }
  function renderDetail(item){ if(!item){ document.getElementById('corpusDetail').innerHTML='<div class="empty-state">没有匹配的文档。</div>'; return; } const indexed=SEARCH_INDEX.docs.find(doc=>doc.id===item.id); const counts=[...indexed.counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,24); document.getElementById('corpusDetailTitle').textContent=item.title; document.getElementById('corpusDetailCategory').textContent=CATEGORY_LABELS[item.category]; document.getElementById('corpusDetail').innerHTML=`<div class="doc-meta-grid"><div><span>DOCUMENT ID</span><strong>${item.id}</strong></div><div><span>CATEGORY</span><strong>${CATEGORY_LABELS[item.category]}</strong></div><div><span>CHARACTERS</span><strong>${item.text.length}</strong></div><div><span>INDEX TOKENS</span><strong>${indexed.tokens.length}</strong></div></div><div class="detail-block"><h3>切片正文</h3><p class="doc-text">${escapeHtml(item.text)}</p></div><div class="detail-block"><h3>高频索引词元</h3><div class="token-cloud">${counts.map(([token,count])=>`<span class="token-chip">${escapeHtml(token)} · ${count}</span>`).join('')}</div></div>`; }
  function render(){ const data=filteredCorpus(); document.getElementById('corpusResultCount').textContent=`${data.length} documents`; if(!data.length){list.innerHTML='<div class="empty-state">没有匹配的知识文档。</div>'; renderDetail(null); return;} if(!data.some(item=>item.id===activeId))activeId=data[0].id; list.innerHTML=data.map(item=>{const indexed=SEARCH_INDEX.docs.find(doc=>doc.id===item.id);return `<button class="corpus-item ${item.id===activeId?'active':''}" type="button" data-document="${item.id}"><span class="doc-symbol"><i data-lucide="file-text"></i></span><span><strong>${escapeHtml(item.title)}</strong><small>${item.id}</small><p>${escapeHtml(item.text)}</p></span><span class="corpus-item-meta"><b>${CATEGORY_LABELS[item.category]}</b><small>${indexed.tokens.length} tokens</small></span></button>`;}).join(''); renderDetail(data.find(item=>item.id===activeId)); refreshIcons(); }
  list.addEventListener('click',event=>{const item=event.target.closest('[data-document]');if(!item)return;activeId=item.dataset.document;render();});
  search.addEventListener('input',render); categoryFilter.addEventListener('change',render); renderSummary(); render();
}

function buildExperiments(){ return [1,2,3,4,5].map(topK=>evaluateAll(topK)); }

function initReports() {
  const chart=document.getElementById('experimentChart'); if(!chart)return;
  const experiments=buildExperiments(); const best=experiments.reduce((current,item)=>item.aggregate.overall>current.aggregate.overall?item:current,experiments[0]);
  const referenceSelect=document.getElementById('referenceK'), candidateSelect=document.getElementById('candidateK');
  const options=experiments.map(item=>`<option value="${item.topK}">TOP-${item.topK}</option>`).join(''); referenceSelect.innerHTML=options; candidateSelect.innerHTML=options; referenceSelect.value='3'; candidateSelect.value=String(best.topK);
  let currentReport;
  document.getElementById('bestConfiguration').textContent=`TOP-K ${best.topK}`; document.getElementById('bestConfigurationMeta').textContent=`综合 ${score100(best.aggregate.overall)} · 精度 ${score100(best.aggregate.citationPrecision)} · 召回 ${score100(best.aggregate.citationRecall)}`;

  function selected(select){return experiments.find(item=>item.topK===Number(select.value))||experiments[0];}
  function renderTable(){document.getElementById('experimentRows').innerHTML=experiments.map(item=>{const isBest=item.topK===best.topK;return `<tr><td><span class="config-badge ${isBest?'best':''}">TOP-${item.topK}</span></td><td>${pct(item.aggregate.topHit)}</td><td>${pct(item.aggregate.citationRecall)}</td><td>${pct(item.aggregate.citationPrecision)}</td><td>${pct(item.aggregate.keywordCoverage)}</td><td><span class="table-score">${score100(item.aggregate.overall)}</span></td><td><span class="status-chip ${isBest?'':'warning'}">${isBest?'BEST':'TRADE-OFF'}</span></td></tr>`;}).join('');}
  function drawChart(){const rect=chart.getBoundingClientRect();if(!rect.width||!rect.height)return;const ratio=window.devicePixelRatio||1;chart.width=Math.round(rect.width*ratio);chart.height=Math.round(rect.height*ratio);const c=chart.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);const width=rect.width,height=rect.height,left=38,right=18,top=30,bottom=42,plotW=width-left-right,plotH=height-top-bottom;c.clearRect(0,0,width,height);[0,25,50,75,100].forEach(value=>{const y=top+plotH-plotH*value/100;c.strokeStyle='#e8ece9';c.beginPath();c.moveTo(left,y);c.lineTo(left+plotW,y);c.stroke();c.fillStyle='#98a29c';c.font='8px Segoe UI';c.textAlign='right';c.fillText(String(value),left-6,y+3);});const series=[['overall','#22624b'],['citationRecall','#426f98'],['citationPrecision','#df654c']];series.forEach(([key,color])=>{c.strokeStyle=color;c.lineWidth=2;c.beginPath();experiments.forEach((item,index)=>{const x=left+plotW*index/(experiments.length-1),y=top+plotH-plotH*score100(item.aggregate[key])/100;if(index===0)c.moveTo(x,y);else c.lineTo(x,y);});c.stroke();experiments.forEach((item,index)=>{const x=left+plotW*index/(experiments.length-1),y=top+plotH-plotH*score100(item.aggregate[key])/100;c.fillStyle=color;c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();});});experiments.forEach((item,index)=>{const x=left+plotW*index/(experiments.length-1);c.fillStyle='#6d7972';c.font='8px Segoe UI';c.textAlign='center';c.fillText(`K=${item.topK}`,x,top+plotH+23);});[['Overall','#22624b'],['Recall','#426f98'],['Precision','#df654c']].forEach(([label,color],index)=>{c.fillStyle=color;c.fillRect(left+index*70,7,12,3);c.fillStyle='#6d7972';c.font='8px Segoe UI';c.textAlign='left';c.fillText(label,left+17+index*70,11);});}
  function renderRisk(candidate){const risks=candidate.results.filter(item=>item.metrics.overall<0.7);document.getElementById('riskCount').textContent=`${risks.length} CASES`;document.getElementById('riskList').innerHTML=risks.length?risks.map(item=>{const missed=item.expectedTerms.filter(term=>!item.keywordHits.includes(term));return `<div class="risk-item"><span class="risk-icon"><i data-lucide="triangle-alert"></i></span><span><strong>${escapeHtml(item.question)}</strong><small>${item.id} · 未覆盖 ${missed.join('、')||'无'}</small></span><b>${score100(item.metrics.overall)}</b></div>`;}).join(''):'<div class="empty-state">当前配置没有低于 70 分的用例。</div>';}
  function render(){const reference=selected(referenceSelect),candidate=selected(candidateSelect);currentReport={generatedAt:new Date().toISOString(),reference,candidate,experiments};const overallDelta=candidate.aggregate.overall-reference.aggregate.overall,recallDelta=candidate.aggregate.citationRecall-reference.aggregate.citationRecall,precisionDelta=candidate.aggregate.citationPrecision-reference.aggregate.citationPrecision;document.getElementById('reportCandidateScore').textContent=score100(candidate.aggregate.overall);document.getElementById('reportCandidateMeta').textContent=`TOP-${candidate.topK}`;const delta=document.getElementById('reportDelta');delta.textContent=signedScore(overallDelta);delta.className=overallDelta>=0?'positive':'negative';const recall=document.getElementById('reportRecallDelta');recall.textContent=signedScore(recallDelta);recall.className=recallDelta>=0?'positive':'negative';const precision=document.getElementById('reportPrecisionDelta');precision.textContent=signedScore(precisionDelta);precision.className=precisionDelta>=0?'positive':'negative';const isBest=candidate.topK===best.topK,improved=candidate.aggregate.overall>=reference.aggregate.overall;const status=document.getElementById('tradeoffStatus');status.textContent=isBest?'RECOMMENDED':improved?'IMPROVED':'TRADE-OFF';status.className=`status-chip ${improved?'':'warning'}`;const decisionTitle=isBest?'当前全局最优配置':improved?'候选配置优于基准':'候选配置需要权衡';const decisionCopy=isBest?'综合评分最高，适合作为当前知识库的默认配置。':improved?`综合得分超过基准，但仍低于全局最优 TOP-${best.topK}。`:'召回或候选范围提升，但综合质量未超过基准。';document.getElementById('tradeoffContent').innerHTML=`<div class="tradeoff-callout ${improved?'':'warning'}"><strong>${decisionTitle}</strong><span>${decisionCopy}</span></div><div class="tradeoff-deltas"><div class="tradeoff-row"><span>综合评分</span><b class="${overallDelta>=0?'positive':'negative'}">${signedScore(overallDelta)}</b></div><div class="tradeoff-row"><span>引用召回</span><b class="${recallDelta>=0?'positive':'negative'}">${signedScore(recallDelta)}</b></div><div class="tradeoff-row"><span>引用精度</span><b class="${precisionDelta>=0?'positive':'negative'}">${signedScore(precisionDelta)}</b></div><div class="tradeoff-row"><span>候选文档数</span><b>${candidate.topK-reference.topK>0?'+':''}${candidate.topK-reference.topK}</b></div></div>`;renderRisk(candidate);drawChart();refreshIcons();}
  referenceSelect.addEventListener('change',render);candidateSelect.addEventListener('change',render);window.addEventListener('resize',drawChart);document.getElementById('exportJson').addEventListener('click',()=>downloadFile('rag-topk-report.json',JSON.stringify(reportPayload(currentReport),null,2),'application/json'));document.getElementById('exportMarkdown').addEventListener('click',()=>downloadFile('rag-topk-report.md',reportMarkdown(currentReport),'text/markdown'));renderTable();render();
}

function reportPayload(report){return{generatedAt:report.generatedAt,corpus:{id:'enterprise-rag-v1',documents:CORPUS.length,cases:EVAL_CASES.length},reference:{topK:report.reference.topK,aggregate:report.reference.aggregate},candidate:{topK:report.candidate.topK,aggregate:report.candidate.aggregate},experiments:report.experiments.map(item=>({topK:item.topK,aggregate:item.aggregate})),candidateCases:report.candidate.results.map(item=>({id:item.id,question:item.question,metrics:item.metrics,retrievedIds:item.retrieved.map(doc=>doc.id)}))};}
function reportMarkdown(report){const payload=reportPayload(report);return['# RAG Top-K Evaluation Report','',`- Generated: ${payload.generatedAt}`,`- Corpus: ${payload.corpus.id} (${payload.corpus.documents} documents)`,`- Reference: TOP-${payload.reference.topK} (${score100(payload.reference.aggregate.overall)})`,`- Candidate: TOP-${payload.candidate.topK} (${score100(payload.candidate.aggregate.overall)})`,'','| Top-K | Top hit | Recall | Precision | Coverage | Overall |','| ---: | ---: | ---: | ---: | ---: | ---: |',...payload.experiments.map(item=>`| ${item.topK} | ${score100(item.aggregate.topHit)} | ${score100(item.aggregate.citationRecall)} | ${score100(item.aggregate.citationPrecision)} | ${score100(item.aggregate.keywordCoverage)} | ${score100(item.aggregate.overall)} |`)].join('\n');}
function copyText(value,message){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(value).then(()=>showToast(message)).catch(()=>fallbackCopy(value,message));}else fallbackCopy(value,message);}
function fallbackCopy(value,message){const textarea=document.createElement('textarea');textarea.value=value;textarea.style.position='fixed';textarea.style.opacity='0';document.body.appendChild(textarea);textarea.select();document.execCommand('copy');textarea.remove();showToast(message);}
function downloadFile(filename,content,type){const blob=new Blob([content],{type:`${type};charset=utf-8`});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(link.href);showToast(`${filename} 已导出。`);}

document.addEventListener('DOMContentLoaded',()=>{refreshIcons();window.addEventListener('load',refreshIcons,{once:true});initQueryLab();initEvaluation();initCorpus();initReports();});
