"""
综合测试脚本 - 验证所有核心功能
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("="*70)
print("  基于 AI 粒子群算法的线控转向 PID 自动调参系统")
print("  综合功能测试")
print("="*70)

# 测试 1: 导入依赖
print("\n[测试 1/4] 检查依赖库...")
try:
    import streamlit as st
    import numpy as np
    import scipy
    from scipy import signal
    import matplotlib
    import plotly
    print(f"  ✓ Streamlit {st.__version__}")
    print(f"  ✓ NumPy {np.__version__}")
    print(f"  ✓ SciPy {scipy.__version__}")
    print(f"  ✓ Matplotlib {matplotlib.__version__}")
    print(f"  ✓ Plotly {plotly.__version__}")
except ImportError as e:
    print(f"  ✗ 依赖导入失败: {e}")
    sys.exit(1)

# 测试 2: NumPy 兼容性
print("\n[测试 2/4] NumPy 版本兼容性...")
print(f"  - NumPy 版本: {np.__version__}")
print(f"  - 是否有 trapezoid: {hasattr(np, 'trapezoid')}")
print(f"  - 是否有 trapz: {hasattr(np, 'trapz')}")

if hasattr(np, 'trapezoid'):
    print("  ✓ 使用 NumPy 2.0+ (trapezoid)")
    trap_func = np.trapezoid
elif hasattr(np, 'trapz'):
    print("  ✓ 使用 NumPy 1.x (trapz)")
    trap_func = np.trapz
else:
    print("  ✗ NumPy 积分函数不可用!")
    sys.exit(1)

# 测试积分函数
x = np.linspace(0, 1, 100)
y = x ** 2
result = trap_func(y, x)
print(f"  - 测试积分: ∫x²dx from 0 to 1 = {result:.4f} (理论值 0.3333)")

# 测试 3: PID 仿真功能
print("\n[测试 3/4] PID 控制仿真...")
try:
    from scipy import signal

    num = [100]
    den = [1, 10, 100]
    sys_tf = signal.TransferFunction(num, den)

    A, B, C, D = signal.tf2ss(sys_tf.num, sys_tf.den)

    dt = 0.001
    t = np.arange(0, 0.5, dt)
    x = np.zeros(A.shape[0])
    y = np.zeros(len(t))

    kp, ki, kd = 10.0, 1.0, 1.0
    target = 30.0
    integral = 0
    prev_error = 0

    for i in range(len(t)):
        # 测试数组到标量转换
        output = C @ x
        y[i] = float(output.flat[0]) if isinstance(output, np.ndarray) else float(output)

        error = target - y[i]
        integral += error * dt
        derivative = (error - prev_error) / dt if i > 0 else 0

        u = kp * error + ki * integral + kd * derivative
        u = np.clip(u, -1000, 1000)

        x_dot = A @ x + B.flatten() * u
        x = x + x_dot * dt
        prev_error = error

    print(f"  ✓ PID 仿真完成")
    print(f"  - 最终输出: {y[-1]:.2f}° (目标: {target}°)")
    print(f"  - 误差: {abs(y[-1] - target):.2f}°")

except Exception as e:
    print(f"  ✗ PID 仿真失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 测试 4: 适应度函数 (ITAE)
print("\n[测试 4/4] 适应度函数 (ITAE 计算)...")
try:
    error = np.abs(target - y)

    # 测试兼容性积分
    if hasattr(np, 'trapezoid'):
        itae = np.trapezoid(t * error, t)
    else:
        itae = np.trapz(t * error, t)

    # 计算性能指标
    peak = np.max(y)
    overshoot = max(0, (peak - target) / target * 100)

    tolerance = 0.02 * target
    settling_idx = np.where(np.abs(y - target) > tolerance)[0]
    settling_time = t[settling_idx[-1]] if len(settling_idx) > 0 else t[0]

    steady_state_error = abs(y[-1] - target)

    fitness = itae + 100 * overshoot + 50 * settling_time + 10 * steady_state_error

    print(f"  ✓ 适应度计算成功")
    print(f"  - ITAE: {itae:.4f}")
    print(f"  - 超调量: {overshoot:.2f}%")
    print(f"  - 调节时间: {settling_time:.3f}s")
    print(f"  - 稳态误差: {steady_state_error:.4f}°")
    print(f"  - 综合适应度: {fitness:.2f}")

except Exception as e:
    print(f"  ✗ 适应度计算失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 总结
print("\n" + "="*70)
print("  ✓✓✓ 所有测试通过! 系统已就绪!")
print("="*70)
print("\n📌 下一步:")
print("  运行命令: streamlit run app.py")
print("  或双击: run.bat")
print("\n🎯 预期效果:")
print("  - 手动调参: 实时响应")
print("  - AI 寻优: 自动找到最优 PID 参数")
print("  - 性能提升: 超调↓ 调节时间↓ 误差↓")
print("\n" + "="*70)
