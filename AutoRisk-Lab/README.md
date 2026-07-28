# AutoRisk Lab

AutoRisk Lab 是一个行车场景风险分析平台原型。项目内置小型样例数据集，围绕场景、对象标注、风险等级、问题和模型输出构建一个可浏览、可评估的 VLM 风险理解工作台。

## 功能

- 内置多类行车场景：城市路口、高速跟车、停车场倒车、雨天夜间道路。
- 每个样例包含对象标注、风险等级、问题、预期输出和模拟模型输出。
- 浏览器端展示场景示意图、目标框、风险标签和建议动作。
- 评估脚本计算风险等级准确率、严重风险召回率和混淆矩阵。
- 页面可直接打开，也可以配合 `data/scenes.json` 做后续数据集扩展。

## 快速运行

### 浏览器演示

直接打开：

```text
web/index.html
```

### 数据集评估

```bash
cd AutoRisk-Lab
python scripts/evaluate.py
```

## 项目结构

```text
AutoRisk-Lab/
├── README.md
├── data/
│   └── scenes.json
├── scripts/
│   └── evaluate.py
└── web/
    └── index.html
```

## 数据格式

每条样例包含：

- `id`: 场景编号。
- `scene_type`: 场景类型。
- `risk_level`: 人工标注风险等级。
- `objects`: 场景目标与位置。
- `question`: 针对画面的用户问题。
- `expected_answer`: 标准说明。
- `model_output`: 模拟模型输出与风险预测。

## 可扩展方向

- 替换为真实脱敏行车图片或视频帧。
- 接入 VLM API，保存真实模型输出。
- 增加错误分析、人工复核和标注导出。
- 使用更细粒度风险标签，例如遮挡、横穿、近距离跟车、盲区目标。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
