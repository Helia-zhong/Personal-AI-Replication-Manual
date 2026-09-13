# RAG Evaluation Studio

RAG Evaluation Studio 是一个面向检索增强生成系统的可复现实验工作台。它把知识库、BM25 召回、引用答案、固定评测集、失败诊断和可选本地 LLM 生成放进同一条可观察链路，便于定位“没有召回”“召回了无关来源”与“答案遗漏要点”等问题。

项目提供 GitHub Pages 浏览器控制台、Python CLI 和 FastAPI 服务。浏览器端使用本地确定性基线，打开即用；Python 端可以切换到 Ollama，记录模型、延迟、Token 和错误。FastAPI 还会把评测运行和查询运行持久化到本地 SQLite，便于复盘质量变化。

## 在线入口

<https://helia-zhong.github.io/Personal-AI-Replication-Manual/RAG-Evaluation-Studio/web/index.html>

## 页面结构

| 页面 | 入口 | 主要内容 |
| --- | --- | --- |
| 检索工作台 | `web/index.html` | 自由查询、BM25 排序、命中词元、候选片段、引用答案和链路追踪 |
| 评测运行 | `web/evaluation.html` | 固定集运行、质量门禁、MRR 和逐用例失败诊断 |
| 知识库 | `web/corpus.html` | 文档搜索、分类筛选、切片正文和索引词元检查 |
| 实验报告 | `web/reports.html` | Top-K 1–5 对比、召回/精度曲线、风险用例和 JSON / Markdown 导出 |

## 核心能力

- 可复用 BM25 索引，支持 Top-K 和最低得分过滤。
- 检索结果带有排名、查询词元、命中词元、词元贡献和截断状态，便于解释排序结果。
- 固定评测集计算 `Recall@K`、`Precision@K`、`MRR`、Top 命中、引用质量、要点覆盖和综合分数。
- 逐用例记录首个期望来源排名、缺失来源、无关来源、缺失要点和失败原因分类。
- Ollama 为可选生成提供方；模型不可用时保留错误和耗时，不静默伪造模型结果。
- 单个生成用例失败不会中断整批评测，方便观察真实运行稳定性。
- GitHub Actions 自动运行单元测试、基线评测和 Python 编译检查。

## 快速运行

### 浏览器工作台

直接打开 `web/index.html`，或者在项目目录启动静态服务器：

```bash
python -m http.server 8000
```

访问 `http://127.0.0.1:8000/web/index.html`。

### Python CLI

```bash
python -m unittest discover -s backend -p 'test_*.py' -v
python scripts/run_eval.py --top-k 3
python scripts/run_eval.py --question "RAG 系统如何避免编造？" --top-k 2
python scripts/run_eval.py --top-k 3 --output reports/baseline.json
```

### Ollama 生成模式

安装依赖后启动本地 Ollama，并确保模型已下载：

```bash
cd backend
python -m pip install -r requirements.txt
cd ..
python scripts/run_eval.py --provider ollama --model llama3.2:3b --top-k 3 --output reports/ollama.json
```

也可以指定服务地址：

```bash
python scripts/run_eval.py --provider ollama --ollama-url http://127.0.0.1:11434 --top-k 3
```

### FastAPI

```bash
cd backend
python app.py
```

接口：

```text
GET http://127.0.0.1:8030/health
GET http://127.0.0.1:8030/api/corpus
GET http://127.0.0.1:8030/api/cases
GET http://127.0.0.1:8030/api/evaluate?top_k=3
GET http://127.0.0.1:8030/api/evaluate?top_k=3&provider=ollama&model=llama3.2:3b
GET http://127.0.0.1:8030/api/query?q=如何避免编造&top_k=2&min_score=0.5
POST http://127.0.0.1:8030/api/runs/evaluate?top_k=3
POST http://127.0.0.1:8030/api/runs/query?q=如何避免编造&top_k=2
GET http://127.0.0.1:8030/api/runs
```

## 评分与诊断

```text
overall = citation_recall × 0.30
        + citation_precision × 0.20
        + keyword_coverage × 0.30
        + top_hit × 0.10
        + MRR × 0.10
```

`Recall@K` 衡量期望来源被召回的比例；`Precision@K` 衡量候选来源中有效来源的比例；`MRR` 关注首个期望来源的排名；`keyword_coverage` 检查答案是否覆盖标注要点。评测结果额外保留失败原因，避免只看一个汇总数字。

## 项目结构

```text
RAG-Evaluation-Studio/
├── README.md
├── docs/validation.md
├── backend/
│   ├── app.py                 FastAPI 服务
│   ├── rag_studio.py         BM25、评测和 Ollama 适配
│   ├── store.py               SQLite 运行记录存储
│   ├── test_api.py            API 与静态入口测试
│   ├── test_rag_studio.py    后端回归测试
│   └── requirements.txt
├── data/
│   ├── eval_cases.json        固定评测问题
│   └── knowledge_base.json    本地知识库
├── scripts/run_eval.py       CLI 入口
└── web/                      四个浏览器工作页面与共享前端逻辑
```

## 运行边界

知识库和评测集是项目内置的小规模演示数据。确定性模式用于回归比较；Ollama 模式用于检查真实生成链路的接入、引用约束和运行观测。任何模式的分数都不代表通用模型准确率。生产验证还需要更大规模的代表性数据、权限测试、对抗性问题和人工复核。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
