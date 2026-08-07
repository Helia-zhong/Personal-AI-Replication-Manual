const SAMPLES = [
  { id: 'content-001', title: '企业知识助手上线说明', content: '企业知识助手已支持对内部制度、项目文档和 FAQ 的统一检索，并可在答案中附带来源引用 [S1]。系统默认保留近 30 天的脱敏查询日志，用于质量评估 [S2]。它可以回答所有业务问题并保证完全正确。遇到权限不足的资料时，助手会提示无法访问并记录审计事件 [S3]。', sources: [
    { id: 'S1', title: '知识助手版本记录', text: '当前版本支持内部制度、项目文档和 FAQ 的统一检索。答案可以附带来源引用，便于用户回看原始资料。' },
    { id: 'S2', title: '日志保留策略', text: '系统默认保留 30 天脱敏查询日志。日志用于质量评估，不包含原始敏感字段。' },
    { id: 'S3', title: '访问控制说明', text: '用户请求超出权限范围时，助手应提示无法访问。系统会记录审计事件以支持安全复核。' }
  ] },
  { id: 'content-002', title: '模型评估周报摘要', content: '本周评估覆盖 180 条问答样本和 60 条摘要样本 [S1]。结构化 Prompt 的 JSON 合规率达到 96.7%，比基础版本高 14.2 个百分点 [S2]。所有测试样本都没有任何幻觉风险。平均响应延迟约为 1.8 秒 [S3]。', sources: [
    { id: 'S1', title: '评测样本统计', text: '本周评测集包含 180 条问答样本、60 条摘要样本和 30 条分类样本。' },
    { id: 'S2', title: 'Prompt 对比结果', text: '结构化 Prompt 的 JSON 合规率为 96.7%，基础版本为 82.5%，差值为 14.2 个百分点。' },
    { id: 'S3', title: '服务性能记录', text: '评估期间平均响应延迟为 1.8 秒，P95 延迟为 3.4 秒。' }
  ] },
  { id: 'content-003', title: 'AI 客服流程说明', content: 'AI 客服会先识别用户意图，再查询知识库和历史工单 [S1]。当问题涉及账号、合同或个人信息时，系统会要求用户完成身份校验 [S2]。如果知识库没有命中，AI 客服会自动编写最终答复。复杂问题可以转人工，并保留上下文摘要 [S3]。', sources: [
    { id: 'S1', title: '客服意图识别流程', text: '客服流程包括意图识别、知识库检索、历史工单查询和结果生成。' },
    { id: 'S2', title: '敏感信息处理规范', text: '账号、合同和个人信息相关问题需要先完成身份校验，未通过时不能输出敏感内容。' },
    { id: 'S3', title: '人工转接规则', text: '复杂问题或低置信度问题可以转人工。系统应保留对话上下文摘要，帮助人工继续处理。' }
  ] }
];

const ABSOLUTE_TERMS = ['所有', '任何', '完全', '永远', '一定', '保证', '零错误', '没有任何'];
const STOPWORDS = new Set(['的', '了', '和', '与', '或', '在', '是', '为', '并', '会', '可', '可以', '当']);
const ISSUE_LABELS = { missing_citation: '缺少来源引用', number_without_source: '数字缺少来源', absolute_language: '绝对化表达', weak_source_match: '来源匹配不足', unknown_source: '未知引用 ID' };
const STORAGE_KEYS = { sample: 'content-qa.selected-sample.v5', dispositions: 'content-qa.dispositions.v5' };

function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function refreshIcons() { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } }); }
let toastTimer;
function showToast(message) { const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200); }
function storageGet(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
function storageSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional local state */ } }
function pct(value) { return `${Math.round(Number(value || 0) * 100)}%`; }

