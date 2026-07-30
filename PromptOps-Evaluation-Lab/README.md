# PromptOps Evaluation Lab

PromptOps Evaluation Lab 是一个 Prompt 版本评估与对比实验室。项目内置测试集、Prompt 模板、模拟模型输出、评分规则和可视化看板，用于演示如何系统化比较不同 Prompt 版本的稳定性、格式遵循、关键词覆盖和安全边界。

## 功能

- 管理多个 Prompt 版本：baseline、structured、guarded。
- 使用固定测试集评估问答、摘要、JSON 抽取、分类和安全拒答任务。
- 计算关键词覆盖率、格式遵循、禁用词惩罚、拒答准确性和综合得分。
- 提供 CLI 脚本，可在本地输出完整评估 JSON。
- 提供 FastAPI 后端接口，便于接入真实模型服务。
- 提供浏览器看板，可直接打开 `web/index.html` 对比 Prompt 表现。

## 快速运行

### 浏览器演示

直接打开：

```text
web/index.html
```

### 命令行评估

```bash
cd PromptOps-Evaluation-Lab
python scripts/run_eval.py --template guarded
```

### 后端接口

```bash
cd PromptOps-Evaluation-Lab/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8020/health
http://127.0.0.1:8020/api/evaluate/guarded
```

## 项目结构

```text
PromptOps-Evaluation-Lab/
├── README.md
├── backend/
│   ├── app.py
│   ├── promptops.py
│   └── requirements.txt
├── data/
│   ├── eval_cases.json
│   └── prompt_templates.json
├── scripts/
│   └── run_eval.py
└── web/
    └── index.html
```

## 评分维度

- `keyword_coverage`: 期望关键词覆盖。
- `format_score`: JSON、列表或拒答格式是否满足要求。
- `forbidden_penalty`: 是否出现不应出现的词或行为。
- `refusal_score`: 安全边界任务是否正确拒答。
- `overall`: 综合得分。

## 可扩展方向

- 将 `simulate_response` 替换为真实 LLM API 调用。
- 加入人工评分、A/B 实验记录和版本回归检测。
- 增加更复杂的测试集，如多轮对话、工具调用、RAG 引用一致性。
- 输出 Markdown / HTML 评估报告，作为 Prompt 迭代记录。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
