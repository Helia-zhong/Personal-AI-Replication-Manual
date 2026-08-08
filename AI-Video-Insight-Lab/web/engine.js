(function (root) {
  "use strict";

  function cloneClip(clip) {
    return JSON.parse(JSON.stringify(clip));
  }

  function clipDuration(clip) {
    return Number(clip.duration_sec);
  }

  function sceneDuration(scene) {
    return Number(scene.end - scene.start);
  }

  function sceneBalanceScore(clip) {
    const average = clipDuration(clip) / Math.max(clip.scenes.length, 1);
    if (average >= 5 && average <= 14) return 1;
    if (average >= 4 && average <= 18) return 0.72;
    if (average > 20) return 0.35;
    return 0.58;
  }

  function highlightRatio(clip) {
    const total = clip.highlights.reduce((sum, item) => sum + (item.end - item.start), 0);
    return total / Math.max(clipDuration(clip), 1);
  }

  function highlightFitScore(clip) {
    const ratio = highlightRatio(clip);
    if (ratio >= 0.18 && ratio <= 0.42) return 1;
    if (ratio >= 0.12 && ratio <= 0.55) return 0.72;
    if (ratio < 0.12) return 0.4;
    return 0.5;
  }

  function coverageScore(clip, key) {
    const filled = clip.scenes.filter((scene) => String(scene[key] || "").trim()).length;
    return filled / Math.max(clip.scenes.length, 1);
  }

  function transcriptDensity(clip) {
    const textLength = clip.scenes.reduce((sum, scene) => sum + String(scene.transcript || "").trim().length, 0);
    return textLength / Math.max(clipDuration(clip), 1);
  }

  function issueList(clip) {
    const issues = [];
    const missingTranscript = clip.scenes.filter((scene) => !String(scene.transcript || "").trim()).map((scene) => scene.id);
    const missingOcr = clip.scenes.filter((scene) => !String(scene.ocr || "").trim()).map((scene) => scene.id);
    const longScenes = clip.scenes.filter((scene) => sceneDuration(scene) >= 18).map((scene) => scene.id);
    const ratio = highlightRatio(clip);
    if (missingTranscript.length) issues.push({ severity: "high", type: "missing_caption", message: `字幕缺失镜头：${missingTranscript.join(", ")}。` });
    if (missingOcr.length >= Math.max(Math.floor(clip.scenes.length / 2), 2)) issues.push({ severity: "medium", type: "ocr_sparse", message: "OCR 覆盖偏低，难以用于关键词检索。" });
    if (longScenes.length) issues.push({ severity: "medium", type: "long_scene", message: `存在过长镜头：${longScenes.join(", ")}。` });
    if (ratio > 0.5) issues.push({ severity: "medium", type: "highlight_overflow", message: "高光窗口过密，成片节奏会偏散。" });
    if (ratio < 0.12) issues.push({ severity: "medium", type: "highlight_sparse", message: "高光窗口偏少，适合补入更强的片段。" });
    if (coverageScore(clip, "audio") < 0.5) issues.push({ severity: "low", type: "audio_sparse", message: "音频事件信息较少，可补充解说或环境音标注。" });
    return issues;
  }

  function recommendActions(clip) {
    const types = new Set(issueList(clip).map((issue) => issue.type));
    const recommendations = [];
    if (types.has("missing_caption")) recommendations.push("补齐字幕并对空段进行人工转写。");
    if (types.has("ocr_sparse")) recommendations.push("为关键镜头增加 OCR 或画面文字标注。");
    if (types.has("long_scene")) recommendations.push("把过长镜头拆短，增强节奏变化。");
    if (types.has("highlight_overflow")) recommendations.push("收紧高光窗口，只保留信息密度最高的片段。");
    if (!recommendations.length) recommendations.push("当前 clip 结构稳定，可继续扩充相似风格样例。");
    return recommendations;
  }

  function inspectClip(clip) {
    const total = clipDuration(clip);
    const transcriptCoverage = coverageScore(clip, "transcript");
    const ocrCoverage = coverageScore(clip, "ocr");
    const audioCoverage = coverageScore(clip, "audio");
    const sceneBalance = sceneBalanceScore(clip);
    const highlightFit = highlightFitScore(clip);
    const overall = Number((0.3 * transcriptCoverage + 0.18 * ocrCoverage + 0.2 * highlightFit + 0.17 * sceneBalance + 0.15 * audioCoverage).toFixed(4));
    return {
      id: clip.id, title: clip.title, duration_sec: total, format: clip.format, theme: clip.theme,
      description: clip.description, highlights: cloneClip(clip.highlights),
      metrics: {
        scene_count: clip.scenes.length,
        transcript_coverage: Number(transcriptCoverage.toFixed(4)),
        ocr_coverage: Number(ocrCoverage.toFixed(4)),
        audio_coverage: Number(audioCoverage.toFixed(4)),
        highlight_ratio: Number(highlightRatio(clip).toFixed(4)),
        highlight_fit: Number(highlightFit.toFixed(4)),
        scene_balance: Number(sceneBalance.toFixed(4)),
        transcript_density: Number(transcriptDensity(clip).toFixed(4)),
        overall_quality: overall,
      },
      issues: issueList(clip), recommendations: recommendActions(clip),
      scenes: clip.scenes.map((scene) => ({
        ...cloneClip(scene), duration_sec: sceneDuration(scene),
        start_ratio: Number((scene.start / total).toFixed(4)),
        end_ratio: Number((scene.end / total).toFixed(4)),
      })),
    };
  }

  function buildTimeline(clip) {
    return clip.scenes.map((scene) => ({ id: scene.id, label: scene.label, start: scene.start, end: scene.end, duration_sec: sceneDuration(scene) }));
  }

  function inspectAll(clips) {
    const inspected = clips.map(inspectClip);
    return {
      aggregate: {
        clip_count: inspected.length,
        avg_quality: Number((inspected.reduce((sum, clip) => sum + clip.metrics.overall_quality, 0) / Math.max(inspected.length, 1)).toFixed(4)),
        avg_transcript_coverage: Number((inspected.reduce((sum, clip) => sum + clip.metrics.transcript_coverage, 0) / Math.max(inspected.length, 1)).toFixed(4)),
        avg_highlight_ratio: Number((inspected.reduce((sum, clip) => sum + clip.metrics.highlight_ratio, 0) / Math.max(inspected.length, 1)).toFixed(4)),
        risky_clips: inspected.filter((clip) => clip.issues.length).map((clip) => clip.id),
      },
      clips: inspected,
    };
  }

  function clipReportMarkdown(clip, inspection = inspectClip(clip)) {
    const pct = (value) => `${Math.round(value * 100)}%`;
    const metrics = inspection.metrics;
    const lines = [
      `# ${clip.title}`, "", `- Duration: ${clip.duration_sec}s`, `- Format: ${clip.format}`,
      `- Theme: ${clip.theme}`, `- Overall quality: ${pct(metrics.overall_quality)}`, "", "## Summary",
      clip.description, "", "## Metrics", "| Metric | Value |", "| --- | ---: |",
      `| Scene count | ${metrics.scene_count} |`, `| Transcript coverage | ${pct(metrics.transcript_coverage)} |`,
      `| OCR coverage | ${pct(metrics.ocr_coverage)} |`, `| Audio coverage | ${pct(metrics.audio_coverage)} |`,
      `| Highlight ratio | ${pct(metrics.highlight_ratio)} |`, `| Highlight fit | ${pct(metrics.highlight_fit)} |`,
      `| Scene balance | ${pct(metrics.scene_balance)} |`, `| Transcript density | ${metrics.transcript_density} |`, "", "## Issues",
      ...(inspection.issues.length ? inspection.issues.map((issue) => `- ${issue.severity}: ${issue.type} - ${issue.message}`) : ["- No major issues detected."]),
      "", "## Recommendations", ...inspection.recommendations.map((item) => `- ${item}`), "", "## Scenes",
      "| Scene | Window | Duration | Visual | Transcript |", "| --- | --- | ---: | --- | --- |",
      ...inspection.scenes.map((scene) => `| ${scene.id} | ${scene.start}s-${scene.end}s | ${scene.duration_sec}s | ${scene.visual} | ${scene.transcript || "none"} |`),
      "", "## Highlights", ...clip.highlights.map((item) => `- ${item.start}s-${item.end}s: ${item.reason}`),
    ];
    return `${lines.join("\n").trim()}\n`;
  }

  root.VideoInsightEngine = {
    cloneClip, clipDuration, sceneDuration, sceneBalanceScore, highlightRatio, highlightFitScore,
    coverageScore, transcriptDensity, issueList, recommendActions, inspectClip, buildTimeline,
    inspectAll, clipReportMarkdown,
  };
}(typeof globalThis !== "undefined" ? globalThis : this));
