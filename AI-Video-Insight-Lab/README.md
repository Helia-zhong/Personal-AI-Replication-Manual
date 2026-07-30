# AI Video Insight Lab

AI Video Insight Lab 是一个视频场景理解与高光分析实验室。它通过样例 clip、镜头切分、字幕片段、OCR 信息和高光窗口，演示如何对视频内容做结构化分析、摘要和剪辑建议。

## 功能

- 读取多个视频样例的镜头、字幕、OCR 和音频事件。
- 计算字幕覆盖率、镜头均衡度、高光密度和综合质量分。
- 标记缺字幕、OCR 稀疏、镜头过长和高光过密等问题。
- 提供命令行脚本，可输出单个 clip 或全部 clip 的分析结果。
- 提供 FastAPI 接口，便于后续接入真实视频处理管线。
- 提供浏览器看板，可直接打开 `web/index.html` 浏览故事板。

## 快速运行

### 浏览器看板

直接打开：

```text
web/index.html
```

### 命令行分析

```bash
cd AI-Video-Insight-Lab
python scripts/inspect_clip.py
python scripts/inspect_clip.py --clip-id launch-teaser
```

### 后端接口

```bash
cd AI-Video-Insight-Lab/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8090/health
http://127.0.0.1:8090/api/clips
http://127.0.0.1:8090/api/inspect/launch-teaser
```

## 项目结构

```text
AI-Video-Insight-Lab/
├── README.md
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

## 分析维度

- `caption_coverage`: 有字幕的镜头占比。
- `ocr_coverage`: 有 OCR 信息的镜头占比。
- `highlight_fit`: 高光窗口是否合适。
- `scene_balance`: 镜头长度是否均衡。
- `audio_coverage`: 有音频事件的镜头占比。
- `overall_quality`: 综合质量分。

## 可扩展方向

- 接入真实视频解码、关键帧提取和语音转写。
- 增加镜头边界检测和人物/物体识别结果。
- 生成自动剪辑建议、封面建议和字幕校对报告。
- 将结果导出成可分享的 Markdown 或 HTML 报告。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
