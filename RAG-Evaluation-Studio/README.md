# RAG Evaluation Studio

RAG Evaluation Studio 是一个本地可运行的检索增强生成评估实验室。项目内置知识库、评测问题、检索排序、引用命中分析和可视化看板，用于观察 RAG 系统在召回、引用、答案覆盖和风险提示上的表现。

## 功能

- 对知识库文档进行轻量分词、索引和 BM25 风格检索。
- 针对评测集计算 Top-K 命中率、引用召回、引用精度、关键词覆盖和综合得分。
- 生成带引用的模拟答案，便于检查答案是否来自正确来源。
- 提供命令行脚本，可输出完整 JSON 评估结果。
- 提供 FastAPI 接口，便于后续接入真实向量库、Embedding 或 LLM。
- 提供浏览器看板，可直接打开 `web/index.html` 查看检索质量。

## 快速运行

### 浏览器看板

直接打开：

```text
web/index.html
```

### 命令行评估

```bash
cd RAG-Evaluation-Studio
python scripts/run_eval.py
```

### 后端接口

```bash
cd RAG-Evaluation-Studio/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8030/health
http://127.0.0.1:8030/api/evaluate
```

## 项目结构

```text
RAG-Evaluation-Studio/
├── README.md
├── backend/
│   ├── app.py
│   ├── rag_studio.py
│   └── requirements.txt
├── data/
│   ├── eval_cases.json
│   └── knowledge_base.json
├── scripts/
│   └── run_eval.py
└── web/
    └── index.html
```

## 评估指标

- `top_hit`: 期望文档是否出现在 Top-K 检索结果中。
- `citation_recall`: 期望引用文档的召回比例。
- `citation_precision`: 检索引用中有效命中的比例。
- `keyword_coverage`: 期望答案要点覆盖比例。
- `overall`: 综合评分。

## 可扩展方向

- 将内置检索替换为向量数据库或混合检索。
- 接入真实 Embedding、reranker 和 LLM 生成答案。
- 增加跨文档冲突检测、引用粒度评估和人工复核记录。
- 把评估结果导出为 Markdown / HTML 报告。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
