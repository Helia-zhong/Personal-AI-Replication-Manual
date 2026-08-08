(function () {
  "use strict";

  const E = globalThis.VideoInsightEngine;
  const STORAGE_KEY = "ai-video-insight-lab-v3";
  const POSTERS = {
    "launch-teaser": "assets/launch-teaser.jpg",
    "support-recap": "assets/support-recap.jpg",
    "webinar-cutdown": "assets/webinar-cutdown.jpg",
    "release-story": "assets/release-story.jpg",
  };
  const ISSUE_LABELS = {
    missing_caption: "字幕缺失", ocr_sparse: "OCR 稀疏", long_scene: "镜头过长",
    highlight_overflow: "高光过密", highlight_sparse: "高光不足", audio_sparse: "音频稀疏",
  };
  const STOP_WORDS = new Set(["the", "and", "with", "for", "one", "flow", "card", "voiceover", "screen"]);

  let baseClips = (globalThis.VideoLabData || []).map((clip) => E.cloneClip(clip));

  function defaultState() {
    return { clipId: "launch-teaser", currentTime: 0, speed: 1, highlightEdits: {} };
  }

  function loadState() {
    const fallback = defaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return fallback;
      return {
        ...fallback, ...saved,
        speed: [0.5, 1, 1.5, 2].includes(Number(saved.speed)) ? Number(saved.speed) : 1,
        highlightEdits: saved.highlightEdits && typeof saved.highlightEdits === "object" ? saved.highlightEdits : {},
      };
    } catch (error) {
      return fallback;
    }
  }

  const state = loadState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* Local storage may be disabled. */ }
  }

  async function loadClips() {
    try {
      const response = await fetch("../data/clips.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Clip request failed.");
      const clips = await response.json();
      if (Array.isArray(clips) && clips.length) baseClips = clips.map((clip) => E.cloneClip(clip));
    } catch (error) {
      baseClips = (globalThis.VideoLabData || []).map((clip) => E.cloneClip(clip));
    }
    if (!baseClips.some((clip) => clip.id === state.clipId)) state.clipId = baseClips[0]?.id || "";
    return baseClips;
  }

  function editedClip(baseClip) {
    const clip = E.cloneClip(baseClip);
    const edit = state.highlightEdits[clip.id];
    if (Array.isArray(edit)) clip.highlights = E.cloneClip(edit);
    return clip;
  }

  function allClips() { return baseClips.map(editedClip); }
  function clipById(id) { return allClips().find((clip) => clip.id === id) || allClips()[0]; }
  function baseClipById(id) { return baseClips.find((clip) => clip.id === id) || baseClips[0]; }
  function byId(id) { return document.getElementById(id); }
  function pct(value) { return `${Math.round(Number(value || 0) * 100)}%`; }
  function formatTime(seconds) {
    const value = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }
  function refreshIcons() { if (globalThis.lucide) globalThis.lucide.createIcons({ attrs: { "stroke-width": 1.8 } }); }
  function showToast(message) {
    const toast = byId("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }
  function severityClass(issues) {
    if (issues.some((issue) => issue.severity === "high")) return "danger";
    if (issues.length) return "warning";
    return "";
  }
  function severityLabel(issues) {
    if (issues.some((issue) => issue.severity === "high")) return "HIGH RISK";
    if (issues.length) return "REVIEW";
    return "READY";
  }
  function sceneAtTime(clip, time) {
    const index = clip.scenes.findIndex((scene) => time >= scene.start && time < scene.end);
    return index >= 0 ? index : Math.max(clip.scenes.length - 1, 0);
  }
  function setClip(id, resetTime = true) {
    state.clipId = baseClips.some((clip) => clip.id === id) ? id : baseClips[0].id;
    if (resetTime) state.currentTime = 0;
    saveState();
  }
  function downloadMarkdown(filename, content) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportClip(clip, suffix = "report") {
    downloadMarkdown(`video-insight-${clip.id}-${suffix}.md`, E.clipReportMarkdown(clip));
    showToast("Markdown 报告已导出");
  }

  function populateClipSelect(select, includeAll = false) {
    select.innerHTML = includeAll ? '<option value="all">全部视频</option>' : "";
    baseClips.forEach((clip) => {
      const option = document.createElement("option");
      option.value = clip.id;
      option.textContent = clip.title;
      select.appendChild(option);
    });
  }

  function drawPortfolioChart(inspected) {
    const canvas = byId("portfolioChart");
    if (!canvas) return;
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    const width = Math.max(canvas.clientWidth, 300);
    const height = 270;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    const pad = { left: 38, right: 14, top: 18, bottom: 48 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    ctx.font = '8px "Segoe UI", sans-serif';
    ctx.fillStyle = "#78827d";
    ctx.strokeStyle = "#e2e6e2";
    ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach((mark) => {
      const y = pad.top + chartHeight - (mark / 100) * chartHeight;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillText(String(mark), 8, y + 3);
    });
    const groupWidth = chartWidth / inspected.length;
    inspected.forEach((clip, index) => {
      const values = [clip.metrics.overall_quality, clip.metrics.transcript_coverage, clip.metrics.highlight_fit];
      const colors = ["#3ca6b0", "#bde34a", "#e6b73e"];
      const barWidth = Math.min(22, groupWidth / 5);
      values.forEach((value, valueIndex) => {
        const x = pad.left + index * groupWidth + groupWidth / 2 + (valueIndex - 1) * (barWidth + 3) - barWidth / 2;
        const barHeight = value * chartHeight;
        ctx.fillStyle = colors[valueIndex];
        ctx.fillRect(x, pad.top + chartHeight - barHeight, barWidth, barHeight);
      });
      ctx.fillStyle = "#4f5a54";
      ctx.textAlign = "center";
      const label = clip.id.replace(/-.*/, "").toUpperCase();
      ctx.fillText(label, pad.left + index * groupWidth + groupWidth / 2, height - 24);
      ctx.fillText(`${Math.round(clip.metrics.overall_quality * 100)}%`, pad.left + index * groupWidth + groupWidth / 2, height - 10);
    });
    ctx.textAlign = "left";
  }

  async function initOverview() {
    await loadClips();
    let risk = "all";
    let sort = "quality-desc";

    function render() {
      const clips = allClips();
      const report = E.inspectAll(clips);
      const totalDuration = clips.reduce((sum, clip) => sum + clip.duration_sec, 0);
      byId("portfolioClipCount").textContent = String(report.aggregate.clip_count);
      byId("totalDurationMetric").textContent = String(totalDuration);
      byId("avgQualityMetric").textContent = pct(report.aggregate.avg_quality);
      byId("avgCaptionMetric").textContent = pct(report.aggregate.avg_transcript_coverage);
      let entries = report.clips.map((inspection) => ({ inspection, clip: clips.find((clip) => clip.id === inspection.id) }));
      if (risk === "high") entries = entries.filter(({ inspection }) => inspection.issues.some((issue) => issue.severity === "high"));
      if (risk === "medium") entries = entries.filter(({ inspection }) => inspection.issues.length && !inspection.issues.some((issue) => issue.severity === "high"));
      if (sort === "quality-desc") entries.sort((a, b) => b.inspection.metrics.overall_quality - a.inspection.metrics.overall_quality);
      if (sort === "issues-desc") entries.sort((a, b) => b.inspection.issues.length - a.inspection.issues.length);
      if (sort === "duration-desc") entries.sort((a, b) => b.clip.duration_sec - a.clip.duration_sec);
      byId("clipCount").textContent = `${entries.length} CLIPS`;
      byId("clipLibrary").innerHTML = entries.length ? entries.map(({ clip, inspection }) => `
        <article class="media-card">
          <div class="media-thumb"><img src="${POSTERS[clip.id]}" alt="${escapeHtml(clip.title)} 封面"><span class="status-chip neutral media-format">${escapeHtml(clip.format.toUpperCase())}</span><span class="media-duration">${formatTime(clip.duration_sec)}</span></div>
          <div class="media-body"><div class="media-title-row"><h2>${escapeHtml(clip.title)}</h2><strong>${pct(inspection.metrics.overall_quality)}</strong></div><p>${escapeHtml(clip.description)}</p>
            <div class="quality-line"><span>字幕覆盖</span><span class="quality-track"><i style="width:${inspection.metrics.transcript_coverage * 100}%"></i></span><strong>${pct(inspection.metrics.transcript_coverage)}</strong></div>
            <div class="quality-line"><span>高光适配</span><span class="quality-track"><i style="width:${inspection.metrics.highlight_fit * 100}%"></i></span><strong>${pct(inspection.metrics.highlight_fit)}</strong></div>
          </div>
          <div class="media-actions"><a class="button button-primary" href="review.html?clip=${clip.id}"><i data-lucide="play"></i>审阅镜头</a><a class="button" href="highlights.html?clip=${clip.id}"><i data-lucide="scissors"></i>调整高光</a></div>
        </article>`).join("") : '<div class="empty-state">当前筛选下没有视频</div>';
      const issues = report.clips.flatMap((clip) => clip.issues.map((issue) => ({ ...issue, clipId: clip.id, title: clip.title })))
        .sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
      byId("issueCount").textContent = `${issues.length} ISSUES`;
      byId("issueFeed").innerHTML = issues.slice(0, 7).map((issue) => `<div class="issue-row"><span class="issue-icon ${issue.severity === "high" ? "high" : ""}"><i data-lucide="${issue.severity === "high" ? "captions-off" : "triangle-alert"}"></i></span><div><strong>${escapeHtml(issue.title)} · ${ISSUE_LABELS[issue.type] || issue.type}</strong><small>${escapeHtml(issue.message)}</small></div><a class="row-link" href="review.html?clip=${issue.clipId}" title="打开审阅" aria-label="打开 ${escapeHtml(issue.title)}"><i data-lucide="arrow-up-right"></i></a></div>`).join("");
      drawPortfolioChart(report.clips);
      refreshIcons();
    }

    byId("riskFilter").addEventListener("change", (event) => { risk = event.target.value; render(); });
    byId("sortClips").addEventListener("change", (event) => { sort = event.target.value; render(); });
    globalThis.addEventListener("resize", () => drawPortfolioChart(E.inspectAll(allClips()).clips));
    render();
  }

  async function initReview() {
    await loadClips();
    const select = byId("reviewClipSelect");
    populateClipSelect(select);
    const params = new URLSearchParams(location.search);
    const requested = params.get("clip");
    if (requested && baseClips.some((clip) => clip.id === requested)) setClip(requested, true);
    const requestedTime = Number(params.get("time"));
    if (Number.isFinite(requestedTime) && requestedTime >= 0) state.currentTime = requestedTime;
    select.value = state.clipId;
    byId("speedSelect").value = String(state.speed);
    let playing = false;
    let timer = null;

    function current() { return clipById(state.clipId); }
    function stop() {
      playing = false;
      clearInterval(timer);
      timer = null;
    }
    function play() {
      if (playing) return;
      playing = true;
      timer = setInterval(() => {
        const clip = current();
        state.currentTime += 0.25 * state.speed;
        if (state.currentTime >= clip.duration_sec) { state.currentTime = clip.duration_sec; stop(); }
        render();
      }, 250);
    }
    function seekScene(index) {
      const clip = current();
      const scene = clip.scenes[Math.max(0, Math.min(index, clip.scenes.length - 1))];
      state.currentTime = scene.start;
      saveState();
      render();
    }

    function render() {
      const clip = current();
      state.currentTime = Math.max(0, Math.min(state.currentTime, clip.duration_sec));
      const index = sceneAtTime(clip, state.currentTime);
      const scene = clip.scenes[index];
      const inspection = E.inspectClip(clip);
      const status = byId("reviewStatus");
      status.className = `status-chip ${severityClass(inspection.issues)}`;
      status.textContent = severityLabel(inspection.issues);
      byId("reviewSubtitle").textContent = `FRAME ${String(index + 1).padStart(2, "0")} · ${scene.label.toUpperCase()} · ${formatTime(state.currentTime)}`;
      byId("reviewClipTitle").textContent = clip.title;
      byId("reviewQuality").textContent = pct(inspection.metrics.overall_quality);
      byId("reviewSceneCount").textContent = String(inspection.metrics.scene_count);
      byId("reviewCaption").textContent = pct(inspection.metrics.transcript_coverage);
      byId("reviewHighlights").textContent = pct(inspection.metrics.highlight_ratio);
      const poster = byId("reviewPoster");
      poster.src = POSTERS[clip.id];
      poster.alt = `${clip.title} 当前镜头`;
      poster.style.objectPosition = ["50% 40%", "42% 48%", "58% 50%", "48% 58%", "62% 45%", "38% 52%"][index % 6];
      byId("frameCode").textContent = `${scene.id.toUpperCase()} · ${scene.label.toUpperCase()}`;
      byId("frameTime").textContent = `${formatTime(state.currentTime)} / ${formatTime(clip.duration_sec)}`;
      const ocr = byId("ocrBadge");
      ocr.textContent = scene.ocr ? `OCR · ${scene.ocr}` : "NO OCR";
      ocr.style.background = scene.ocr ? "" : "#e46558";
      ocr.style.color = scene.ocr ? "" : "#fff";
      const caption = byId("captionText");
      caption.textContent = scene.transcript || "CAPTION GAP · 当前镜头缺少字幕";
      caption.style.background = scene.transcript ? "" : "rgba(159, 35, 45, .9)";
      const scrubber = byId("scrubber");
      scrubber.max = String(clip.duration_sec);
      scrubber.value = String(state.currentTime);
      byId("scrubberScene").textContent = `${scene.id.toUpperCase()} · ${scene.label.toUpperCase()}`;
      byId("timeReadout").textContent = `${formatTime(state.currentTime)} / ${formatTime(clip.duration_sec)}`;
      byId("playPause").innerHTML = `<i data-lucide="${playing ? "pause" : "play"}"></i>`;
      byId("playPause").title = playing ? "暂停" : "播放";
      byId("playPause").setAttribute("aria-label", playing ? "暂停" : "播放");
      byId("sceneLane").innerHTML = clip.scenes.map((item, itemIndex) => `<button class="scene-segment ${itemIndex === index ? "active" : ""}" type="button" data-scene-index="${itemIndex}" style="flex:${item.end - item.start}" title="${item.id} · ${item.label}">${escapeHtml(item.label.toUpperCase())}</button>`).join("");
      byId("reviewHighlightLane").innerHTML = clip.highlights.map((item) => `<i class="highlight-window" style="left:${item.start / clip.duration_sec * 100}%;width:${(item.end - item.start) / clip.duration_sec * 100}%" title="${escapeHtml(item.reason)}"></i>`).join("");
      byId("sceneListCount").textContent = `${clip.scenes.length} SCENES`;
      byId("sceneList").innerHTML = clip.scenes.map((item, itemIndex) => `<button class="scene-row ${itemIndex === index ? "active" : ""}" type="button" data-scene-index="${itemIndex}"><span class="scene-index">${String(itemIndex + 1).padStart(2, "0")}</span><span><strong>${escapeHtml(item.id)} · ${escapeHtml(item.label)}</strong><small>${escapeHtml(item.visual)}</small></span><time>${formatTime(item.start)}</time></button>`).join("");
      byId("frameWindow").textContent = `${formatTime(scene.start)} — ${formatTime(scene.end)}`;
      byId("visualText").textContent = scene.visual;
      byId("audioText").textContent = scene.audio || "NONE";
      byId("objectText").textContent = scene.objects.join(" · ") || "NONE";
      byId("ocrText").textContent = scene.ocr || "MISSING";
      byId("recommendationTitle").textContent = inspection.issues.length ? `${inspection.issues.length} 个问题待复核` : "当前结构稳定";
      byId("recommendationText").textContent = inspection.recommendations[0];
      byId("previousScene").disabled = index === 0;
      byId("nextScene").disabled = index === clip.scenes.length - 1;
      byId("sceneLane").querySelectorAll("[data-scene-index]").forEach((button) => button.addEventListener("click", () => { stop(); seekScene(Number(button.dataset.sceneIndex)); }));
      byId("sceneList").querySelectorAll("[data-scene-index]").forEach((button) => button.addEventListener("click", () => { stop(); seekScene(Number(button.dataset.sceneIndex)); }));
      refreshIcons();
    }

    select.addEventListener("change", (event) => { stop(); setClip(event.target.value, true); render(); });
    byId("speedSelect").addEventListener("change", (event) => { state.speed = Number(event.target.value); saveState(); });
    byId("playPause").addEventListener("click", () => { if (playing) stop(); else { if (state.currentTime >= current().duration_sec) state.currentTime = 0; play(); } render(); });
    byId("previousScene").addEventListener("click", () => { stop(); seekScene(sceneAtTime(current(), state.currentTime) - 1); });
    byId("nextScene").addEventListener("click", () => { stop(); seekScene(sceneAtTime(current(), state.currentTime) + 1); });
    byId("scrubber").addEventListener("input", (event) => { stop(); state.currentTime = Number(event.target.value); saveState(); render(); });
    byId("exportReview").addEventListener("click", () => exportClip(current(), "review"));
    document.addEventListener("keydown", (event) => {
      if (["INPUT", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (event.code === "Space") { event.preventDefault(); byId("playPause").click(); }
      if (event.code === "ArrowLeft") byId("previousScene").click();
      if (event.code === "ArrowRight") byId("nextScene").click();
    });
    globalThis.addEventListener("pagehide", () => { stop(); saveState(); });
    render();
  }

  async function initCoverage() {
    await loadClips();
    const scope = byId("coverageScope");
    populateClipSelect(scope, true);
    const params = new URLSearchParams(location.search);
    const requested = params.get("clip");
    scope.value = requested && baseClips.some((clip) => clip.id === requested) ? requested : "all";
    let query = "";

    function selectedClips() { return scope.value === "all" ? allClips() : [clipById(scope.value)]; }
    function render() {
      const clips = selectedClips();
      const scenes = clips.flatMap((clip) => clip.scenes.map((scene) => ({ clip, scene })));
      const missingCaption = scenes.filter(({ scene }) => !String(scene.transcript || "").trim()).length;
      const ocrFilled = scenes.filter(({ scene }) => String(scene.ocr || "").trim()).length;
      const audioFilled = scenes.filter(({ scene }) => String(scene.audio || "").trim()).length;
      byId("coverageSceneMetric").textContent = String(scenes.length);
      byId("missingCaptionMetric").textContent = String(missingCaption);
      byId("ocrCoverageMetric").textContent = pct(ocrFilled / Math.max(scenes.length, 1));
      byId("audioCoverageMetric").textContent = pct(audioFilled / Math.max(scenes.length, 1));
      const normalized = query.trim().toLowerCase();
      const filtered = scenes.filter(({ scene, clip }) => !normalized || [clip.title, scene.id, scene.label, scene.visual, scene.transcript, scene.ocr, scene.audio, ...(scene.objects || [])].join(" ").toLowerCase().includes(normalized));
      byId("coverageResultCount").textContent = `${filtered.length} SCENES`;
      byId("coverageScopeLabel").textContent = scope.value === "all" ? "ALL CLIPS" : clipById(scope.value).id.toUpperCase();
      byId("coverageRows").innerHTML = filtered.length ? filtered.map(({ clip, scene }) => {
        const complete = Boolean(scene.transcript && scene.ocr && scene.audio);
        return `<div class="coverage-row"><div><strong>${escapeHtml(scene.id)}</strong><small>${escapeHtml(clip.title)}</small></div><span class="coverage-status ${complete ? "" : "missing"}"><i data-lucide="${complete ? "check" : "triangle-alert"}"></i></span><div class="coverage-copy ${scene.transcript ? "" : "missing"}">${escapeHtml(scene.transcript || "MISSING CAPTION")}</div><div class="coverage-copy ${scene.ocr ? "" : "missing"}">${escapeHtml(scene.ocr || "NO OCR")}</div><div class="coverage-copy ${scene.audio ? "" : "missing"}">${escapeHtml(scene.audio || "NO AUDIO")}</div><a class="row-link" href="review.html?clip=${clip.id}&time=${scene.start}" title="打开镜头" aria-label="打开 ${scene.id}"><i data-lucide="play"></i></a></div>`;
      }).join("") : '<div class="empty-state">没有匹配的镜头信号</div>';
      const transcriptCoverage = 1 - missingCaption / Math.max(scenes.length, 1);
      const coverages = [["字幕覆盖", transcriptCoverage], ["OCR 覆盖", ocrFilled / Math.max(scenes.length, 1)], ["音频覆盖", audioFilled / Math.max(scenes.length, 1)]];
      byId("coverageProfileLabel").textContent = scope.value === "all" ? "AGGREGATE" : "SINGLE CLIP";
      byId("coverageBars").innerHTML = coverages.map(([label, value]) => `<div class="coverage-bar"><header><span>${label}</span><strong>${pct(value)}</strong></header><div class="coverage-track"><i style="width:${value * 100}%"></i></div></div>`).join("");
      const terms = new Map();
      scenes.forEach(({ scene }) => [...(scene.objects || []), ...String(scene.ocr || "").toLowerCase().split(/\s+/)].forEach((term) => {
        const clean = term.replace(/[^a-z0-9%-]/g, "");
        if (clean.length > 2 && !STOP_WORDS.has(clean)) terms.set(clean, (terms.get(clean) || 0) + 1);
      }));
      const topTerms = [...terms.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 16);
      byId("termCount").textContent = `${topTerms.length} TERMS`;
      byId("termList").innerHTML = topTerms.map(([term, count]) => `<span class="term-chip">${escapeHtml(term)} · ${count}</span>`).join("");
      const gaps = scenes.flatMap(({ scene, clip }) => [
        ...(!scene.transcript ? [{ severity: "high", title: `${clip.title} · ${scene.id}`, message: "字幕轨为空，无法形成完整转写索引。" }] : []),
        ...(!scene.ocr ? [{ severity: "medium", title: `${clip.title} · ${scene.id}`, message: "OCR 为空，画面关键词不可检索。" }] : []),
      ]);
      byId("gapCount").textContent = `${gaps.length} GAPS`;
      byId("gapList").innerHTML = gaps.length ? gaps.map((gap) => `<div class="issue-row"><span class="issue-icon ${gap.severity === "high" ? "high" : ""}"><i data-lucide="${gap.severity === "high" ? "captions-off" : "scan-text"}"></i></span><div><strong>${escapeHtml(gap.title)}</strong><small>${escapeHtml(gap.message)}</small></div></div>`).join("") : '<div class="empty-state">当前范围没有覆盖缺口</div>';
      refreshIcons();
    }

    scope.addEventListener("change", () => { if (scope.value !== "all") setClip(scope.value, false); render(); });
    byId("coverageSearch").addEventListener("input", (event) => { query = event.target.value; render(); });
    byId("exportCoverage").addEventListener("click", () => {
      const clips = selectedClips();
      const content = clips.map((clip) => E.clipReportMarkdown(clip)).join("\n\n---\n\n");
      downloadMarkdown(scope.value === "all" ? "video-insight-coverage-report.md" : `video-insight-${scope.value}-coverage.md`, content);
      showToast("覆盖诊断报告已导出");
    });
    render();
  }

  async function initHighlights() {
    await loadClips();
    const select = byId("highlightClipSelect");
    populateClipSelect(select);
    const params = new URLSearchParams(location.search);
    const requested = params.get("clip");
    if (requested && baseClips.some((clip) => clip.id === requested)) setClip(requested, false);
    select.value = state.clipId;

    function current() { return clipById(state.clipId); }
    function persistHighlights(highlights) {
      state.highlightEdits[state.clipId] = highlights.map((item) => ({ start: Number(item.start), end: Number(item.end), reason: String(item.reason || "highlight") }));
      saveState();
    }
    function render() {
      const clip = current();
      const base = baseClipById(clip.id);
      const inspection = E.inspectClip(clip);
      const baseInspection = E.inspectClip(base);
      const selectedDuration = clip.highlights.reduce((sum, item) => sum + item.end - item.start, 0);
      const ratio = inspection.metrics.highlight_ratio;
      byId("highlightSubtitle").textContent = `${clip.highlights.length} WINDOWS · ${selectedDuration}s SELECTED · LOCAL EDIT`;
      byId("highlightRatioMetric").textContent = pct(ratio);
      byId("highlightFitMetric").textContent = pct(inspection.metrics.highlight_fit);
      byId("highlightQualityMetric").textContent = pct(inspection.metrics.overall_quality);
      byId("selectedDurationMetric").textContent = String(selectedDuration);
      byId("highlightClipTitle").textContent = clip.title;
      byId("reelPoster").src = POSTERS[clip.id];
      byId("reelPoster").alt = `${clip.title} 高光剪辑预览`;
      byId("reelTitle").textContent = `${clip.highlights.length} 段高光 · ${selectedDuration} 秒`;
      byId("reelSubtitle").textContent = inspection.recommendations[0];
      byId("cutDuration").textContent = formatTime(clip.duration_sec);
      const density = byId("densityStatus");
      density.className = "status-chip";
      if (ratio > 0.55) { density.textContent = "TOO DENSE"; density.classList.add("warning"); }
      else if (ratio >= 0.18 && ratio <= 0.42) density.textContent = "BALANCED";
      else { density.textContent = "REVIEW"; density.classList.add("neutral"); }
      byId("cutRuler").innerHTML = [
        ...clip.scenes.map((scene) => `<span class="cut-scene" style="left:${scene.start / clip.duration_sec * 100}%;width:${(scene.end - scene.start) / clip.duration_sec * 100}%">${escapeHtml(scene.label.toUpperCase())}</span>`),
        ...clip.highlights.map((item, index) => `<span class="cut-window ${index === 0 ? "active" : ""}" style="left:${item.start / clip.duration_sec * 100}%;width:${(item.end - item.start) / clip.duration_sec * 100}%">${escapeHtml(item.reason)}</span>`),
      ].join("");
      byId("highlightWindowCount").textContent = `${clip.highlights.length} WINDOWS`;
      byId("highlightEditor").innerHTML = clip.highlights.length ? clip.highlights.map((item, index) => `<div class="highlight-edit-row" data-index="${index}"><span class="edit-index">${String(index + 1).padStart(2, "0")}</span><label><span>入点 / S</span><input type="number" min="0" max="${clip.duration_sec - 1}" step="1" value="${item.start}" data-field="start" aria-label="第 ${index + 1} 段入点"></label><label><span>出点 / S</span><input type="number" min="1" max="${clip.duration_sec}" step="1" value="${item.end}" data-field="end" aria-label="第 ${index + 1} 段出点"></label><label><span>片段标签</span><input type="text" value="${escapeHtml(item.reason)}" data-field="reason" aria-label="第 ${index + 1} 段标签"></label><button class="icon-button button-danger" type="button" data-delete="${index}" title="删除窗口" aria-label="删除第 ${index + 1} 段"><i data-lucide="trash-2"></i></button></div>`).join("") : '<div class="empty-state">当前没有高光窗口</div>';
      const highlightIssues = inspection.issues.filter((issue) => issue.type.startsWith("highlight"));
      byId("cutIssueCount").textContent = `${highlightIssues.length} ISSUES`;
      byId("cutIssueSummary").innerHTML = [
        ["原始高光密度", pct(baseInspection.metrics.highlight_ratio)],
        ["当前高光密度", pct(inspection.metrics.highlight_ratio)],
        ["质量分变化", `${pct(baseInspection.metrics.overall_quality)} → ${pct(inspection.metrics.overall_quality)}`],
        ["高光问题", highlightIssues.length ? highlightIssues.map((issue) => ISSUE_LABELS[issue.type]).join(" / ") : "NONE"],
      ].map(([label, value]) => `<div class="issue-summary-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
      byId("cutRecommendationTitle").textContent = highlightIssues.length ? "建议继续收紧窗口" : "高光密度处于可用区间";
      byId("cutRecommendationText").textContent = inspection.recommendations.find((item) => item.includes("高光")) || inspection.recommendations[0];
      byId("previewHighlight").href = `review.html?clip=${clip.id}&time=${clip.highlights[0]?.start || 0}`;
      refreshIcons();
    }

    select.addEventListener("change", (event) => { setClip(event.target.value, false); render(); });
    byId("highlightEditor").addEventListener("change", (event) => {
      const input = event.target.closest("input[data-field]");
      if (!input) return;
      const row = input.closest("[data-index]");
      const index = Number(row.dataset.index);
      const clip = current();
      const highlights = E.cloneClip(clip.highlights);
      if (input.dataset.field === "reason") highlights[index].reason = input.value.trim() || "highlight";
      if (input.dataset.field === "start") highlights[index].start = Math.max(0, Math.min(Number(input.value), highlights[index].end - 1));
      if (input.dataset.field === "end") highlights[index].end = Math.min(clip.duration_sec, Math.max(Number(input.value), highlights[index].start + 1));
      highlights.sort((a, b) => a.start - b.start);
      persistHighlights(highlights); render();
    });
    byId("highlightEditor").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-delete]");
      if (!button) return;
      const highlights = E.cloneClip(current().highlights);
      highlights.splice(Number(button.dataset.delete), 1);
      persistHighlights(highlights); render(); showToast("高光窗口已删除");
    });
    byId("addHighlight").addEventListener("click", () => {
      const clip = current();
      const highlights = E.cloneClip(clip.highlights).sort((a, b) => a.start - b.start);
      let cursor = 0;
      let windowStart = null;
      for (const item of highlights) {
        if (item.start - cursor >= 6) { windowStart = cursor; break; }
        cursor = Math.max(cursor, item.end);
      }
      if (windowStart === null && clip.duration_sec - cursor >= 6) windowStart = cursor;
      if (windowStart === null) { showToast("没有足够的空白区间可添加 6 秒窗口"); return; }
      highlights.push({ start: windowStart, end: Math.min(windowStart + 6, clip.duration_sec), reason: "new highlight" });
      highlights.sort((a, b) => a.start - b.start);
      persistHighlights(highlights); render(); showToast("已添加 6 秒高光窗口");
    });
    byId("resetHighlights").addEventListener("click", () => { delete state.highlightEdits[state.clipId]; saveState(); render(); showToast("已恢复原始高光窗口"); });
    byId("exportHighlights").addEventListener("click", () => exportClip(current(), "highlight-cut"));
    render();
  }

  async function start() {
    if (!E || !baseClips.length) return;
    const page = document.body.dataset.page;
    if (page === "overview") await initOverview();
    if (page === "review") await initReview();
    if (page === "coverage") await initCoverage();
    if (page === "highlights") await initHighlights();
    refreshIcons();
  }

  start().catch((error) => {
    console.error(error);
    showToast("页面初始化失败，请刷新后重试");
  });
}());