function tokenize(text) { return new Set((String(text).toLowerCase().match(/[a-zA-Z0-9_]+|[\u4e00-\u9fff]/g) || []).filter(token => !STOPWORDS.has(token))); }
function splitClaims(content) { return String(content).split(/(?<=[。！？!?])\s*/).map(part => part.trim()).filter(part => part.length >= 8); }
function citationIds(claim) { return [...String(claim).matchAll(/\[([A-Za-z0-9_-]+)\]/g)].map(match => match[1]); }
function supportScore(claim, sources) {
  const claimTokens = tokenize(String(claim).replace(/\[[^\]]+\]/g, ''));
  if (!claimTokens.size || !sources.length) return 0;
  const sourceTokens = new Set(); sources.forEach(source => tokenize(`${source.title} ${source.text}`).forEach(token => sourceTokens.add(token)));
  return Number(([...claimTokens].filter(token => sourceTokens.has(token)).length / claimTokens.size).toFixed(4));
}

function auditClaim(sample, claim, index) {
  const citations = citationIds(claim);
  const sourceMap = new Map(sample.sources.map(source => [source.id, source]));
  const sources = citations.map(id => sourceMap.get(id)).filter(Boolean);
  const support = supportScore(claim, sources);
  const issues = [];
  if (!citations.length) issues.push({ severity: 'medium', type: 'missing_citation', message: '声明缺少来源引用。' });
  if (/\d+(?:\.\d+)?%?|\d+\s*(?:天|秒|条|个|次)/.test(claim) && !citations.length) issues.push({ severity: 'high', type: 'number_without_source', message: '数字声明需要可追溯来源。' });
  if (ABSOLUTE_TERMS.some(term => claim.includes(term))) issues.push({ severity: 'medium', type: 'absolute_language', message: '存在绝对化表达，建议改为有边界的描述。' });
  if (citations.length && support < .2) issues.push({ severity: 'medium', type: 'weak_source_match', message: '引用来源与声明匹配不足。' });
  if (citations.length && sources.length !== citations.length) issues.push({ severity: 'high', type: 'unknown_source', message: '存在无法匹配的引用 ID。' });
  const severity = issues.some(issue => issue.severity === 'high') ? 'high' : issues.length ? 'medium' : 'ok';
  return { index, claim, citations, sources, support, issues, severity };
}

function auditSample(sample) {
  const claims = splitClaims(sample.content).map((claim, index) => auditClaim(sample, claim, index));
  const citedCount = claims.filter(claim => claim.citations.length).length;
  const issueCount = claims.reduce((sum, claim) => sum + claim.issues.length, 0);
  const highCount = claims.reduce((sum, claim) => sum + claim.issues.filter(issue => issue.severity === 'high').length, 0);
  const averageSupport = claims.reduce((sum, claim) => sum + claim.support, 0) / Math.max(citedCount, 1);
  const risk = highCount ? 'high' : issueCount >= 2 ? 'medium' : issueCount ? 'low' : 'ok';
  return { sample, claims, metrics: { claimCount: claims.length, citationCoverage: citedCount / Math.max(claims.length, 1), averageSupport, issueCount, highCount, risk } };
}

const AUDITS = SAMPLES.map(auditSample);
const ALL_CLAIMS = AUDITS.flatMap(audit => audit.claims.map(claim => ({ ...claim, sampleId: audit.sample.id, sampleTitle: audit.sample.title })));
const ALL_ISSUES = ALL_CLAIMS.flatMap(claim => claim.issues.map(issue => ({ ...issue, sampleId: claim.sampleId, claim: claim.claim, claimIndex: claim.index })));
function riskLabel(risk) { return ({ high: '高风险', medium: '中风险', low: '低风险', ok: '通过' })[risk]; }
function riskClass(risk) { return risk === 'high' ? 'danger' : risk === 'medium' || risk === 'low' ? 'warning' : ''; }
function selectedSample() { const stored = storageGet(STORAGE_KEYS.sample, SAMPLES[0].id); return SAMPLES.find(sample => sample.id === stored) || SAMPLES[0]; }
function selectSample(sampleId) { storageSet(STORAGE_KEYS.sample, sampleId); }

