# AI Connect Four Arena

AI Connect Four Arena 是一个可对战、可分析的四子棋 AI 游戏项目。它把经典棋类对抗、极小化极大搜索和局面评分放到同一个工作台里，既能直接游玩，也能作为 AI 策略分析样例。

## 功能

- 支持人机对战，AI 采用 minimax + alpha-beta 搜索。
- 提供难度切换、提示走法和局面分析。
- 支持加载预设挑战局面，查看推荐落子与候选评分。
- 提供命令行分析脚本，可输出单局面或样例集 JSON。
- 提供 FastAPI 接口，便于后续接入更多棋类或策略实验。
- 提供浏览器看板，可直接打开 `web/index.html` 开始对战。

## 快速运行

### 浏览器对战

直接打开：

```text
web/index.html
```

### 命令行分析

```bash
cd AI-Connect-Four-Arena
python scripts/analyze_board.py
python scripts/analyze_board.py --sample-id block-threat
```

### 后端接口

```bash
cd AI-Connect-Four-Arena/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8080/health
http://127.0.0.1:8080/api/samples
http://127.0.0.1:8080/api/analyze/block-threat
```

## 项目结构

```text
AI-Connect-Four-Arena/
├── README.md
├── backend/
│   ├── app.py
│   ├── connect_four.py
│   └── requirements.txt
├── data/
│   └── sample_positions.json
├── scripts/
│   └── analyze_board.py
└── web/
    └── index.html
```

## 分析维度

- `best_move`: 当前局面 AI 的推荐落子。
- `candidate_scores`: 各列候选分数。
- `threats`: 立即获胜或必须阻挡的威胁列。
- `overall`: 局面综合评分。

## 可扩展方向

- 增加开局库、残局库和更深层的搜索。
- 加入双人热座模式或观战模式。
- 输出对局回放和走法注释。
- 改造成其他棋类或策略对抗游戏。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
