# 工业电机健康状态监测大屏

这是一个基于 React 和 TailwindCSS 的工业电机健康状态监测大屏项目。

## 功能特性

- ✅ 实时转速仪表盘（1500-1600 RPM 动态显示）
- ✅ 轴承温度折线图（过去 60 秒数据，50-85°C 范围）
- ✅ 超温预警系统（温度超过 80°C 时显示红色闪烁警告）
- ✅ 深色科技风 UI 设计
- ✅ 响应式布局

## 快速开始

### 方式一：直接打开 HTML 文件（推荐，无需安装依赖）

项目提供了一个独立的 HTML 文件，使用 CDN 加载所有依赖，可以直接在浏览器中运行。

1. **直接双击打开**：
   - 直接在浏览器中打开 `index.html` 文件即可运行

2. **使用本地服务器**（推荐，避免 CORS 问题）：
   ```bash
   # 使用 Python
   python -m http.server 8000
   # 然后访问 http://localhost:8000

   # 或使用 Node.js http-server
   npx http-server
   # 然后访问 http://localhost:8080
   ```

### 方式二：使用 Vite 开发服务器

如果你想使用 Vite 进行开发（需要 Node.js 环境）：

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **启动开发服务器**：
   ```bash
   npm run dev
   ```
   然后访问 http://localhost:5173

3. **构建生产版本**：
   ```bash
   npm run build
   ```
   构建结果会输出到 `dist` 目录

4. **预览生产版本**：
   ```bash
   npm run preview
   ```

## 项目结构

```
industrial-dashboard/
├── index.html              # 独立 HTML 文件（使用 CDN，可直接运行）
├── index-vite.html         # Vite 开发用 HTML 入口
├── package.json            # 项目配置
├── vite.config.js          # Vite 配置
├── tailwind.config.js      # TailwindCSS 配置
├── postcss.config.js       # PostCSS 配置
├── README.md               # 项目说明
├── .gitignore              # Git 忽略文件
└── src/
    ├── main.jsx            # 应用入口
    ├── App.jsx             # 主应用组件
    ├── index.css           # 全局样式
    └── components/
        ├── SpeedGauge.jsx        # 转速仪表盘组件
        ├── TemperatureChart.jsx  # 温度折线图组件
        └── WarningAlert.jsx      # 警告提示组件
```

## 技术栈

- **React 18** - UI 框架
- **TailwindCSS 3** - CSS 框架
- **Recharts 2** - 图表库
- **Vite 5** - 构建工具（可选）

## 功能说明

### 1. 实时转速仪表盘
- 显示范围：1500-1600 RPM
- 更新频率：每秒
- 视觉效果：动态指针、刻度盘、数字显示

### 2. 轴承温度折线图
- 显示范围：50-85°C
- 时间跨度：过去 60 秒
- 警戒线：80°C（红色虚线）
- 实时更新：每秒添加新数据点

### 3. 超温预警系统
- 触发条件：温度 > 80°C
- 视觉效果：右上角红色闪烁警告框
- 警告文字：「WARNING: 超温预警」

### 4. 状态面板
- 当前转速显示
- 当前温度显示（超温时变红）
- 运行状态指示（正常/预警）

## 数据模拟

项目使用随机数模拟实时数据：

- **转速**：每秒随机生成 1500-1600 RPM 之间的值
- **温度**：每秒随机生成 50-85°C 之间的值
- **警告**：当温度超过 80°C 时自动触发

## 浏览器支持

支持所有现代浏览器：
- Chrome / Edge (推荐)
- Firefox
- Safari

## 开发说明

如果需要修改代码：

1. 修改 `src/` 目录下的组件文件
2. 使用 `npm run dev` 启动开发服务器
3. 浏览器会自动热重载

如果只需要演示，直接打开 `index.html` 即可。

## 常见问题

**Q: 为什么有两个 HTML 文件？**
- `index.html`：独立版本，使用 CDN，可直接打开
- `index-vite.html`：Vite 开发版本，需要运行 `npm run dev`

**Q: npm install 没有反应怎么办？**
- 直接使用 `index.html`，无需安装任何依赖

**Q: 如何修改数据范围？**
- 编辑 `src/App.jsx` 中的随机数生成逻辑
- 或直接编辑 `index.html` 中的内联代码

## 许可证

MIT
