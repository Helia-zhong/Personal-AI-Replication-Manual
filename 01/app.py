import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal
import matplotlib

# 设置中文字体支持
matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False

# 页面配置
st.set_page_config(
    page_title="智能汽车线控底盘与泊车仿真系统",
    page_icon="🚗",
    layout="wide"
)

# 标题
st.title("🚗 智能汽车线控底盘与泊车仿真系统")
st.markdown("---")

# 创建两个标签页
tab1, tab2 = st.tabs(["🅿️ 自动泊车轨迹规划 (Auto Parking)", "🎛️ 线控转向 PID 调参模拟 (Steer-by-Wire PID)"])

# ==================== 模块一：自动泊车轨迹规划 ====================
with tab1:
    st.header("自动泊车轨迹规划")

    # 创建两列布局
    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader("参数设置")

        # 起点坐标输入
        st.markdown("### 泊车起点坐标")
        start_x = st.number_input("起点 X 坐标 (m)", value=8.10, step=0.1, format="%.2f", key="start_x")
        start_y = st.number_input("起点 Y 坐标 (m)", value=3.60, step=0.1, format="%.2f", key="start_y")

        # 终点坐标输入
        st.markdown("### 泊车终点坐标")
        end_x = st.number_input("终点 X 坐标 (m)", value=1.00, step=0.1, format="%.2f", key="end_x")
        end_y = st.number_input("终点 Y 坐标 (m)", value=1.35, step=0.1, format="%.2f", key="end_y")

        st.info(f"当前起点: ({start_x:.2f}, {start_y:.2f})")
        st.info(f"当前终点: ({end_x:.2f}, {end_y:.2f})")

    with col2:
        st.subheader("泊车轨迹可视化")

        # 生成轨迹数据
        # 使用五次多项式公式
        x_original = np.linspace(1, 8.1, 200)
        y_original = (0.000748 * x_original**5 -
                     0.017022 * x_original**4 +
                     0.123472 * x_original**3 -
                     0.275764 * x_original**2 +
                     0.245460 * x_original +
                     1.273105)

        # 根据用户输入调整轨迹（缩放和平移）
        # 将原始轨迹从 (1, y(1)) 到 (8.1, y(8.1)) 映射到用户指定的起点和终点
        x_range_original = 8.1 - 1.0
        y_range_original = y_original[-1] - y_original[0]

        x_range_new = start_x - end_x
        y_range_new = start_y - end_y

        # 缩放和平移
        x_trajectory = end_x + (x_original - 1.0) * (x_range_new / x_range_original)
        y_trajectory = end_y + (y_original - y_original[0]) * (y_range_new / y_range_original)

        # 绘制图表
        fig, ax = plt.subplots(figsize=(10, 8))

        # 绘制轨迹
        ax.plot(x_trajectory, y_trajectory, 'b-', linewidth=2, label='泊车轨迹')

        # 标记起点和终点
        ax.plot(start_x, start_y, 'ro', markersize=12, label=f'起点 ({start_x:.2f}, {start_y:.2f})')
        ax.plot(end_x, end_y, 'go', markersize=12, label=f'终点 ({end_x:.2f}, {end_y:.2f})')

        # 添加箭头指示方向
        mid_idx = len(x_trajectory) // 2
        dx = x_trajectory[mid_idx + 10] - x_trajectory[mid_idx]
        dy = y_trajectory[mid_idx + 10] - y_trajectory[mid_idx]
        ax.arrow(x_trajectory[mid_idx], y_trajectory[mid_idx], dx, dy,
                head_width=0.2, head_length=0.15, fc='blue', ec='blue', alpha=0.6)

        # 设置图表属性
        ax.set_xlabel('X 坐标 (m)', fontsize=12)
        ax.set_ylabel('Y 坐标 (m)', fontsize=12)
        ax.set_title('自动泊车轨迹规划图', fontsize=14, fontweight='bold')
        ax.legend(loc='best', fontsize=10)
        ax.grid(True, linestyle='--', alpha=0.6)
        ax.axis('equal')

        # 显示图表
        st.pyplot(fig)

        # 显示轨迹信息
        distance = np.sqrt((start_x - end_x)**2 + (start_y - end_y)**2)
        st.success(f"✓ 泊车直线距离: {distance:.2f} m")

