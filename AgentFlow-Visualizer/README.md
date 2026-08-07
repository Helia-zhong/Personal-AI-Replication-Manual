# AgentFlow Visualizer

AgentFlow Visualizer 是一个多页面 LLM 工作流实验台，用于搭建演示流程、模拟节点执行、查看运行轨迹、调试 Prompt 模板并管理本地运行参数。项目完全运行在浏览器中，不需要后端或构建工具。

## 在线入口

<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AgentFlow-Visualizer/index.html>

## 页面结构

| 页面 | 入口 | 主要内容 |
| --- | --- | --- |
| Workspace | `index.html` | 工作流选择、节点画布、执行配置、逐节点动画和结果输出 |
| Runs | `runs.html` | 运行记录筛选、执行详情、节点轨迹、结果复制和 JSON 导出 |
| Prompt Lab | `prompts.html` | Prompt 模板、JSON 变量、渲染预览和规则评分 |
| Settings | `settings.html` | 模型参数、运行策略、主题设置和本地数据管理 |

## 核心能力

- 内置 RAG Q&A、Research Agent、Content Review 和 Multi-Agent 四种工作流。
- 通过独立节点状态展示执行中、成功和失败状态。
- 保存最近 50 条 Mock 运行记录，并支持筛选、复盘和重放。
- 支持 `{{variable}}` 和 `{{variable|default}}` Prompt 变量语法。
- 提供 Prompt 清晰度、变量覆盖、输出约束和安全边界评分。
- 使用浏览器 `localStorage` 保存运行记录、设置和主题。
- 桌面端使用固定工作台导航，移动端自动切换为底部导航。

## 快速运行

直接打开 `index.html`，或者在本目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 项目结构

```text
AgentFlow-Visualizer/
├── index.html       Workspace 工作台
├── runs.html        运行记录与轨迹复盘
├── prompts.html     Prompt 调试与评估
├── settings.html    运行与数据设置
├── styles.css       共享界面与响应式样式
├── app.js           工作流、运行记录和页面交互
└── README.md        项目说明
```

## 技术栈

- HTML5
- CSS3
- Vanilla JavaScript
- Browser LocalStorage

## 运行边界

当前版本使用确定性的 Mock 数据，不会调用真实 LLM、搜索服务或向量数据库。设置页面中的模型参数用于展示运行配置，不需要填写 API Key，也不会向外部服务发送内容。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
