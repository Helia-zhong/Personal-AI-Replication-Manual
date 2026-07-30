from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = PROJECT_DIR / "data" / "clips.json"


def load_clips() -> list[dict[str, Any]]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def get_clip(clip_id: str) -> dict[str, Any]:
    for clip in load_clips():
        if clip["id"] == clip_id:
            return clip
    raise KeyError(f"Clip not found: {clip_id}")


def clip_duration(clip: dict[str, Any]) -> int:
    return int(clip["duration_sec"])


def scene_duration(scene: dict[str, Any]) -> int:
    return int(scene["end"] - scene["start"])


def scene_balance_score(clip: dict[str, Any]) -> float:
    scenes = clip["scenes"]
    average = clip_duration(clip) / max(len(scenes), 1)
    if 5 <= average <= 14:
        return 1.0
    if 4 <= average <= 18:
        return 0.72
    if average > 20:
        return 0.35
    return 0.58


def highlight_ratio(clip: dict[str, Any]) -> float:
    total = sum(item["end"] - item["start"] for item in clip["highlights"])
    return total / max(clip_duration(clip), 1)


def highlight_fit_score(clip: dict[str, Any]) -> float:
    ratio = highlight_ratio(clip)
    if 0.18 <= ratio <= 0.42:
        return 1.0
    if 0.12 <= ratio <= 0.55:
        return 0.72
    if ratio < 0.12:
        return 0.4
    return 0.5


def coverage_score(clip: dict[str, Any], key: str) -> float:
    scenes = clip["scenes"]
    filled = sum(1 for scene in scenes if str(scene.get(key, "")).strip())
    return filled / max(len(scenes), 1)


def transcript_density(clip: dict[str, Any]) -> float:
    text_len = sum(len(scene.get("transcript", "").strip()) for scene in clip["scenes"])
    return text_len / max(clip_duration(clip), 1)