function sizeCanvas(canvas) { const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return null; const ratio = window.devicePixelRatio || 1; canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio); const context = canvas.getContext('2d'); context.setTransform(ratio, 0, 0, ratio, 0, 0); return { context, width: rect.width, height: rect.height }; }
function drawGrid(context, width, height, left, right, top, bottom) { const plotHeight = height - top - bottom; [0, 25, 50, 75, 100].forEach(value => { const y = top + plotHeight - plotHeight * value / 100; context.strokeStyle = '#e3e9e6'; context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke(); context.fillStyle = '#89958f'; context.font = '8px Segoe UI'; context.textAlign = 'right'; context.fillText(String(value), left - 7, y + 3); }); }
function drawQualityChart() {
  const canvas = document.getElementById('qualityChart'); if (!canvas) return; const sized = sizeCanvas(canvas); if (!sized) return;
  const { context, width, height } = sized, left = 38, right = 22, top = 28, bottom = 48, plotWidth = width - left - right, plotHeight = height - top - bottom;
  context.clearRect(0, 0, width, height); drawGrid(context, width, height, left, right, top, bottom); const cell = plotWidth / AUDITS.length;
  AUDITS.forEach((audit, index) => { const center = left + cell * (index + .5), barWidth = Math.min(54, cell * .36), barHeight = plotHeight * audit.metrics.averageSupport; context.fillStyle = audit.metrics.risk === 'medium' ? '#b87818' : '#1f715e'; context.fillRect(center - barWidth / 2, top + plotHeight - barHeight, barWidth, barHeight); const dotY = top + plotHeight - plotHeight * audit.metrics.citationCoverage; context.fillStyle = '#47749d'; context.beginPath(); context.arc(center, dotY, 4, 0, Math.PI * 2); context.fill(); context.fillStyle = '#6b7874'; context.font = '8px Segoe UI'; context.textAlign = 'center'; context.fillText(audit.sample.id, center, top + plotHeight + 20); context.fillStyle = '#17201f'; context.font = '700 9px Segoe UI'; context.fillText(`${pct(audit.metrics.averageSupport)} / ${pct(audit.metrics.citationCoverage)}`, center, top + plotHeight + 35); });
}

function initDashboard() {
  const riskFilter = document.getElementById('dashboardRisk'); if (!riskFilter) return;
  const aggregate = { claimCount: ALL_CLAIMS.length, coverage: AUDITS.reduce((sum, audit) => sum + audit.metrics.citationCoverage, 0) / AUDITS.length, support: AUDITS.reduce((sum, audit) => sum + audit.metrics.averageSupport, 0) / AUDITS.length, issues: ALL_ISSUES.length };
  document.getElementById('sampleCountMetric').textContent = SAMPLES.length; document.getElementById('claimCountMetric').textContent = aggregate.claimCount; document.getElementById('coverageMetric').textContent = pct(aggregate.coverage); document.getElementById('supportMetric').textContent = pct(aggregate.support); document.getElementById('issueCountMetric').textContent = aggregate.issues;
  const issueControl = Math.max(0, 1 - aggregate.issues / aggregate.claimCount), readiness = Math.round((aggregate.coverage * .4 + aggregate.support * .4 + issueControl * .2) * 100);
  document.getElementById('readinessScore').textContent = readiness; const status = document.getElementById('readinessStatus'); status.textContent = readiness >= 85 ? 'READY' : 'REVIEW'; status.className = `status-chip ${readiness >= 85 ? '' : 'warning'}`;
  document.getElementById('qualityBars').innerHTML = [['引用覆盖', aggregate.coverage * 100], ['来源支持', aggregate.support * 100], ['问题控制', issueControl * 100]].map(([label, value]) => `<div class="quality-bar"><header><span>${label}</span><b>${Math.round(value)}</b></header><div class="quality-track"><i style="width:${value}%"></i></div></div>`).join('');
  document.getElementById('readinessNote').textContent = '三份内容均存在无引用声明；两处绝对化表达需要发布前改写。';

  function renderSamples() { const data = AUDITS.filter(audit => riskFilter.value === 'all' || audit.metrics.risk === riskFilter.value); document.getElementById('dashboardResultCount').textContent = `${data.length} ITEMS`; document.getElementById('dashboardSamples').innerHTML = data.length ? data.map(audit => `<article class="sample-row"><span class="sample-main"><strong>${escapeHtml(audit.sample.title)}</strong><small>${escapeHtml(audit.sample.content)}</small></span><span class="sample-stat"><span>风险</span><strong>${riskLabel(audit.metrics.risk)}</strong></span><span class="sample-stat"><span>声明</span><strong>${audit.metrics.claimCount}</strong></span><span class="sample-stat"><span>覆盖</span><strong>${pct(audit.metrics.citationCoverage)}</strong></span><span class="sample-stat"><span>问题</span><strong>${audit.metrics.issueCount}</strong></span><a class="row-link" href="review.html?sample=${encodeURIComponent(audit.sample.id)}" aria-label="复核 ${escapeHtml(audit.sample.title)}"><i data-lucide="arrow-up-right"></i></a></article>`).join('') : '<div class="empty-state">没有匹配的内容样本。</div>'; refreshIcons(); }
  const issueCounts = ALL_ISSUES.reduce((map, issue) => map.set(issue.type, (map.get(issue.type) || 0) + 1), new Map());
  document.getElementById('ruleSignals').innerHTML = [...issueCounts.entries()].map(([type, count]) => `<div class="rule-row"><span class="rule-icon"><i data-lucide="${type === 'absolute_language' ? 'message-square-warning' : 'link-2-off'}"></i></span><span><strong>${ISSUE_LABELS[type]}</strong><small>${type}</small></span><b>${count}</b></div>`).join('');
  document.getElementById('sourceHealth').innerHTML = AUDITS.map(audit => `<div class="source-health-row"><span><strong>${escapeHtml(audit.sample.title)}</strong></span><span class="mini-track"><i style="width:${audit.metrics.averageSupport * 100}%"></i></span><b>${pct(audit.metrics.averageSupport)}</b></div>`).join('');
  riskFilter.addEventListener('change', renderSamples); document.getElementById('refreshDashboard').addEventListener('click', () => showToast('质量数据已刷新。')); window.addEventListener('resize', drawQualityChart); renderSamples(); drawQualityChart(); refreshIcons();
}

