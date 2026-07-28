# Parking Planner Lab

Parking Planner Lab 是一个自动泊车路径规划实验室。项目通过栅格地图、障碍物、A* 搜索和路径平滑展示从起点到车位目标点的规划过程。

## 功能

- 支持不同泊车场景：平行车位、窄车位、障碍物遮挡。
- 使用 A* 在栅格地图中搜索可行路径。
- 对离散路径进行简化和平滑，生成更适合展示的轨迹。
- 提供动画回放，展示车辆沿轨迹移动。
- 提供 Python 版本路径规划脚本，便于验证算法逻辑。
- 浏览器页面可直接打开 `web/index.html`。

## 快速运行

### 浏览器演示

直接打开：

```text
web/index.html
```

### Python 算法脚本

```bash
cd Parking-Planner-Lab
python algorithms/path_planner.py
```

## 项目结构

```text
Parking-Planner-Lab/
├── README.md
├── algorithms/
│   └── path_planner.py
└── web/
    └── index.html
```

## 技术栈

- HTML
- CSS
- Vanilla JavaScript
- Canvas 2D
- Python
- A* path planning

## 可扩展方向

- 加入 Reeds-Shepp 或 Hybrid A*，考虑车辆最小转弯半径。
- 加入动态障碍物和重新规划。
- 接入 MPC 跟踪控制，展示规划路径与实际跟踪误差。
- 输出规划报告，记录搜索节点数、路径长度和碰撞检测结果。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
