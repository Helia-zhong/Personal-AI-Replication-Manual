# Personal AI Replication Manual

这个仓库用于整理 AI 产品原型、评估实验、Agent 工程、模型路由、数据治理、AI 游戏和视频理解项目。每个重点项目都有独立目录、README 和可运行入口。

## 先看这里

你截图里打不开，是因为你停在 GitHub 的文件浏览页面。GitHub 仓库页只能看文件和 README，不能直接把 `web/index.html` 当作应用运行。

正确打开方式：

- 在线演示入口：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/>
- 四子棋 AI：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Connect-Four-Arena/web/index.html>
- 视频理解 Lab：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Video-Insight-Lab/web/index.html>

如果 GitHub Pages 刚开启，页面可能需要 1 到 3 分钟完成部署。

## 项目目录

| 项目 | 简介 | 在线入口 |
| --- | --- | --- |
| AgentFlow Visualizer | 多页面 LLM 工作流实验台、运行轨迹与 Prompt 评估工具 | [打开](AgentFlow-Visualizer/index.html) |
| PromptOps Evaluation Lab | 多页面 Prompt 版本、回归测试、发布门禁与报告控制台 | [打开](PromptOps-Evaluation-Lab/web/index.html) |
| RAG Evaluation Studio | 多页面 BM25 检索、引用评测、知识库与 Top-K 实验工作台 | [打开](RAG-Evaluation-Studio/web/index.html) |
| Agent Run Monitor | 多页面 Agent Trace、异常诊断、运行健康度与成本性能控制台 | [打开](Agent-Run-Monitor/web/index.html) |
| AI Content QA Workbench | AI 生成内容声明审查、引用覆盖和风险分级 | [打开](AI-Content-QA-Workbench/web/index.html) |
| Model Router Sandbox | 多模型路由策略、成本延迟质量权衡与候选排序 | [打开](Model-Router-Sandbox/web/index.html) |
| AI Dataset Curation Lab | 数据集质检、重复检测、泄漏检查与样本评分 | [打开](AI-Dataset-Curation-Lab/web/index.html) |
| AI Connect Four Arena | 四子棋 AI 对战、局面搜索、挑战样例和报告导出 | [打开](AI-Connect-Four-Arena/web/index.html) |
| AI Video Insight Lab | 视频场景理解、字幕覆盖、OCR、高光分析和报告导出 | [打开](AI-Video-Insight-Lab/web/index.html) |
| AutoVision Copilot | VLM 场景理解与风险问答演示 | [打开](AutoVision-Copilot/index.html) |
| PID Auto Tuning Dashboard | PID 参数调节、智能寻优与响应曲线对比 | [打开](PID-Auto-Tuning-Dashboard/index.html) |
| Auto Parking Trajectory Simulator | 自动泊车轨迹规划与前端可视化 | [打开](Auto-Parking-Trajectory-Simulator/index.html) |
| CAN Sentinel | CAN / 传感器时序异常检测系统 | [打开](CAN-Sentinel/web/index.html) |
| AutoRisk Lab | 场景风险分析、标注样例与评估工作台 | [打开](AutoRisk-Lab/web/index.html) |
| Vehicle Manual RAG Copilot | 本地手册检索问答助手 | [打开](Vehicle-Manual-RAG-Copilot/web/index.html) |
| Parking Planner Lab | A* 路径规划、障碍物与动画回放实验 | [打开](Parking-Planner-Lab/web/index.html) |
| Mechanism Kinematics Lab | 曲柄摇杆机构运动学求解、轨迹可视化与传动角监控 | [打开](https://personal-ai-replication-manual-zu9q4eze6ixxk43nqpz6bf.streamlit.app) |
| Industrial Motor Health Dashboard | 工业电机转速、轴承温度与超温预警监测 | [打开](Industrial-Motor-Health-Dashboard/index.html) |

## 本地运行

```bash
git clone https://github.com/Helia-zhong/Personal-AI-Replication-Manual.git
cd Personal-AI-Replication-Manual
```

大多数浏览器项目可以直接双击对应目录下的 `index.html` 或 `web/index.html`。

机构运动学项目需要 Python 环境：

```bash
cd Mechanism-Kinematics-Lab
python -m pip install -r requirements.txt
python -m streamlit run app3.py
```

其他项目的具体启动方式以各自目录中的 README 为准。

## GitHub Pages

仓库已包含 `.github/workflows/pages.yml`，推送到 `main` 后会自动部署静态网页。

部署成功后，访问：

```text
https://helia-zhong.github.io/Personal-AI-Replication-Manual/
```

## License

本仓库使用 [MIT License](LICENSE)。