function getDispositions() { const value = storageGet(STORAGE_KEYS.dispositions, {}); return value && typeof value === 'object' ? value : {}; }
function dispositionLabel(value) { return ({ pending: '待处理', approved: '已通过', revision: '需修改' })[value] || '待处理'; }
function initReview() {
  const sampleSelect = document.getElementById('reviewSampleSelect'); if (!sampleSelect) return;
  const querySample = new URLSearchParams(location.search).get('sample'); if (SAMPLES.some(sample => sample.id === querySample)) selectSample(querySample);
  sampleSelect.innerHTML = SAMPLES.map(sample => `<option value="${sample.id}">${escapeHtml(sample.title)} · ${sample.id}</option>`).join(''); sampleSelect.value = selectedSample().id;
  let activeClaimIndex = 0;
  function renderInspector(audit, claim) {
    const dispositions = getDispositions(), key = `${audit.sample.id}-${claim.index}`, disposition = dispositions[key] || 'pending';
    document.getElementById('claimInspectorTitle').textContent = `声明 ${String(claim.index + 1).padStart(2, '0')}`; const badge = document.getElementById('claimInspectorStatus'); badge.textContent = claim.severity === 'ok' ? 'SUPPORTED' : 'REVIEW'; badge.className = `status-chip ${claim.severity === 'ok' ? '' : claim.severity === 'high' ? 'danger' : 'warning'}`;
    const evidence = claim.sources.length ? claim.sources.map(source => `${source.id} · ${source.title}：${source.text}`).join('\n') : '当前声明没有关联来源。';
    document.getElementById('claimInspector').innerHTML = `<p class="claim-text">${escapeHtml(claim.claim)}</p><div class="inspector-grid"><div><span>CITATIONS</span><strong>${claim.citations.length ? claim.citations.join(', ') : 'NONE'}</strong></div><div><span>SUPPORT</span><strong>${pct(claim.support)}</strong></div><div><span>ISSUES</span><strong>${claim.issues.length}</strong></div><div><span>RISK</span><strong>${claim.severity.toUpperCase()}</strong></div></div><div class="inspector-sections"><div class="inspector-block"><h3>规则诊断</h3><div class="issue-tags">${claim.issues.length ? claim.issues.map(issue => `<span class="issue-tag">${escapeHtml(issue.message)}</span>`).join('') : '<span class="issue-tag ok">未发现规则问题</span>'}</div></div><div class="inspector-block"><h3>来源证据</h3><p>${escapeHtml(evidence)}</p></div></div><div class="disposition-control"><span>人工处置：<strong>${dispositionLabel(disposition)}</strong></span><div class="segmented" aria-label="声明处置"><button class="${disposition === 'pending' ? 'active' : ''}" type="button" data-disposition="pending">待处理</button><button class="${disposition === 'approved' ? 'active' : ''}" type="button" data-disposition="approved">通过</button><button class="${disposition === 'revision' ? 'active' : ''}" type="button" data-disposition="revision">需修改</button></div></div>`;
  }
  function render() {
    const sample = SAMPLES.find(item => item.id === sampleSelect.value) || SAMPLES[0], audit = auditSample(sample); selectSample(sample.id); if (!audit.claims[activeClaimIndex]) activeClaimIndex = 0;
    document.getElementById('reviewSubtitle').textContent = `${audit.metrics.claimCount} 条声明 · ${sample.sources.length} 份来源 · ${audit.metrics.issueCount} 个规则问题`; document.getElementById('reviewSampleId').textContent = sample.id; document.getElementById('reviewSampleTitle').textContent = sample.title; const risk = document.getElementById('reviewRisk'); risk.textContent = riskLabel(audit.metrics.risk); risk.className = `status-chip ${riskClass(audit.metrics.risk)}`;
    document.getElementById('reviewClaimCount').textContent = audit.metrics.claimCount; document.getElementById('reviewCoverage').textContent = pct(audit.metrics.citationCoverage); document.getElementById('reviewSupport').textContent = pct(audit.metrics.averageSupport); document.getElementById('reviewIssueCount').textContent = audit.metrics.issueCount; document.getElementById('documentLength').textContent = `${sample.content.length} CHARS`; document.getElementById('claimQueueCount').textContent = `${audit.claims.length} CLAIMS`;
    document.getElementById('documentContent').innerHTML = audit.claims.map(claim => `<span class="document-sentence ${claim.issues.length ? 'issue' : ''} ${claim.index === activeClaimIndex ? 'active' : ''}"><span class="sentence-index">${String(claim.index + 1).padStart(2, '0')}</span>${escapeHtml(claim.claim)}</span>`).join('');
    const dispositions = getDispositions(); document.getElementById('claimQueue').innerHTML = audit.claims.map(claim => { const disposition = dispositions[`${sample.id}-${claim.index}`] || 'pending'; return `<button class="claim-item ${claim.issues.length ? 'has-issue' : ''} ${claim.index === activeClaimIndex ? 'active' : ''}" type="button" data-claim="${claim.index}"><span class="claim-index">${String(claim.index + 1).padStart(2, '0')}</span><span class="claim-copy"><strong>${escapeHtml(claim.claim)}</strong><small>${claim.citations.length ? claim.citations.join(', ') : 'NO CITATION'} · ${pct(claim.support)}</small></span><span class="claim-disposition">${dispositionLabel(disposition)}</span></button>`; }).join('');
    renderInspector(audit, audit.claims[activeClaimIndex]); refreshIcons();
  }
  sampleSelect.addEventListener('change', () => { activeClaimIndex = 0; render(); }); document.getElementById('claimQueue').addEventListener('click', event => { const item = event.target.closest('[data-claim]'); if (!item) return; activeClaimIndex = Number(item.dataset.claim); render(); }); document.getElementById('claimInspector').addEventListener('click', event => { const button = event.target.closest('[data-disposition]'); if (!button) return; const sample = SAMPLES.find(item => item.id === sampleSelect.value), dispositions = getDispositions(); dispositions[`${sample.id}-${activeClaimIndex}`] = button.dataset.disposition; storageSet(STORAGE_KEYS.dispositions, dispositions); render(); showToast(`声明已标记为${dispositionLabel(button.dataset.disposition)}。`); }); document.getElementById('resetDispositions').addEventListener('click', () => { storageSet(STORAGE_KEYS.dispositions, {}); render(); showToast('人工处置已重置。'); }); render();
}

