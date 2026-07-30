# AI Content QA Workbench

AI Content QA Workbench 是一个 AI 生成内容质检工作台。它用本地样例文本和来源材料演示声明抽取、引用覆盖、来源匹配、绝对化表达识别和风险分级，适合扩展成内容审核、知识问答复核或发布前检查流程。

## 功能

- 从内容文本中抽取可检查声明。
- 识别引用缺失、数字声明缺少来源、绝对化表达和来源匹配不足。
- 基于引用来源计算支持度分数。
- 汇总样本级风险等级、引用覆盖率和平均支持度。
- 提供 CLI 脚本，可输出完整 JSON 审查结果。
- 提供 FastAPI 接口，便于后续接入真实内容生产流程。
- 提供浏览器看板，可直接打开 `web/index.html` 查看质检结果。

## 快速运行

### 浏览器看板

直接打开：

```text
web/index.html
```

### 命令行审查

```bash
cd AI-Content-QA-Workbench
python scripts/audit_content.py
python scripts/audit_content.py --sample-id content-002
```

### 后端接口

```bash
cd AI-Content-QA-Workbench/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8050/health
http://127.0.0.1:8050/api/audit
http://127.0.0.1:8050/api/audit/content-002
```

## 项目结构

```text
AI-Content-QA-Workbench/
├── README.md
├── backend/
│   ├── app.py
│   ├── content_qa.py
│   └── requirements.txt
├── data/
│   └── content_samples.json
├── scripts/
│   └── audit_content.py
└── web/
    └── index.html
```

## 质检维度

- `citation_coverage`: 有引用声明占比。
- `average_support`: 引用来源与声明的平均匹配程度。
- `issue_count`: 风险问题数量。
- `risk_level`: 样本综合风险等级。

## 可扩展方向

- 接入 LLM 做更细粒度的声明抽取与蕴含判断。
- 增加网页、PDF、知识库等多来源检索。
- 为每条问题生成改写建议和复核状态。
- 把质检结果接入内容发布、知识库更新或运营审核流程。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
