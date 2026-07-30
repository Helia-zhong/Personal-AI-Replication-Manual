# Personal AI Replication Manual

这个仓库用于整理 AI 产品原型、评估实验、Agent 工程、模型路由和数据可视化项目。每个重点项目都有独立目录、README 和可运行入口；部分早期工程实验也保留在仓库中。

## 项目目录

| 项目 | 简介 | 入口 |
| --- | --- | --- |
| AgentFlow Visualizer | LLM 工作流可视化、执行模拟与 Prompt 调试工具 | [AgentFlow-Visualizer/index.html](AgentFlow-Visualizer/index.html) |
| PromptOps Evaluation Lab | Prompt 版本管理、测试集评估与评分看板 | [PromptOps-Evaluation-Lab/web/index.html](PromptOps-Evaluation-Lab/web/index.html) |
| RAG Evaluation Studio | RAG 检索、引用召回、答案覆盖与评估看板 | [RAG-Evaluation-Studio/web/index.html](RAG-Evaluation-Studio/web/index.html) |
| Agent Run Monitor | AI Agent 运行轨迹、工具调用、重试和成本观测 | [Agent-Run-Monitor/web/index.html](Agent-Run-Monitor/web/index.html) |
| AI Content QA Workbench | AI 生成内容声明审查、引用覆盖和风险分级 | [AI-Content-QA-Workbench/web/index.html](AI-Content-QA-Workbench/web/index.html) |
| Model Router Sandbox | 多模型路由策略、成本延迟质量权衡与候选排序 | [Model-Router-Sandbox/web/index.html](Model-Router-Sandbox/web/index.html) |
| AI Dataset Curation Lab | AI 数据集质检、重复检测、泄漏检查与样本评分 | [AI-Dataset-Curation-Lab/web/index.html](AI-Dataset-Curation-Lab/web/index.html) |
| AutoVision Copilot | 行车画面的 VLM 场景理解与风险问答演示 | [AutoVision-Copilot/index.html](AutoVision-Copilot/index.html) |
| PID Auto Tuning Dashboard | 线控转向 PID 参数调节、智能寻优与响应曲线对比 | [PID-Auto-Tuning-Dashboard/index.html](PID-Auto-Tuning-Dashboard/index.html) |
| Auto Parking Trajectory Simulator | 五次多项式自动泊车轨迹规划与前端可视化 | [Auto-Parking-Trajectory-Simulator/index.html](Auto-Parking-Trajectory-Simulator/index.html) |
| CAN Sentinel | 车辆 CAN / 传感器时序异常检测系统 | [CAN-Sentinel/web/index.html](CAN-Sentinel/web/index.html) |
| AutoRisk Lab | 行车场景风险分析、标注样例与评估工作台 | [AutoRisk-Lab/web/index.html](AutoRisk-Lab/web/index.html) |
| Vehicle Manual RAG Copilot | 车辆手册本地检索问答助手 | [Vehicle-Manual-RAG-Copilot/web/index.html](Vehicle-Manual-RAG-Copilot/web/index.html) |
| Parking Planner Lab | A* 自动泊车路径规划、障碍物与动画回放实验室 | [Parking-Planner-Lab/web/index.html](Parking-Planner-Lab/web/index.html) |

## 快速运行

大多数浏览器项目可以直接打开对应目录下的 `index.html` 或 `web/index.html`。

```bash
git clone https://github.com/Helia-zhong/Personal-AI-Replication-Manual.git
cd Personal-AI-Replication-Manual
```

需要后端的项目在各自目录中提供 `backend/requirements.txt` 和启动说明。

## 仓库结构

```text
.
├── AgentFlow-Visualizer/
├── PromptOps-Evaluation-Lab/
├── RAG-Evaluation-Studio/
├── Agent-Run-Monitor/
├── AI-Content-QA-Workbench/
├── Model-Router-Sandbox/
├── AI-Dataset-Curation-Lab/
├── AutoVision-Copilot/
├── PID-Auto-Tuning-Dashboard/
├── Auto-Parking-Trajectory-Simulator/
├── CAN-Sentinel/
├── AutoRisk-Lab/
├── Vehicle-Manual-RAG-Copilot/
├── Parking-Planner-Lab/
├── 01/
├── 02/
├── 03/
├── 04/
├── 05/
├── LICENSE
├── packages.txt
└── README.md
```

## 说明

- 浏览器项目主要用于交互演示、算法流程说明和可视化展示。
- 后端项目保留 Python / FastAPI 接口，便于后续接入真实数据或模型服务。
- `01` 到 `05` 为早期项目目录，保留原始代码和说明。

## License

本仓库使用 [MIT License](LICENSE)。
