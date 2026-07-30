# Model Router Sandbox

Model Router Sandbox 是一个模型路由策略实验项目。它用样例任务和模型画像演示如何在质量、成本、延迟、上下文长度和隐私约束之间做选择，适合扩展成 AI 产品里的模型调度、降级和预算控制模块。

## 功能

- 维护模型能力画像，包括任务质量、成本、延迟、上下文窗口和隐私模式。
- 维护任务画像，包括任务类型、风险等级、上下文长度、预算和延迟要求。
- 根据硬性约束过滤候选模型，再用加权评分排序。
- 输出推荐模型、备选模型和每个决策理由。
- 提供 CLI 脚本，可批量查看所有任务路由结果。
- 提供 FastAPI 接口，便于后续接入真实模型网关。
- 提供浏览器看板，可直接打开 `web/index.html` 查看路由结果。

## 快速运行

### 浏览器看板

直接打开：

```text
web/index.html
```

### 命令行路由

```bash
cd Model-Router-Sandbox
python scripts/route_tasks.py
python scripts/route_tasks.py --task-id task-004
```

### 后端接口

```bash
cd Model-Router-Sandbox/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8060/health
http://127.0.0.1:8060/api/routes
http://127.0.0.1:8060/api/routes/task-004
```

## 项目结构

```text
Model-Router-Sandbox/
├── README.md
├── backend/
│   ├── app.py
│   ├── model_router.py
│   └── requirements.txt
├── data/
│   ├── models.json
│   └── tasks.json
├── scripts/
│   └── route_tasks.py
└── web/
    └── index.html
```

## 路由维度

- `quality_score`: 模型在当前任务类型上的能力分。
- `latency_score`: 相对任务延迟预算的得分。
- `cost_score`: 相对任务预算的得分。
- `safety_score`: 安全与稳定性分。
- `context_score`: 上下文窗口余量分。

## 可扩展方向

- 接入真实模型价格、速率限制和可用性状态。
- 增加失败降级策略、A/B 分流和缓存命中策略。
- 为高风险任务加入人工复核、审计日志和安全策略。
- 将路由结果导出成 JSON policy，服务于生产网关。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
