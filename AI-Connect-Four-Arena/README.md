# AI Connect Four Arena

一个完整的四子棋 AI 对弈与搜索实验项目。浏览器端提供四个共享状态的操作页面，Python 端提供同规则的分析引擎、CLI、FastAPI 接口和单元测试。

## 在线入口

- 对弈竞技场：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Connect-Four-Arena/web/index.html>
- 搜索实验室：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Connect-Four-Arena/web/analysis.html>
- 挑战基准：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Connect-Four-Arena/web/challenges.html>
- 对局档案：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Connect-Four-Arena/web/matches.html>

GitHub 的文件预览页只显示源码。运行应用时请使用上面的 GitHub Pages 地址，或在本地直接打开 `web/index.html`。

## 页面

| 页面 | 内容 |
| --- | --- |
| 对弈竞技场 | 人类落子、自动 AI、搜索深度切换、落点预测、撤销一轮和战报导出 |
| 搜索实验室 | 可编辑 7×6 局面、四组样例、战术信号、候选列排序和 Markdown 分析报告 |
| 挑战基准 | 深度 4 固定基准、预期落点对照、局面复现入口和偏差公开 |
| 对局档案 | 当前棋盘、落子时间线、累计胜负统计和最近对局记录 |

所有页面共用 `localStorage` 状态；刷新或跨页后会保留当前棋局、搜索深度、对局历史与累计战绩。浏览器端无需 API Key，也不依赖后端才能运行。

## AI 引擎

浏览器和 Python 使用一致的规则：

- 6 行 × 7 列棋盘
- Minimax 与 alpha-beta pruning
- 中心优先走子顺序：`4, 3, 5, 2, 6, 1, 7`
- 中线控制、二连、三连、对手威胁和终局评分
- AI 终局分 `1,000,000`，人类终局分 `-1,000,000`

`web/engine.js` 暴露纯函数到 `globalThis.ConnectFourEngine`，可同时被浏览器页面和 Node 校验脚本调用。

## 挑战基准

当前深度 4 的可复现结果：

| 局面 | 预期列 | 引擎列 | 分数 | 结果 |
| --- | ---: | ---: | ---: | --- |
| Opening Center Control | 4 | 4 | 8 | PASS |
| Block the Row Threat | 4 | 4 | -11 | PASS |
| Immediate AI Win | 4 | 4 | 1,000,000 | PASS |
| Late Fork Pressure | 5 | 6 | -51 | DEVIATION |

`Late Fork Pressure` 会随搜索深度改变最佳分支。挑战页保留这个偏差，用于观察启发式评估和截断深度对决策的影响。

## 本地运行

直接双击：

```text
web/index.html
```

如果需要验证 JSON 数据加载，可在仓库根目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/AI-Connect-Four-Arena/web/index.html
```

通过 `file://` 打开时，前端会使用与 `data/sample_positions.json` 一致的内置快照。

## CLI

```bash
cd AI-Connect-Four-Arena
python scripts/analyze_board.py --sample-id block-threat
python scripts/analyze_board.py --sample-id block-threat --format markdown
```

## FastAPI

```bash
cd AI-Connect-Four-Arena/backend
python -m pip install -r requirements.txt
python app.py
```

服务默认运行于 `http://127.0.0.1:8080`。

| 接口 | 说明 |
| --- | --- |
| `GET /health` | 健康检查 |
| `GET /api/samples` | 挑战样例 |
| `GET /api/analyze/{sample_id}?depth=4` | 分析指定样例 |
| `GET /api/recommend?board=42_digits&depth=4` | 分析自定义局面 |
| `GET /api/move?board=42_digits&column=3` | 执行指定落子 |
| `GET /api/report/{sample_id}?depth=4` | 导出样例报告 |
| `GET /api/export?board=42_digits&depth=4&title=Custom` | 导出自定义报告 |

## Board Key

棋盘按从上到下、从左到右的顺序序列化为 42 位数字：

- `0`：空位
- `1`：人类
- `2`：AI

例如空棋盘是 `000000000000000000000000000000000000000000`。

## 项目结构

```text
AI-Connect-Four-Arena/
|-- README.md
|-- backend/
|   |-- app.py
|   |-- connect_four.py
|   |-- requirements.txt
|   `-- tests/
|       `-- test_connect_four.py
|-- data/
|   `-- sample_positions.json
|-- scripts/
|   `-- analyze_board.py
`-- web/
    |-- index.html
    |-- analysis.html
    |-- challenges.html
    |-- matches.html
    |-- engine.js
    |-- app.js
    `-- styles.css
```

## 测试

```bash
cd AI-Connect-Four-Arena/backend
python -m unittest discover -s tests -v
```

JavaScript 基准可直接通过 Node 加载 `web/engine.js`，并与 `data/sample_positions.json` 的四组局面进行断言。

## License

本项目随仓库使用 [MIT License](../LICENSE)。
