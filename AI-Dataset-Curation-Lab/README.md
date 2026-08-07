# AI Dataset Curation Lab

AI Dataset Curation Lab 是一个面向 AI 训练集与评测集的数据质量工作台。项目对问答、抽取、摘要和分类样本执行来源、格式、长度、支持度、重复与跨 split 泄漏审计，并用发布门禁把质量信号转化为可执行的数据版本决策。

前端提供完整的四页操作界面，Python 侧同时提供审计模块、CLI 和 FastAPI 接口。所有演示数据均在仓库内，不需要 API Key。

## 在线体验

- [打开数据健康总览](https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Dataset-Curation-Lab/web/index.html)
- [进入样本复核](https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Dataset-Curation-Lab/web/samples.html?dataset=support-qa-playbook&sample=qa-004)
- [查看完整性扫描](https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Dataset-Curation-Lab/web/integrity.html?dataset=meeting-summary-set)
- [运行发布门禁](https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Dataset-Curation-Lab/web/release.html?dataset=support-qa-playbook)

## 四个工作区

| 页面 | 主要能力 |
| --- | --- |
| 数据健康 | 数据集质量画像、来源覆盖、发布准备度、Split 分配和问题信号聚合 |
| 样本复核 | 数据集、Split、严重度和关键词组合筛选，逐条指标解释与人工处置状态 |
| 完整性扫描 | 指令相似度矩阵、重复聚类、跨 Split 泄漏对、问题分布与修复建议 |
| 发布门禁 | 质量、来源、重复率和泄漏阈值实验，实时阻断判定与 JSON 报告导出 |

页面支持通过参数直接定位数据集和样本：

~~~text
samples.html?dataset=support-qa-playbook&sample=qa-004
integrity.html?dataset=meeting-summary-set
release.html?dataset=contract-extraction-kit
~~~

样本页的“保留、待修、剔除”是浏览器会话中的整理状态，不会写回 `data/datasets.json`。

## 审计规则

### 样本评分

每条样本包含四项基础指标：

| 指标 | 说明 |
| --- | --- |
| `format_fit` | 回答或标签是否符合当前任务格式 |
| `source_coverage` | 是否具备可追溯来源 |
| `length_fit` | 响应长度或压缩率是否合理 |
| `support_score` | 响应与来源、指令的 Jaccard 支持度 |

综合质量分采用：

~~~text
overall = 0.32 * format_fit
        + 0.24 * source_coverage
        + 0.18 * length_fit
        + 0.16 * support_score
        - 0.07 * duplicate
        - 0.11 * leakage
~~~

### 重复与泄漏

- 指令 Jaccard 相似度达到 `0.88` 时进入同一重复聚类。
- 不同 split 的指令相似度达到 `0.90` 时记录为泄漏对。
- 来源缺失、跨集泄漏、拒答边界错误和非法标签属于高严重度问题。
- 格式偏差、摘要长度异常、标签错配和来源支持度弱属于中严重度问题。

## 当前基准

| 数据集 | 综合质量 | 来源覆盖 | 格式通过 | 重复率 | 泄漏对 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Support QA Playbook | 0.5228 | 80% | 80% | 40% | 1 |
| Contract Extraction Kit | 0.5269 | 80% | 60% | 40% | 1 |
| Meeting Summary Set | 0.2414 | 80% | 0% | 60% | 2 |
| Intent Classification Pack | 0.5912 | 100% | 60% | 40% | 1 |

组合指标为 4 个数据集、20 条样本、平均质量 `0.4706`、平均来源覆盖 `0.85` 和 5 组跨 split 泄漏。当前四个数据集均因泄漏或高严重度问题被标记为高风险。

## 发布门禁

默认策略要求：

- 综合质量不低于 `65%`。
- 来源覆盖不低于 `90%`。
- 重复率不高于 `10%`。
- 跨 split 泄漏为 `0`。

门禁页允许在浏览器中调整阈值并实时重算结果。例如 Support QA Playbook 在默认策略下 `0/4` 项通过，将阈值调整为质量 `50%`、来源 `80%`、重复率 `40%`、泄漏对 `1` 后可观察到 `4/4` 项通过。

## 快速运行

### 静态前端

可直接打开 `web/index.html`。为了让前端读取 `data/datasets.json` 的最新内容，推荐在仓库根目录启动静态服务器：

~~~bash
python -m http.server 8000
~~~

然后访问：

~~~text
http://127.0.0.1:8000/AI-Dataset-Curation-Lab/web/index.html
~~~

通过 `file://` 双击打开时，前端会使用与项目数据一致的内置快照。

### CLI

~~~bash
cd AI-Dataset-Curation-Lab
python scripts/audit_dataset.py
python scripts/audit_dataset.py --dataset-id support-qa-playbook
~~~

### FastAPI

~~~bash
cd AI-Dataset-Curation-Lab/backend
python -m pip install -r requirements.txt
python app.py
~~~

服务默认运行在 `http://127.0.0.1:8070`：

| 接口 | 说明 |
| --- | --- |
| `GET /health` | 健康检查 |
| `GET /api/datasets` | 原始数据集列表 |
| `GET /api/audit` | 全量审计结果 |
| `GET /api/audit/{dataset_id}` | 单数据集审计结果 |

## 项目结构

~~~text
AI-Dataset-Curation-Lab/
|-- README.md
|-- backend/
|   |-- app.py
|   |-- dataset_lab.py
|   `-- requirements.txt
|-- data/
|   `-- datasets.json
|-- scripts/
|   `-- audit_dataset.py
`-- web/
    |-- index.html
    |-- samples.html
    |-- integrity.html
    |-- release.html
    |-- app.js
    `-- styles.css
~~~

## 数据与实现

- `data/datasets.json`：4 类任务的原始样本、标签、来源和 Split。
- `backend/dataset_lab.py`：Python 审计规则的基准实现。
- `web/app.js`：与 Python 规则一致的浏览器审计引擎及四页交互。

在 HTTP 和 GitHub Pages 环境中，前端优先读取 `data/datasets.json`；直接打开文件或离线时使用内置数据快照。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
