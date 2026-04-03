# 🚗 线控转向传感器故障诊断系统

基于机器学习的自动驾驶底盘安全监控系统

---

## 🚀 快速启动

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

或使用国内镜像加速：
```bash
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
```

### 2. 启动应用
```bash
./start.sh
```

或直接运行：
```bash
python -m streamlit run app.py
```

应用将在浏览器自动打开：http://localhost:8501

---

## 📋 功能说明

### 🤖 AI 故障诊断
- **随机森林分类器**：实时检测 3 种传感器状态
  - **状态 0**: 正常运行（微小噪声）
  - **状态 1**: 电磁干扰（大噪声+尖刺）
  - **状态 2**: 传感器卡死/漂移

### 📊 实时监控界面
- 双曲线对比图：真实转角 vs 传感器读数
- 故障注入测试：手动切换 3 种模式
- 智能诊断日志：AI 实时分析并给出建议
- 控制面板：刷新速度调节、系统重置

---

## 🛠️ 技术栈

- **Python 3.8+**
- **Streamlit** - Web 界面
- **scikit-learn** - 机器学习（随机森林）
- **NumPy** - 数值计算
- **Plotly** - 交互式图表

---

## 🔧 常见问题

### Q: 提示 "No module named 'sklearn'"
```bash
pip install scikit-learn
```

### Q: 图表卡顿
- 降低刷新速度到 2-3 Hz（左侧滑块）
- 使用 Chrome/Edge 最新版浏览器

### Q: 端口被占用
```bash
python -m streamlit run app.py --server.port 8502
```

---

## 🎮 使用建议

1. 启动后等待 2-3 秒让 AI 模型加载完成
2. 刷新速度设置为 3 Hz 获得最佳流畅度
3. 切换故障类型后观察 5-10 秒
4. 观察底部诊断日志中的 AI 判断结果

---

## 📂 项目结构

```
steer_sensor_diagnosis/
├── app.py              # 主程序（已优化）
├── requirements.txt    # 依赖列表
├── start.sh           # 启动脚本
├── .streamlit/        # Streamlit 配置
└── README.md          # 本文件
```

---

**用途**: 教育研究 | 原型验证 | 技术演示
**注意**: 仅供学习使用，实际部署需符合 ISO 26262 标准
