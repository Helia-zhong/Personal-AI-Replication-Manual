# Personal AI Replication Manual

这个仓库用于整理 AI 产品原型、智能车辆仿真、车辆控制和数据可视化项目。每个重点项目都有独立目录、README 和可运行入口。

## 项目目录

| 项目 | 简介 | 入口 |
| --- | --- | --- |
| AgentFlow Visualizer | LLM 工作流可视化、执行模拟与 Prompt 调试工具 | [AgentFlow-Visualizer/index.html](AgentFlow-Visualizer/index.html) |
| AutoVision Copilot | 行车画面的 VLM 场景理解与风险问答演示 | [AutoVision-Copilot/index.html](AutoVision-Copilot/index.html) |
| PID Auto Tuning Dashboard | 线控转向 PID 参数调节、智能寻优与响应曲线对比 | [PID-Auto-Tuning-Dashboard/index.html](PID-Auto-Tuning-Dashboard/index.html) |
| Auto Parking Trajectory Simulator | 五次多项式自动泊车轨迹规划与前端可视化 | [Auto-Parking-Trajectory-Simulator/index.html](Auto-Parking-Trajectory-Simulator/index.html) |
| CAN Sentinel | 车辆 CAN / 传感器时序异常检测系统 | [CAN-Sentinel/web/index.html](CAN-Sentinel/web/index.html) |
| AutoRisk Lab | 行车场景风险分析、标注样例与评估工作台 | [AutoRisk-Lab/web/index.html](AutoRisk-Lab/web/index.html) |
| Vehicle Manual RAG Copilot | 车辆手册本地检索问答助手 | [Vehicle-Manual-RAG-Copilot/web/index.html](Vehicle-Manual-RAG-Copilot/web/index.html) |
| Parking Planner Lab | A* 自动泊车路径规划、障碍物与动画回放实验室 | [Parking-Planner-Lab/web/index.html](Parking-Planner-Lab/web/index.html) |
| PromptOps Evaluation Lab | Prompt 版本管理、测试集评估与评分看板 | [PromptOps-Evaluation-Lab/web/index.html](PromptOps-Evaluation-Lab/web/index.html) |

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
├── AutoVision-Copilot/
├── PID-Auto-Tuning-Dashboard/
├── Auto-Parking-Trajectory-Simulator/
├── CAN-Sentinel/
├── AutoRisk-Lab/
├── Vehicle-Manual-RAG-Copilot/
├── Parking-Planner-Lab/
├── PromptOps-Evaluation-Lab/
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
