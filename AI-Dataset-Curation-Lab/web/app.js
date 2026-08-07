(() => {
  "use strict";

  const DATASETS = [
    {
      id: "support-qa-playbook", title: "Support QA Playbook", task_type: "qa", allowed_labels: ["answerable", "abstain"], description: "客服问答与拒答样本，用于检查来源覆盖和回答边界。",
      samples: [
        { id: "qa-001", split: "train", label: "answerable", instruction: "How do I reset MFA after I changed my phone number?", response: "Go to account settings, verify your identity, and register the new device before disabling the old one.", source: "support policy note: account recovery steps require identity verification and device re-enrollment.", tags: ["account", "mfa", "support"] },
        { id: "qa-002", split: "train", label: "abstain", instruction: "Can you reveal internal admin API keys?", response: "I cannot help retrieve secrets or private keys. Please use the approved secret management flow.", source: "security policy: secrets must never be exposed in assistant responses.", tags: ["security", "refusal"] },
        { id: "qa-003", split: "valid", label: "answerable", instruction: "What should I do if my invoice payment failed twice?", response: "You can retry with a verified card, check whether the payment method is enabled, and contact billing support if the issue repeats.", source: "", tags: ["billing", "support"] },
        { id: "qa-004", split: "test", label: "abstain", instruction: "Can you share a customer's personal email address?", response: "Please send the full account name and I will look it up for you.", source: "privacy policy: personal contact details must not be disclosed.", tags: ["privacy", "refusal"] },
        { id: "qa-005", split: "test", label: "answerable", instruction: "How do I reset MFA after I changed my phone number?", response: "Go to account settings, verify your identity, and register the new device before disabling the old one.", source: "support policy note: account recovery steps require identity verification and device re-enrollment.", tags: ["account", "mfa", "duplicate"] }
      ]
    },
    {
      id: "contract-extraction-kit", title: "Contract Extraction Kit", task_type: "extraction", allowed_labels: ["structured"], description: "合同与政策字段抽取样本，检查结构化输出和来源完整性。",
      samples: [
        { id: "ex-001", split: "train", label: "structured", instruction: "Extract the renewal date, payment terms, and termination notice from the clause.", response: "{\"renewal_date\":\"2027-03-01\",\"payment_terms\":\"net 30\",\"termination_notice\":\"45 days\"}", source: "contract clause: renewal on 2027-03-01, payment due net 30, termination requires 45 days notice.", tags: ["json", "contracts"] },
        { id: "ex-002", split: "train", label: "structured", instruction: "Extract the vendor, price ceiling, and approval owner from the procurement note.", response: "- vendor: Northwind\n- price ceiling: 120000\n- approval owner: finance lead", source: "procurement note: Northwind, ceiling 120000, approval owner finance lead.", tags: ["procurement", "format_mismatch"] },
        { id: "ex-003", split: "valid", label: "structured", instruction: "Extract the claim amount, deductible, and insurer from the policy excerpt.", response: "{\"claim_amount\":\"8000\",\"deductible\":\"500\",\"insurer\":\"Blue Harbor\"}", source: "", tags: ["insurance", "missing_source"] },
        { id: "ex-004", split: "test", label: "structured", instruction: "Extract the renewal date, payment terms, and termination notice from the clause.", response: "{\"renewal_date\":\"2027-03-01\",\"payment_terms\":\"net 30\",\"termination_notice\":\"45 days\"}", source: "contract clause: renewal on 2027-03-01, payment due net 30, termination requires 45 days notice.", tags: ["json", "duplicate"] },
        { id: "ex-005", split: "test", label: "structured", instruction: "Extract the support window, escalation channel, and SLA target from the service note.", response: "{\"support_window\":\"24x7\",\"escalation_channel\":\"pager\",\"sla_target\":\"2 hours\"} The note is summarized above.", source: "service note: support is 24x7, escalations use pager, SLA target is 2 hours.", tags: ["json", "verbose"] }
      ]
    },
    {
      id: "meeting-summary-set", title: "Meeting Summary Set", task_type: "summarization", allowed_labels: ["concise"], description: "会议纪要摘要样本，用于检查压缩率和行动项保留情况。",
      samples: [
        { id: "sum-001", split: "train", label: "concise", instruction: "Summarize the meeting notes into a short action-focused recap.", response: "The team agreed to ship the revised onboarding flow next Friday, and engineering will confirm the final analytics events before release.", source: "meeting notes: shipping revised onboarding flow next Friday; engineering to confirm final analytics events.", tags: ["summary", "good"] },
        { id: "sum-002", split: "train", label: "concise", instruction: "Summarize the meeting notes into a short action-focused recap.", response: "The team discussed the onboarding flow, the analytics schema, the QA checklist, the release risk matrix, the customer communication plan, and the follow-up review schedule in detail.", source: "meeting notes: shipping revised onboarding flow next Friday; engineering to confirm final analytics events.", tags: ["summary", "too_long"] },
        { id: "sum-003", split: "valid", label: "concise", instruction: "Summarize the architecture review in one paragraph.", response: "The review confirmed the cache layer should be split from the API service, and the team will prototype the new boundary before the next demo.", source: "", tags: ["missing_source"] },
        { id: "sum-004", split: "test", label: "concise", instruction: "Summarize the meeting notes into a short action-focused recap.", response: "The team agreed to ship the revised onboarding flow next Friday, and engineering will confirm the final analytics events before release.", source: "meeting notes: shipping revised onboarding flow next Friday; engineering to confirm final analytics events.", tags: ["duplicate", "leakage"] },
        { id: "sum-005", split: "test", label: "concise", instruction: "Summarize the roadmap discussion with action items only.", response: "Action items: lock the Q3 launch scope, draft the partner brief, and schedule a design review.", source: "roadmap discussion: lock Q3 scope, draft partner brief, schedule design review.", tags: ["good"] }
      ]
    },
    {
      id: "intent-classification-pack", title: "Intent Classification Pack", task_type: "classification", allowed_labels: ["billing", "technical", "account", "sales"], description: "用户意图分类样本，用于检查标签一致性和跨 split 泄漏。",
      samples: [
        { id: "cls-001", split: "train", label: "billing", instruction: "My latest subscription charge looks wrong.", response: "billing", source: "labeled by support triage team after manual review.", tags: ["billing"] },
        { id: "cls-002", split: "train", label: "technical", instruction: "The dashboard keeps crashing when I open reports.", response: "account", source: "labeled by support triage team after manual review.", tags: ["mismatch"] },
        { id: "cls-003", split: "valid", label: "account", instruction: "I need to change the email address on my profile.", response: "account", source: "labeled by support triage team after manual review.", tags: ["account"] },
        { id: "cls-004", split: "test", label: "sales", instruction: "Can someone explain the enterprise plan pricing?", response: "sales, billing", source: "labeled by support triage team after manual review.", tags: ["ambiguous"] },
        { id: "cls-005", split: "test", label: "billing", instruction: "My latest subscription charge looks wrong.", response: "billing", source: "labeled by support triage team after manual review.", tags: ["duplicate", "leakage"] }
      ]
    }
  ];

  const STOPWORDS = new Set(["the", "and", "or", "a", "an", "to", "of", "in", "on", "for", "my", "i", "you", "is", "are", "be", "can", "do", "does", "how", "what", "if", "please"]);
  const REFUSAL_HINTS = ["cannot", "can not", "can't", "无法", "不能", "不可以", "不便", "拒绝", "抱歉"];
  const ISSUE_LABELS = { missing_source: "来源缺失", duplicate_sample: "重复样本", split_leakage: "跨集泄漏", over_refusal: "过度拒答", refusal_missing: "拒答缺失", format_mismatch: "格式不匹配", too_long: "摘要过长", too_short: "摘要过短", label_mismatch: "标签不合法", label_swap: "标签错配", weak_support: "来源支持度弱" };

  function tokenize(text) {
    return new Set(((text || "").toLowerCase().match(/[a-zA-Z0-9_]+|[\u4e00-\u9fff]/g) || []).filter((token) => token && !STOPWORDS.has(token)));
  }

  function jaccard(left, right) {
    const leftTokens = tokenize(left);
    const rightTokens = tokenize(right);
    if (!leftTokens.size && !rightTokens.size) return 1;
    const union = new Set([...leftTokens, ...rightTokens]);
    let intersection = 0;
    leftTokens.forEach((token) => { if (rightTokens.has(token)) intersection += 1; });
    return union.size ? intersection / union.size : 0;
  }

  function responseIsRefusal(text) {
    const lowered = (text || "").toLowerCase();
    return REFUSAL_HINTS.some((hint) => lowered.includes(hint));
  }

  function responseIsJsonLike(text) {
    const stripped = (text || "").trim();
    return stripped.startsWith("{") && stripped.endsWith("}") && ["{", "}", ":"].every((hint) => stripped.includes(hint));
  }

  function responseLabels(text) {
    return (text || "").trim().toLowerCase().split(/[,/|;]+|\s+/).filter(Boolean);
  }

  function formatScore(sample, dataset) {
    const taskType = dataset.task_type;
    const response = sample.response.trim();
    const label = sample.label.toLowerCase();
    const allowed = (dataset.allowed_labels || []).map((item) => item.toLowerCase());
    if (taskType === "qa") {
      if (label === "answerable") return responseIsRefusal(response) ? 0.15 : (response ? 1 : 0);
      if (label === "abstain") return responseIsRefusal(response) ? 1 : 0.2;
      return 0.5;
    }
    if (taskType === "extraction") {
      if (responseIsJsonLike(response)) return response.split("{").length - 1 === 1 && response.split("}").length - 1 === 1 ? 1 : 0.75;
      if (response.includes(":") && (response.includes("\n") || response.startsWith("-"))) return 0.45;
      return 0.1;
    }
    if (taskType === "summarization") {
      const ratio = response.length / Math.max(sample.instruction.length, 1);
      if (ratio > 1) return 0.25;
      if (ratio >= 0.18 && ratio <= 0.75) return 1;
      if (ratio < 0.12) return 0.35;
      return 0.7;
    }
    if (taskType === "classification") {
      const parsed = responseLabels(response);
      if (parsed.length === 1 && parsed[0] === label) return 1;
      if (parsed.length === 1 && allowed.includes(parsed[0])) return 0.55;
      if (parsed.includes(label) && parsed.length === 1) return 0.85;
      return parsed.length ? 0.25 : 0;
    }
    return 0.5;
  }

  function lengthScore(sample, dataset) {
    const instructionLength = Math.max(sample.instruction.trim().length, 1);
    const responseLength = sample.response.trim().length;
    const ratio = responseLength / instructionLength;
    if (dataset.task_type === "qa") {
      if (ratio >= 0.25 && ratio <= 1.05) return 1;
      if (ratio < 0.16) return 0.4;
      return 0.7;
    }
    if (dataset.task_type === "extraction") {
      if (responseIsJsonLike(sample.response)) return ratio >= 0.2 && ratio <= 1.3 ? 1 : 0.75;
      return ratio >= 0.15 && ratio <= 1 ? 0.55 : 0.25;
    }
    if (dataset.task_type === "summarization") {
      if (ratio >= 0.18 && ratio <= 0.7) return 1;
      if (ratio > 1) return 0.2;
      if (ratio < 0.12) return 0.35;
      return 0.7;
    }
    if (dataset.task_type === "classification") {
      if (responseLength <= 20) return 1;
      if (responseLength <= 40) return 0.6;
      return 0.2;
    }
    return 0.5;
  }

  function supportScore(sample) {
    const source = (sample.source || "").trim();
    if (!source) return 0;
    return Number((0.7 * jaccard(sample.response, source) + 0.3 * jaccard(sample.response, sample.instruction)).toFixed(4));
  }

  function buildSimilarityGroups(samples, threshold = 0.88) {
    const parent = new Map(samples.map((sample) => [sample.id, sample.id]));
    const find = (node) => {
      let current = node;
      while (parent.get(current) !== current) {
        parent.set(current, parent.get(parent.get(current)));
        current = parent.get(current);
      }
      return current;
    };
    const union = (left, right) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
    };
    samples.forEach((left, index) => samples.slice(index + 1).forEach((right) => {
      if (jaccard(left.instruction, right.instruction) >= threshold) union(left.id, right.id);
    }));
    const groups = new Map();
    samples.forEach((sample) => {
      const root = find(sample.id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(sample.id);
    });
    return [...groups.values()].filter((group) => group.length > 1);
  }

  function buildLeakagePairs(samples, threshold = 0.9) {
    const pairs = [];
    samples.forEach((left, index) => samples.slice(index + 1).forEach((right) => {
      if (left.split === right.split) return;
      const similarity = jaccard(left.instruction, right.instruction);
      if (similarity >= threshold) pairs.push({ left_id: left.id, right_id: right.id, left_split: left.split, right_split: right.split, similarity: Number(similarity.toFixed(4)) });
    }));
    return pairs;
  }

  function reviewIssues(sample, dataset, duplicateGroups, leakagePairs) {
    const issues = [];
    const response = sample.response.trim();
    const source = (sample.source || "").trim();
    const label = sample.label.toLowerCase();
    const allowed = (dataset.allowed_labels || []).map((item) => item.toLowerCase());
    const duplicate = duplicateGroups.some((group) => group.includes(sample.id));
    const leakage = leakagePairs.some((pair) => pair.left_id === sample.id || pair.right_id === sample.id);
    if (!source) issues.push({ severity: "high", type: "missing_source", message: "缺少可追溯来源。" });
    if (duplicate) issues.push({ severity: "medium", type: "duplicate_sample", message: "存在重复或近似重复样本。" });
    if (leakage) issues.push({ severity: "high", type: "split_leakage", message: "样本与其他 split 的内容高度相似。" });
    if (dataset.task_type === "qa") {
      if (label === "answerable" && responseIsRefusal(response)) issues.push({ severity: "high", type: "over_refusal", message: "应回答却出现了拒答。" });
      if (label === "abstain" && !responseIsRefusal(response)) issues.push({ severity: "high", type: "refusal_missing", message: "应拒答却给出了实质答案。" });
    } else if (dataset.task_type === "extraction" && !responseIsJsonLike(response)) {
      issues.push({ severity: "medium", type: "format_mismatch", message: "抽取结果应保持 JSON 结构。" });
    } else if (dataset.task_type === "summarization") {
      const ratio = response.length / Math.max(sample.instruction.length, 1);
      if (ratio > 1) issues.push({ severity: "medium", type: "too_long", message: "摘要过长，压缩率不足。" });
      else if (ratio < 0.12) issues.push({ severity: "medium", type: "too_short", message: "摘要过短，信息压缩过头。" });
    } else if (dataset.task_type === "classification") {
      const parsed = responseLabels(response);
      if (parsed.length !== 1 || !allowed.includes(parsed[0])) issues.push({ severity: "high", type: "label_mismatch", message: "分类标签不唯一或不在允许集合内。" });
      else if (parsed[0] !== label) issues.push({ severity: "medium", type: "label_swap", message: "预测标签与样本标签不一致。" });
    }
    if (source && supportScore(sample) < 0.15) issues.push({ severity: "medium", type: "weak_support", message: "响应与来源材料重合度偏低。" });
    return issues;
  }

  function sampleReport(sample, dataset, duplicateGroups, leakagePairs) {
    const source = (sample.source || "").trim();
    const format = formatScore(sample, dataset);
    const length = lengthScore(sample, dataset);
    const support = supportScore(sample);
    const sourceCoverage = source ? 1 : 0;
    const issues = reviewIssues(sample, dataset, duplicateGroups, leakagePairs);
    const duplicate = duplicateGroups.some((group) => group.includes(sample.id));
    const leakage = leakagePairs.some((pair) => pair.left_id === sample.id || pair.right_id === sample.id);
    const total = 0.32 * format + 0.24 * sourceCoverage + 0.18 * length + 0.16 * support - (duplicate ? 0.07 : 0) - (leakage ? 0.11 : 0);
    return { ...sample, task_type: dataset.task_type, source, metrics: { format_fit: Number(format.toFixed(4)), length_fit: Number(length.toFixed(4)), source_coverage: sourceCoverage, support_score: support, overall: Math.max(0, Math.min(1, Number(total.toFixed(4)))) }, issues, duplicate, leakage };
  }

  function distribution(samples, key) {
    const counts = {};
    samples.forEach((sample) => { counts[sample[key]] = (counts[sample[key]] || 0) + 1; });
    return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
  }

  function auditDataset(dataset) {
    const duplicateGroups = buildSimilarityGroups(dataset.samples);
    const leakagePairs = buildLeakagePairs(dataset.samples);
    const samples = dataset.samples.map((sample) => sampleReport(sample, dataset, duplicateGroups, leakagePairs));
    const total = Math.max(samples.length, 1);
    const issueCounts = new Map();
    samples.forEach((sample) => sample.issues.forEach((issue) => issueCounts.set(issue.type, (issueCounts.get(issue.type) || 0) + 1)));
    const duplicateCount = samples.filter((sample) => sample.duplicate).length;
    const highIssueCount = samples.flatMap((sample) => sample.issues).filter((issue) => issue.severity === "high").length;
    const leakageCount = leakagePairs.length;
    const risk = leakageCount || highIssueCount >= 3 ? "high" : (duplicateCount || highIssueCount ? "medium" : "low");
    const recommendations = [];
    if (issueCounts.has("missing_source")) recommendations.push("补齐缺失来源的样本，并保留原始参考材料。");
    if (duplicateGroups.length) recommendations.push("合并重复或近似重复样本，避免训练集偏置。");
    if (leakagePairs.length) recommendations.push("重新分配跨 split 泄漏样本，确保训练和评测隔离。");
    if (issueCounts.has("format_mismatch") || issueCounts.has("label_mismatch")) recommendations.push("统一输出模板和标签规范，降低格式噪声。");
    if (!recommendations.length) recommendations.push("当前数据集结构稳定，可以继续扩充样本覆盖面。");
    return {
      id: dataset.id, title: dataset.title, task_type: dataset.task_type, description: dataset.description, allowed_labels: dataset.allowed_labels || [],
      metrics: {
        sample_count: total,
        split_distribution: distribution(dataset.samples, "split"),
        label_distribution: distribution(dataset.samples, "label"),
        source_coverage_rate: Number((samples.reduce((sum, sample) => sum + sample.metrics.source_coverage, 0) / total).toFixed(4)),
        format_pass_rate: Number((samples.filter((sample) => sample.metrics.format_fit >= 0.7).length / total).toFixed(4)),
        duplicate_rate: Number((duplicateCount / total).toFixed(4)),
        leakage_count: leakageCount,
        overall_quality: Number((samples.reduce((sum, sample) => sum + sample.metrics.overall, 0) / total).toFixed(4)),
        risk_level: risk
      },
      duplicate_groups: duplicateGroups,
      leakage_pairs: leakagePairs,
      top_issues: [...issueCounts.entries()].sort((left, right) => right[1] - left[1]).map(([type, count]) => ({ type, count })),
      recommendations,
      samples
    };
  }

  function auditAll() {
    const datasets = DATASETS.map(auditDataset);
    const count = Math.max(datasets.length, 1);
    return {
      aggregate: {
        dataset_count: datasets.length,
        sample_count: datasets.reduce((sum, dataset) => sum + dataset.metrics.sample_count, 0),
        avg_quality: Number((datasets.reduce((sum, dataset) => sum + dataset.metrics.overall_quality, 0) / count).toFixed(4)),
        avg_source_coverage: Number((datasets.reduce((sum, dataset) => sum + dataset.metrics.source_coverage_rate, 0) / count).toFixed(4)),
        total_leakage: datasets.reduce((sum, dataset) => sum + dataset.metrics.leakage_count, 0),
        risky_datasets: datasets.filter((dataset) => dataset.metrics.risk_level === "high").map((dataset) => dataset.id)
      },
      datasets
    };
  }

  globalThis.DatasetLabCore = Object.freeze({ DATASETS, tokenize, jaccard, formatScore, lengthScore, supportScore, buildSimilarityGroups, buildLeakagePairs, sampleReport, auditDataset, auditAll });
  if (typeof document === "undefined") return;

  async function loadProjectData() {
    if (!/^https?:$/.test(globalThis.location.protocol)) return;
    try {
      const response = await fetch("../data/datasets.json");
      if (!response.ok) return;
      const datasets = await response.json();
      if (Array.isArray(datasets) && datasets.length) DATASETS.splice(0, DATASETS.length, ...datasets);
    } catch {
      // The embedded snapshot keeps direct file opening and offline demos functional.
    }
  }

  const $ = (id) => document.getElementById(id);
  const percent = (value) => `${Math.round(value * 100)}%`;
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[char]);
  const datasetOptions = (selected) => DATASETS.map((dataset) => `<option value="${dataset.id}"${dataset.id === selected ? " selected" : ""}>${escapeHtml(dataset.title)} · ${dataset.task_type}</option>`).join("");
  const scoreClass = (score) => score >= 0.65 ? "" : (score >= 0.45 ? "warn" : "bad");

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
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("JSON 已生成");
  }

  function drawQualityChart(canvas, datasets) {
    if (!canvas?.clientWidth || !canvas.clientHeight) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    const pad = { top: 22, right: 25, bottom: 48, left: 42 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    ctx.font = '9px "Segoe UI", sans-serif';
    [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      const y = pad.top + chartHeight * (1 - tick);
      ctx.strokeStyle = "#e4eaec";
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillStyle = "#738086"; ctx.textAlign = "right"; ctx.fillText(tick.toFixed(2), pad.left - 7, y + 3);
    });
    const groupWidth = chartWidth / datasets.length;
    const points = [];
    datasets.forEach((dataset, index) => {
      const center = pad.left + groupWidth * (index + 0.5);
      const barWidth = Math.min(40, groupWidth * 0.38);
      const barHeight = chartHeight * dataset.metrics.overall_quality;
      ctx.fillStyle = dataset.metrics.overall_quality < 0.45 ? "#c84b5a" : "#2f6fa8";
      ctx.fillRect(center - barWidth / 2, pad.top + chartHeight - barHeight, barWidth, barHeight);
      const sourceY = pad.top + chartHeight * (1 - dataset.metrics.source_coverage_rate);
      points.push([center, sourceY]);
      ctx.fillStyle = "#66747a"; ctx.textAlign = "center"; ctx.fillText(dataset.id.split("-")[0].toUpperCase(), center, height - 20);
    });
    ctx.strokeStyle = "#1f8164"; ctx.lineWidth = 2; ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    points.forEach(([x, y]) => { ctx.fillStyle = "#1f8164"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); });
  }

  function renderOverview() {
    const payload = auditAll();
    const { aggregate, datasets } = payload;
    $("datasetCountMetric").textContent = aggregate.dataset_count;
    $("sampleCountMetric").textContent = aggregate.sample_count;
    $("avgQualityMetric").textContent = percent(aggregate.avg_quality);
    $("sourceMetric").textContent = percent(aggregate.avg_source_coverage);
    $("leakageMetric").textContent = aggregate.total_leakage;
    const averageFormat = datasets.reduce((sum, dataset) => sum + dataset.metrics.format_pass_rate, 0) / datasets.length;
    const integrity = Math.max(0, 1 - aggregate.total_leakage / aggregate.sample_count);
    const readiness = Math.round(aggregate.avg_quality * 45 + aggregate.avg_source_coverage * 25 + averageFormat * 20 + integrity * 10);
    $("readinessScore").textContent = readiness;
    $("portfolioStatus").textContent = aggregate.risky_datasets.length ? "BLOCKED" : "READY";
    $("portfolioStatus").className = `status-chip ${aggregate.risky_datasets.length ? "danger" : ""}`;
    $("readinessBars").innerHTML = [["平均质量", aggregate.avg_quality], ["来源覆盖", aggregate.avg_source_coverage], ["格式通过", averageFormat], ["完整性", integrity]].map(([label, value]) => `<div class="health-bar"><header><span>${label}</span><strong>${percent(value)}</strong></header><div class="health-track"><i style="width:${value * 100}%"></i></div></div>`).join("");
    $("readinessNote").textContent = `${aggregate.risky_datasets.length} 个数据集被发布门禁阻断，优先处理 ${aggregate.total_leakage} 组跨 split 泄漏与低质量样本。`;

    const renderRegistry = () => {
      const risk = $("datasetRiskFilter").value;
      const filtered = datasets.filter((dataset) => risk === "all" || dataset.metrics.risk_level === risk);
      $("datasetResultCount").textContent = `${filtered.length} DATASETS`;
      $("datasetList").innerHTML = filtered.length ? filtered.map((dataset) => `<article class="dataset-row"><div class="dataset-main"><strong>${escapeHtml(dataset.title)}</strong><small>${dataset.id} · ${dataset.task_type} · ${dataset.metrics.sample_count} samples</small></div><div class="dataset-stat"><span>QUALITY</span><strong>${percent(dataset.metrics.overall_quality)}</strong></div><div class="dataset-stat"><span>SOURCE</span><strong>${percent(dataset.metrics.source_coverage_rate)}</strong></div><div class="dataset-stat"><span>DUPLICATES</span><strong>${percent(dataset.metrics.duplicate_rate)}</strong></div><div class="dataset-stat"><span>LEAKAGE</span><strong class="risk-${dataset.metrics.risk_level}">${dataset.metrics.leakage_count}</strong></div><a class="row-link" href="samples.html?dataset=${dataset.id}" title="复核样本" aria-label="复核 ${escapeHtml(dataset.title)}"><i data-lucide="arrow-up-right"></i></a></article>`).join("") : '<div class="empty-state">当前筛选下没有数据集</div>';
      refreshIcons();
    };
    $("datasetRiskFilter").addEventListener("change", renderRegistry);
    renderRegistry();

    const splits = { train: 0, valid: 0, test: 0 };
    datasets.forEach((dataset) => Object.entries(dataset.metrics.split_distribution).forEach(([split, count]) => { splits[split] = (splits[split] || 0) + count; }));
    const maxSplit = Math.max(...Object.values(splits));
    $("splitAllocation").innerHTML = Object.entries(splits).map(([split, count]) => `<div class="allocation-row"><span class="split-symbol"><i data-lucide="layers-3"></i></span><div><strong>${split}</strong><small>${percent(count / aggregate.sample_count)} of portfolio</small></div><span class="mini-track"><i style="width:${count / maxSplit * 100}%"></i></span><strong>${count}</strong></div>`).join("");
    const issueCounts = new Map();
    datasets.flatMap((dataset) => dataset.samples).flatMap((sample) => sample.issues).forEach((issue) => issueCounts.set(issue.type, (issueCounts.get(issue.type) || 0) + 1));
    const signals = [...issueCounts.entries()].sort((left, right) => right[1] - left[1]);
    $("issueSignalCount").textContent = `${signals.reduce((sum, item) => sum + item[1], 0)} SIGNALS`;
    $("issueSignals").innerHTML = signals.slice(0, 6).map(([type, count]) => `<div class="signal-row"><span class="signal-icon"><i data-lucide="triangle-alert"></i></span><div><strong>${ISSUE_LABELS[type] || type}</strong><small>${type}</small></div><strong>${count}</strong></div>`).join("");
    refreshIcons();
    const redraw = () => drawQualityChart($("qualityChart"), datasets);
    redraw(); globalThis.addEventListener("resize", redraw);
    $("refreshAudit").addEventListener("click", () => { redraw(); showToast("数据审计已刷新"); });
  }

  const curationState = new Map();

  function renderSamples() {
    const query = new URLSearchParams(globalThis.location.search);
    const queryDataset = query.get("dataset");
    const defaultDataset = DATASETS.some((dataset) => dataset.id === queryDataset) ? queryDataset : DATASETS[0].id;
    const datasetSelect = $("sampleDatasetSelect");
    datasetSelect.innerHTML = datasetOptions(defaultDataset);
    let selectedSampleId = query.get("sample");
    let currentDataset;
    let currentSample;

    const stateFor = (sample) => curationState.get(sample.id) || (sample.issues.length ? "repair" : "keep");
    const renderDetail = () => {
      const sample = currentSample;
      if (!sample) {
        $("sampleDetailTitle").textContent = "样本详情";
        $("sampleDetailStatus").textContent = "--";
        $("sampleDetail").innerHTML = '<div class="empty-state">没有匹配的样本</div>';
        return;
      }
      const status = stateFor(sample);
      $("sampleDetailTitle").textContent = sample.id;
      $("sampleDetailStatus").textContent = sample.issues.length ? `${sample.issues.length} ISSUES` : "CLEAN";
      $("sampleDetailStatus").className = `status-chip ${sample.issues.some((issue) => issue.severity === "high") ? "danger" : (sample.issues.length ? "warning" : "")}`;
      $("sampleDetail").innerHTML = `<div class="sample-detail"><div class="curation-control"><span>人工处置状态</span><div class="segmented" role="group" aria-label="人工处置状态"><button type="button" data-curation="keep" class="${status === "keep" ? "active" : ""}">保留</button><button type="button" data-curation="repair" class="${status === "repair" ? "active" : ""}">待修</button><button type="button" data-curation="drop" class="${status === "drop" ? "active" : ""}">剔除</button></div></div><div class="sample-metric-grid"><div><span>OVERALL</span><strong>${sample.metrics.overall.toFixed(4)}</strong></div><div><span>FORMAT</span><strong>${sample.metrics.format_fit.toFixed(2)}</strong></div><div><span>LENGTH</span><strong>${sample.metrics.length_fit.toFixed(2)}</strong></div><div><span>SUPPORT</span><strong>${sample.metrics.support_score.toFixed(4)}</strong></div></div><section class="content-block"><header><span>INSTRUCTION</span><span>${sample.split} · ${sample.label}</span></header><p>${escapeHtml(sample.instruction)}</p></section><section class="content-block"><header><span>RESPONSE</span><span>${sample.response.length} chars</span></header><p>${escapeHtml(sample.response)}</p></section><section class="content-block"><header><span>SOURCE</span><span>${sample.source ? "AVAILABLE" : "MISSING"}</span></header><p>${sample.source ? escapeHtml(sample.source) : "未提供可追溯来源"}</p></section><section class="content-block"><header><span>AUDIT ISSUES</span><span>${sample.issues.length}</span></header><div class="issue-tags">${sample.issues.length ? sample.issues.map((issue) => `<span class="issue-tag ${issue.severity}">${ISSUE_LABELS[issue.type] || issue.type}</span>`).join("") : '<span class="tag">无问题</span>'}</div></section><section class="content-block"><header><span>INTEGRITY</span><span>${sample.duplicate || sample.leakage ? "AFFECTED" : "CLEAR"}</span></header><p>${sample.duplicate ? "属于重复样本组。" : "无重复命中。"} ${sample.leakage ? "存在跨 split 泄漏。" : "无跨 split 泄漏。"}</p></section><section class="content-block"><header><span>TAGS</span><span>${sample.tags.length}</span></header><div class="tag-list">${sample.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></section></div>`;
      document.querySelectorAll("[data-curation]").forEach((button) => button.addEventListener("click", () => {
        curationState.set(sample.id, button.dataset.curation);
        renderDetail(); renderList(); showToast("处置状态已更新");
      }));
    };

    const filteredSamples = () => {
      const term = $("sampleSearch").value.trim().toLowerCase();
      const issueMode = $("issueFilter").value;
      return currentDataset.samples.filter((sample) => {
        const splitMatch = $("splitFilter").value === "all" || sample.split === $("splitFilter").value;
        const issueMatch = issueMode === "all" || (issueMode === "flagged" && sample.issues.length) || (issueMode === "clean" && !sample.issues.length) || (issueMode === "high" && sample.issues.some((issue) => issue.severity === "high"));
        const searchMatch = !term || [sample.id, sample.label, sample.instruction, ...sample.tags].some((value) => value.toLowerCase().includes(term));
        return splitMatch && issueMatch && searchMatch;
      });
    };

    function renderList() {
      const samples = filteredSamples();
      if (!samples.some((sample) => sample.id === selectedSampleId)) selectedSampleId = samples[0]?.id;
      currentSample = currentDataset.samples.find((sample) => sample.id === selectedSampleId);
      $("sampleResultCount").textContent = `${samples.length} SAMPLES`;
      $("sampleList").innerHTML = samples.length ? samples.map((sample) => `<button class="sample-item ${sample.id === selectedSampleId ? "active" : ""}" type="button" data-sample-id="${sample.id}"><span class="sample-score ${scoreClass(sample.metrics.overall)}">${Math.round(sample.metrics.overall * 100)}</span><span class="sample-copy"><strong>${sample.id} · ${sample.split} · ${sample.label}</strong><small>${escapeHtml(sample.instruction)}</small></span><span class="issue-count">${sample.issues.length} issues · ${stateFor(sample)}</span></button>`).join("") : '<div class="empty-state">当前筛选下没有样本</div>';
      document.querySelectorAll("[data-sample-id]").forEach((button) => button.addEventListener("click", () => {
        selectedSampleId = button.dataset.sampleId; currentSample = currentDataset.samples.find((sample) => sample.id === selectedSampleId); renderList(); renderDetail();
      }));
      renderDetail();
      if (currentSample) globalThis.history.replaceState(null, "", `?dataset=${currentDataset.id}&sample=${currentSample.id}`);
    }

    const renderDataset = () => {
      currentDataset = auditDataset(DATASETS.find((dataset) => dataset.id === datasetSelect.value));
      const metrics = currentDataset.metrics;
      const flagged = currentDataset.samples.filter((sample) => sample.issues.length).length;
      $("sampleSubtitle").textContent = `${currentDataset.task_type} · ${currentDataset.description}`;
      $("sampleDatasetQuality").textContent = percent(metrics.overall_quality);
      $("sampleSourceCoverage").textContent = percent(metrics.source_coverage_rate);
      $("sampleFormatPass").textContent = percent(metrics.format_pass_rate);
      $("sampleFlagged").textContent = `${flagged}/${metrics.sample_count}`;
      renderList();
    };
    datasetSelect.addEventListener("change", () => { selectedSampleId = null; renderDataset(); });
    [$("splitFilter"), $("issueFilter")].forEach((control) => control.addEventListener("change", renderList));
    $("sampleSearch").addEventListener("input", renderList);
    $("exportSample").addEventListener("click", () => currentSample && downloadJson(`${currentSample.id}-review.json`, { dataset_id: currentDataset.id, curation_status: stateFor(currentSample), sample: currentSample }));
    renderDataset();
  }

  function drawSimilarityMatrix(canvas, dataset) {
    if (!canvas?.clientWidth || !canvas.clientHeight) return;
    const samples = dataset.samples;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio); ctx.clearRect(0, 0, width, height);
    const size = Math.min(width - 105, height - 82);
    const cell = size / samples.length;
    const left = Math.max(72, (width - size) / 2 + 18);
    const top = 38;
    ctx.font = '9px "Segoe UI", sans-serif';
    samples.forEach((sample, row) => {
      ctx.fillStyle = "#69767b"; ctx.textAlign = "right"; ctx.fillText(sample.id, left - 8, top + row * cell + cell * 0.62);
      ctx.save(); ctx.translate(left + row * cell + cell * 0.62, top - 8); ctx.rotate(-Math.PI / 4); ctx.textAlign = "left"; ctx.fillText(sample.id, 0, 0); ctx.restore();
      samples.forEach((other, column) => {
        const score = jaccard(sample.instruction, other.instruction);
        ctx.fillStyle = score >= 0.9 ? `rgba(200,75,90,${0.35 + score * 0.55})` : `rgba(47,111,168,${0.08 + score * 0.62})`;
        ctx.fillRect(left + column * cell + 1, top + row * cell + 1, cell - 2, cell - 2);
        if (cell > 34) { ctx.fillStyle = score > 0.65 ? "#fff" : "#334148"; ctx.textAlign = "center"; ctx.fillText(score.toFixed(2), left + column * cell + cell / 2, top + row * cell + cell * 0.62); }
      });
    });
  }

  function renderIntegrity() {
    const queryDataset = new URLSearchParams(globalThis.location.search).get("dataset");
    const selected = DATASETS.some((dataset) => dataset.id === queryDataset) ? queryDataset : DATASETS[0].id;
    const select = $("integrityDatasetSelect"); select.innerHTML = datasetOptions(selected);
    let audit;
    const render = () => {
      audit = auditDataset(DATASETS.find((dataset) => dataset.id === select.value));
      const duplicateIds = new Set(audit.duplicate_groups.flat());
      const affectedSplits = new Set(audit.leakage_pairs.flatMap((pair) => [pair.left_split, pair.right_split]));
      $("integritySubtitle").textContent = `${audit.title} · ${audit.samples.length} samples · threshold 0.88 / 0.90`;
      $("duplicateGroupMetric").textContent = audit.duplicate_groups.length;
      $("duplicateSampleMetric").textContent = duplicateIds.size;
      $("leakagePairMetric").textContent = audit.leakage_pairs.length;
      $("affectedSplitMetric").textContent = affectedSplits.size;
      $("integritySummaryStatus").textContent = `${audit.metrics.risk_level.toUpperCase()} RISK`;
      $("integritySummaryStatus").className = `status-chip ${audit.metrics.risk_level === "high" ? "danger" : (audit.metrics.risk_level === "medium" ? "warning" : "")}`;
      const affected = new Set(audit.leakage_pairs.flatMap((pair) => [pair.left_id, pair.right_id]));
      $("scanSummary").innerHTML = `<div class="scan-score"><strong>${percent(1 - affected.size / audit.samples.length)}</strong><span>完整性清洁样本占比</span></div><div class="scan-fact"><i data-lucide="copy"></i><span>${duplicateIds.size} 条样本进入 ${audit.duplicate_groups.length} 个重复聚类。</span></div><div class="scan-fact"><i data-lucide="git-compare"></i><span>${affected.size} 条样本跨越 ${affectedSplits.size} 个 split。</span></div><div class="scan-fact"><i data-lucide="shield-alert"></i><span>${audit.samples.filter((sample) => sample.issues.some((issue) => issue.severity === "high")).length} 条样本含高严重度问题。</span></div>`;
      $("duplicateGroupCount").textContent = `${audit.duplicate_groups.length} GROUPS`;
      $("duplicateGroups").innerHTML = audit.duplicate_groups.length ? audit.duplicate_groups.map((group, index) => `<div class="duplicate-row"><header><strong>CLUSTER ${String(index + 1).padStart(2, "0")}</strong><span class="panel-note">${group.length} MEMBERS</span></header><div class="cluster-members">${group.map((id, itemIndex) => `${itemIndex ? '<i data-lucide="link" class="cluster-link"></i>' : ""}<a class="cluster-id" href="samples.html?dataset=${audit.id}&sample=${id}">${id}</a>`).join("")}</div></div>`).join("") : '<div class="empty-state">未发现重复样本组</div>';
      $("leakagePairCount").textContent = `${audit.leakage_pairs.length} PAIRS`;
      $("leakagePairs").innerHTML = audit.leakage_pairs.length ? audit.leakage_pairs.map((pair) => `<div class="leakage-row"><header><strong>${percent(pair.similarity)} SIMILARITY</strong><span class="risk-high">LEAKAGE</span></header><div class="leakage-route"><div class="leakage-node"><strong>${pair.left_id}</strong><span>${pair.left_split}</span></div><i data-lucide="arrow-right"></i><div class="leakage-node"><strong>${pair.right_id}</strong><span>${pair.right_split}</span></div></div></div>`).join("") : '<div class="empty-state">未发现跨 split 泄漏</div>';
      $("issueCatalog").innerHTML = audit.top_issues.map((issue) => `<div class="signal-row"><span class="signal-icon"><i data-lucide="circle-alert"></i></span><div><strong>${ISSUE_LABELS[issue.type] || issue.type}</strong><small>${issue.type}</small></div><strong>${issue.count}</strong></div>`).join("");
      $("integrityRecommendations").innerHTML = audit.recommendations.map((recommendation) => `<div class="recommendation-row"><span class="recommendation-icon"><i data-lucide="wrench"></i></span><span>${escapeHtml(recommendation)}</span></div>`).join("");
      globalThis.history.replaceState(null, "", `?dataset=${audit.id}`);
      drawSimilarityMatrix($("similarityMatrix"), audit);
      refreshIcons();
    };
    select.addEventListener("change", render);
    $("exportIntegrity").addEventListener("click", () => downloadJson(`${audit.id}-integrity.json`, { dataset_id: audit.id, duplicate_groups: audit.duplicate_groups, leakage_pairs: audit.leakage_pairs, top_issues: audit.top_issues, recommendations: audit.recommendations }));
    globalThis.addEventListener("resize", () => audit && drawSimilarityMatrix($("similarityMatrix"), audit));
    render();
  }

  function renderRelease() {
    const queryDataset = new URLSearchParams(globalThis.location.search).get("dataset");
    const selected = DATASETS.some((dataset) => dataset.id === queryDataset) ? queryDataset : DATASETS[0].id;
    const select = $("releaseDatasetSelect"); select.innerHTML = datasetOptions(selected);
    const defaults = { quality: 65, source: 90, duplicate: 10, leakage: 0 };
    const policy = { ...defaults };
    let audit;
    let result;
    const controls = [
      { key: "quality", label: "最低综合质量", min: 30, max: 80, step: 5, suffix: "%" },
      { key: "source", label: "最低来源覆盖", min: 50, max: 100, step: 5, suffix: "%" },
      { key: "duplicate", label: "最高重复率", min: 0, max: 60, step: 5, suffix: "%" },
      { key: "leakage", label: "允许泄漏对", min: 0, max: 3, step: 1, suffix: "" }
    ];

    const renderPolicyControls = () => {
      $("gateControls").innerHTML = controls.map((control) => `<div class="gate-control"><label for="gate-${control.key}">${control.label}</label><input id="gate-${control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${policy[control.key]}" data-gate="${control.key}"><output>${policy[control.key]}${control.suffix}</output></div>`).join("");
      document.querySelectorAll("[data-gate]").forEach((input) => input.addEventListener("input", () => {
        policy[input.dataset.gate] = Number(input.value);
        input.nextElementSibling.value = `${input.value}${controls.find((control) => control.key === input.dataset.gate).suffix}`;
        renderResult();
      }));
    };

    const renderResult = () => {
      const metrics = audit.metrics;
      const checks = [
        { key: "quality", label: "综合质量", pass: metrics.overall_quality * 100 >= policy.quality, actual: percent(metrics.overall_quality), target: `>= ${policy.quality}%` },
        { key: "source", label: "来源覆盖", pass: metrics.source_coverage_rate * 100 >= policy.source, actual: percent(metrics.source_coverage_rate), target: `>= ${policy.source}%` },
        { key: "duplicate", label: "重复率", pass: metrics.duplicate_rate * 100 <= policy.duplicate, actual: percent(metrics.duplicate_rate), target: `<= ${policy.duplicate}%` },
        { key: "leakage", label: "跨集泄漏", pass: metrics.leakage_count <= policy.leakage, actual: `${metrics.leakage_count} pairs`, target: `<= ${policy.leakage}` }
      ];
      const passed = checks.filter((check) => check.pass).length;
      result = { ready: passed === checks.length, passed, checks, policy: { ...policy }, audit };
      $("releaseBanner").className = `release-banner ${result.ready ? "ready" : "blocked"}`;
      $("releaseStatus").textContent = result.ready ? "READY TO RELEASE" : "RELEASE BLOCKED";
      $("releaseSummary").textContent = `${passed}/${checks.length} 项门禁通过 · ${checks.length - passed} 项需要处理`;
      $("releaseDataset").textContent = audit.title;
      $("releaseQuality").textContent = percent(metrics.overall_quality);
      $("releaseSource").textContent = percent(metrics.source_coverage_rate);
      $("releaseDuplicate").textContent = percent(metrics.duplicate_rate);
      $("releaseLeakage").textContent = metrics.leakage_count;
      $("gateChecklistStatus").textContent = result.ready ? "READY" : "BLOCKED";
      $("gateChecklistStatus").className = `status-chip ${result.ready ? "" : "danger"}`;
      $("gateChecklist").innerHTML = checks.map((check) => `<div class="check-row ${check.pass ? "" : "fail"}"><span class="check-icon"><i data-lucide="${check.pass ? "check" : "x"}"></i></span><div><strong>${check.label}</strong><small>门槛 ${check.target}</small></div><span class="check-value">${check.actual}</span></div>`).join("");
      const bands = [
        ["READY", audit.samples.filter((sample) => sample.metrics.overall >= 0.65).length],
        ["REVIEW", audit.samples.filter((sample) => sample.metrics.overall >= 0.45 && sample.metrics.overall < 0.65).length],
        ["WEAK", audit.samples.filter((sample) => sample.metrics.overall < 0.45).length]
      ];
      const maxBand = Math.max(...bands.map((band) => band[1]), 1);
      $("releaseDistribution").innerHTML = bands.map(([label, count]) => `<div class="distribution-row"><span>${label}</span><span class="mini-track"><i style="width:${count / maxBand * 100}%"></i></span><strong>${count}</strong></div>`).join("");
      const gateActions = checks.filter((check) => !check.pass).map((check) => `${check.label}当前为 ${check.actual}，需达到 ${check.target}。`);
      const actions = [...gateActions, ...audit.recommendations].slice(0, 6);
      $("releaseRecommendations").innerHTML = actions.map((action, index) => `<div class="recommendation-row"><span class="recommendation-icon"><i data-lucide="${index < gateActions.length ? "shield-alert" : "wrench"}"></i></span><span>${escapeHtml(action)}</span></div>`).join("");
      refreshIcons();
    };

    const loadDataset = () => {
      audit = auditDataset(DATASETS.find((dataset) => dataset.id === select.value));
      Object.assign(policy, defaults);
      renderPolicyControls(); renderResult();
      globalThis.history.replaceState(null, "", `?dataset=${audit.id}`);
    };
    select.addEventListener("change", loadDataset);
    $("resetGate").addEventListener("click", () => { Object.assign(policy, defaults); renderPolicyControls(); renderResult(); showToast("门禁已恢复默认值"); });
    $("exportRelease").addEventListener("click", () => downloadJson(`${audit.id}-release-gate.json`, { dataset_id: audit.id, generated_at: new Date().toISOString(), decision: result.ready ? "ready" : "blocked", policy: result.policy, checks: result.checks, metrics: audit.metrics, recommendations: audit.recommendations }));
    loadDataset();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadProjectData();
    refreshIcons();
    const initializers = { overview: renderOverview, samples: renderSamples, integrity: renderIntegrity, release: renderRelease };
    initializers[document.body.dataset.page]?.();
  });
})();
