from __future__ import annotations

import sys
from pathlib import Path
import unittest


PROJECT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_DIR / "backend"))

from video_lab import clip_report_markdown, get_clip, inspect_all, inspect_clip


class VideoLabTests(unittest.TestCase):
    def test_inspect_all_reports_all_clips(self) -> None:
        report = inspect_all()
        self.assertEqual(report["aggregate"]["clip_count"], 4)
        self.assertGreaterEqual(len(report["aggregate"]["risky_clips"]), 1)

    def test_known_clip_flags_expected_issues(self) -> None:
        clip = get_clip("webinar-cutdown")
        inspection = inspect_clip(clip)
        issue_types = {issue["type"] for issue in inspection["issues"]}
        self.assertIn("missing_caption", issue_types)
        self.assertIn("long_scene", issue_types)
        self.assertIn("highlight_overflow", issue_types)

    def test_report_contains_scene_table(self) -> None:
        clip = get_clip("launch-teaser")
        report = clip_report_markdown(clip, inspect_clip(clip))
        self.assertIn("# Product Launch Teaser", report)
        self.assertIn("## Scenes", report)
        self.assertIn("| Scene | Window | Duration | Visual | Transcript |", report)


if __name__ == "__main__":
    unittest.main()
