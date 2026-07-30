# AI Connect Four Arena

一个可对战、可分析、可导出报告的四子棋 AI 项目。

## 在线打开

- GitHub Pages：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Connect-Four-Arena/web/index.html>
- 仓库文件页只能看源码，不能直接运行应用。

## 你可以做什么

- 人机对战
- Minimax + alpha-beta 搜索
- 挑战样例加载与局面分析
- 本地刷新后恢复当前对局
- 导出 Markdown 局面报告
- Python CLI 和 FastAPI 接口

## 本地运行

直接打开：

```text
web/index.html
```

## 后端

```bash
cd AI-Connect-Four-Arena/backend
python -m pip install -r requirements.txt
python app.py
```

## CLI

```bash
cd AI-Connect-Four-Arena
python scripts/analyze_board.py --sample-id block-threat
python scripts/analyze_board.py --sample-id block-threat --format markdown
```

## API

- `GET /health`
- `GET /api/samples`
- `GET /api/analyze/{sample_id}?depth=4`
- `GET /api/recommend?board=42_digits&depth=4`
- `GET /api/move?board=42_digits&column=3`
- `GET /api/report/{sample_id}?depth=4`
- `GET /api/export?board=42_digits&depth=4&title=Custom`

## Board Key

局面用 42 位数字表示：

- `0` = 空位
- `1` = 人类
- `2` = AI

从上到下、从左到右依次拼接。

## 目录

```text
AI-Connect-Four-Arena/
├── backend/
│   ├── app.py
│   ├── connect_four.py
│   ├── requirements.txt
│   └── tests/
├── data/
│   └── sample_positions.json
├── scripts/
│   └── analyze_board.py
└── web/
    └── index.html
```

## 测试

```bash
cd AI-Connect-Four-Arena/backend
python -m unittest discover -s tests
```

## License

MIT，见仓库根目录 `LICENSE`。
