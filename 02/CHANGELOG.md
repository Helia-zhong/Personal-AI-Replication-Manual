# 更新日志 (CHANGELOG)

## v1.2.0 - 2026-03-12 (最新)

### 🐛 Bug 修复 #2

**修复了 NumPy 2.0+ 兼容性问题**
- **问题**: `AttributeError: module 'numpy' has no attribute 'trapz'`
- **位置**: `app.py:236` 在 `fitness_function` 函数中
- **原因**: NumPy 2.0+ 版本中 `trapz` 被重命名为 `trapezoid`
- **解决方案**:
  ```python
  # 修复前:
  itae = np.trapz(t * error, t)

  # 修复后 (兼容新旧版本):
  if hasattr(np, 'trapezoid'):
      itae = np.trapezoid(t * error, t)
  else:
      itae = np.trapz(t * error, t)
  ```
- **影响**: AI 自动寻优功能现在可以正常工作

### ✅ 验证
- 创建了 `test_pso.py` 验证脚本
- 适应度函数计算正常
- PSO 优化功能完全正常 ✓

---

## v1.1.0 - 2026-03-12

### 🐛 Bug 修复

**修复了 NumPy 数组赋值错误**
- **问题**: `ValueError: setting an array element with a sequence` 在运行时发生
- **位置**: `app.py:173` 在 `simulate_step_response` 函数中
- **原因**: `C @ x` 返回的是 NumPy 数组而不是标量，无法直接赋值给 `y[i]`
- **解决方案**:
  ```python
  # 修复前:
  y[i] = C @ x + D * 0

  # 修复后:
  output = C @ x
  y[i] = float(output.flat[0]) if isinstance(output, np.ndarray) else float(output)
  ```
- **影响**: 现在应用可以正常运行，PID 仿真功能完全正常

### ✅ 验证
- 创建了 `test_fix.py` 验证脚本
- 所有测试通过 ✓
- PID 仿真输出正常

---

## v1.0.0 - 2026-03-12

### 🎉 首次发布

**核心功能**
- ✅ PSO 粒子群优化算法实现
- ✅ PID 控制器与二阶系统仿真
- ✅ Streamlit 交互式 Web 界面
- ✅ 实时性能指标对比
- ✅ 响应曲线可视化
- ✅ PSO 收敛曲线展示

**技术栈**
- Python 3.x
- Streamlit 1.55.0
- NumPy 2.4.3
- SciPy 1.17.1
- Matplotlib 3.10.8
- Plotly 6.6.0

**文档**
- README.md - 项目说明
- QUICKSTART.md - 快速入门
- PROJECT_INFO.md - 技术细节
- 启动脚本 (run.bat / run.sh)

---

## 📋 计划中的功能

### v1.2.0 (未来)
- [ ] 支持更多系统模型（三阶、高阶系统）
- [ ] 添加其他优化算法（遗传算法、差分进化）
- [ ] 导出优化结果到 CSV/Excel
- [ ] 批量测试功能
- [ ] 参数对比模式（同时显示多组参数）

### v1.3.0 (未来)
- [ ] 实时硬件在环仿真接口
- [ ] 自定义适应度函数编辑器
- [ ] 优化历史记录和回放
- [ ] 多目标优化支持

---

## 🔧 已知问题

暂无已知问题

---

## 📝 贡献

欢迎提交 Issue 和 Pull Request!

**报告问题**: 请在 GitHub Issues 中描述问题和重现步骤
**功能建议**: 欢迎提出新功能想法

---

## 📞 联系方式

- 项目位置: `f:\其他\PID_Auto_Tuning_System\`
- 运行命令: `streamlit run app.py`
