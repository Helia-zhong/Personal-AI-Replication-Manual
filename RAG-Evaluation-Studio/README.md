# RAG Evaluation Studio

RAG Evaluation Studio 是一个多页面检索增强生成评估工作台，用固定知识库和问题集检查 BM25 召回、引用精度、来源覆盖、答案要点与 Top-K 配置权衡。

项目同时提供可部署到 GitHub Pages 的浏览器控制台、Python CLI 和 FastAPI 接口。浏览器端复刻 Python 后端的分词、BM25、片段选择和评分公式，全部使用本地确定性数据，不需要 API Key。

## 在线入口

<https://helia-zhong.github.io/Personal-AI-Replication-Manual/RAG-Evaluation-Studio/web/index.html>

## 页面结构

| 页面 | 入口 | 主要内容 |
| --- | --- | --- |
| 检索工作台 | `web/index.html` | 自由查询、BM25 排序、候选片段、引用答案和链路追踪 |
| 评测运行 | `web/evaluation.html` | 固定集运行、五项指标、质量门禁和逐用例诊断 |
| 知识库 | `web/corpus.html` | 文档搜索、分类筛选、切片正文和索引词元检查 |
| 实验报告 | `web/reports.html` | Top-K 1–5 对比、性能曲线、风险用例和报告导出 |

## 核心能力

- 内置 6 篇中文知识文档和 5 个固定评测问题。
- 使用 BM25 风格检索，支持 Top-K 1–5 配置。
- 生成包含文档 ID 的引用答案，并展示分词、召回、截断和合成链路。
- 计算 `top_hit`、`citation_recall`、`citation_precision`、`keyword_coverage` 和 `overall`。
- 支持逐用例检查期望来源、实际召回、答案要点和低分原因。
- 自动比较五组 Top-K 实验，识别最佳配置和召回/精度权衡。
- 使用 `localStorage` 保存最近查询和评测配置。
- 支持 JSON 与 Markdown 实验报告导出。

## 快速运行

### 浏览器工作台

直接打开 `web/index.html`，或者在项目目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/web/index.html
```

### 命令行评测

```bash
python scripts/run_eval.py --top-k 3
python scripts/run_eval.py --question "RAG 系统如何避免编造？" --top-k 2
```

### FastAPI 接口

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

接口地址：

```text
GET http://127.0.0.1:8030/health
GET http://127.0.0.1:8030/api/corpus
GET http://127.0.0.1:8030/api/cases
GET http://127.0.0.1:8030/api/evaluate?top_k=3
GET http://127.0.0.1:8030/api/query?q=如何避免编造&top_k=2
```

## 评分规则

```text
overall = citation_recall × 0.35
        + citation_precision × 0.20
        + keyword_coverage × 0.30
        + top_hit × 0.15
```

| 指标 | 含义 |
| --- | --- |
| `top_hit` | 首位检索结果是否属于期望来源 |
| `citation_recall` | 期望来源被召回的比例 |
| `citation_precision` | 检索结果中有效来源的比例 |
| `keyword_coverage` | 引用答案覆盖期望要点的比例 |
| `overall` | 按权重汇总后的综合得分 |

## 项目结构

```text
RAG-Evaluation-Studio/
├── README.md
├── backend/
│   ├── app.py               FastAPI 服务
│   ├── rag_studio.py        BM25 检索与评分引擎
│   └── requirements.txt
├── data/
│   ├── eval_cases.json      固定评测问题
│   └── knowledge_base.json  本地知识库
├── scripts/
│   └── run_eval.py          CLI 入口
└── web/
    ├── index.html           检索工作台
    ├── evaluation.html      固定集评测
    ├── corpus.html          知识库浏览
    ├── reports.html         Top-K 实验报告
    ├── styles.css           共享视觉与响应式样式
    └── app.js               BM25、评测、状态与导出逻辑
```

## 运行边界

- 当前知识库和评测集均为项目内置演示数据。
- 答案由确定性片段拼接生成，不调用真实 LLM，也不代表生产回答质量。
- 接入向量库、Embedding、reranker 或 LLM 时，可保留现有评测数据与指标结构作为回归基准。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
