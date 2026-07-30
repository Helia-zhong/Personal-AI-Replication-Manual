# Agent Run Monitor

Agent Run Monitor 是一个 AI Agent 运行轨迹观测项目。它把多步骤任务中的工具调用、耗时、token、重试、失败节点和成本整理成可读指标，帮助定位 Agent 工作流里的瓶颈和不稳定环节。

## 功能

- 读取多条 Agent 运行轨迹样例。
- 计算总耗时、token 用量、成本、步骤成功率、重试次数和工具分布。
- 自动识别失败步骤、高重试步骤、耗时瓶颈和成本异常。
- 提供命令行分析脚本，支持单条运行或全部运行汇总。
- 提供 FastAPI 后端接口，便于后续接入真实日志系统。
- 提供浏览器看板，可直接打开 `web/index.html` 查看时间线和诊断结果。

## 快速运行

### 浏览器看板

直接打开：

```text
web/index.html
```

### 命令行分析

```bash
cd Agent-Run-Monitor
python scripts/analyze_runs.py
python scripts/analyze_runs.py --run-id run-2026-07-qa-001
```

### 后端接口

```bash
cd Agent-Run-Monitor/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8040/health
http://127.0.0.1:8040/api/runs
http://127.0.0.1:8040/api/runs/run-2026-07-qa-001/summary
```

## 项目结构

```text
Agent-Run-Monitor/
├── README.md
├── backend/
│   ├── app.py
│   ├── run_monitor.py
│   └── requirements.txt
├── data/
│   └── sample_runs.json
├── scripts/
│   └── analyze_runs.py
└── web/
    └── index.html
```

## 观测指标

- `total_duration_ms`: 端到端耗时。
- `total_tokens`: 输入与输出 token 合计。
- `estimated_cost_usd`: 估算成本。
- `step_success_rate`: 步骤成功率。
- `retry_count`: 重试总次数。
- `bottleneck_step`: 当前运行中耗时最长的步骤。

## 可扩展方向

- 接入真实 Agent 日志、OpenTelemetry trace 或 LangGraph 节点事件。
- 增加按项目、模型、工具和任务类型聚合的趋势图。
- 加入错误聚类、重试策略对比和成本预算预警。
- 导出运行报告，沉淀 Agent 工作流改进记录。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
