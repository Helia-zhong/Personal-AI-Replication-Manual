from __future__ import annotations

import sys
from pathlib import Path
import unittest


PROJECT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_DIR / "backend"))

from connect_four import AI, HUMAN, analyze_board, build_report, deserialize_board, serialize_board, winning_move


class ConnectFourTests(unittest.TestCase):
    def test_deserialize_board_round_trip(self) -> None:
        board = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [1, 2, 1, 2, 0, 0, 0],
        ]
        self.assertEqual(deserialize_board(serialize_board(board)), board)

    def test_winning_move_detects_horizontal_line(self) -> None:
        board = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [HUMAN, HUMAN, HUMAN, HUMAN, 0, 0, 0],
        ]
        self.assertTrue(winning_move(board, HUMAN))
        self.assertFalse(winning_move(board, AI))

    def test_analysis_prioritizes_blocking_the_threat(self) -> None:
        board = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [HUMAN, HUMAN, HUMAN, 0, AI, 0, 0],
        ]
        analysis = analyze_board(board, depth=4)
        self.assertEqual(analysis["best_move"]["column"], 3)
        self.assertEqual(analysis["threats"]["human_threats"], [3])

    def test_report_includes_board_key_and_table(self) -> None:
        board = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 0, 2, 0, 0],
        ]
        analysis = analyze_board(board, depth=4)
        report = build_report("Sample", analysis, history=["Loaded challenge"])
        self.assertIn("Board key:", report)
        self.assertIn("| Column | Score | Immediate win |", report)
        self.assertIn("Loaded challenge", report)


if __name__ == "__main__":
    unittest.main()
