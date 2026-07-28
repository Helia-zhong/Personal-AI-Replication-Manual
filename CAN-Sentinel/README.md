# CAN Sentinel

CAN Sentinel 是一个车辆传感器与 CAN 时序异常检测系统。项目用模拟车辆信号生成数据流，通过规则检测和鲁棒统计评分识别电压跌落、制动/油门冲突、转向与横摆不一致、冷却液温度异常等问题。

## 功能

- 生成车辆时序信号：车速、转速、油门、制动、方向盘角、横摆角速度、电池电压、冷却液温度。
- 内置异常场景：电压跌落、踏板冲突、转向失配、温度升高和传感器尖峰。
- 输出异常等级、触发规则、异常时间段和诊断建议。
- 提供 FastAPI 后端接口，便于接入前端或脚本调用。
- 提供浏览器版大屏，可直接打开 `web/index.html` 进行交互演示。

## 快速运行

### 方式一：浏览器演示

直接打开：

```text
web/index.html
```

### 方式二：后端接口

```bash
cd CAN-Sentinel/backend
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/api/sample-stream?scenario=voltage_drop
```

## 项目结构

```text
CAN-Sentinel/
├── README.md
├── backend/
│   ├── app.py
│   ├── can_sentinel.py
│   └── requirements.txt
├── data/
│   └── sample_trace.json
└── web/
    └── index.html
```

## 技术栈

- Python
- FastAPI
- Pydantic
- Vanilla JavaScript
- Canvas 2D

## 可扩展方向

- 接入真实 CAN 日志解析，如 BLF、ASC、CSV。
- 增加 Isolation Forest、RandomForest 或 LSTM AutoEncoder 等模型。
- 添加回放速度控制、告警确认、规则配置和诊断报告导出。
- 接入车辆台架或仿真平台输出的数据流。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
