# Vehicle Manual RAG Copilot

Vehicle Manual RAG Copilot 是一个车辆手册问答助手。项目使用本地手册文本做检索，回答时展示引用片段，并在问题超出资料范围时给出拒答提示。

## 功能

- 本地车辆手册知识库。
- 基于关键词、中文字符 n-gram 和 IDF 的轻量检索。
- 返回答案、引用来源、相似度分数和建议追问。
- 提供 FastAPI 后端接口。
- 提供浏览器版问答界面，可直接打开 `web/index.html` 体验。

## 快速运行

### 浏览器演示

直接打开：

```text
web/index.html
```

### 命令行检索

```bash
cd Vehicle-Manual-RAG-Copilot
python backend/rag_engine.py "胎压报警怎么办"
```

### 后端接口

```bash
cd Vehicle-Manual-RAG-Copilot/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8010/health
```

## 项目结构

```text
Vehicle-Manual-RAG-Copilot/
├── README.md
├── backend/
│   ├── app.py
│   ├── rag_engine.py
│   └── requirements.txt
├── docs/
│   └── manual.md
└── web/
    └── index.html
```

## 技术栈

- Python
- FastAPI
- Pydantic
- Vanilla JavaScript
- 本地文本检索

## 可扩展方向

- 替换为真实车辆说明书 PDF，并增加解析脚本。
- 接入向量数据库或 SQLite FTS。
- 接入 LLM 生成自然语言答案，同时保留引用来源。
- 增加答案质量评估、拒答测试集和多轮问答记忆。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
