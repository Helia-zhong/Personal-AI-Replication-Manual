from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = PROJECT_DIR / "data" / "sample_positions.json"
ROWS = 6
COLS = 7
HUMAN = 1
AI = 2


def load_samples() -> list[dict[str, Any]]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def get_sample(sample_id: str) -> dict[str, Any]:
    for sample in load_samples():
        if sample["id"] == sample_id:
            return sample
    raise KeyError(f"Sample not found: {sample_id}")


def clone_board(board: list[list[int]]) -> list[list[int]]:
    return [row[:] for row in board]


def new_board() -> list[list[int]]:
    return [[0 for _ in range(COLS)] for _ in range(ROWS)]


def valid_moves(board: list[list[int]]) -> list[int]:
    return [col for col in range(COLS) if board[0][col] == 0]


def ordered_moves(moves: list[int]) -> list[int]:
    center = COLS // 2
    return sorted(moves, key=lambda col: (abs(center - col), col))


def next_row(board: list[list[int]], col: int) -> int | None:
    for row in range(ROWS - 1, -1, -1):
        if board[row][col] == 0:
            return row
    return None


def drop_piece(board: list[list[int]], col: int, piece: int) -> int:
    row = next_row(board, col)
    if row is None:
        raise ValueError(f"Column {col} is full")
    board[row][col] = piece
    return row


def winning_move(board: list[list[int]], piece: int) -> bool:
    for row in range(ROWS):
        for col in range(COLS - 3):
            if all(board[row][col + offset] == piece for offset in range(4)):
                return True

    for row in range(ROWS - 3):
        for col in range(COLS):
            if all(board[row + offset][col] == piece for offset in range(4)):
                return True

    for row in range(ROWS - 3):
        for col in range(COLS - 3):
            if all(board[row + offset][col + offset] == piece for offset in range(4)):
                return True

    for row in range(3, ROWS):
        for col in range(COLS - 3):
            if all(board[row - offset][col + offset] == piece for offset in range(4)):
                return True

    return False


def board_full(board: list[list[int]]) -> bool:
    return all(cell != 0 for cell in board[0])


def terminal_state(board: list[list[int]]) -> dict[str, Any]:
    if winning_move(board, AI):
        return {"terminal": True, "winner": AI}
    if winning_move(board, HUMAN):
        return {"terminal": True, "winner": HUMAN}
    if board_full(board):
        return {"terminal": True, "winner": 0}
    return {"terminal": False, "winner": 0}


def evaluate_window(window: list[int], piece: int) -> int:
    opponent = HUMAN if piece == AI else AI
    piece_count = window.count(piece)
    opp_count = window.count(opponent)
    empty_count = window.count(0)
    score = 0

    if piece_count == 4:
        score += 1000
    elif piece_count == 3 and empty_count == 1:
        score += 60
    elif piece_count == 2 and empty_count == 2:
        score += 12

    if opp_count == 3 and empty_count == 1:
        score -= 55
    elif opp_count == 2 and empty_count == 2:
        score -= 8

    return score


def score_position(board: list[list[int]], piece: int) -> int:
    score = 0
    center_col = COLS // 2
    center_count = sum(1 for row in range(ROWS) if board[row][center_col] == piece)
    score += center_count * 8

    for row in range(ROWS):
        for col in range(COLS - 3):
            score += evaluate_window([board[row][col + offset] for offset in range(4)], piece)

    for col in range(COLS):
        for row in range(ROWS - 3):
            score += evaluate_window([board[row + offset][col] for offset in range(4)], piece)

    for row in range(ROWS - 3):
        for col in range(COLS - 3):
            score += evaluate_window([board[row + offset][col + offset] for offset in range(4)], piece)

    for row in range(3, ROWS):
        for col in range(COLS - 3):
            score += evaluate_window([board[row - offset][col + offset] for offset in range(4)], piece)

    return score


def immediate_wins(board: list[list[int]], piece: int) -> list[int]:
    wins = []
    for col in valid_moves(board):
        trial = clone_board(board)
        drop_piece(trial, col, piece)
        if winning_move(trial, piece):
            wins.append(col)
    return wins


def minimax(board: list[list[int]], depth: int, alpha: int, beta: int, maximizing: bool) -> dict[str, Any]:
    terminal = terminal_state(board)
    moves = valid_moves(board)
    if depth == 0 or terminal["terminal"]:
        if terminal["terminal"]:
            if terminal["winner"] == AI:
                return {"column": None, "score": 1_000_000}
            if terminal["winner"] == HUMAN:
                return {"column": None, "score": -1_000_000}
            return {"column": None, "score": 0}
        return {"column": None, "score": score_position(board, AI)}

    ordered = ordered_moves(moves)
    if maximizing:
        value = -math.inf
        best_col = ordered[0]
        for col in ordered:
            trial = clone_board(board)
            drop_piece(trial, col, AI)
            score = minimax(trial, depth - 1, alpha, beta, False)["score"]
            if score > value:
                value = score
                best_col = col
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return {"column": best_col, "score": int(value)}

    value = math.inf
    best_col = ordered[0]
    for col in ordered:
        trial = clone_board(board)
        drop_piece(trial, col, HUMAN)
        score = minimax(trial, depth - 1, alpha, beta, True)["score"]
        if score < value:
            value = score
            best_col = col
        beta = min(beta, value)
        if alpha >= beta:
            break
    return {"column": best_col, "score": int(value)}


def candidate_scores(board: list[list[int]], depth: int = 4) -> list[dict[str, Any]]:
    scores = []
    for col in ordered_moves(valid_moves(board)):
        trial = clone_board(board)
        drop_piece(trial, col, AI)
        if winning_move(trial, AI):
            score = 1_000_000
        else:
            score = minimax(trial, depth - 1, -math.inf, math.inf, False)["score"]
        scores.append({"column": col, "score": int(score), "immediate_win": winning_move(trial, AI)})
    return sorted(scores, key=lambda item: item["score"], reverse=True)


def analyze_board(board: list[list[int]], depth: int = 4) -> dict[str, Any]:
    scores = candidate_scores(board, depth=depth)
    best_move = scores[0] if scores else {"column": None, "score": 0, "immediate_win": False}
    ai_wins = immediate_wins(board, AI)
    human_threats = immediate_wins(board, HUMAN)
    terminal = terminal_state(board)
    recommendation = "AI can press for a win." if ai_wins else "AI should balance control and threats."
    if human_threats:
        recommendation = f"Human threat columns: {', '.join(str(col + 1) for col in human_threats)}."
    if best_move["immediate_win"]:
        recommendation = f"AI has a direct win in column {best_move['column'] + 1}."

    return {
        "board": board,
        "depth": depth,
        "terminal": terminal,
        "best_move": best_move,
        "candidate_scores": scores,
        "threats": {
            "ai_wins": ai_wins,
            "human_threats": human_threats,
        },
        "recommendation": recommendation,
        "overall": score_position(board, AI),
    }


def apply_move(board: list[list[int]], col: int, piece: int) -> dict[str, Any]:
    trial = clone_board(board)
    row = drop_piece(trial, col, piece)
    return {
        "board": trial,
        "row": row,
        "winner": AI if winning_move(trial, AI) else HUMAN if winning_move(trial, HUMAN) else 0,
        "terminal": terminal_state(trial),
    }
