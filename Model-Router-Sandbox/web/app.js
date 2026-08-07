(() => {
  "use strict";

  const MODELS = [
    { id: "fast-mini", name: "Fast Mini", provider: "cloud", privacy_mode: "standard", context_window: 64000, latency_ms_p95: 900, input_cost_per_1k: 0.00015, output_cost_per_1k: 0.0006, safety_score: 0.78, quality: { classification: 0.86, extraction: 0.82, summarization: 0.78, reasoning: 0.66, content_qa: 0.72 } },
    { id: "balanced-pro", name: "Balanced Pro", provider: "cloud", privacy_mode: "enterprise", context_window: 128000, latency_ms_p95: 1800, input_cost_per_1k: 0.0012, output_cost_per_1k: 0.0048, safety_score: 0.88, quality: { classification: 0.91, extraction: 0.9, summarization: 0.89, reasoning: 0.84, content_qa: 0.87 } },
    { id: "deep-reasoner", name: "Deep Reasoner", provider: "cloud", privacy_mode: "enterprise", context_window: 96000, latency_ms_p95: 4200, input_cost_per_1k: 0.004, output_cost_per_1k: 0.016, safety_score: 0.93, quality: { classification: 0.9, extraction: 0.88, summarization: 0.9, reasoning: 0.95, content_qa: 0.92 } },
    { id: "long-context", name: "Long Context", provider: "cloud", privacy_mode: "enterprise", context_window: 512000, latency_ms_p95: 3600, input_cost_per_1k: 0.002, output_cost_per_1k: 0.006, safety_score: 0.86, quality: { classification: 0.86, extraction: 0.88, summarization: 0.92, reasoning: 0.82, content_qa: 0.84 } },
    { id: "local-private", name: "Local Private", provider: "local", privacy_mode: "private", context_window: 32000, latency_ms_p95: 2600, input_cost_per_1k: 0.00005, output_cost_per_1k: 0.0002, safety_score: 0.74, quality: { classification: 0.8, extraction: 0.76, summarization: 0.73, reasoning: 0.62, content_qa: 0.7 } }
  ];

  const TASKS = [
    { id: "task-001", name: "客服工单意图分类", task_type: "classification", risk_level: "low", context_tokens: 1800, expected_output_tokens: 120, latency_budget_ms: 1500, max_budget_usd: 0.003, privacy: "standard", min_quality: 0.78 },
    { id: "task-002", name: "合同条款 JSON 抽取", task_type: "extraction", risk_level: "high", context_tokens: 22000, expected_output_tokens: 900, latency_budget_ms: 3500, max_budget_usd: 0.08, privacy: "restricted", min_quality: 0.86 },
    { id: "task-003", name: "长文档摘要", task_type: "summarization", risk_level: "medium", context_tokens: 180000, expected_output_tokens: 1400, latency_budget_ms: 5200, max_budget_usd: 0.42, privacy: "enterprise", min_quality: 0.84 },
    { id: "task-004", name: "复杂方案推理", task_type: "reasoning", risk_level: "high", context_tokens: 16000, expected_output_tokens: 1800, latency_budget_ms: 6000, max_budget_usd: 0.18, privacy: "enterprise", min_quality: 0.9 },
    { id: "task-005", name: "发布内容风险质检", task_type: "content_qa", risk_level: "medium", context_tokens: 9000, expected_output_tokens: 900, latency_budget_ms: 3000, max_budget_usd: 0.06, privacy: "enterprise", min_quality: 0.82 }
  ];

  const PRIVACY_RANK = { standard: 1, enterprise: 2, private: 3 };
  const RISK_RANK = { low: 1, medium: 2, high: 3 };
  const SCORE_LABELS = { quality: "任务质量", safety: "安全稳定", latency: "响应延迟", cost: "调用成本", context: "上下文余量" };
  const QUALITY_LABELS = { classification: "分类", extraction: "抽取", summarization: "摘要", reasoning: "推理", content_qa: "内容质检" };

  function defaultWeights(task) {
    return RISK_RANK[task.risk_level] >= 3
      ? { quality: 0.42, safety: 0.28, latency: 0.1, cost: 0.1, context: 0.1 }
      : { quality: 0.4, safety: 0.18, latency: 0.18, cost: 0.17, context: 0.07 };
  }

  function estimateCost(model, task) {
    const input = task.context_tokens / 1000 * model.input_cost_per_1k;
    const output = task.expected_output_tokens / 1000 * model.output_cost_per_1k;
    return Number((input + output).toFixed(6));
  }

  function effectiveTask(task, options = {}) {
    return {
      ...task,
      max_budget_usd: task.max_budget_usd * (options.budgetMultiplier ?? 1),
      min_quality: Math.max(0, Math.min(1, task.min_quality + (options.qualityAdjustment ?? 0)))
    };
  }

  function constraintReasons(model, task) {
    const reasons = [];
    const requiredPrivacy = task.privacy === "restricted" ? "private" : task.privacy;
    if (PRIVACY_RANK[model.privacy_mode] < PRIVACY_RANK[requiredPrivacy]) reasons.push("隐私模式不足");
    if (model.context_window < task.context_tokens) reasons.push("上下文窗口不足");
    if (estimateCost(model, task) > task.max_budget_usd) reasons.push("超过预算上限");
    if ((model.quality[task.task_type] ?? 0) < task.min_quality) reasons.push("任务质量低于要求");
    return reasons;
  }

  function buildReasons(model, task, qualityScore, cost, latencyScore) {
    const reasons = [`${task.task_type} 质量分 ${qualityScore.toFixed(2)}。`];
    if (["enterprise", "private"].includes(model.privacy_mode)) reasons.push(`满足 ${task.privacy} 隐私要求。`);
    if (model.context_window >= task.context_tokens * 2) reasons.push("上下文窗口余量充足。");
    if (cost <= task.max_budget_usd * 0.5) reasons.push("成本低于预算的一半。");
    if (latencyScore >= 1) reasons.push("P95 延迟满足任务预算。");
    if (RISK_RANK[task.risk_level] >= 3 && model.safety_score >= 0.9) reasons.push("高风险任务优先选择安全分更高的模型。");
    return reasons;
  }

  function scoreModel(model, task, weights = defaultWeights(task)) {
    const qualityScore = model.quality[task.task_type] ?? 0;
    const cost = estimateCost(model, task);
    const latencyScore = Math.min(task.latency_budget_ms / Math.max(model.latency_ms_p95, 1), 1);
    const costScore = Math.min(task.max_budget_usd / Math.max(cost, 0.000001), 1);
    const contextScore = Math.min(model.context_window / Math.max(task.context_tokens, 1), 4) / 4;
    const breakdown = {
      quality_score: qualityScore,
      safety_score: model.safety_score,
      latency_score: latencyScore,
      cost_score: costScore,
      context_score: contextScore
    };
    const total = qualityScore * weights.quality
      + model.safety_score * weights.safety
      + latencyScore * weights.latency
      + costScore * weights.cost
      + contextScore * weights.context;
    return {
      model_id: model.id,
      model_name: model.name,
      provider: model.provider,
      privacy_mode: model.privacy_mode,
      estimated_cost_usd: cost,
      latency_ms_p95: model.latency_ms_p95,
      score: Number(total.toFixed(4)),
      score_breakdown: Object.fromEntries(Object.entries(breakdown).map(([key, value]) => [key, Number(value.toFixed(4))])),
      reasons: buildReasons(model, task, qualityScore, cost, latencyScore)
    };
  }

  function routeTask(task, options = {}) {
    const experimentTask = effectiveTask(task, options);
    const weights = options.weights || defaultWeights(task);
    const candidates = [];
    const rejected = [];
    MODELS.forEach((model) => {
      const reasons = constraintReasons(model, experimentTask);
      if (reasons.length) rejected.push({ model_id: model.id, model_name: model.name, reasons });
      else candidates.push(scoreModel(model, experimentTask, weights));
    });
    candidates.sort((a, b) => b.score - a.score);
    return { task: experimentTask, recommended: candidates[0] || null, candidates, rejected };
  }

  function routeAll() {
    return { route_count: TASKS.length, routes: TASKS.map((task) => routeTask(task)) };
  }

  globalThis.ModelRouterCore = Object.freeze({ MODELS, TASKS, defaultWeights, estimateCost, constraintReasons, scoreModel, routeTask, routeAll });
  if (typeof document === "undefined") return;

  async function loadProjectData() {
    if (!/^https?:$/.test(globalThis.location.protocol)) return;
    try {
      const responses = await Promise.all([fetch("../data/models.json"), fetch("../data/tasks.json")]);
      if (responses.some((response) => !response.ok)) return;
      const [models, tasks] = await Promise.all(responses.map((response) => response.json()));
      if (Array.isArray(models) && models.length) MODELS.splice(0, MODELS.length, ...models);
      if (Array.isArray(tasks) && tasks.length) TASKS.splice(0, TASKS.length, ...tasks);
    } catch {
      // The embedded snapshot keeps direct file opening and offline demos functional.
    }
  }

  const $ = (id) => document.getElementById(id);
  const formatNumber = (value) => new Intl.NumberFormat("zh-CN").format(value);
  const formatCost = (value) => `$${Number(value).toFixed(value < 0.01 ? 5 : 4)}`;
  const percent = (value) => `${Math.round(value * 100)}%`;
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[char]);

  function refreshIcons() {
    if (globalThis.lucide) globalThis.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("JSON 已生成");
  }

  function taskOptions(selectedId) {
    return TASKS.map((task) => `<option value="${task.id}"${task.id === selectedId ? " selected" : ""}>${task.id} · ${escapeHtml(task.name)}</option>`).join("");
  }

  function drawRouteChart(canvas, routes) {
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    const pad = { top: 24, right: 28, bottom: 40, left: 44 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = "right";
    ctx.fillStyle = "#7a8580";
    ctx.strokeStyle = "#e5ebe7";
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      const y = pad.top + chartHeight * (1 - tick);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillText(tick.toFixed(2), pad.left - 8, y + 3);
    });
    const maxCost = Math.max(...routes.map((route) => route.recommended?.estimated_cost_usd || 0), 0.001);
    const groupWidth = chartWidth / routes.length;
    routes.forEach((route, index) => {
      const center = pad.left + groupWidth * (index + 0.5);
      const score = route.recommended?.score || 0;
      const barWidth = Math.min(34, groupWidth * 0.42);
      const barHeight = chartHeight * score;
      ctx.fillStyle = route.recommended ? "#256c50" : "#d8dfdb";
      ctx.fillRect(center - barWidth / 2, pad.top + chartHeight - barHeight, barWidth, barHeight);
      const costY = pad.top + chartHeight * (1 - (route.recommended?.estimated_cost_usd || 0) / maxCost);
      ctx.beginPath();
      ctx.fillStyle = route.recommended ? "#dc6650" : "#c8d2cc";
      ctx.arc(center, costY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#67736d";
      ctx.textAlign = "center";
      ctx.fillText(route.task.id.replace("task-", "T"), center, height - 17);
    });
  }

  function renderOverview() {
    const allRoutes = routeAll().routes;
    const routed = allRoutes.filter((route) => route.recommended);
    const averageCandidates = allRoutes.reduce((sum, route) => sum + route.candidates.length, 0) / allRoutes.length;
    const averageScore = routed.reduce((sum, route) => sum + route.recommended.score, 0) / routed.length;
    const totalCost = routed.reduce((sum, route) => sum + route.recommended.estimated_cost_usd, 0);
    $("taskCountMetric").textContent = allRoutes.length;
    $("routableMetric").textContent = `${routed.length}/${allRoutes.length}`;
    $("candidateMetric").textContent = averageCandidates.toFixed(1);
    $("winnerScoreMetric").textContent = averageScore.toFixed(4);
    $("routeCostMetric").textContent = formatCost(totalCost);

    const renderRoutes = () => {
      const status = $("routeStatusFilter").value;
      const routes = allRoutes.filter((route) => status === "all" || (status === "routed" ? route.recommended : !route.recommended));
      $("routeResultCount").textContent = `${routes.length} ROUTES`;
      $("routeList").innerHTML = routes.length ? routes.map((route) => {
        const winner = route.recommended;
        return `<article class="route-row">
          <div class="route-main"><strong>${escapeHtml(route.task.name)}</strong><small>${route.task.id} · ${route.task.task_type} · ${route.task.risk_level} risk</small></div>
          <div class="route-stat"><span>WINNER</span><strong>${winner ? escapeHtml(winner.model_name) : "无候选"}</strong></div>
          <div class="route-stat"><span>SCORE</span><strong>${winner ? winner.score.toFixed(4) : "--"}</strong></div>
          <div class="route-stat"><span>COST</span><strong>${winner ? formatCost(winner.estimated_cost_usd) : "--"}</strong></div>
          <div class="route-stat"><span>CANDIDATES</span><strong>${route.candidates.length}</strong></div>
          <a class="row-link" href="decision.html?task=${route.task.id}" title="查看决策" aria-label="查看 ${escapeHtml(route.task.name)} 的决策"><i data-lucide="arrow-up-right"></i></a>
        </article>`;
      }).join("") : '<div class="empty-state">当前筛选下没有任务</div>';
      refreshIcons();
    };
    $("routeStatusFilter").addEventListener("change", renderRoutes);
    renderRoutes();

    const coverage = routed.length / allRoutes.length;
    const allocation = new Map();
    routed.forEach((route) => allocation.set(route.recommended.model_name, (allocation.get(route.recommended.model_name) || 0) + 1));
    const diversity = allocation.size / routed.length;
    const health = Math.round(coverage * 45 + averageScore * 35 + diversity * 20);
    $("policyHealthScore").textContent = health;
    $("policyHealthStatus").textContent = health >= 85 ? "STABLE" : "REVIEW";
    $("policyHealthStatus").className = `status-chip ${health >= 85 ? "" : "warning"}`;
    $("policyHealthBars").innerHTML = [
      ["任务覆盖率", coverage],
      ["赢家置信度", averageScore],
      ["模型分散度", diversity]
    ].map(([label, value]) => `<div class="health-bar"><header><span>${label}</span><strong>${percent(value)}</strong></header><div class="health-track"><i style="width:${value * 100}%"></i></div></div>`).join("");
    const blocked = allRoutes.filter((route) => !route.recommended);
    $("policyHealthNote").textContent = blocked.length
      ? `${blocked.map((route) => route.task.id).join("、")} 因硬约束没有候选，建议检查隐私模型供给与质量门槛。`
      : "全部任务均有可执行路由，当前策略覆盖完整。";

    const maxAllocation = Math.max(...allocation.values());
    $("modelAllocation").innerHTML = [...allocation.entries()].map(([name, count]) => `<div class="allocation-row"><span class="model-symbol"><i data-lucide="box"></i></span><div><strong>${escapeHtml(name)}</strong><small>${count} 个任务</small></div><span class="mini-track"><i style="width:${count / maxAllocation * 100}%"></i></span><strong>${count}</strong></div>`).join("");
    const signals = new Map();
    allRoutes.flatMap((route) => route.rejected).flatMap((item) => item.reasons).forEach((reason) => signals.set(reason, (signals.get(reason) || 0) + 1));
    const sortedSignals = [...signals.entries()].sort((a, b) => b[1] - a[1]);
    $("rejectSignalCount").textContent = `${sortedSignals.reduce((sum, item) => sum + item[1], 0)} SIGNALS`;
    $("constraintSignals").innerHTML = sortedSignals.map(([reason, count]) => `<div class="constraint-row"><span class="constraint-icon"><i data-lucide="shield-alert"></i></span><div><strong>${reason}</strong><small>跨全部任务的硬约束命中</small></div><strong>${count}</strong></div>`).join("");
    refreshIcons();

    const canvas = $("routeChart");
    const redraw = () => drawRouteChart(canvas, allRoutes);
    redraw();
    globalThis.addEventListener("resize", redraw);
    $("refreshRoutes").addEventListener("click", () => {
      redraw();
      showToast("路由结果已刷新");
    });
  }

  function renderDecision() {
    const queryTask = new URLSearchParams(globalThis.location.search).get("task");
    const selectedId = TASKS.some((task) => task.id === queryTask) ? queryTask : TASKS[0].id;
    const select = $("decisionTaskSelect");
    select.innerHTML = taskOptions(selectedId);
    let currentRoute;

    const render = () => {
      const task = TASKS.find((item) => item.id === select.value);
      currentRoute = routeTask(task);
      const winner = currentRoute.recommended;
      $("decisionSubtitle").textContent = `${task.task_type} · ${task.risk_level} risk · ${formatNumber(task.context_tokens)} tokens · ${task.privacy}`;
      $("winnerBanner").classList.toggle("blocked", !winner);
      $("winnerName").textContent = winner?.model_name || "没有满足硬约束的模型";
      $("winnerCopy").textContent = winner ? `${winner.provider} · ${winner.privacy_mode} · ${currentRoute.candidates.length} 个候选参与排序` : "请检查过滤诊断，调整隐私供给、预算或质量门槛";
      $("winnerScore").textContent = winner ? winner.score.toFixed(4) : "BLOCKED";
      $("decisionCandidateCount").textContent = currentRoute.candidates.length;
      $("decisionCost").textContent = winner ? formatCost(winner.estimated_cost_usd) : "--";
      $("decisionLatency").textContent = winner ? `${formatNumber(winner.latency_ms_p95)} ms` : "--";
      $("decisionRejected").textContent = currentRoute.rejected.length;
      $("decisionWeightProfile").textContent = RISK_RANK[task.risk_level] >= 3 ? "HIGH-RISK PROFILE" : "STANDARD PROFILE";
      $("decisionStatus").textContent = winner ? "ROUTED" : "BLOCKED";
      $("decisionStatus").className = `status-chip ${winner ? "" : "danger"}`;

      const weights = defaultWeights(task);
      $("scoreBreakdown").innerHTML = winner ? Object.entries(weights).map(([key, weight]) => {
        const score = winner.score_breakdown[`${key}_score`];
        return `<div class="score-row"><header><span>${SCORE_LABELS[key]} · 权重 ${percent(weight)}</span><strong>${score.toFixed(4)}</strong></header><div class="score-track"><i style="width:${score * 100}%"></i></div></div>`;
      }).join("") : '<div class="empty-state">无候选模型，无法生成评分分解</div>';
      $("decisionReasons").innerHTML = winner ? winner.reasons.map((reason) => `<div class="reason-row"><i data-lucide="check-circle-2"></i><span>${escapeHtml(reason)}</span></div>`).join("") : '<div class="reason-row"><i data-lucide="circle-slash"></i><span>所有模型均被一个或多个硬约束过滤。</span></div>';
      $("candidateCountNote").textContent = `${currentRoute.candidates.length} MODELS`;
      $("candidateList").innerHTML = currentRoute.candidates.length ? currentRoute.candidates.map((candidate, index) => `<article class="candidate-row"><span class="rank-box">#${index + 1}</span><div class="candidate-main"><strong>${escapeHtml(candidate.model_name)}</strong><small>${candidate.provider} · ${candidate.privacy_mode}</small></div><div class="candidate-stat"><span>SCORE</span><strong>${candidate.score.toFixed(4)}</strong></div><div class="candidate-stat"><span>QUALITY</span><strong>${candidate.score_breakdown.quality_score.toFixed(2)}</strong></div><div class="candidate-stat"><span>COST</span><strong>${formatCost(candidate.estimated_cost_usd)}</strong></div><div class="candidate-stat"><span>P95</span><strong>${formatNumber(candidate.latency_ms_p95)} ms</strong></div></article>`).join("") : '<div class="empty-state">没有模型通过全部硬约束</div>';
      $("rejectionCountNote").textContent = `${currentRoute.rejected.length} MODELS`;
      $("rejectionGrid").innerHTML = currentRoute.rejected.length ? currentRoute.rejected.map((item) => `<article class="rejection-item"><h3>${escapeHtml(item.model_name)}</h3>${item.reasons.map((reason) => `<span class="reject-tag">${reason}</span>`).join("")}</article>`).join("") : '<div class="empty-state">所有模型均通过硬约束</div>';
      globalThis.history.replaceState(null, "", `?task=${task.id}`);
      refreshIcons();
    };
    select.addEventListener("change", render);
    $("exportDecision").addEventListener("click", () => downloadJson(`route-${select.value}.json`, currentRoute));
    render();
  }

  function modelDetailTemplate(model) {
    const qualityRows = Object.entries(model.quality).map(([key, value]) => `<div class="quality-row"><span>${QUALITY_LABELS[key]}</span><span class="quality-track"><i style="width:${value * 100}%"></i></span><strong>${value.toFixed(2)}</strong></div>`).join("");
    return `<div class="model-detail"><div class="model-meta-grid">
      <div><span>PROVIDER</span><strong>${model.provider}</strong></div><div><span>CONTEXT WINDOW</span><strong>${formatNumber(model.context_window)}</strong></div>
      <div><span>INPUT / 1K</span><strong>$${model.input_cost_per_1k}</strong></div><div><span>OUTPUT / 1K</span><strong>$${model.output_cost_per_1k}</strong></div>
      <div><span>P95 LATENCY</span><strong>${formatNumber(model.latency_ms_p95)} ms</strong></div><div><span>SAFETY SCORE</span><strong>${model.safety_score.toFixed(2)}</strong></div>
    </div><div class="quality-profile">${qualityRows}</div></div>`;
  }

  function renderModels() {
    let selectedId = MODELS[0].id;
    const search = $("modelSearch");
    const privacy = $("privacyFilter");
    $("modelCountMetric").textContent = MODELS.length;
    $("cloudCountMetric").textContent = MODELS.filter((model) => model.provider === "cloud").length;
    $("maxContextMetric").textContent = `${Math.max(...MODELS.map((model) => model.context_window)) / 1000}K`;
    $("minLatencyMetric").textContent = `${Math.min(...MODELS.map((model) => model.latency_ms_p95))} ms`;

    const renderDetail = (model) => {
      $("modelDetailTitle").textContent = model?.name || "模型详情";
      $("modelDetailPrivacy").textContent = model?.privacy_mode || "--";
      $("modelDetailPrivacy").className = `status-chip ${model?.privacy_mode === "private" ? "warning" : ""}`;
      $("modelDetail").innerHTML = model ? modelDetailTemplate(model) : '<div class="empty-state">没有匹配的模型</div>';
    };
    const render = () => {
      const term = search.value.trim().toLowerCase();
      const filtered = MODELS.filter((model) => (privacy.value === "all" || model.privacy_mode === privacy.value) && [model.name, model.id, model.provider].some((value) => value.toLowerCase().includes(term)));
      if (!filtered.some((model) => model.id === selectedId)) selectedId = filtered[0]?.id;
      $("modelResultCount").textContent = `${filtered.length} MODELS`;
      $("modelList").innerHTML = filtered.length ? filtered.map((model) => `<button class="model-item ${model.id === selectedId ? "active" : ""}" type="button" data-model-id="${model.id}"><span class="model-symbol"><i data-lucide="box"></i></span><span class="model-copy"><strong>${escapeHtml(model.name)}</strong><small>${model.provider} · ${model.privacy_mode} · ${formatNumber(model.context_window)} tokens</small></span><span class="model-latency">${formatNumber(model.latency_ms_p95)} ms</span></button>`).join("") : '<div class="empty-state">没有匹配的模型</div>';
      renderDetail(MODELS.find((model) => model.id === selectedId));
      $("capabilityRows").innerHTML = filtered.map((model) => `<tr><td><strong>${escapeHtml(model.name)}</strong></td><td>${model.quality.classification.toFixed(2)}</td><td>${model.quality.extraction.toFixed(2)}</td><td>${model.quality.summarization.toFixed(2)}</td><td>${model.quality.reasoning.toFixed(2)}</td><td>${model.quality.content_qa.toFixed(2)}</td><td>${model.safety_score.toFixed(2)}</td><td>${formatNumber(model.latency_ms_p95)} ms</td></tr>`).join("");
      document.querySelectorAll("[data-model-id]").forEach((button) => button.addEventListener("click", () => {
        selectedId = button.dataset.modelId;
        render();
      }));
      refreshIcons();
    };
    search.addEventListener("input", render);
    privacy.addEventListener("change", render);
    render();
  }

  function renderPolicy() {
    const queryTask = new URLSearchParams(globalThis.location.search).get("task");
    const selectedId = TASKS.some((task) => task.id === queryTask) ? queryTask : TASKS[0].id;
    const taskSelect = $("policyTaskSelect");
    const budgetInput = $("budgetMultiplier");
    const qualityInput = $("qualityAdjustment");
    taskSelect.innerHTML = taskOptions(selectedId);
    let weights = {};
    let experiment;

    const resetValues = () => {
      const task = TASKS.find((item) => item.id === taskSelect.value);
      weights = { ...defaultWeights(task) };
      budgetInput.value = 100;
      qualityInput.value = 0;
      renderControls();
      renderExperiment();
    };
    const renderControls = () => {
      $("weightControls").innerHTML = Object.entries(weights).map(([key, value]) => `<label class="weight-row"><span>${SCORE_LABELS[key]}</span><input type="range" min="0" max="60" step="1" value="${Math.round(value * 100)}" data-weight="${key}"><b>${Math.round(value * 100)}%</b></label>`).join("");
      document.querySelectorAll("[data-weight]").forEach((input) => input.addEventListener("input", () => {
        weights[input.dataset.weight] = Number(input.value) / 100;
        input.nextElementSibling.textContent = `${input.value}%`;
        renderExperiment();
      }));
    };
    const renderExperiment = () => {
      const task = TASKS.find((item) => item.id === taskSelect.value);
      const baseline = routeTask(task);
      const rawTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);
      const scoringWeights = rawTotal > 0
        ? Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / rawTotal]))
        : defaultWeights(task);
      const budgetMultiplier = Number(budgetInput.value) / 100;
      const qualityAdjustment = Number(qualityInput.value) / 100;
      experiment = routeTask(task, { weights: scoringWeights, budgetMultiplier, qualityAdjustment });
      const winner = experiment.recommended;
      $("weightTotal").textContent = `${Math.round(rawTotal * 100)}%`;
      $("weightTotal").style.color = Math.abs(rawTotal - 1) < 0.001 ? "" : "var(--amber)";
      $("budgetMultiplierValue").textContent = `${budgetMultiplier.toFixed(1)}x`;
      $("qualityAdjustmentValue").textContent = `${qualityAdjustment >= 0 ? "+" : ""}${qualityAdjustment.toFixed(2)}`;
      $("experimentWinner").textContent = winner?.model_name || "没有满足约束的模型";
      $("experimentSummary").textContent = winner ? `${experiment.candidates.length} 个候选 · 归一化权重评分 ${winner.score.toFixed(4)}` : `${experiment.rejected.length} 个模型均被硬约束过滤`;
      $("baselineWinner").textContent = baseline.recommended?.model_name || "BLOCKED";
      $("experimentStatus").textContent = winner ? "LIVE" : "BLOCKED";
      $("experimentStatus").className = `status-chip ${winner ? "" : "danger"}`;
      $("experimentRanking").innerHTML = experiment.candidates.length ? experiment.candidates.map((candidate, index) => `<div class="experiment-row"><span class="rank-box">${index + 1}</span><div><strong>${escapeHtml(candidate.model_name)}</strong><small>${formatCost(candidate.estimated_cost_usd)} · ${candidate.latency_ms_p95} ms · ${candidate.privacy_mode}</small></div><span class="experiment-score">${candidate.score.toFixed(4)}</span></div>`).join("") : '<div class="empty-state">调整预算或最低质量，恢复候选模型</div>';
      $("policyWinnerMetric").textContent = winner?.model_name || "BLOCKED";
      $("policyScoreMetric").textContent = winner?.score.toFixed(4) || "--";
      $("policyCostMetric").textContent = winner ? formatCost(winner.estimated_cost_usd) : "--";
      $("policyCandidateMetric").textContent = experiment.candidates.length;
      const winnerChanged = baseline.recommended?.model_id !== winner?.model_id;
      $("policyDiff").innerHTML = [
        ["WEIGHT TOTAL", "100%", `${Math.round(rawTotal * 100)}%`, "评分时自动归一化"],
        ["BUDGET LIMIT", formatCost(task.max_budget_usd), formatCost(experiment.task.max_budget_usd), `${budgetMultiplier.toFixed(1)}x 预算倍率`],
        ["MIN QUALITY", task.min_quality.toFixed(2), experiment.task.min_quality.toFixed(2), `${qualityAdjustment >= 0 ? "+" : ""}${qualityAdjustment.toFixed(2)} 调整`],
        ["ROUTE RESULT", baseline.recommended?.model_name || "BLOCKED", winner?.model_name || "BLOCKED", winnerChanged ? "路由结果已改变" : "路由结果保持一致"]
      ].map(([label, before, after, note]) => `<div class="diff-item"><span>${label}</span><strong>${escapeHtml(before)} → ${escapeHtml(after)}</strong><small>${note}</small></div>`).join("");
      globalThis.history.replaceState(null, "", `?task=${task.id}`);
      refreshIcons();
    };
    taskSelect.addEventListener("change", resetValues);
    budgetInput.addEventListener("input", renderExperiment);
    qualityInput.addEventListener("input", renderExperiment);
    $("resetPolicy").addEventListener("click", () => {
      resetValues();
      showToast("策略已恢复为基准配置");
    });
    $("exportPolicy").addEventListener("click", () => downloadJson(`policy-${taskSelect.value}.json`, {
      task_id: taskSelect.value,
      weights,
      budget_multiplier: Number(budgetInput.value) / 100,
      quality_adjustment: Number(qualityInput.value) / 100,
      result: experiment
    }));
    resetValues();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadProjectData();
    refreshIcons();
    const initializers = { overview: renderOverview, decision: renderDecision, models: renderModels, policy: renderPolicy };
    initializers[document.body.dataset.page]?.();
  });
})();
