# Personal AI Replication Manual

这个仓库用于整理个人 AI 产品与浏览器演示项目。目前包含两个可直接在浏览器中打开的前端 Demo：Agent 工作流可视化工具和行车场景理解助手。

## 项目目录

| 项目 | 简介 | 入口 |
| --- | --- | --- |
| AgentFlow Visualizer | LLM 工作流可视化、执行模拟与 Prompt 调试工具 | [AgentFlow-Visualizer/index.html](AgentFlow-Visualizer/index.html) |
| AutoVision Copilot | 面向行车画面的 VLM 场景理解与风险问答演示 | [AutoVision-Copilot/index.html](AutoVision-Copilot/index.html) |

## 快速运行

这两个项目都是单文件浏览器版，不需要安装依赖或启动服务。

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

- 当前两个浏览器项目均为前端 Mock 演示，用于展示产品交互和能力设计，不包含后端服务。
- AgentFlow Visualizer 使用 Mermaid CDN 渲染流程图，打开时需要网络访问 CDN。
- AutoVision Copilot 会在本地浏览器中读取用户上传的图片或视频首帧，演示问答结果为预设模拟响应。

## License

本仓库使用 [MIT License](LICENSE)。