# ==================== 模块二：线控转向 PID 调参模拟 ====================
with tab2:
    st.header("线控转向 PID 调参模拟")

    # 创建两列布局
    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader("PID 参数设置")

        # PID 参数滑块
        kp = st.slider("比例增益 P", min_value=0.0, max_value=50.0, value=15.0, step=0.5, key="kp")
        ki = st.slider("积分增益 I", min_value=0.0, max_value=10.0, value=2.0, step=0.1, key="ki")
        kd = st.slider("微分增益 D", min_value=0.0, max_value=10.0, value=3.0, step=0.1, key="kd")

        st.markdown("---")
        st.subheader("系统参数")
        target_angle = st.number_input("目标转角 (度)", value=30.0, step=1.0, format="%.1f", key="target")

        st.info(f"**当前 PID 参数:**\n\n- P = {kp:.1f}\n- I = {ki:.1f}\n- D = {kd:.1f}")
        st.info(f"**目标转角:** {target_angle:.1f}°")

    with col2:
        st.subheader("转向响应曲线")

        # 仿真参数
        dt = 0.01  # 时间步长
        t_end = 3.0  # 仿真时间
        time = np.arange(0, t_end, dt)

        # 初始化变量
        angle = np.zeros_like(time)
        error_integral = 0
        error_prev = 0

        # 系统参数（二阶系统）
        # 传递函数: G(s) = 1 / (s^2 + 2*zeta*wn*s + wn^2)
        wn = 5.0  # 自然频率
        zeta = 0.3  # 阻尼比（小于1，欠阻尼系统）

        # PID 控制仿真
        for i in range(1, len(time)):
            # 计算误差
            error = target_angle - angle[i-1]

            # PID 控制器输出
            error_integral += error * dt
            error_derivative = (error - error_prev) / dt
            control_output = kp * error + ki * error_integral + kd * error_derivative

            # 二阶系统模型（简化）
            # 使用差分方程近似
            a = 1 + 2*zeta*wn*dt + wn**2*dt**2
            b = -2 - 2*zeta*wn*dt
            c = 1

            if i >= 2:
                # 系统动态响应
                angle[i] = (control_output*dt**2 - b*angle[i-1] - c*angle[i-2]) / a
            else:
                angle[i] = angle[i-1] + control_output * dt * 0.1

            error_prev = error

        # 绘制响应曲线
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 10))

        # 子图1：转角响应
        ax1.plot(time, angle, 'b-', linewidth=2, label='实际转角')
        ax1.axhline(y=target_angle, color='r', linestyle='--', linewidth=2, label=f'目标转角 ({target_angle}°)')
        ax1.fill_between(time, target_angle*0.98, target_angle*1.02, alpha=0.2, color='green', label='±2% 误差带')

        ax1.set_xlabel('时间 (s)', fontsize=12)
        ax1.set_ylabel('转角 (度)', fontsize=12)
        ax1.set_title('转向角度响应曲线', fontsize=14, fontweight='bold')
        ax1.legend(loc='best', fontsize=10)
        ax1.grid(True, linestyle='--', alpha=0.6)

        # 子图2：误差曲线
        error_curve = target_angle - angle
        ax2.plot(time, error_curve, 'r-', linewidth=2, label='跟踪误差')
        ax2.axhline(y=0, color='k', linestyle='-', linewidth=1)
        ax2.fill_between(time, -target_angle*0.02, target_angle*0.02, alpha=0.2, color='green', label='±2% 误差带')

        ax2.set_xlabel('时间 (s)', fontsize=12)
        ax2.set_ylabel('误差 (度)', fontsize=12)
        ax2.set_title('跟踪误差曲线', fontsize=14, fontweight='bold')
        ax2.legend(loc='best', fontsize=10)
        ax2.grid(True, linestyle='--', alpha=0.6)

        plt.tight_layout()
        st.pyplot(fig)

        # 性能指标计算
        # 超调量
        max_angle = np.max(angle)
        overshoot = ((max_angle - target_angle) / target_angle) * 100 if max_angle > target_angle else 0

        # 稳态误差
        steady_state_error = abs(target_angle - angle[-1])

        # 上升时间（10% 到 90%）
        idx_10 = np.where(angle >= target_angle * 0.1)[0]
        idx_90 = np.where(angle >= target_angle * 0.9)[0]
        rise_time = time[idx_90[0]] - time[idx_10[0]] if len(idx_10) > 0 and len(idx_90) > 0 else 0

        # 调节时间（进入±2%误差带）
        settling_band = target_angle * 0.02
        settled_idx = np.where(np.abs(error_curve) <= settling_band)[0]
        settling_time = time[settled_idx[0]] if len(settled_idx) > 0 else t_end

        # 显示性能指标
        col_a, col_b, col_c, col_d = st.columns(4)
        with col_a:
            st.metric("超调量", f"{overshoot:.2f}%")
        with col_b:
            st.metric("上升时间", f"{rise_time:.3f}s")
        with col_c:
            st.metric("调节时间", f"{settling_time:.3f}s")
        with col_d:
            st.metric("稳态误差", f"{steady_state_error:.3f}°")

        # 参数建议
        if overshoot > 20:
            st.warning("⚠️ 超调量过大！建议降低 P 增益或增加 D 增益。")
        elif overshoot < 1 and rise_time > 1.0:
            st.info("ℹ️ 响应较慢，可以适当增加 P 增益。")
        else:
            st.success("✓ PID 参数调节良好！")

# 页脚
st.markdown("---")
st.markdown("""
<div style='text-align: center; color: gray;'>
    <p>智能汽车线控底盘与泊车仿真系统 v1.0 | 基于 Python + Streamlit 开发</p>
</div>
""", unsafe_allow_html=True)
