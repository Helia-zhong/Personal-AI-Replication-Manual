# Personal AI Replication Manual

这个仓库用于整理个人 AI 产品与浏览器演示项目。当前主线是 AI 工程化、智能车辆、车辆控制与数据可视化。

## 项目目录

| 项目 | 简介 | 入口 |
| --- | --- | --- |
| AgentFlow Visualizer | LLM 工作流可视化、执行模拟与 Prompt 调试工具 | [AgentFlow-Visualizer/index.html](AgentFlow-Visualizer/index.html) |
| AutoVision Copilot | 面向行车画面的 VLM 场景理解与风险问答演示 | [AutoVision-Copilot/index.html](AutoVision-Copilot/index.html) |
| PID Auto Tuning Dashboard | 线控转向 PID 参数调节、智能寻优与响应曲线对比 | [PID-Auto-Tuning-Dashboard/index.html](PID-Auto-Tuning-Dashboard/index.html) |
| Auto Parking Trajectory Simulator | 五次多项式自动泊车轨迹规划与前端可视化 | [Auto-Parking-Trajectory-Simulator/index.html](Auto-Parking-Trajectory-Simulator/index.html) |

## 招聘视角评估

已补充一份面向求职作品集的评估与后续作品建议：

[Recruiter-Portfolio-Review.md](Recruiter-Portfolio-Review.md)

## 快速运行

四个重点项目都是单文件浏览器版，不需要安装依赖或启动服务。

1. 克隆仓库：

   ```bash
   git clone https://github.com/Helia-zhong/Personal-AI-Replication-Manual.git
   cd Personal-AI-Replication-Manual
   ```

2. 直接用浏览器打开对应项目的 `index.html`。

## 仓库结构

```text
.
├── AgentFlow-Visualizer/
│   ├── index.html
│   └── README.md
├── AutoVision-Copilot/
│   ├── index.html
│   └── README.md
├── PID-Auto-Tuning-Dashboard/
│   ├── index.html
│   └── README.md
├── Auto-Parking-Trajectory-Simulator/
│   ├── index.html
│   └── README.md
├── 01/
├── 02/
├── 03/
├── 04/
├── 05/
├── LICENSE
├── packages.txt
├── Recruiter-Portfolio-Review.md
└── README.md
```

## 说明

- 当前重点浏览器项目均为前端演示，用于展示产品交互、算法流程和可视化能力，不包含后端服务。
- AgentFlow Visualizer 使用 Mermaid CDN 渲染流程图，打开时需要网络访问 CDN。
- AutoVision Copilot 会在本地浏览器中读取用户上传的图片或视频首帧，演示问答结果为预设模拟响应。
- PID Auto Tuning Dashboard 和 Auto Parking Trajectory Simulator 是浏览器端近似仿真，用于作品集展示与面试讲解。

## License

本仓库使用 [MIT License](LICENSE)。
