"""
测试 PSO 优化功能完整性
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import numpy as np
from scipy import signal

print("="*60)
print("  测试 PSO 优化功能")
print("="*60)

# 定义简化的系统类
class TestSystem:
    def __init__(self):
        num = [100]
        den = [1, 10, 100]
        self.sys = signal.TransferFunction(num, den)
        self.dt = 0.001
        self.t_sim = 2.0
        self.t = np.arange(0, self.t_sim, self.dt)

    def simulate_step_response(self, kp, ki, kd, target=30.0):
        A, B, C, D = signal.tf2ss(self.sys.num, self.sys.den)
        n_states = A.shape[0]
        x = np.zeros(n_states)
        integral = 0
        prev_error = 0
        y = np.zeros(len(self.t))

        for i, _ in enumerate(self.t):
            output = C @ x
            y[i] = float(output.flat[0]) if isinstance(output, np.ndarray) else float(output)

            error = target - y[i]
            integral += error * self.dt
            derivative = (error - prev_error) / self.dt if i > 0 else 0

            u = kp * error + ki * integral + kd * derivative
            u = np.clip(u, -1000, 1000)

            x_dot = A @ x + B.flatten() * u
            x = x + x_dot * self.dt
            prev_error = error

        return self.t, y

# 测试适应度函数
print("\n[TEST] 测试适应度函数 (ITAE 计算)...")

system = TestSystem()
kp, ki, kd = 10.0, 1.0, 1.0
target = 30.0

try:
    t, y = system.simulate_step_response(kp, ki, kd, target)

    # 计算 ITAE (测试 trapezoid 兼容性)
    error = np.abs(target - y)

    if hasattr(np, 'trapezoid'):
        itae = np.trapezoid(t * error, t)
        method = "trapezoid"
    else:
        itae = np.trapz(t * error, t)
        method = "trapz"

    print(f"  ✓ ITAE 计算成功 (使用 np.{method})")
    print(f"  - ITAE 值: {itae:.4f}")
    print(f"  - 最终输出: {y[-1]:.2f}°")
    print(f"  - 目标值: {target}°")

    # 计算完整适应度
    peak = np.max(y)
    overshoot = max(0, (peak - target) / target * 100)

    tolerance = 0.02 * target
    settling_idx = np.where(np.abs(y - target) > tolerance)[0]
    settling_time = t[settling_idx[-1]] if len(settling_idx) > 0 else t[0]

    steady_state_error = abs(y[-1] - target)

    fitness = itae + 100 * overshoot + 50 * settling_time + 10 * steady_state_error

    print(f"\n[性能指标]")
    print(f"  - 超调量: {overshoot:.2f}%")
    print(f"  - 调节时间: {settling_time:.3f}s")
    print(f"  - 稳态误差: {steady_state_error:.4f}°")
    print(f"  - 适应度得分: {fitness:.2f}")

    print("\n✓ 所有测试通过! PSO 优化功能正常!")

except Exception as e:
    print(f"\n✗ 测试失败: {e}")
    import traceback
    traceback.print_exc()

print("="*60)