function flattenSources() { return SAMPLES.flatMap(sample => sample.sources.map(source => ({ ...source, key: `${sample.id}-${source.id}`, sampleId: sample.id, sampleTitle: sample.title }))); }
function initSources() {
  const sourceList = document.getElementById('sourceList'); if (!sourceList) return; const search = document.getElementById('sourceSearch'), filter = document.getElementById('sourceSampleFilter'), sources = flattenSources(); let activeKey = sources[0].key;
  filter.innerHTML += SAMPLES.map(sample => `<option value="${sample.id}">${escapeHtml(sample.title)}</option>`).join(''); document.getElementById('sourceCountMetric').textContent = sources.length; document.getElementById('citedSourceMetric').textContent = new Set(ALL_CLAIMS.flatMap(claim => claim.citations.map(id => `${claim.sampleId}-${id}`))).size; document.getElementById('sourceSupportMetric').textContent = pct(AUDITS.reduce((sum, audit) => sum + audit.metrics.averageSupport, 0) / AUDITS.length); document.getElementById('uncitedClaimMetric').textContent = ALL_CLAIMS.filter(claim => !claim.citations.length).length;
  function linkedClaims(source) { return ALL_CLAIMS.filter(claim => claim.sampleId === source.sampleId && claim.citations.includes(source.id)); }
  function renderDetail(source) { if (!source) { document.getElementById('sourceDetail').innerHTML = '<div class="empty-state">没有匹配的来源。</div>'; return; } const claims = linkedClaims(source), support = claims.length ? claims.reduce((sum, claim) => sum + claim.support, 0) / claims.length : 0; document.getElementById('sourceDetailTitle').textContent = source.title; const badge = document.getElementById('sourceDetailStatus'); badge.textContent = claims.length ? 'CITED' : 'UNUSED'; badge.className = `status-chip ${claims.length ? '' : 'warning'}`; document.getElementById('sourceDetail').innerHTML = `<div class="source-detail"><div class="source-meta-grid"><div><span>SOURCE ID</span><strong>${source.id}</strong></div><div><span>REFERENCES</span><strong>${claims.length}</strong></div><div><span>AVG SUPPORT</span><strong>${pct(support)}</strong></div></div><p class="source-body">${escapeHtml(source.text)}</p><div class="linked-claims">${claims.length ? claims.map(claim => `<div class="linked-claim"><strong>声明 ${claim.index + 1}</strong> · ${escapeHtml(claim.claim)}</div>`).join('') : '<div class="empty-state">当前没有声明引用此来源。</div>'}</div></div>`; }
  function render() { const query = search.value.trim().toLowerCase(), data = sources.filter(source => (filter.value === 'all' || source.sampleId === filter.value) && (!query || `${source.id} ${source.title} ${source.text}`.toLowerCase().includes(query))); if (!data.some(source => source.key === activeKey)) activeKey = data[0]?.key || null; document.getElementById('sourceResultCount').textContent = `${data.length} SOURCES`; sourceList.innerHTML = data.length ? data.map(source => `<button class="source-item ${source.key === activeKey ? 'active' : ''}" type="button" data-source="${source.key}"><span class="source-symbol"><i data-lucide="file-text"></i></span><span class="source-copy"><strong>${source.id} · ${escapeHtml(source.title)}</strong><small>${escapeHtml(source.sampleTitle)}</small></span><span class="source-ref">${linkedClaims(source).length} REF</span></button>`).join('') : '<div class="empty-state">没有匹配的来源文档。</div>'; renderDetail(data.find(source => source.key === activeKey)); refreshIcons(); }
  document.getElementById('evidenceRows').innerHTML = ALL_CLAIMS.map(claim => `<tr><td class="claim-cell"><strong>${escapeHtml(claim.sampleTitle)}</strong><small>${escapeHtml(claim.claim)}</small></td><td>${claim.citations.length ? claim.citations.join(', ') : 'NONE'}</td><td class="score-value">${pct(claim.support)}</td><td>${claim.issues.length}</td><td><span class="status-chip ${claim.severity === 'ok' ? '' : 'warning'}">${claim.severity === 'ok' ? 'SUPPORTED' : 'REVIEW'}</span></td></tr>`).join(''); sourceList.addEventListener('click', event => { const item = event.target.closest('[data-source]'); if (!item) return; activeKey = item.dataset.source; render(); }); search.addEventListener('input', render); filter.addEventListener('change', render); render();
}

