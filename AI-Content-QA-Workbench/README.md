# AI Content QA Workbench

AI Content QA Workbench 是一个多页面 AI 生成内容质量审核工作台，用确定性规则检查声明、引用覆盖、来源支持度、数字来源、绝对化表达和引用 ID 完整性。

项目同时提供可部署到 GitHub Pages 的浏览器控制台、Python CLI 和 FastAPI 接口。浏览器端镜像 Python 后端的声明切分、词元匹配、支持度和风险分级公式，使用本地内容与证据，不需要 API Key。

## 在线入口

<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Content-QA-Workbench/web/index.html>

## 页面结构

| 页面 | 入口 | 主要内容 |
| --- | --- | --- |
| 质量总览 | `web/index.html` | 跨内容质量指标、样本分布、发布准备度、规则命中和证据状态 |
| 声明复核 | `web/review.html` | 内容拆句、声明队列、规则诊断、来源证据和人工处置状态 |
| 证据库 | `web/sources.html` | 来源搜索、内容筛选、来源检查器和声明/证据关系矩阵 |
| 发布报告 | `web/report.html` | 发布门禁、问题构成、内容对比、修复动作和报告导出 |

## 核心能力

- 内置 3 份内容、12 条声明和 9 份本地来源材料。
- 识别缺少来源、数字无来源、绝对化表达、弱来源匹配和未知引用 ID。
- 计算声明支持度、内容引用覆盖率、平均支持度、问题数量与风险等级。
- 提供逐声明规则诊断、来源证据检查和人工处置状态。
- 使用 `localStorage` 保存最近查看的内容及声明处置结果。
- 支持来源全文搜索、内容筛选和引用关系检查。
- 使用 4 项质量门禁输出 `PASS` 或 `HOLD` 发布决策。
- 支持 JSON 与 Markdown 审核报告导出。

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

### 命令行审核

```bash
python scripts/audit_content.py
python scripts/audit_content.py --sample-id content-002
```

### FastAPI 接口

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

接口地址：

```text
GET http://127.0.0.1:8050/health
GET http://127.0.0.1:8050/api/samples
GET http://127.0.0.1:8050/api/audit
GET http://127.0.0.1:8050/api/audit/content-002
```

## 审核规则

| 规则 | 级别 | 触发条件 |
| --- | --- | --- |
| `missing_citation` | 中危 | 声明没有引用 ID |
| `number_without_source` | 高危 | 数字声明没有引用 ID |
| `absolute_language` | 中危 | 声明包含“所有、完全、保证”等绝对化词语 |
| `weak_source_match` | 中危 | 有引用但来源支持度低于 `0.2` |
| `unknown_source` | 高危 | 引用 ID 无法关联到来源材料 |

当前样本共 12 条声明，平均引用覆盖率 `75%`、平均来源支持度 `83.92%`，识别 5 个规则问题。

## 发布门禁

```text
citation_coverage >= 0.75
average_support >= 0.75
high_issue_count == 0
issue_count <= 1
```

## 项目结构

```text
AI-Content-QA-Workbench/
├── README.md
├── backend/
│   ├── app.py               FastAPI 服务
│   ├── content_qa.py        声明、引用、支持度和风险引擎
│   └── requirements.txt
├── data/
│   └── content_samples.json 内容与来源样本
├── scripts/
│   └── audit_content.py     CLI 入口
└── web/
    ├── index.html           质量总览
    ├── review.html          声明复核
    ├── sources.html         证据库
    ├── report.html          发布报告
    ├── styles.css           共享视觉与响应式样式
    └── app.js               审核、状态、图表与导出逻辑
```

## 运行边界

- 当前内容、来源和审核结果均为项目内置演示数据。
- 支持度使用词元重合计算，不等同于语义蕴含或事实正确性判断。
- 生产接入可增加网页/PDF 检索、LLM 声明抽取、NLI 判断和人工审核接口，同时保留现有规则作为确定性基线。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
