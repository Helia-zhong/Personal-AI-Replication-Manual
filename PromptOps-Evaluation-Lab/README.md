# PromptOps Evaluation Lab

PromptOps Evaluation Lab 是一个多页面 Prompt 评估与回归控制台，用固定测试集比较 Prompt 版本，检查关键字覆盖、输出格式、安全拒答与禁止内容，并在发布前给出质量门禁结论。

项目包含可直接部署到 GitHub Pages 的浏览器工作台，以及共享同一测试数据和评分维度的 Python CLI 与 FastAPI 接口。浏览器演示使用确定性本地模拟器，不需要 API Key，也不会发送 Prompt 内容。

## 在线入口

<https://helia-zhong.github.io/Personal-AI-Replication-Manual/PromptOps-Evaluation-Lab/web/index.html>

## 页面结构

| 页面 | 入口 | 主要内容 |
| --- | --- | --- |
| 评估总览 | `web/index.html` | 版本评分、质量门禁、逐用例结果、评估记录 |
| 版本管理 | `web/versions.html` | Prompt 编辑、变量检测、规则检查、草稿保存与版本复制 |
| 测试数据 | `web/datasets.html` | 任务筛选、用例详情、关键字约束、评估范围启停 |
| 对比报告 | `web/reports.html` | 基准/候选对比、维度变化、回归定位、JSON 与 Markdown 导出 |

## 核心能力

- 内置 Baseline、Structured、Guarded 三个 Prompt 版本。
- 覆盖支持问答、文本摘要、JSON 抽取、文本分类和安全拒答五类任务。
- 计算关键字覆盖、格式遵循、禁止词惩罚、安全拒答和综合得分。
- 通过综合得分、格式、安全与低分用例数量形成发布门禁。
- 使用浏览器 `localStorage` 保存 Prompt 草稿、启用范围和最近 40 次评估记录。
- 支持版本复制、实时静态检查、逐用例回归对比及报告下载。
- 提供 CLI 与 FastAPI 入口，便于替换本地模拟器并接入真实模型服务。

## 快速运行

### 浏览器工作台

可直接打开 `web/index.html`，也可以在项目目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/web/index.html
```

### 命令行评估

```bash
python scripts/run_eval.py --template guarded
python scripts/run_eval.py --compare
```

### FastAPI 接口

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

接口地址：

```text
GET http://127.0.0.1:8020/health
GET http://127.0.0.1:8020/api/cases
GET http://127.0.0.1:8020/api/templates
GET http://127.0.0.1:8020/api/evaluate/guarded
GET http://127.0.0.1:8020/api/compare
```

## 评分规则

综合得分由四部分组成：

```text
overall = keyword_coverage × 0.45
        + format_score × 0.25
        + refusal_score × 0.20
        + (1 - forbidden_penalty) × 0.10
```

| 指标 | 含义 |
| --- | --- |
| `keyword_coverage` | 响应对期望关键字的覆盖比例 |
| `format_score` | JSON、列表、步骤、标签理由或拒答格式是否满足要求 |
| `forbidden_penalty` | 响应命中禁止关键字的比例 |
| `refusal_score` | 必须拒答的安全用例是否正确拒绝 |
| `overall` | 按权重汇总后的单例或版本综合得分 |

## 项目结构

```text
PromptOps-Evaluation-Lab/
├── README.md
├── backend/
│   ├── app.py                 FastAPI 服务
│   ├── promptops.py           模拟响应与评分引擎
│   └── requirements.txt
├── data/
│   ├── eval_cases.json        固定回归测试集
│   └── prompt_templates.json  默认 Prompt 版本
├── scripts/
│   └── run_eval.py            CLI 入口
└── web/
    ├── index.html             评估总览
    ├── versions.html          版本管理
    ├── datasets.html          测试数据
    ├── reports.html           对比报告
    ├── styles.css             共享视觉与响应式样式
    └── app.js                 本地评估、状态和导出逻辑
```

## 运行边界

- 浏览器端使用确定性 Mock 响应，用于演示 PromptOps 流程，不代表真实模型质量。
- 浏览器草稿只保存在当前设备的 `localStorage`，不会修改仓库中的 JSON 数据。
- Python 端默认同样使用模拟响应。接入真实 LLM 时，可替换 `backend/promptops.py` 中的 `simulate_response`，保留现有评分和报告结构。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
