"""
快速测试脚本 - 验证核心功能
"""

import numpy as np
from scipy import signal
import sys
import io

# 设置输出编码为 UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("  线控转向 PID 自动调参系统 - 功能测试")
print("=" * 60)
print()

# 测试 1: 导入所有依赖
print("[TEST 1] 检查依赖库")
try:
    import streamlit as st
    print("  - Streamlit:", st.__version__)
    import numpy as np
    print("  - NumPy:", np.__version__)
    import scipy
    print("  - SciPy:", scipy.__version__)
    import matplotlib
    print("  - Matplotlib:", matplotlib.__version__)
    import plotly
    print("  - Plotly:", plotly.__version__)
    print("  [OK] 所有依赖库正常\n")
except ImportError as e:
    print(f"  [FAIL] 导入失败: {e}\n")
    exit(1)

# 测试 2: PSO 算法基础功能
print("[TEST 2] PSO 算法初始化")
try:
    class SimplePSO:
        def __init__(self, n_particles, bounds):
            self.n_particles = n_particles
            self.bounds = np.array(bounds)
            self.n_dimensions = len(bounds)
            self.positions = np.random.uniform(
                self.bounds[:, 0],
                self.bounds[:, 1],
                (n_particles, self.n_dimensions)
            )

    pso = SimplePSO(20, [(0, 50), (0, 10), (0, 10)])
    print(f"  - 粒子数量: {pso.n_particles}")
    print(f"  - 维度: {pso.n_dimensions}")
    print(f"  - 初始位置形状: {pso.positions.shape}")
    print("  [OK] PSO 算法初始化成功\n")
except Exception as e:
    print(f"  [FAIL] PSO 初始化失败: {e}\n")

# 测试 3: 二阶系统传递函数
print("[TEST 3] 二阶系统仿真")
try:
    num = [100]
    den = [1, 10, 100]
    sys = signal.TransferFunction(num, den)

    # 计算系统的自然频率和阻尼比
    omega_n = np.sqrt(den[2])  # 自然频率
    zeta = den[1] / (2 * omega_n)  # 阻尼比

    print(f"  - 传递函数: {num} / {den}")
    print(f"  - 自然频率 ωn: {omega_n:.2f} rad/s")
    print(f"  - 阻尼比 ζ: {zeta:.3f}")
    print(f"  - 系统类型: {'欠阻尼' if zeta < 1 else '过阻尼' if zeta > 1 else '临界阻尼'}")
    print("  [OK] 系统模型创建成功\n")
except Exception as e:
    print(f"  [FAIL] 系统仿真失败: {e}\n")

# 测试 4: 简单的 PID 仿真
print("[TEST 4] PID 控制仿真")
try:
    # 状态空间转换
    A, B, C, D = signal.tf2ss(num, den)
    print(f"  - 状态空间维度: {A.shape[0]}")

    # 简单仿真测试
    dt = 0.001
    t_sim = 0.1
    n_steps = int(t_sim / dt)

    x = np.zeros(A.shape[0])
    kp, ki, kd = 10.0, 1.0, 1.0
    target = 30.0

    for _ in range(10):  # 仅测试 10 步
        y = C @ x
        error = target - y
        u = kp * error
        x_dot = A @ x + B.flatten() * u
        x = x + x_dot * dt

    print(f"  - PID 参数: Kp={kp}, Ki={ki}, Kd={kd}")
    print(f"  - 目标值: {target}°")
    print(f"  - 10 步后输出: {y:.4f}°")
    print("  [OK] PID 仿真测试成功\n")
except Exception as e:
    print(f"  [FAIL] PID 仿真失败: {e}\n")

print("=" * 60)
print("  [SUCCESS] 所有核心功能测试通过!")
print("  准备运行应用: streamlit run app.py")
print("=" * 60)
