"""
基于 AI 粒子群算法的线控转向 PID 自动调参系统
作者: AI 汽车底盘电控工程师
"""

import numpy as np
import streamlit as st
import matplotlib.pyplot as plt
from scipy import signal
from scipy.integrate import odeint
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# 设置页面配置
st.set_page_config(
    page_title="线控转向 PID 自动调参系统",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义CSS样式
st.markdown("""
<style>
    .main-title {
        font-size: 2.5rem;
        color: #1f77b4;
        text-align: center;
        font-weight: bold;
        margin-bottom: 2rem;
    }
    .subtitle {
        font-size: 1.2rem;
        color: #666;
        text-align: center;
        margin-bottom: 3rem;
    }
</style>
""", unsafe_allow_html=True)

# ==================== PSO 粒子群优化算法核心 ====================
class PSO:
    """粒子群优化算法实现"""

    def __init__(self, n_particles, n_iterations, bounds, objective_func):
        """
        初始化 PSO 算法

        参数:
            n_particles: 粒子数量
            n_iterations: 迭代次数
            bounds: 参数边界 [(min_p, max_p), (min_i, max_i), (min_d, max_d)]
            objective_func: 目标函数（适应度函数）
        """
        self.n_particles = n_particles
        self.n_iterations = n_iterations
        self.bounds = np.array(bounds)
        self.objective_func = objective_func
        self.n_dimensions = len(bounds)

        # 初始化粒子位置和速度
        self.positions = np.random.uniform(
            self.bounds[:, 0],
            self.bounds[:, 1],
            (n_particles, self.n_dimensions)
        )
        self.velocities = np.random.uniform(
            -1, 1,
            (n_particles, self.n_dimensions)
        )

        # 个体最佳和全局最佳
        self.personal_best_positions = self.positions.copy()
        self.personal_best_scores = np.array([float('inf')] * n_particles)
        self.global_best_position = None
        self.global_best_score = float('inf')

        # 记录历史
        self.history = []

        # PSO 参数
        self.w = 0.7  # 惯性权重
        self.c1 = 1.5  # 个体学习因子
        self.c2 = 1.5  # 社会学习因子

    def optimize(self):
        """执行 PSO 优化"""

        for iteration in range(self.n_iterations):
            # 评估每个粒子
            for i in range(self.n_particles):
                score = self.objective_func(self.positions[i])

                # 更新个体最佳
                if score < self.personal_best_scores[i]:
                    self.personal_best_scores[i] = score
                    self.personal_best_positions[i] = self.positions[i].copy()

                # 更新全局最佳
                if score < self.global_best_score:
                    self.global_best_score = score
                    self.global_best_position = self.positions[i].copy()

            # 记录当前迭代的最佳得分
            self.history.append(self.global_best_score)

            # 更新粒子速度和位置
            for i in range(self.n_particles):
                r1 = np.random.random(self.n_dimensions)
                r2 = np.random.random(self.n_dimensions)

                # 速度更新
                cognitive = self.c1 * r1 * (self.personal_best_positions[i] - self.positions[i])
                social = self.c2 * r2 * (self.global_best_position - self.positions[i])
                self.velocities[i] = self.w * self.velocities[i] + cognitive + social

                # 位置更新
                self.positions[i] = self.positions[i] + self.velocities[i]

                # 边界处理
                self.positions[i] = np.clip(
                    self.positions[i],
                    self.bounds[:, 0],
                    self.bounds[:, 1]
                )

        return self.global_best_position, self.global_best_score, self.history


# ==================== 二阶系统仿真与 PID 控制 ====================
class SteeringSystem:
    """线控转向系统仿真"""

    def __init__(self, num, den):
        """
        初始化转向系统

        参数:
            num: 传递函数分子
            den: 传递函数分母
        """
        self.sys = signal.TransferFunction(num, den)
        self.dt = 0.001  # 仿真时间步长
        self.t_sim = 2.0  # 仿真时长（秒）
        self.t = np.arange(0, self.t_sim, self.dt)

    def simulate_step_response(self, kp, ki, kd, target=30.0):
        """
        模拟 PID 控制下的阶跃响应

        参数:
            kp, ki, kd: PID 参数
            target: 目标转角（度）

        返回:
            t: 时间数组
            y: 响应数组
        """
        # 状态空间表示
        A, B, C, D = signal.tf2ss(self.sys.num, self.sys.den)

        # 初始化
        n_states = A.shape[0]
        x = np.zeros(n_states)  # 系统状态
        integral = 0  # 积分项
        prev_error = 0  # 上次误差（用于微分）

        y = np.zeros(len(self.t))

        # 仿真循环
        for i, _ in enumerate(self.t):
            # 当前输出（确保为标量）
            output = C @ x
            y[i] = float(output.flat[0]) if isinstance(output, np.ndarray) else float(output)

            # PID 控制
            error = target - y[i]
            integral += error * self.dt
            derivative = (error - prev_error) / self.dt if i > 0 else 0

            # PID 输出
            u = kp * error + ki * integral + kd * derivative

            # 限幅（防止过大控制量）
            u = np.clip(u, -1000, 1000)

            # 状态更新（欧拉法）
            x_dot = A @ x + B.flatten() * u
            x = x + x_dot * self.dt

            prev_error = error

        return self.t, y

    def calculate_performance_metrics(self, t, y, target=30.0):
        """
        计算性能指标

        返回:
            overshoot: 超调量 (%)
            settling_time: 调节时间 (s)
            steady_state_error: 稳态误差 (度)
        """
        # 超调量
        peak = np.max(y)
        overshoot = max(0, (peak - target) / target * 100)

        # 调节时间（2%误差带）
        tolerance = 0.02 * target
        settling_idx = np.where(np.abs(y - target) > tolerance)[0]
        settling_time = t[settling_idx[-1]] if len(settling_idx) > 0 else t[0]

        # 稳态误差
        steady_state_error = abs(y[-1] - target)

        return overshoot, settling_time, steady_state_error


# ==================== 适应度函数 ====================
def fitness_function(pid_params, system, target=30.0):
    """
    PSO 优化的适应度函数（越小越好）

    使用综合评价指标：ITAE + 超调量惩罚 + 调节时间惩罚
    """
    kp, ki, kd = pid_params

    # 仿真
    t, y = system.simulate_step_response(kp, ki, kd, target)

    # 计算性能指标
    overshoot, settling_time, steady_state_error = system.calculate_performance_metrics(t, y, target)

    # ITAE (Integral of Time-weighted Absolute Error)
    error = np.abs(target - y)
    # 兼容 NumPy 2.0+: trapz 已被 trapezoid 替代
    if hasattr(np, 'trapezoid'):
        itae = np.trapezoid(t * error, t)
    else:
        itae = np.trapz(t * error, t)

    # 综合适应度（加权）
    fitness = itae + 100 * overshoot + 50 * settling_time + 10 * steady_state_error

    return fitness


# ==================== Streamlit 界面 ====================
def main():
    # 页面标题
    st.markdown('<h1 class="main-title">🚗 基于 AI 粒子群算法的线控转向 PID 自动调参系统</h1>', unsafe_allow_html=True)
    st.markdown('<p class="subtitle">Steer-by-Wire PID Auto-Tuning System with PSO Algorithm</p>', unsafe_allow_html=True)

    # 初始化系统（二阶传递函数：阻尼不足系统）
    # 传递函数: G(s) = 100 / (s^2 + 10s + 100)
    num = [100]
    den = [1, 10, 100]
    system = SteeringSystem(num, den)

    # 侧边栏控制面板
    st.sidebar.header("⚙️ 控制面板")

    # 模式选择
    st.sidebar.subheader("📊 操作模式")
    mode = st.sidebar.radio("选择模式", ["手动调参", "AI 自动寻优"], label_visibility="collapsed")

    st.sidebar.markdown("---")

    # 手动 PID 参数
    st.sidebar.subheader("🎛️ 手动 PID 参数")
    manual_kp = st.sidebar.slider("比例系数 Kp", 0.0, 50.0, 10.0, 0.1)
    manual_ki = st.sidebar.slider("积分系数 Ki", 0.0, 10.0, 1.0, 0.1)
    manual_kd = st.sidebar.slider("微分系数 Kd", 0.0, 10.0, 1.0, 0.1)

    st.sidebar.markdown("---")

    # AI 参数设置
    st.sidebar.subheader("🤖 AI 寻优参数")
    n_particles = st.sidebar.number_input("粒子数量", 10, 50, 20, 5)
    n_iterations = st.sidebar.number_input("迭代次数", 10, 100, 30, 5)
    target_angle = st.sidebar.number_input("目标转角 (度)", 10.0, 90.0, 30.0, 5.0)

    # AI 寻优按钮
    optimize_button = st.sidebar.button("🚀 启动 AI 自动寻优", type="primary", use_container_width=True)

    # 初始化 session state
    if 'ai_params' not in st.session_state:
        st.session_state.ai_params = None
        st.session_state.pso_history = None
        st.session_state.ai_fitness = None

    # 执行 AI 寻优
    if optimize_button:
        with st.spinner("🔄 AI 正在寻找最优 PID 参数..."):
            # 定义边界
            bounds = [(0, 50), (0, 10), (0, 10)]

            # 创建适应度函数
            obj_func = lambda params: fitness_function(params, system, target_angle)

            # 执行 PSO
            pso = PSO(n_particles, n_iterations, bounds, obj_func)
            best_params, best_score, history = pso.optimize()

            # 保存结果
            st.session_state.ai_params = best_params
            st.session_state.pso_history = history
            st.session_state.ai_fitness = best_score

        st.sidebar.success("✅ AI 寻优完成！")

    # 显示 AI 参数
    if st.session_state.ai_params is not None:
        st.sidebar.markdown("---")
        st.sidebar.subheader("🎯 AI 优化结果")
        ai_kp, ai_ki, ai_kd = st.session_state.ai_params
        st.sidebar.metric("AI - Kp", f"{ai_kp:.3f}")
        st.sidebar.metric("AI - Ki", f"{ai_ki:.3f}")
        st.sidebar.metric("AI - Kd", f"{ai_kd:.3f}")
        st.sidebar.metric("适应度得分", f"{st.session_state.ai_fitness:.2f}")

    # ==================== 主界面内容 ====================

    # 仿真手动参数
    t_manual, y_manual = system.simulate_step_response(manual_kp, manual_ki, manual_kd, target_angle)
    overshoot_manual, settling_time_manual, sse_manual = system.calculate_performance_metrics(
        t_manual, y_manual, target_angle
    )

    # 仿真 AI 参数
    if st.session_state.ai_params is not None:
        ai_kp, ai_ki, ai_kd = st.session_state.ai_params
        t_ai, y_ai = system.simulate_step_response(ai_kp, ai_ki, ai_kd, target_angle)
        overshoot_ai, settling_time_ai, sse_ai = system.calculate_performance_metrics(
            t_ai, y_ai, target_angle
        )

    # 指标展示板
    st.subheader("📈 性能指标对比")
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "超调量 (%)",
            f"{overshoot_manual:.2f}",
            delta=f"{overshoot_ai - overshoot_manual:.2f}" if st.session_state.ai_params is not None else None,
            delta_color="inverse"
        )
        if st.session_state.ai_params is not None:
            st.caption(f"AI: {overshoot_ai:.2f}%")

    with col2:
        st.metric(
            "调节时间 (s)",
            f"{settling_time_manual:.3f}",
            delta=f"{settling_time_ai - settling_time_manual:.3f}" if st.session_state.ai_params is not None else None,
            delta_color="inverse"
        )
        if st.session_state.ai_params is not None:
            st.caption(f"AI: {settling_time_ai:.3f}s")

    with col3:
        st.metric(
            "稳态误差 (°)",
            f"{sse_manual:.4f}",
            delta=f"{sse_ai - sse_manual:.4f}" if st.session_state.ai_params is not None else None,
            delta_color="inverse"
        )
        if st.session_state.ai_params is not None:
            st.caption(f"AI: {sse_ai:.4f}°")

    st.markdown("---")

    # 图表区域
    col_left, col_right = st.columns(2)

    with col_left:
        st.subheader("📉 阶跃响应对比")

        # 使用 Plotly 绘制响应曲线
        fig1 = go.Figure()

        # 目标值
        fig1.add_trace(go.Scatter(
            x=t_manual,
            y=[target_angle] * len(t_manual),
            mode='lines',
            name='目标转角',
            line=dict(color='red', dash='dash', width=2)
        ))

        # 手动参数响应
        fig1.add_trace(go.Scatter(
            x=t_manual,
            y=y_manual,
            mode='lines',
            name=f'手动PID (P={manual_kp:.1f}, I={manual_ki:.1f}, D={manual_kd:.1f})',
            line=dict(color='blue', width=2)
        ))

        # AI 参数响应
        if st.session_state.ai_params is not None:
            fig1.add_trace(go.Scatter(
                x=t_ai,
                y=y_ai,
                mode='lines',
                name=f'AI优化PID (P={ai_kp:.2f}, I={ai_ki:.2f}, D={ai_kd:.2f})',
                line=dict(color='green', width=2)
            ))

        fig1.update_layout(
            xaxis_title='时间 (s)',
            yaxis_title='转角 (°)',
            hovermode='x unified',
            legend=dict(x=0.7, y=0.1),
            height=450
        )

        st.plotly_chart(fig1, use_container_width=True)

    with col_right:
        st.subheader("🔬 PSO 算法收敛曲线")

        if st.session_state.pso_history is not None:
            fig2 = go.Figure()

            fig2.add_trace(go.Scatter(
                x=list(range(1, len(st.session_state.pso_history) + 1)),
                y=st.session_state.pso_history,
                mode='lines+markers',
                name='最佳适应度',
                line=dict(color='purple', width=2),
                marker=dict(size=6)
            ))

            fig2.update_layout(
                xaxis_title='迭代次数',
                yaxis_title='适应度得分 (越小越好)',
                hovermode='x unified',
                height=450
            )

            st.plotly_chart(fig2, use_container_width=True)

            # 显示收敛信息
            improvement = ((st.session_state.pso_history[0] - st.session_state.pso_history[-1])
                          / st.session_state.pso_history[0] * 100)
            st.info(f"🎯 算法收敛改进: {improvement:.1f}% | 初始适应度: {st.session_state.pso_history[0]:.2f} → 最终适应度: {st.session_state.pso_history[-1]:.2f}")
        else:
            st.info("👆 点击左侧 '🚀 启动 AI 自动寻优' 按钮查看算法收敛过程")

            # 显示示意图
            fig_placeholder = go.Figure()
            fig_placeholder.add_annotation(
                text="等待 AI 寻优启动...",
                xref="paper", yref="paper",
                x=0.5, y=0.5, showarrow=False,
                font=dict(size=20, color="gray")
            )
            fig_placeholder.update_layout(
                xaxis=dict(visible=False),
                yaxis=dict(visible=False),
                height=450
            )
            st.plotly_chart(fig_placeholder, use_container_width=True)

    # 底部说明
    st.markdown("---")
    with st.expander("ℹ️ 系统说明"):
        st.markdown("""
        ### 系统架构
        - **物理模型**: 二阶传递函数 G(s) = 100/(s² + 10s + 100)
        - **控制算法**: PID 闭环控制
        - **优化算法**: 粒子群优化 (PSO)
        - **适应度函数**: ITAE + 超调量惩罚 + 调节时间惩罚

        ### 使用说明
        1. **手动调参**: 使用左侧滑块调整 P、I、D 参数，实时查看响应曲线
        2. **AI 寻优**: 点击 "🚀 启动 AI 自动寻优" 按钮，让算法自动寻找最优参数
        3. **对比分析**: 通过指标对比和曲线对比，评估 AI 调参效果

        ### 技术栈
        - Python + NumPy + SciPy
        - Streamlit (Web 框架)
        - Plotly (交互式图表)
        - 手写 PSO 算法
        """)


if __name__ == "__main__":
    main()