function releaseGate(audit) {
  const gates = [
    { label: '引用覆盖率不低于 75%', value: pct(audit.metrics.citationCoverage), passed: audit.metrics.citationCoverage >= .75 },
    { label: '来源支持度不低于 75%', value: pct(audit.metrics.averageSupport), passed: audit.metrics.averageSupport >= .75 },
    { label: '高危问题必须为 0', value: audit.metrics.highCount, passed: audit.metrics.highCount === 0 },
    { label: '问题总数不超过 1', value: audit.metrics.issueCount, passed: audit.metrics.issueCount <= 1 }
  ];
  const score = Math.round((audit.metrics.citationCoverage * .25 + audit.metrics.averageSupport * .35 + (audit.metrics.highCount ? 0 : .2) + (audit.metrics.issueCount <= 1 ? .2 : 0)) * 100);
  return { gates, passed: gates.every(gate => gate.passed), score };
}

function initReport() {
  const select = document.getElementById('reportSampleSelect'); if (!select) return; select.innerHTML = SAMPLES.map(sample => `<option value="${sample.id}">${escapeHtml(sample.title)} · ${sample.id}</option>`).join(''); select.value = selectedSample().id; let currentAudit;
  function recommendations(audit) { const types = new Set(audit.claims.flatMap(claim => claim.issues.map(issue => issue.type))); const items = []; if (types.has('missing_citation')) items.push(['补齐引用', '为无来源声明关联可追溯材料；无法补证时删除或明确标注推测。']); if (types.has('absolute_language')) items.push(['收敛表达边界', '将“所有、完全、保证”等表达改为限定适用范围和验证条件的描述。']); if (!items.length) items.push(['保留审核记录', '当前内容已满足规则门禁，发布时保留来源与审核版本。']); if (audit.metrics.citationCoverage < 1) items.push(['提升覆盖率', '继续为未引用声明补齐证据，使引用覆盖率接近 100%。']); return items.slice(0, 3); }
  function render() { currentAudit = auditSample(SAMPLES.find(sample => sample.id === select.value) || SAMPLES[0]); selectSample(currentAudit.sample.id); const gate = releaseGate(currentAudit); document.getElementById('reportSubtitle').textContent = `${currentAudit.sample.title} · ${currentAudit.sample.id}`; document.getElementById('releaseDecision').textContent = gate.passed ? 'READY FOR RELEASE' : 'HOLD FOR REVISION'; document.getElementById('releaseDecisionCopy').textContent = gate.passed ? '规则门禁通过，可进入发布流程。' : '存在未通过的质量门禁，需修改后重新审核。'; document.getElementById('releaseScore').textContent = gate.score; document.getElementById('reportCoverage').textContent = pct(currentAudit.metrics.citationCoverage); document.getElementById('reportSupport').textContent = pct(currentAudit.metrics.averageSupport); document.getElementById('reportHighIssues').textContent = currentAudit.metrics.highCount; document.getElementById('reportIssues').textContent = currentAudit.metrics.issueCount; const status = document.getElementById('gateStatus'); status.textContent = gate.passed ? 'PASS' : 'REVIEW'; status.className = `status-chip ${gate.passed ? '' : 'warning'}`; document.getElementById('gateList').innerHTML = gate.gates.map(item => `<div class="gate-row ${item.passed ? '' : 'failed'}"><i data-lucide="${item.passed ? 'circle-check' : 'circle-x'}"></i><span>${item.label}</span><b>${item.value}</b></div>`).join(''); const counts = currentAudit.claims.flatMap(claim => claim.issues).reduce((map, issue) => map.set(issue.type, (map.get(issue.type) || 0) + 1), new Map()); document.getElementById('issueBreakdownCount').textContent = `${currentAudit.metrics.issueCount} ISSUES`; document.getElementById('issueBreakdown').innerHTML = counts.size ? [...counts.entries()].map(([type, count]) => `<div class="breakdown-row"><header><span>${ISSUE_LABELS[type]}</span><b>${count}</b></header><div class="breakdown-track"><i style="width:${count / currentAudit.metrics.issueCount * 100}%"></i></div></div>`).join('') : '<div class="empty-state">当前内容没有规则问题。</div>'; document.getElementById('reportRecommendations').innerHTML = recommendations(currentAudit).map(([title, copy], index) => `<article class="recommendation-item"><span>0${index + 1}</span><h3>${title}</h3><p>${copy}</p></article>`).join(''); refreshIcons(); }
  document.getElementById('comparisonRows').innerHTML = AUDITS.map(audit => { const gate = releaseGate(audit); return `<tr><td class="claim-cell"><strong>${escapeHtml(audit.sample.title)}</strong><small>${audit.sample.id}</small></td><td><span class="status-chip ${riskClass(audit.metrics.risk)}">${riskLabel(audit.metrics.risk)}</span></td><td>${audit.metrics.claimCount}</td><td>${pct(audit.metrics.citationCoverage)}</td><td>${pct(audit.metrics.averageSupport)}</td><td>${audit.metrics.issueCount}</td><td><span class="status-chip ${gate.passed ? '' : 'warning'}">${gate.passed ? 'PASS' : 'HOLD'}</span></td></tr>`; }).join(''); select.addEventListener('change', render); document.getElementById('exportReportJson').addEventListener('click', () => downloadFile(`${currentAudit.sample.id}-qa-report.json`, JSON.stringify(reportPayload(currentAudit), null, 2), 'application/json')); document.getElementById('exportReportMarkdown').addEventListener('click', () => downloadFile(`${currentAudit.sample.id}-qa-report.md`, reportMarkdown(currentAudit), 'text/markdown')); render();
}

