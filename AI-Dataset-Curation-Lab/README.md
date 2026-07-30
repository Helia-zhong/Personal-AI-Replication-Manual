# AI Dataset Curation Lab

AI Dataset Curation Lab 是一个 AI 数据集质检与整理实验室。它聚焦训练集、验证集和测试集的样本质量，检查重复样本、跨 split 泄漏、格式不一致、来源缺失和标签偏移，适合作为 AI 数据工程和评测准备的基础工作台。

## 功能

- 管理多种 AI 数据集样例，包括问答、抽取、摘要和分类任务。
- 自动检查重复样本、近似重复、跨 split 泄漏和来源缺失。
- 针对不同任务类型计算格式匹配、长度匹配、来源覆盖和综合质量分。
- 汇总标签分布、split 分布、问题样本和建议操作。
- 提供命令行脚本，可输出完整 JSON 质检结果。
- 提供 FastAPI 后端接口，便于后续接入真实数据源。
- 提供浏览器看板，可直接打开 `web/index.html` 查看数据集健康度。

## 快速运行

### 浏览器看板

直接打开：

```text
web/index.html
```

### 命令行审查

```bash
cd AI-Dataset-Curation-Lab
python scripts/audit_dataset.py
python scripts/audit_dataset.py --dataset-id support-qa-playbook
```

### 后端接口

```bash
cd AI-Dataset-Curation-Lab/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8070/health
http://127.0.0.1:8070/api/datasets
http://127.0.0.1:8070/api/audit/support-qa-playbook
```

## 项目结构

```text
AI-Dataset-Curation-Lab/
├── README.md
├── backend/
│   ├── app.py
│   ├── dataset_lab.py
│   └── requirements.txt
├── data/
│   └── datasets.json
├── scripts/
│   └── audit_dataset.py
└── web/
    └── index.html
```

## 质检维度

- `source_coverage`: 样本是否具备可追溯来源。
- `format_fit`: 响应格式是否符合任务类型。
- `length_fit`: 响应长度是否落在合理范围。
- `duplicate_rate`: 重复和近似重复样本占比。
- `leakage_count`: 跨 split 泄漏样本数量。
- `overall_quality`: 综合质量分。

## 可扩展方向

- 接入真实标注平台、对象存储或数据库。
- 增加人工复核状态、打回原因和修复历史。
- 对样本做自动分层抽样，支持训练集与评测集分离。
- 输出 Markdown / CSV 审查报告，方便团队协作。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
