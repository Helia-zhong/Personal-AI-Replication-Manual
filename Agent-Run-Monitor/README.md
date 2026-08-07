# Agent Run Monitor

Agent Run Monitor 是一个多页面 AI Agent 运行可观测控制台，用统一轨迹检查工作流状态、步骤耗时、工具调用、Token、成本、重试与失败节点。

项目同时提供可部署到 GitHub Pages 的浏览器控制台、Python CLI 和 FastAPI 接口。浏览器端镜像 Python 后端的汇总与异常检测口径，使用三条确定性样本轨迹，不需要 API Key。

## 在线入口

<https://helia-zhong.github.io/Personal-AI-Replication-Manual/Agent-Run-Monitor/web/index.html>

## 页面结构

| 页面 | 入口 | 主要内容 |
| --- | --- | --- |
| 运行总览 | `web/index.html` | 跨运行健康度、耗时成本图、运行记录、观测信号和工具调用 |
| Trace 详情 | `web/trace.html` | 单次运行 Waterfall、步骤检查器、资源分布与 Trace 属性 |
| 异常中心 | `web/incidents.html` | 失败、重试、耗时和成本异常筛选、诊断与修复优先级 |
| 成本性能 | `web/economics.html` | 成本/延迟预算、工具经济性、预算门禁和优化空间 |

## 核心能力

- 内置 3 条工作流、14 个 Agent 步骤和 10 类工具/推理调用。
- 计算端到端耗时、Token、估算成本、步骤成功率、重试数与瓶颈步骤。
- 使用与 Python 后端相同的规则识别步骤失败、高重试、耗时瓶颈与成本异常。
- 提供跨运行健康度、单次 Trace Waterfall 和步骤级资源检查器。
- 支持按严重级别筛选异常，并关联到原始运行与具体步骤。
- 支持动态调整成本与延迟预算，标记超预算运行。
- 汇总工具调用次数、平均耗时、Token、成本占比与风险信号。
- 使用 `localStorage` 保存最近查看的运行。
- 支持 Trace JSON 与异常 Markdown 报告导出。

## 快速运行

### 浏览器控制台

直接打开 `web/index.html`，或者在项目目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/web/index.html
```

### 命令行分析

```bash
python scripts/analyze_runs.py
python scripts/analyze_runs.py --run-id run-2026-07-research-002
```

### FastAPI 接口

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

接口地址：

```text
GET http://127.0.0.1:8040/health
GET http://127.0.0.1:8040/api/runs
GET http://127.0.0.1:8040/api/summary
GET http://127.0.0.1:8040/api/runs/run-2026-07-qa-001/summary
```

## 异常规则

| 信号 | 级别 | 触发条件 |
| --- | --- | --- |
| 步骤失败 | 高危 | `status != success` |
| 重试次数偏高 | 中危 | `retries >= 2` |
| 耗时瓶颈 | 中危 | 步骤耗时大于当前运行步骤耗时中位数的 2 倍 |
| 成本偏高 | 低危 | 单步骤成本不低于 `$0.015` |

当前样本共识别 7 个异常信号：1 个高危、5 个中危和 1 个低危。

## 项目结构

```text
Agent-Run-Monitor/
├── README.md
├── backend/
│   ├── app.py               FastAPI 服务
│   ├── run_monitor.py       汇总、异常检测与建议逻辑
│   └── requirements.txt
├── data/
│   └── sample_runs.json     Agent 运行轨迹样本
├── scripts/
│   └── analyze_runs.py      CLI 入口
└── web/
    ├── index.html           运行总览
    ├── trace.html           Trace 详情
    ├── incidents.html       异常中心
    ├── economics.html       成本性能
    ├── styles.css           共享视觉与响应式样式
    └── app.js               数据、指标、交互、图表与导出逻辑
```

## 运行边界

- 当前轨迹、成本与时间均为项目内置演示数据。
- 前端为保证 GitHub Pages 和本地文件模式可用，内置了与 `sample_runs.json` 相同的样本数据。
- 生产接入可将数据源替换为 OpenTelemetry、LangGraph 节点事件或现有日志平台，同时复用指标与异常模型。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
