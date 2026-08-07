# Mechanism Kinematics Lab

曲柄摇杆机构运动学仿真与轨迹分析项目。应用基于机械原理的解析计算，展示机构闭合校验、关节位置求解、连杆中点轨迹和传动角变化。

## 项目亮点

- 使用格拉晓夫定理检查四杆机构是否满足闭合与曲柄运动条件。
- 使用矢量闭合方程求解曲柄、连杆和摇杆的姿态。
- 绘制机构运动动画、连杆中点轨迹和传动角变化曲线。
- 对最小传动角进行监控，并对可能的工程死角给出提示。
- 通过 Streamlit 控件实时调整四根杆件长度。

## 快速运行

```bash
cd Mechanism-Kinematics-Lab
python -m pip install -r requirements.txt
python -m streamlit run app3.py
```

启动后访问 `http://localhost:8501`。如果默认端口被占用，可以使用：

```bash
python -m streamlit run app3.py --server.port 8502
```

在线演示：<https://personal-ai-replication-manual-zu9q4eze6ixxk43nqpz6bf.streamlit.app>

## 计算内容

1. 根据四根杆件长度判断机构类型和闭合条件。
2. 对曲柄转角进行离散采样，求解各关节坐标。
3. 计算连杆中点的运动轨迹和摇杆角度。
4. 计算传动角，并标记小于 40° 的低效区间。

## 项目结构

```text
app3.py            Streamlit 应用与运动学计算
check.py           机构条件检查辅助脚本
test.py            基础计算测试
requirements.txt   Python 依赖
启动说明.md        启动与排错说明
```

## 默认参数

- 机架 L1：200 mm
- 曲柄 L2：60 mm
- 连杆 L3：180 mm
- 摇杆 L4：150 mm

这些参数用于展示标准曲柄摇杆机构。调整杆长后，界面会重新检查机构是否能够闭合。

## 技术栈与边界

- Python
- Streamlit
- NumPy
- Plotly

项目聚焦运动学分析，不包含动力学、摩擦、材料强度或闭环控制器仿真。计算结果适合作品集演示和机构方案比较。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
