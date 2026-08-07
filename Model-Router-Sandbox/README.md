# Model Router Sandbox

Model Router Sandbox 是一个可解释的多模型策略路由工作台。项目先用隐私、上下文、预算和最低质量四类硬约束过滤模型，再依据任务风险等级，对质量、安全、延迟、成本与上下文余量进行加权排序。

前端提供完整的四页操作界面，Python 侧同时提供可复用路由模块、CLI 和 FastAPI 接口。所有演示数据均在仓库内，不需要 API Key。

## 在线体验

- [打开路由总览](https://helia-zhong.github.io/Personal-AI-Replication-Manual/Model-Router-Sandbox/web/index.html)
- [查看决策解释](https://helia-zhong.github.io/Personal-AI-Replication-Manual/Model-Router-Sandbox/web/decision.html?task=task-002)
- [进入策略实验](https://helia-zhong.github.io/Personal-AI-Replication-Manual/Model-Router-Sandbox/web/policy.html?task=task-001)

## 四个工作区

| 页面 | 主要能力 |
| --- | --- |
| 路由总览 | 路由覆盖率、赢家评分与成本、策略健康度、模型分配、硬约束信号 |
| 决策解释 | 单任务评分分解、推荐理由、候选排序、逐模型过滤诊断、JSON 导出 |
| 模型目录 | 模型检索、隐私筛选、价格与延迟画像、能力矩阵、模型详情检查器 |
| 策略实验 | 评分权重、预算倍率和最低质量的实时实验、基准对比、策略导出 |

页面间通过任务参数联动，例如：

```text
decision.html?task=task-004
policy.html?task=task-002
```

## 路由规则

### 1. 硬约束过滤

模型必须同时满足：

- 隐私模式不低于任务要求，`restricted` 任务必须使用 `private` 模型。
- 上下文窗口覆盖任务输入长度。
- 预计输入与输出成本不超过任务预算。
- 对应任务类型的质量分不低于最低质量门槛。

### 2. 风险权重评分

通过硬约束的模型按五个维度评分：

| 维度 | 标准任务 | 高风险任务 |
| --- | ---: | ---: |
| 任务质量 | 40% | 42% |
| 安全稳定 | 18% | 28% |
| 响应延迟 | 18% | 10% |
| 调用成本 | 17% | 10% |
| 上下文余量 | 7% | 10% |

策略实验页允许调整原始权重。计算时会自动归一化，界面同时保留原始权重总量，便于发现配置偏差。

## 基准路由

当前样例数据的默认结果如下：

| 任务 | 推荐模型 | 加权分 | 预计成本 | 候选数 |
| --- | --- | ---: | ---: | ---: |
| 客服工单意图分类 | Balanced Pro | 0.9124 | $0.002736 | 3 |
| 合同条款 JSON 抽取 | 无候选 | - | - | 0 |
| 长文档摘要 | Long Context | 0.9226 | $0.368400 | 1 |
| 复杂方案推理 | Deep Reasoner | 0.9594 | $0.092800 | 1 |
| 发布内容风险质检 | Balanced Pro | 0.9264 | $0.015120 | 3 |

`task-002` 的阻断状态是刻意保留的诊断样例：唯一的私有模型未达到默认抽取质量门槛。在策略实验中把最低质量调整为 `-0.10` 后，可观察到 Local Private 恢复为候选。

## 快速运行

### 静态前端

可直接打开 `web/index.html`。为了让前端从 `data/` 读取最新 JSON，推荐在仓库根目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/Model-Router-Sandbox/web/index.html
```

通过 `file://` 双击打开时，前端会使用与项目数据一致的内置快照，不影响完整演示。

### CLI

```bash
cd Model-Router-Sandbox
python scripts/route_tasks.py
python scripts/route_tasks.py --task-id task-004
```

### FastAPI

```bash
cd Model-Router-Sandbox/backend
python -m pip install -r requirements.txt
python app.py
```

服务默认运行在 `http://127.0.0.1:8060`：

| 接口 | 说明 |
| --- | --- |
| `GET /health` | 健康检查 |
| `GET /api/models` | 模型画像列表 |
| `GET /api/tasks` | 任务画像列表 |
| `GET /api/routes` | 批量路由结果 |
| `GET /api/routes/{task_id}` | 单任务路由结果 |

## 项目结构

```text
Model-Router-Sandbox/
|-- README.md
|-- backend/
|   |-- app.py
|   |-- model_router.py
|   `-- requirements.txt
|-- data/
|   |-- models.json
|   `-- tasks.json
|-- scripts/
|   `-- route_tasks.py
`-- web/
    |-- index.html
    |-- decision.html
    |-- models.html
    |-- policy.html
    |-- app.js
    `-- styles.css
```

## 数据与实现

- `data/models.json`：模型能力、隐私、上下文、价格、延迟和安全画像。
- `data/tasks.json`：任务类型、风险、Token、预算、隐私和质量要求。
- `backend/model_router.py`：Python 路由规则的基准实现。
- `web/app.js`：与 Python 规则一致的浏览器路由引擎及四页交互。

在 HTTP 和 GitHub Pages 环境中，前端优先读取 `data/*.json`；直接打开文件或离线时使用内置数据快照。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