def issue_list(clip: dict[str, Any]) -> list[dict[str, Any]]:
    issues = []
    scenes = clip["scenes"]
    transcript_missing = [scene["id"] for scene in scenes if not str(scene.get("transcript", "")).strip()]
    ocr_missing = [scene["id"] for scene in scenes if not str(scene.get("ocr", "")).strip()]
    long_scenes = [scene["id"] for scene in scenes if scene_duration(scene) >= 18]
    highlight_ratio_value = highlight_ratio(clip)

    if transcript_missing:
        issues.append(
            {
                "severity": "high",
                "type": "missing_caption",
                "message": f"字幕缺失镜头：{', '.join(transcript_missing)}。",
            }
        )
    if len(ocr_missing) >= max(len(scenes) // 2, 2):
        issues.append(
            {
                "severity": "medium",
                "type": "ocr_sparse",
                "message": "OCR 覆盖偏低，难以用于关键词检索。",
            }
        )
    if long_scenes:
        issues.append(
            {
                "severity": "medium",
                "type": "long_scene",
                "message": f"存在过长镜头：{', '.join(long_scenes)}。",
            }
        )
    if highlight_ratio_value > 0.5:
        issues.append(
            {
                "severity": "medium",
                "type": "highlight_overflow",
                "message": "高光窗口过密，成片节奏会偏散。",
            }
        )
    if highlight_ratio_value < 0.12:
        issues.append(
            {
                "severity": "medium",
                "type": "highlight_sparse",
                "message": "高光窗口偏少，适合补入更强的片段。",
            }
        )
    if coverage_score(clip, "audio") < 0.5:
        issues.append(
            {
                "severity": "low",
                "type": "audio_sparse",
                "message": "音频事件信息较少，可补充解说或环境音标注。",
            }
        )
    return issues


def recommend_actions(clip: dict[str, Any]) -> list[str]:
    issues = issue_list(clip)
    recommendations = []
    if any(issue["type"] == "missing_caption" for issue in issues):
        recommendations.append("补齐字幕并对空段进行人工转写。")
    if any(issue["type"] == "ocr_sparse" for issue in issues):
        recommendations.append("为关键镜头增加 OCR 或画面文字标注。")
    if any(issue["type"] == "long_scene" for issue in issues):
        recommendations.append("把过长镜头拆短，增强节奏变化。")
    if any(issue["type"] == "highlight_overflow" for issue in issues):
        recommendations.append("收紧高光窗口，只保留信息密度最高的片段。")
    if not recommendations:
        recommendations.append("当前 clip 结构稳定，可继续扩充相似风格样例。")
    return recommendations


def inspect_clip(clip: dict[str, Any]) -> dict[str, Any]:
    scenes = clip["scenes"]
    total_duration = clip_duration(clip)
    transcript_coverage = coverage_score(clip, "transcript")
    ocr_coverage = coverage_score(clip, "ocr")
    audio_coverage = coverage_score(clip, "audio")
    scene_balance = scene_balance_score(clip)
    highlight_fit = highlight_fit_score(clip)
    density = transcript_density(clip)
    overall = round(
        0.3 * transcript_coverage
        + 0.18 * ocr_coverage
        + 0.2 * highlight_fit
        + 0.17 * scene_balance
        + 0.15 * audio_coverage,
        4,
    )

    scenes_out = []
    for scene in scenes:
        scenes_out.append(
            {
                **scene,
                "duration_sec": scene_duration(scene),
                "start_ratio": round(scene["start"] / total_duration, 4),
                "end_ratio": round(scene["end"] / total_duration, 4),
            }
        )

    return {
        "id": clip["id"],
        "title": clip["title"],
        "duration_sec": total_duration,
        "format": clip["format"],
        "theme": clip["theme"],
        "description": clip["description"],
        "highlights": clip["highlights"],
        "metrics": {
            "scene_count": len(scenes),
            "transcript_coverage": round(transcript_coverage, 4),
            "ocr_coverage": round(ocr_coverage, 4),
            "audio_coverage": round(audio_coverage, 4),
            "highlight_ratio": round(highlight_ratio(clip), 4),
            "highlight_fit": round(highlight_fit, 4),
            "scene_balance": round(scene_balance, 4),
            "transcript_density": round(density, 4),
            "overall_quality": overall,
        },
        "issues": issue_list(clip),
        "recommendations": recommend_actions(clip),
        "scenes": scenes_out,
    }


def build_timeline(clip: dict[str, Any]) -> list[dict[str, Any]]:
    timeline = []
    for scene in clip["scenes"]:
        timeline.append(
            {
                "id": scene["id"],
                "label": scene["label"],
                "start": scene["start"],
                "end": scene["end"],
                "duration_sec": scene_duration(scene),
            }
        )
    return timeline


def clip_report_markdown(clip: dict[str, Any], inspection: dict[str, Any] | None = None) -> str:
    inspection = inspection or inspect_clip(clip)
    metrics = inspection["metrics"]
    pct = lambda value: f"{round(value * 100)}%"
    lines = [
        f"# {clip['title']}",
        "",
        f"- Duration: {clip['duration_sec']}s",
        f"- Format: {clip['format']}",
        f"- Theme: {clip['theme']}",
        f"- Overall quality: {pct(metrics['overall_quality'])}",
        "",
        "## Summary",
        clip["description"],
        "",
        "## Metrics",
        "| Metric | Value |",
        "| --- | ---: |",
    ]
    metric_labels = [
        ("Scene count", metrics["scene_count"]),
        ("Transcript coverage", pct(metrics["transcript_coverage"])),
        ("OCR coverage", pct(metrics["ocr_coverage"])),
        ("Audio coverage", pct(metrics["audio_coverage"])),
        ("Highlight ratio", pct(metrics["highlight_ratio"])),
        ("Highlight fit", pct(metrics["highlight_fit"])),
        ("Scene balance", pct(metrics["scene_balance"])),
        ("Transcript density", metrics["transcript_density"]),
    ]
    for label, value in metric_labels:
        lines.append(f"| {label} | {value} |")

    lines.extend(
        [
            "",
            "## Issues",
        ]
    )
    if inspection["issues"]:
        for issue in inspection["issues"]:
            lines.append(f"- {issue['severity']}: {issue['type']} - {issue['message']}")
    else:
        lines.append("- No major issues detected.")

    lines.extend(
        [
            "",
            "## Recommendations",
            *[f"- {item}" for item in inspection["recommendations"]],
            "",
            "## Scenes",
            "| Scene | Window | Duration | Visual | Transcript |",
            "| --- | --- | ---: | --- | --- |",
        ]
    )
    for scene in inspection["scenes"]:
        transcript = scene["transcript"] or "none"
        lines.append(
            f"| {scene['id']} | {scene['start']}s-{scene['end']}s | {scene['duration_sec']}s | {scene['visual']} | {transcript} |"
        )
    lines.extend(
        [
            "",
            "## Highlights",
        ]
    )
    for item in clip["highlights"]:
        lines.append(f"- {item['start']}s-{item['end']}s: {item['reason']}")
    return "\n".join(lines).strip() + "\n"


def inspect_all() -> dict[str, Any]:
    clips = [inspect_clip(clip) for clip in load_clips()]
    aggregate = {
        "clip_count": len(clips),
        "avg_quality": round(sum(clip["metrics"]["overall_quality"] for clip in clips) / max(len(clips), 1), 4),
        "avg_transcript_coverage": round(sum(clip["metrics"]["transcript_coverage"] for clip in clips) / max(len(clips), 1), 4),
        "avg_highlight_ratio": round(sum(clip["metrics"]["highlight_ratio"] for clip in clips) / max(len(clips), 1), 4),
        "risky_clips": [clip["id"] for clip in clips if clip["issues"]],
    }
    return {"aggregate": aggregate, "clips": clips}