function reportPayload(audit) { return { generatedAt: new Date().toISOString(), sample: { id: audit.sample.id, title: audit.sample.title }, metrics: audit.metrics, gate: releaseGate(audit), claims: audit.claims.map(claim => ({ claim: claim.claim, citations: claim.citations, support: claim.support, severity: claim.severity, issues: claim.issues })) }; }
function reportMarkdown(audit) { const payload = reportPayload(audit); return ['# AI Content QA Report', '', `- Generated: ${payload.generatedAt}`, `- Sample: ${payload.sample.title} (${payload.sample.id})`, `- Decision: ${payload.gate.passed ? 'PASS' : 'HOLD'}`, `- Score: ${payload.gate.score}`, '', '| Metric | Value |', '| --- | ---: |', `| Citation coverage | ${pct(payload.metrics.citationCoverage)} |`, `| Average support | ${pct(payload.metrics.averageSupport)} |`, `| High issues | ${payload.metrics.highCount} |`, `| Total issues | ${payload.metrics.issueCount} |`, '', '## Claims', '', ...payload.claims.map((claim, index) => `${index + 1}. ${claim.claim}  \n   - Citations: ${claim.citations.join(', ') || 'none'}  \n   - Support: ${pct(claim.support)}  \n   - Issues: ${claim.issues.map(issue => issue.message).join(' / ') || 'none'}`)].join('\n'); }
function downloadFile(filename, content, type) { const blob = new Blob([content], { type: `${type};charset=utf-8` }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href); showToast(`${filename} 已导出。`); }

document.addEventListener('DOMContentLoaded', () => { refreshIcons(); window.addEventListener('load', refreshIcons, { once: true }); initDashboard(); initReview(); initSources(); initReport(); });
