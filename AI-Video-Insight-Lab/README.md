# AI Video Insight Lab

一个用于视频场景理解、字幕覆盖检查、OCR 线索分析和剪辑报告导出的 AI 项目。

## 你可以做什么

- 浏览样例视频的场景拆分
- 查看字幕、OCR、音频和高光片段
- 识别缺字幕、长镜头和高光过密等问题
- 导出 Markdown 审阅报告
- 用 CLI 或 FastAPI 调用分析结果
- 刷新后恢复当前 clip 与时间位置

## 快速开始

### 浏览器

直接打开：

```text
web/index.html
```

### 后端

```bash
cd AI-Video-Insight-Lab/backend
python -m pip install -r requirements.txt
python app.py
```

### CLI

```bash
cd AI-Video-Insight-Lab
python scripts/inspect_clip.py --clip-id launch-teaser
python scripts/inspect_clip.py --clip-id launch-teaser --format markdown
```

## API

- `GET /health`
- `GET /api/clips`
- `GET /api/report`
- `GET /api/inspect/{clip_id}`
- `GET /api/clips/{clip_id}/report`

## 目录

```text
AI-Video-Insight-Lab/
├── backend/
│   ├── app.py
│   ├── video_lab.py
│   └── requirements.txt
├── data/
│   └── clips.json
├── scripts/
│   └── inspect_clip.py
└── web/
    └── index.html
```

## 测试

```bash
cd AI-Video-Insight-Lab/backend
python -m unittest discover -s tests
```

## License

MIT，见仓库根目录 `LICENSE`。
