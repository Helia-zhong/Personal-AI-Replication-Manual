(function (root) {
  "use strict";

  const ROWS = 6;
  const COLS = 7;
  const HUMAN = 1;
  const AI = 2;

  function newBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function serializeBoard(board) {
    return board.flat().join("");
  }

  function deserializeBoard(boardKey) {
    const digits = String(boardKey).match(/\d/g)?.map(Number) || [];
    if (digits.length !== ROWS * COLS) {
      throw new Error("Board key must contain 42 digits.");
    }
    if (digits.some((cell) => ![0, HUMAN, AI].includes(cell))) {
      throw new Error("Board key may only contain digits 0, 1, and 2.");
    }
    return Array.from({ length: ROWS }, (_, row) => digits.slice(row * COLS, (row + 1) * COLS));
  }

  function validMoves(board) {
    return Array.from({ length: COLS }, (_, col) => col).filter((col) => board[0][col] === 0);
  }

  function orderedMoves(moves) {
    const center = Math.floor(COLS / 2);
    return moves.slice().sort((left, right) => Math.abs(center - left) - Math.abs(center - right) || left - right);
  }

  function nextRow(board, col) {
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row][col] === 0) return row;
    }
    return null;
  }

  function dropPiece(board, col, piece) {
    if (!Number.isInteger(col) || col < 0 || col >= COLS) throw new Error("Column out of range.");
    if (![HUMAN, AI].includes(piece)) throw new Error("Piece must be 1 or 2.");
    const row = nextRow(board, col);
    if (row === null) throw new Error(`Column ${col} is full.`);
    board[row][col] = piece;
    return row;
  }

  function winningMove(board, piece) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS - 3; col += 1) {
        if ([0, 1, 2, 3].every((offset) => board[row][col + offset] === piece)) return true;
      }
    }
    for (let row = 0; row < ROWS - 3; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if ([0, 1, 2, 3].every((offset) => board[row + offset][col] === piece)) return true;
      }
    }
    for (let row = 0; row < ROWS - 3; row += 1) {
      for (let col = 0; col < COLS - 3; col += 1) {
        if ([0, 1, 2, 3].every((offset) => board[row + offset][col + offset] === piece)) return true;
      }
    }
    for (let row = 3; row < ROWS; row += 1) {
      for (let col = 0; col < COLS - 3; col += 1) {
        if ([0, 1, 2, 3].every((offset) => board[row - offset][col + offset] === piece)) return true;
      }
    }
    return false;
  }

  function boardFull(board) {
    return board[0].every((cell) => cell !== 0);
  }

  function terminalState(board) {
    if (winningMove(board, AI)) return { terminal: true, winner: AI };
    if (winningMove(board, HUMAN)) return { terminal: true, winner: HUMAN };
    if (boardFull(board)) return { terminal: true, winner: 0 };
    return { terminal: false, winner: 0 };
  }

  function evaluateWindow(window, piece) {
    const opponent = piece === AI ? HUMAN : AI;
    const pieceCount = window.filter((cell) => cell === piece).length;
    const opponentCount = window.filter((cell) => cell === opponent).length;
    const emptyCount = window.filter((cell) => cell === 0).length;
    let score = 0;
    if (pieceCount === 4) score += 1000;
    else if (pieceCount === 3 && emptyCount === 1) score += 60;
    else if (pieceCount === 2 && emptyCount === 2) score += 12;
    if (opponentCount === 3 && emptyCount === 1) score -= 55;
    else if (opponentCount === 2 && emptyCount === 2) score -= 8;
    return score;
  }

  function scorePosition(board, piece) {
    let score = 0;
    const center = Math.floor(COLS / 2);
    score += board.filter((row) => row[center] === piece).length * 8;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS - 3; col += 1) {
        score += evaluateWindow([0, 1, 2, 3].map((offset) => board[row][col + offset]), piece);
      }
    }
    for (let col = 0; col < COLS; col += 1) {
      for (let row = 0; row < ROWS - 3; row += 1) {
        score += evaluateWindow([0, 1, 2, 3].map((offset) => board[row + offset][col]), piece);
      }
    }
    for (let row = 0; row < ROWS - 3; row += 1) {
      for (let col = 0; col < COLS - 3; col += 1) {
        score += evaluateWindow([0, 1, 2, 3].map((offset) => board[row + offset][col + offset]), piece);
      }
    }
    for (let row = 3; row < ROWS; row += 1) {
      for (let col = 0; col < COLS - 3; col += 1) {
        score += evaluateWindow([0, 1, 2, 3].map((offset) => board[row - offset][col + offset]), piece);
      }
    }
    return score;
  }

  function immediateWins(board, piece) {
    return validMoves(board).filter((col) => {
      const trial = cloneBoard(board);
      dropPiece(trial, col, piece);
      return winningMove(trial, piece);
    });
  }

  function minimax(board, depth, alpha, beta, maximizing) {
    const terminal = terminalState(board);
    const moves = validMoves(board);
    if (depth === 0 || terminal.terminal) {
      if (terminal.terminal) {
        if (terminal.winner === AI) return { column: null, score: 1000000 };
        if (terminal.winner === HUMAN) return { column: null, score: -1000000 };
        return { column: null, score: 0 };
      }
      return { column: null, score: scorePosition(board, AI) };
    }

    const ordered = orderedMoves(moves);
    if (maximizing) {
      let value = -Infinity;
      let bestCol = ordered[0];
      for (const col of ordered) {
        const trial = cloneBoard(board);
        dropPiece(trial, col, AI);
        const score = minimax(trial, depth - 1, alpha, beta, false).score;
        if (score > value) {
          value = score;
          bestCol = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return { column: bestCol, score: value };
    }

    let value = Infinity;
    let bestCol = ordered[0];
    for (const col of ordered) {
      const trial = cloneBoard(board);
      dropPiece(trial, col, HUMAN);
      const score = minimax(trial, depth - 1, alpha, beta, true).score;
      if (score < value) {
        value = score;
        bestCol = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { column: bestCol, score: value };
  }

  function candidateScores(board, depth = 4) {
    return orderedMoves(validMoves(board)).map((col, order) => {
      const trial = cloneBoard(board);
      dropPiece(trial, col, AI);
      const immediateWin = winningMove(trial, AI);
      const score = immediateWin ? 1000000 : minimax(trial, depth - 1, -Infinity, Infinity, false).score;
      return { column: col, score, immediate_win: immediateWin, order };
    }).sort((left, right) => right.score - left.score || left.order - right.order)
      .map(({ order, ...item }) => item);
  }

  function boardToAscii(board) {
    const symbols = [".", "H", "A"];
    return ["      1 2 3 4 5 6 7", ...board.map((row) => `      ${row.map((cell) => symbols[cell]).join(" ")}`)].join("\n");
  }

  function analyzeBoard(board, depth = 4) {
    const scores = candidateScores(board, depth);
    const bestMove = scores[0] || { column: null, score: 0, immediate_win: false };
    const aiWins = immediateWins(board, AI);
    const humanThreats = immediateWins(board, HUMAN);
    let recommendation = aiWins.length ? "AI can press for a win." : "AI should balance control and threats.";
    if (humanThreats.length) recommendation = `Human threat columns: ${humanThreats.map((col) => col + 1).join(", ")}.`;
    if (bestMove.immediate_win) recommendation = `AI has a direct win in column ${bestMove.column + 1}.`;
    return {
      board: cloneBoard(board),
      board_key: serializeBoard(board),
      board_ascii: boardToAscii(board),
      depth,
      terminal: terminalState(board),
      best_move: bestMove,
      candidate_scores: scores,
      threats: { ai_wins: aiWins, human_threats: humanThreats },
      recommendation,
      overall: scorePosition(board, AI),
    };
  }

  function formatColumns(columns) {
    return columns.length ? columns.map((col) => col + 1).join(", ") : "none";
  }

  function buildReport(title, analysis, history = []) {
    const winner = analysis.terminal.winner;
    const winnerLabel = winner === AI ? "AI" : winner === HUMAN ? "Human" : analysis.terminal.terminal ? "Draw" : "In progress";
    const bestMove = analysis.best_move;
    const lines = [
      `# ${title}`, "", `- Depth: ${analysis.depth}`, `- Overall score: ${analysis.overall}`,
      `- Recommendation: ${analysis.recommendation}`, `- Board key: \`${analysis.board_key}\``, "",
      "## Board", "```text", analysis.board_ascii, "```", "", "## Signals",
      `- AI winning columns: ${formatColumns(analysis.threats.ai_wins)}`,
      `- Human threat columns: ${formatColumns(analysis.threats.human_threats)}`,
      `- Terminal: ${analysis.terminal.terminal} (${winnerLabel})`, "", "## Best Move",
      `- Column: ${bestMove.column === null ? "None" : bestMove.column + 1}`,
      `- Score: ${bestMove.score}`, `- Immediate win: ${bestMove.immediate_win ? "yes" : "no"}`, "",
      "## Candidate Scores", "| Column | Score | Immediate win |", "| --- | ---: | --- |",
      ...analysis.candidate_scores.map((item) => `| ${item.column + 1} | ${item.score} | ${item.immediate_win ? "yes" : "no"} |`),
    ];
    if (history.length) lines.push("", "## History", ...history.map((entry) => `- ${entry}`));
    return `${lines.join("\n").trim()}\n`;
  }

  root.ConnectFourEngine = {
    ROWS, COLS, HUMAN, AI, serializeBoard, deserializeBoard, newBoard, cloneBoard,
    validMoves, orderedMoves, nextRow, dropPiece, winningMove, boardFull, terminalState,
    evaluateWindow, scorePosition, immediateWins, minimax, candidateScores, analyzeBoard,
    boardToAscii, buildReport,
  };
}(typeof globalThis !== "undefined" ? globalThis : this));
