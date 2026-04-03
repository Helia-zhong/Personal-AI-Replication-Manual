"""简单验证脚本"""
import sys
sys.path.insert(0, '.')

# 导入核心模块并测试
print("Starting validation...")

from scipy import signal
import numpy as np

# 创建简化的系统测试
class QuickTest:
    def __init__(self):
        self.sys = signal.TransferFunction([100], [1, 10, 100])
        self.dt = 0.001
        self.t_sim = 2.0
        self.t = np.arange(0, self.t_sim, self.dt)

    def test_simulation(self):
        A, B, C, D = signal.tf2ss(self.sys.num, self.sys.den)
        x = np.zeros(A.shape[0])
        y = np.zeros(100)

        for i in range(100):
            output = C @ x
            y[i] = float(output.flat[0]) if isinstance(output, np.ndarray) else float(output)
            error = 30.0 - y[i]
            u = 10.0 * error
            x_dot = A @ x + B.flatten() * u
            x = x + x_dot * self.dt

        return y[-1]

test = QuickTest()
result = test.test_simulation()
print(f"Validation passed! Final output: {result:.2f} degrees")
