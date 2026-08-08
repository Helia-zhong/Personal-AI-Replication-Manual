# AI Video Insight Lab

AI Video Insight Lab 是一个可离线运行的多模态视频质检工作台。项目用结构化场景数据模拟视频理解管线，统一检查字幕、OCR、音频、对象、镜头时长与高光密度，并提供可编辑的剪辑决策和 Markdown 报告导出。

## 在线体验

- GitHub Pages：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/AI-Video-Insight-Lab/web/index.html>
- 本地直接打开：`web/index.html`

前端不依赖 API Key。通过 HTTP 访问时会读取 `data/clips.json`；直接以 `file://` 打开时会自动使用 `web/data.js` 中的离线快照。

## 四个工作页面

| 页面 | 功能 |
| --- | --- |
| [媒体总览](web/index.html) | 汇总样例规模、字幕覆盖率、质量分和问题队列，支持风险筛选与质量排序 |
| [镜头审阅](web/review.html) | 模拟播放、时间轴拖动、场景跳转，并同步展示字幕、OCR、音频和对象信号 |
| [覆盖诊断](web/coverage.html) | 按视频或关键词检索多模态覆盖矩阵，直接跳转到缺口发生的时间码 |
| [高光剪辑](web/highlights.html) | 新增、修改、删除高光窗口，实时重算密度、适配度与整体质量 |

高光编辑、当前样例、播放位置和速度保存在浏览器本地。修改后的高光结果会同步反映到审阅页，并可随时恢复原始数据。

## 质量基线

| 样例 | 时长 | 场景 | 质量分 | 诊断问题 |
| --- | ---: | ---: | ---: | --- |
| Product Launch Teaser | 72 秒 | 5 | 85.24% | 长镜头、高光过密 |
| Support Training Recap | 96 秒 | 6 | 86.64% | 长镜头 |
| Webinar Cutdown | 84 秒 | 6 | 85.00% | 字幕缺失、长镜头、高光过密 |
| Release Story Clip | 60 秒 | 5 | 90.00% | 长镜头、高光过密 |

四个样例的加权质量基线为 `86.72%`。JavaScript 前端引擎与 Python 后端对同一份数据返回一致的质量分和问题类型。

## 本地运行

直接打开 `web/index.html` 即可使用完整离线前端。也可以从仓库根目录启动静态服务：

```bash
python -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/AI-Video-Insight-Lab/web/index.html
```

## Python API

```bash
cd AI-Video-Insight-Lab/backend
python -m pip install -r requirements.txt
python app.py
```

默认服务地址为 `http://127.0.0.1:8000`，接口包括：

- `GET /health`
- `GET /api/clips`
- `GET /api/report`
- `GET /api/inspect/{clip_id}`
- `GET /api/clips/{clip_id}/report`

## CLI

```bash
cd AI-Video-Insight-Lab
python scripts/inspect_clip.py --clip-id launch-teaser
python scripts/inspect_clip.py --clip-id webinar-cutdown --format markdown
```

## 项目结构

```text
AI-Video-Insight-Lab/
|-- backend/
|   |-- app.py
|   |-- video_lab.py
|   |-- requirements.txt
|   `-- tests/
|-- data/
|   `-- clips.json
|-- scripts/
|   `-- inspect_clip.py
`-- web/
    |-- assets/
    |-- index.html
    |-- review.html
    |-- coverage.html
    |-- highlights.html
    |-- data.js
    |-- engine.js
    |-- app.js
    `-- styles.css
```

`backend/video_lab.py` 与 `web/engine.js` 实现同一套确定性规则，负责覆盖率、镜头节奏、高光密度、问题列表和推荐语计算。前端没有构建步骤，适合直接部署到 GitHub Pages。

## 测试

```bash
cd AI-Video-Insight-Lab/backend
python -m unittest discover -s tests
python -m py_compile app.py video_lab.py ../scripts/inspect_clip.py
```

前端脚本可使用 Node.js 做语法检查：

```bash
node --check web/data.js
node --check web/engine.js
node --check web/app.js
```

## 图片来源

演示封面图片来自 [Unsplash](https://unsplash.com/)，遵循 [Unsplash License](https://unsplash.com/license)。图片仅用于项目界面演示。

## License

MIT，见仓库根目录 [LICENSE](../LICENSE)。
