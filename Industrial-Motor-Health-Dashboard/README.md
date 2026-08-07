# Industrial Motor Health Dashboard

工业电机健康状态监测大屏，用模拟运行数据展示转速、轴承温度、健康状态、异常日志和历史数据导出。项目包含一个无需构建工具的浏览器演示入口，适合作品集在线预览。

## 功能特性

- 实时转速仪表盘，显示电机当前 RPM 和波动趋势。
- 轴承温度折线图，保留最近一段时间的运行数据。
- 温度超过 80°C 时触发超温预警并同步更新状态面板。
- 实时日志记录温度变化、预警事件和运行状态。
- 支持导出当前会话的监测数据。
- 响应式深色工业监控界面，适配桌面和移动端。

## 快速运行

### 直接打开

直接打开本目录下的 `index.html` 即可体验静态演示，无需安装依赖。

### 使用本地服务器

在项目目录执行：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。GitHub Pages 在线入口：<https://helia-zhong.github.io/Personal-AI-Replication-Manual/Industrial-Motor-Health-Dashboard/index.html>

## 数据与计算

当前演示使用前端 JavaScript 生成模拟数据：

- 转速在基准值附近叠加周期扰动和随机噪声。
- 温度通过一阶响应逐步接近目标值，并叠加随机噪声。
- 温度高于 80°C 时，状态切换为预警并写入日志。
- 导出的数据只代表当前浏览器会话，不是来自真实工业设备。

## 项目结构

```text
index.html             可直接运行的静态演示入口
App.jsx                React 组件版应用
main.jsx               React 应用入口
SpeedGauge.jsx         转速仪表盘组件
TemperatureChart.jsx   温度图表组件
WarningAlert.jsx       预警组件
package.json           Vite / React 开发配置
```

## 技术栈

- HTML、CSS、JavaScript
- React 18 组件源码
- Recharts 图表依赖
- Vite 开发配置

静态演示与 React 源码是两个可独立维护的入口；GitHub Pages 使用 `index.html`，因此在线访问不依赖 Node.js 构建环境。

## License

本项目随仓库使用 MIT License，详见根目录 [LICENSE](../LICENSE)。
