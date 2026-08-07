(function () {
  "use strict";

  const E = globalThis.ConnectFourEngine;
  const STORAGE_KEY = "ai-connect-four-arena-v2";
  const analysisCache = new Map();
  const FALLBACK_SAMPLES = [
    { id: "opening-center", title: "Opening Center Control", next_player: 2, board: E.newBoard(), expected_best_column: 3, note: "空局面下，AI 应优先占据中线。" },
    { id: "block-threat", title: "Block the Row Threat", next_player: 2, board: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[1,1,1,0,2,0,0]], expected_best_column: 3, note: "必须封住人类的横向三连。" },
    { id: "ai-win", title: "Immediate AI Win", next_player: 2, board: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,2,0,0],[1,1,0,0,2,2,2]], expected_best_column: 3, note: "AI 在第 4 列可以直接完成四连。" },
    { id: "late-fork", title: "Late Fork Pressure", next_player: 2, board: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,1,0,0,0,0],[0,0,2,1,0,0,0],[0,1,1,2,0,0,0],[1,2,2,1,0,0,0]], expected_best_column: 4, note: "更接近中后盘，用于观察搜索深度的分支变化。" },
  ];

  let samples = FALLBACK_SAMPLES;

  function defaultState() {
    const board = E.newBoard();
    return {
      board, baseBoard: E.cloneBoard(board), turn: E.HUMAN, depth: 4, history: [],
      autoAi: true, challengeId: "", completed: false, completionId: "", lastMove: null,
      lastPrediction: null, stats: { games: 0, humanWins: 0, aiWins: 0, draws: 0 }, matches: [],
    };
  }

  function isBoard(value) {
    return Array.isArray(value) && value.length === E.ROWS && value.every((row) => Array.isArray(row) && row.length === E.COLS && row.every((cell) => [0, 1, 2].includes(cell)));
  }

  function loadState() {
    const fallback = defaultState();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!stored || !isBoard(stored.board)) return fallback;
      const stats = { ...fallback.stats, ...(stored.stats || {}) };
      return {
        ...fallback, ...stored, stats,
        board: E.cloneBoard(stored.board),
        baseBoard: isBoard(stored.baseBoard) ? E.cloneBoard(stored.baseBoard) : E.newBoard(),
        history: Array.isArray(stored.history) ? stored.history : [],
        matches: Array.isArray(stored.matches) ? stored.matches.slice(0, 30) : [],
        depth: [2, 3, 4, 5].includes(Number(stored.depth)) ? Number(stored.depth) : 4,
      };
    } catch (error) {
      return fallback;
    }
  }

  let state = loadState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* Storage can be disabled. */ }
  }

  async function loadSamples() {
    try {
      const response = await fetch("../data/sample_positions.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Sample request failed.");
      const payload = await response.json();
      if (Array.isArray(payload) && payload.length) samples = payload;
    } catch (error) {
      samples = FALLBACK_SAMPLES;
    }
    return samples;
  }

  function byId(id) { return document.getElementById(id); }
  function pieceCount(board) { return board.flat().filter(Boolean).length; }
  function formatScore(value) { return Number(value || 0).toLocaleString("zh-CN"); }
  function formatColumns(columns) { return columns.length ? columns.map((col) => col + 1).join(" / ") : "NONE"; }
  function getAnalysis(board, depth) {
    const key = `${E.serializeBoard(board)}:${depth}`;
    if (!analysisCache.has(key)) analysisCache.set(key, E.analyzeBoard(board, depth));
    return analysisCache.get(key);
  }

  function showToast(message) {
    const toast = byId("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function refreshIcons() {
    if (globalThis.lucide) globalThis.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }

  function renderBoard(element, board, options = {}) {
    if (!element) return;
    const { interactive = false, onCell = null, lastMove = null, bestCol = null } = options;
    element.innerHTML = "";
    const bestRow = bestCol === null ? null : E.nextRow(board, bestCol);
    board.forEach((rowValues, row) => rowValues.forEach((piece, col) => {
      const cell = document.createElement(interactive ? "button" : "div");
      cell.className = `board-cell${piece === E.HUMAN ? " human" : piece === E.AI ? " ai" : ""}`;
      if (lastMove && lastMove.row === row && lastMove.col === col) cell.classList.add("last");
      if (bestRow === row && bestCol === col && piece === 0) cell.classList.add("best");
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `第 ${row + 1} 行，第 ${col + 1} 列，${piece === E.HUMAN ? "人类棋子" : piece === E.AI ? "AI 棋子" : "空位"}`);
      if (interactive) {
        cell.type = "button";
        cell.addEventListener("click", () => onCell?.(row, col));
      }
      element.appendChild(cell);
    }));
  }

  function renderScoreList(element, scores) {
    if (!element) return;
    if (!scores.length) {
      element.innerHTML = '<div class="empty-state">当前没有可用列</div>';
      return;
    }
    element.innerHTML = scores.map((item, index) => {
      const width = scores.length === 1 ? 100 : Math.max(18, 100 - index * (78 / (scores.length - 1)));
      return `<div class="score-row"><span class="score-column">COL ${item.column + 1}</span><span class="score-track"><i style="width:${width}%"></i></span><span class="score-value">${item.immediate_win ? "WIN · " : ""}${formatScore(item.score)}</span></div>`;
    }).join("");
  }

  function recommendationText(analysis) {
    if (analysis.terminal.terminal) {
      if (analysis.terminal.winner === E.AI) return ["AI 已完成四连", "当前局面为终局，停止继续搜索。"];
      if (analysis.terminal.winner === E.HUMAN) return ["人类已完成四连", "当前局面为终局，停止继续搜索。"];
      return ["棋盘已满", "当前局面以平局结束。"];
    }
    if (analysis.best_move.immediate_win) return [`第 ${analysis.best_move.column + 1} 列直接取胜`, "AI 可在下一手完成四连。"];
    if (analysis.threats.human_threats.length) return [`封锁第 ${analysis.threats.human_threats.map((col) => col + 1).join("、")} 列`, "人类存在下一手直接获胜的威胁。"];
    return [`优先选择第 ${analysis.best_move.column + 1} 列`, `深度 ${analysis.depth} 搜索评分 ${formatScore(analysis.best_move.score)}。`];
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

  function historyLines(history) {
    return history.map((move, index) => `${index + 1}. ${move.piece === E.HUMAN ? "Human" : "AI"} · column ${move.col + 1}`);
  }

  function exportPosition(title, board, depth, history = []) {
    const analysis = getAnalysis(board, depth);
    downloadMarkdown(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "connect-four"}.md`, E.buildReport(title, analysis, history));
    showToast("Markdown 报告已导出");
  }

  function resultForTerminal(terminal) {
    return terminal.winner === E.HUMAN ? "human" : terminal.winner === E.AI ? "ai" : "draw";
  }

  function finalizeIfNeeded() {
    const terminal = E.terminalState(state.board);
    if (!terminal.terminal || state.completed) return terminal;
    const result = resultForTerminal(terminal);
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    state.completed = true;
    state.completionId = id;
    state.stats.games += 1;
    if (result === "human") state.stats.humanWins += 1;
    if (result === "ai") state.stats.aiWins += 1;
    if (result === "draw") state.stats.draws += 1;
    state.matches.unshift({
      id, result, moves: state.history.length, depth: state.depth, challengeId: state.challengeId,
      endedAt: new Date().toISOString(), boardKey: E.serializeBoard(state.board),
    });
    state.matches = state.matches.slice(0, 30);
    saveState();
    return terminal;
  }

  function revertCompletion() {
    if (!state.completed) return;
    const match = state.matches.find((item) => item.id === state.completionId);
    state.matches = state.matches.filter((item) => item.id !== state.completionId);
    if (match) {
      state.stats.games = Math.max(0, state.stats.games - 1);
      if (match.result === "human") state.stats.humanWins = Math.max(0, state.stats.humanWins - 1);
      if (match.result === "ai") state.stats.aiWins = Math.max(0, state.stats.aiWins - 1);
      if (match.result === "draw") state.stats.draws = Math.max(0, state.stats.draws - 1);
    }
    state.completed = false;
    state.completionId = "";
  }

  async function initArena() {
    await loadSamples();
    const params = new URLSearchParams(location.search);
    const challengeId = params.get("challenge");
    if (challengeId) {
      const sample = samples.find((item) => item.id === challengeId);
      if (sample) {
        state.board = E.cloneBoard(sample.board);
        state.baseBoard = E.cloneBoard(sample.board);
        state.turn = Number(sample.next_player) || E.AI;
        state.history = [];
        state.challengeId = sample.id;
        state.completed = false;
        state.completionId = "";
        state.lastMove = null;
        state.lastPrediction = null;
        saveState();
        history.replaceState(null, "", "index.html");
      }
    }

    byId("arenaDepth").value = String(state.depth);
    byId("autoAi").checked = Boolean(state.autoAi);

    function render() {
      const terminal = finalizeIfNeeded();
      const analysis = getAnalysis(state.board, state.depth);
      const challenge = samples.find((item) => item.id === state.challengeId);
      const [recommendation, detail] = recommendationText(analysis);
      byId("turnMetric").textContent = terminal.terminal ? "终局" : state.turn === E.HUMAN ? "人类" : "AI";
      byId("moveMetric").textContent = String(pieceCount(state.board));
      byId("depthMetric").textContent = String(state.depth);
      byId("scoreMetric").textContent = formatScore(analysis.overall);
      byId("gameTitle").textContent = challenge ? challenge.title : "标准对局";
      byId("challengeLabel").textContent = challenge ? "CHALLENGE" : "STANDARD";
      byId("arenaSubtitle").textContent = challenge ? `${challenge.id.toUpperCase()} · AI TO MOVE` : "HUMAN FIRST · LOCAL MINIMAX";
      const status = byId("gameStatus");
      status.className = "status-chip";
      if (terminal.terminal) {
        status.textContent = terminal.winner === E.HUMAN ? "人类获胜" : terminal.winner === E.AI ? "AI 获胜" : "平局";
        status.classList.add(terminal.winner === E.HUMAN ? "danger" : "warning");
      } else status.textContent = "进行中";
      byId("turnTitle").textContent = terminal.terminal ? recommendation : state.turn === E.HUMAN ? "等待人类落子" : "等待 AI 决策";
      byId("turnDetail").textContent = terminal.terminal ? detail : state.turn === E.HUMAN ? "选择任意可用列" : `深度 ${state.depth} · ${recommendation}`;
      const boardKey = E.serializeBoard(state.board);
      byId("boardKeyShort").textContent = `${boardKey.slice(0, 6)}…${boardKey.slice(-6)}`;
      const visibleScores = terminal.terminal ? [] : analysis.candidate_scores;
      byId("candidateCount").textContent = `${visibleScores.length} MOVES`;
      byId("arenaSignal").textContent = `${recommendation} ${detail}`;
      renderScoreList(byId("arenaScores"), visibleScores);
      renderBoard(byId("arenaBoard"), state.board, {
        interactive: !terminal.terminal,
        onCell: (row, col) => playHuman(col),
        lastMove: state.lastMove,
        bestCol: state.lastPrediction,
      });
      const controls = byId("dropControls");
      controls.innerHTML = "";
      for (let col = 0; col < E.COLS; col += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `drop-control${state.lastPrediction === col ? " recommended" : ""}`;
        button.textContent = `↓ ${col + 1}`;
        button.disabled = terminal.terminal || state.turn !== E.HUMAN || E.nextRow(state.board, col) === null;
        button.setAttribute("aria-label", `落子到第 ${col + 1} 列`);
        button.addEventListener("click", () => playHuman(col));
        controls.appendChild(button);
      }
      byId("undoRound").disabled = state.history.length === 0;
      byId("playAiMove").disabled = terminal.terminal || state.turn !== E.AI;
      refreshIcons();
    }

    function recordMove(piece, col) {
      const boardBefore = E.serializeBoard(state.board);
      const row = E.dropPiece(state.board, col, piece);
      state.history.push({ piece, col, row, boardBefore, at: new Date().toISOString() });
      state.lastMove = { piece, col, row };
      state.lastPrediction = null;
    }

    function playHuman(col) {
      if (E.terminalState(state.board).terminal) return;
      if (state.turn !== E.HUMAN) { showToast("当前等待 AI 决策"); return; }
      if (E.nextRow(state.board, col) === null) { showToast("该列已满"); return; }
      recordMove(E.HUMAN, col);
      state.turn = E.AI;
      saveState();
      render();
      if (state.autoAi && !E.terminalState(state.board).terminal) setTimeout(playAi, 280);
    }

    function playAi() {
      if (E.terminalState(state.board).terminal) return;
      if (state.turn !== E.AI) { showToast("请先由人类落子"); return; }
      const analysis = getAnalysis(state.board, state.depth);
      if (analysis.best_move.column === null) return;
      recordMove(E.AI, analysis.best_move.column);
      state.turn = E.HUMAN;
      saveState();
      render();
    }

    byId("newGame").addEventListener("click", () => {
      const fresh = E.newBoard();
      state.board = fresh;
      state.baseBoard = E.cloneBoard(fresh);
      state.turn = E.HUMAN;
      state.history = [];
      state.challengeId = "";
      state.completed = false;
      state.completionId = "";
      state.lastMove = null;
      state.lastPrediction = null;
      saveState(); render(); showToast("新对局已创建");
    });
    byId("undoRound").addEventListener("click", () => {
      if (!state.history.length) return;
      revertCompletion();
      const removed = [];
      let restoreKey = null;
      while (state.history.length) {
        const move = state.history.pop();
        removed.push(move);
        restoreKey = move.boardBefore;
        if (move.piece === E.HUMAN) break;
      }
      state.board = E.deserializeBoard(restoreKey);
      state.turn = removed.some((move) => move.piece === E.HUMAN) ? E.HUMAN : E.AI;
      const previous = state.history[state.history.length - 1];
      state.lastMove = previous ? { piece: previous.piece, col: previous.col, row: previous.row } : null;
      state.lastPrediction = null;
      saveState(); render(); showToast(`已撤销 ${removed.length} 手`);
    });
    byId("predictMove").addEventListener("click", () => {
      if (E.terminalState(state.board).terminal) return;
      const analysis = getAnalysis(state.board, state.depth);
      state.lastPrediction = analysis.best_move.column;
      saveState(); render();
      showToast(analysis.best_move.column === null ? "没有可用落点" : `AI 推荐第 ${analysis.best_move.column + 1} 列`);
    });
    byId("playAiMove").addEventListener("click", playAi);
    byId("arenaDepth").addEventListener("change", (event) => { state.depth = Number(event.target.value); state.lastPrediction = null; saveState(); render(); });
    byId("autoAi").addEventListener("change", (event) => { state.autoAi = event.target.checked; saveState(); if (state.autoAi && state.turn === E.AI && !E.terminalState(state.board).terminal) setTimeout(playAi, 220); });
    byId("exportGame").addEventListener("click", () => exportPosition("AI Connect Four Match", state.board, state.depth, historyLines(state.history)));
    render();
  }

  async function initAnalysis() {
    await loadSamples();
    const source = byId("analysisSource");
    samples.forEach((sample) => {
      const option = document.createElement("option");
      option.value = sample.id;
      option.textContent = sample.title;
      source.appendChild(option);
    });
    const params = new URLSearchParams(location.search);
    const requested = params.get("challenge");
    let editorBoard = E.cloneBoard(state.board);
    let pieceMode = E.HUMAN;
    let depth = 4;
    if (requested && samples.some((sample) => sample.id === requested)) source.value = requested;

    function loadSource() {
      if (source.value === "current") editorBoard = E.cloneBoard(state.board);
      else editorBoard = E.cloneBoard(samples.find((sample) => sample.id === source.value).board);
      render();
    }

    function render() {
      const analysis = getAnalysis(editorBoard, depth);
      const selectedSample = samples.find((sample) => sample.id === source.value);
      const [title, detail] = recommendationText(analysis);
      const terminal = analysis.terminal;
      byId("analysisSourceTitle").textContent = selectedSample?.title || "当前对局";
      byId("analysisBest").textContent = analysis.best_move.column === null ? "--" : String(analysis.best_move.column + 1);
      byId("analysisScore").textContent = formatScore(analysis.best_move.score);
      byId("humanThreatMetric").textContent = String(analysis.threats.human_threats.length);
      byId("aiWinMetric").textContent = String(analysis.threats.ai_wins.length);
      byId("recommendationTitle").textContent = title;
      byId("recommendationDetail").textContent = detail;
      byId("aiWinColumns").textContent = formatColumns(analysis.threats.ai_wins);
      byId("humanThreatColumns").textContent = formatColumns(analysis.threats.human_threats);
      byId("overallScore").textContent = formatScore(analysis.overall);
      byId("terminalLabel").textContent = terminal.terminal ? "TERMINAL" : "IN PROGRESS";
      const visibleScores = terminal.terminal ? [] : analysis.candidate_scores;
      byId("analysisCandidateCount").textContent = `${visibleScores.length} MOVES`;
      byId("analysisPieceCount").textContent = `${pieceCount(editorBoard)} PIECES · DEPTH ${depth}`;
      byId("analysisBoardKey").textContent = `BOARD KEY  ${analysis.board_key}`;
      const status = byId("positionStatus");
      status.textContent = terminal.terminal ? "终局" : "可分析";
      status.className = `status-chip${terminal.terminal ? " warning" : ""}`;
      renderScoreList(byId("analysisScores"), visibleScores);
      renderBoard(byId("analysisBoard"), editorBoard, {
        interactive: true,
        bestCol: analysis.best_move.column,
        onCell: (row, col) => { editorBoard[row][col] = pieceMode; source.value = "current"; render(); },
      });
    }

    source.addEventListener("change", loadSource);
    byId("analysisDepth").addEventListener("change", (event) => { depth = Number(event.target.value); render(); });
    byId("pieceMode").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-piece]");
      if (!button) return;
      pieceMode = Number(button.dataset.piece);
      byId("pieceMode").querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    });
    byId("clearEditor").addEventListener("click", () => { editorBoard = E.newBoard(); source.value = "current"; render(); showToast("棋盘已清空"); });
    byId("sendToArena").addEventListener("click", () => {
      state.board = E.cloneBoard(editorBoard);
      state.baseBoard = E.cloneBoard(editorBoard);
      state.turn = E.AI;
      state.history = [];
      state.challengeId = source.value === "current" ? "" : source.value;
      state.completed = false;
      state.completionId = "";
      state.lastMove = null;
      state.lastPrediction = null;
      state.depth = depth;
      saveState();
      location.href = "index.html";
    });
    byId("exportAnalysis").addEventListener("click", () => exportPosition(selectedTitle(), editorBoard, depth));
    function selectedTitle() { return samples.find((sample) => sample.id === source.value)?.title || "Custom Connect Four Position"; }
    if (requested) loadSource(); else render();
  }

  async function initChallenges() {
    await loadSamples();
    const grid = byId("challengeGrid");
    let passed = 0;
    samples.forEach((sample, index) => {
      const analysis = getAnalysis(sample.board, 4);
      const actual = analysis.best_move.column;
      const match = actual === Number(sample.expected_best_column);
      if (match) passed += 1;
      const article = document.createElement("article");
      article.className = "challenge-card";
      article.innerHTML = `<header class="challenge-card-head"><div><p>BENCHMARK ${String(index + 1).padStart(2, "0")}</p><h2>${sample.title}</h2></div><span class="status-chip ${match ? "" : "warning"}">${match ? "PASS" : "DEVIATION"}</span></header><div class="mini-board-wrap"><div class="game-board mini" data-mini-board></div><div class="challenge-facts"><div class="challenge-fact"><span>预期列</span><strong>COL ${Number(sample.expected_best_column) + 1}</strong></div><div class="challenge-fact"><span>引擎列</span><strong>COL ${actual === null ? "--" : actual + 1}</strong></div><div class="challenge-fact"><span>搜索评分</span><strong>${formatScore(analysis.best_move.score)}</strong></div><p class="challenge-note">${sample.note}</p></div></div><div class="challenge-actions"><a class="button button-primary" href="index.html?challenge=${encodeURIComponent(sample.id)}"><i data-lucide="play"></i>进入对弈</a><a class="button" href="analysis.html?challenge=${encodeURIComponent(sample.id)}"><i data-lucide="scan-search"></i>拆解局面</a></div>`;
      grid.appendChild(article);
      renderBoard(article.querySelector("[data-mini-board]"), sample.board, { bestCol: actual });
    });
    byId("benchmarkScore").textContent = `${passed}/${samples.length}`;
    byId("benchmarkTitle").textContent = passed === samples.length ? "全部预期落点一致" : `${samples.length - passed} 个局面出现深度偏差`;
    refreshIcons();
  }

  function initMatches() {
    const stats = state.stats;
    byId("gamesMetric").textContent = String(stats.games);
    byId("humanWinsMetric").textContent = String(stats.humanWins);
    byId("aiWinsMetric").textContent = String(stats.aiWins);
    byId("drawsMetric").textContent = String(stats.draws);
    byId("archiveSubtitle").textContent = `LOCAL SESSION · ${stats.games} MATCHES`;
    byId("currentMatchTitle").textContent = E.terminalState(state.board).terminal ? "已完成的当前局" : "进行中的对局";
    renderBoard(byId("matchesBoard"), state.board, { lastMove: state.lastMove });

    const timeline = byId("moveTimeline");
    byId("timelineCount").textContent = `${state.history.length} MOVES`;
    timeline.innerHTML = state.history.length ? state.history.map((move, index) => `<div class="timeline-row"><span class="timeline-index">${String(index + 1).padStart(2, "0")}</span><div><strong>${move.piece === E.HUMAN ? "人类落子" : "AI 决策"}</strong><small>第 ${move.col + 1} 列 · 第 ${move.row + 1} 行</small></div><i class="timeline-piece${move.piece === E.AI ? " ai" : ""}"></i></div>`).join("") : '<div class="empty-state">当前对局还没有落子记录</div>';

    const matches = byId("recentMatches");
    byId("matchCount").textContent = `${state.matches.length} MATCHES`;
    matches.innerHTML = state.matches.length ? state.matches.map((match) => {
      const label = match.result === "human" ? "人类胜" : match.result === "ai" ? "AI 胜" : "平局";
      const cls = match.result === "human" ? "" : match.result === "ai" ? "loss" : "draw";
      const date = new Date(match.endedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      return `<div class="match-row"><span class="match-result ${cls}">${label}</span><div><strong>${match.challengeId || "Standard Match"}</strong><small>${date} · ${match.moves} 手 · 深度 ${match.depth}</small></div><span class="match-score">${match.boardKey.slice(-7)}</span></div>`;
    }).join("") : '<div class="empty-state">完成一局后，结果会出现在这里</div>';

    byId("clearRecords").addEventListener("click", () => {
      state.stats = { games: 0, humanWins: 0, aiWins: 0, draws: 0 };
      state.matches = [];
      saveState();
      initMatchesViewOnly();
      showToast("历史战绩已清空");
    });
    byId("exportArchive").addEventListener("click", () => exportPosition("AI Connect Four Current Match", state.board, state.depth, historyLines(state.history)));
    refreshIcons();
  }

  function initMatchesViewOnly() {
    byId("gamesMetric").textContent = "0";
    byId("humanWinsMetric").textContent = "0";
    byId("aiWinsMetric").textContent = "0";
    byId("drawsMetric").textContent = "0";
    byId("archiveSubtitle").textContent = "LOCAL SESSION · 0 MATCHES";
    byId("matchCount").textContent = "0 MATCHES";
    byId("recentMatches").innerHTML = '<div class="empty-state">完成一局后，结果会出现在这里</div>';
  }

  async function start() {
    if (!E) return;
    const page = document.body.dataset.page;
    if (page === "arena") await initArena();
    if (page === "analysis") await initAnalysis();
    if (page === "challenges") await initChallenges();
    if (page === "matches") initMatches();
    refreshIcons();
  }

  start().catch((error) => {
    console.error(error);
    showToast("页面初始化失败，请刷新后重试");
  });
}());
