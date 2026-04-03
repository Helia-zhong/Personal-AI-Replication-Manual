"""
快速验证修复 - 测试 PID 仿真
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import numpy as np
from scipy import signal

print("="*60)
print("  验证 PID 仿真修复")
print("="*60)

# 测试系统模型
num = [100]
den = [1, 10, 100]

# 状态空间转换
A, B, C, D = signal.tf2ss(num, den)

print(f"\n[信息] 系统参数:")
print(f"  - A 矩阵形状: {A.shape}")
print(f"  - B 矩阵形状: {B.shape}")
print(f"  - C 矩阵形状: {C.shape}")
print(f"  - D 矩阵形状: {D.shape}")

# 简单仿真测试
dt = 0.001
t_sim = 0.1
n_steps = int(t_sim / dt)

x = np.zeros(A.shape[0])
kp, ki, kd = 10.0, 1.0, 1.0
target = 30.0

print(f"\n[测试] 运行 {n_steps} 步仿真...")

try:
    for step in range(min(n_steps, 100)):  # 测试前100步
        # 测试输出计算
        output = C @ x
        y = float(output.flat[0]) if isinstance(output, np.ndarray) else float(output)

        # PID 控制
        error = target - y
        u = kp * error

        # 状态更新
        x_dot = A @ x + B.flatten() * u
        x = x + x_dot * dt

        if step % 20 == 0:
            print(f"  步骤 {step}: 输出 = {y:.4f}°")

    print("\n[成功] ✓ PID 仿真测试通过!")
    print(f"[结果] 最终输出: {y:.4f}°, 目标: {target}°")

except Exception as e:
    print(f"\n[失败] ✗ 测试失败: {e}")
    import traceback
    traceback.print_exc()

print("="*60)
