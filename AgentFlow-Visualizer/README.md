# AgentFlow Visualizer

AgentFlow Visualizer 是一个浏览器版 LLM 工作流可视化与调试工具，用于展示常见 AI 工作流的节点结构、模拟执行过程，并辅助调试 Prompt 模板。

## 功能

- 工作流模板切换：内置 RAG 问答、思维链推理和多 Agent 协作流程。
- 流程图可视化：使用 Mermaid 渲染节点与任务流向。
- 执行模拟：展示总步数、成功步数、耗时、时间线和执行日志。
- Prompt 调试器：支持 `{{variable}}` 变量插值、JSON 变量输入和渲染预览。
- 单文件运行：无需构建、无需安装依赖，直接在浏览器打开即可。

## 快速开始

1. 下载或克隆仓库。
2. 打开本目录下的 `index.html`。
3. 选择一个工作流模板，调整输入变量，然后点击「执行工作流」。
4. 在 Prompt 调试器中编辑模板和变量，点击「预览渲染结果」查看输出。

## 技术栈

- HTML
- CSS
- Vanilla JavaScript
- Mermaid CDN

## 文件结构

```text
AgentFlow-Visualizer/
├── index.html
└── README.md
```

## 使用场景

- AI 工作流方案展示
- RAG / CoT / 多 Agent 流程讲解
- Prompt 模板调试演示
- 个人作品集中的交互式项目案例

## 注意事项

- 当前版本为 Mock 演示，不会真正调用 LLM API。
- Mermaid 通过 CDN 加载；离线环境下流程图可能无法渲染。
- 页面中提到的真实 GPT-4o 接入是后续扩展方向，当前未包含 API Key 输入和后端转发逻辑。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
