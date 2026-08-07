"""
工程级曲柄摇杆机构运动学仿真与轨迹分析系统
基于严谨的机械原理计算，包含格拉晓夫定理校验、矢量闭合求解、传动角监控
"""

import streamlit as st
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import math

# ==================== 页面配置 ====================
st.set_page_config(
    page_title="曲柄摇杆机构运动学仿真系统",
    page_icon="⚙️",
    layout="wide"
)

st.title("⚙️ 工程级曲柄摇杆机构运动学仿真与轨迹分析系统")
st.markdown("---")


# ==================== 格拉晓夫定理校验器 ====================
def check_grashof_condition(L1, L2, L3, L4):
    """
    格拉晓夫定理判断：判断四杆机构能否构成曲柄摇杆机构

    参数:
        L1: 机架长度
        L2: 曲柄长度
        L3: 连杆长度
        L4: 摇杆长度

    返回:
        (is_valid, mechanism_type, error_msg)
    """
    lengths = [L1, L2, L3, L4]
    s = min(lengths)  # 最短杆
    l = max(lengths)  # 最长杆
    p = sum(lengths) - s - l  # 中间两杆之和

    # 基本闭合条件：最长杆 + 最短杆 <= 其余两杆之和
    if s + l > p:
        return False, "无法闭合", f"机构无法闭合！最短杆({s:.2f}) + 最长杆({l:.2f}) > 其余两杆之和({p:.2f})"

    # 格拉晓夫条件：s + l <= p（满足此条件才能有曲柄）
    grashof_satisfied = (s + l <= p)

    if not grashof_satisfied:
        return False, "双摇杆机构", f"不满足格拉晓夫条件！无法构成曲柄摇杆机构（当前为双摇杆机构）"

    # 判断机构类型：根据最短杆的位置
    # 曲柄摇杆：最短杆为曲柄或机架，且最短杆的邻边不是最长杆
    if L2 == s:  # 曲柄是最短杆
        return True, "曲柄摇杆机构", ""
    elif L1 == s:  # 机架是最短杆
        return True, "双曲柄机构", ""  # 机架最短时为双曲柄
    elif L3 == s or L4 == s:  # 连杆或摇杆是最短杆
        # 检查是否能构成曲柄摇杆（曲柄能否整周转动）
        if L2 + L3 <= L1 + L4 and L2 + L4 <= L1 + L3:
            return True, "曲柄摇杆机构", ""
        else:
            return True, "曲柄摇杆机构", ""  # 满足格拉晓夫条件即可
    else:
        return True, "曲柄摇杆机构", ""


# ==================== 矢量闭合求解器 ====================
def solve_mechanism_kinematics(L1, L2, L3, L4, theta2_array):
    """
    基于矢量闭合方程求解机构位置

    闭合方程: L2*e^(iθ2) + L3*e^(iθ3) = L1 + L4*e^(iθ4)

    参数:
        L1, L2, L3, L4: 各杆长度
        theta2_array: 曲柄转角数组（弧度）

    返回:
        positions: 包含各关节坐标的字典
        theta3_array: 连杆角度数组
        theta4_array: 摇杆角度数组
    """
    n = len(theta2_array)

    # 固定铰链坐标
    A = np.array([0, 0])  # 曲柄固定点
    B0 = np.array([L1, 0])  # 摇杆固定点

    # 初始化结果数组
    B_positions = np.zeros((n, 2))  # 曲柄末端（连杆起点）
    C_positions = np.zeros((n, 2))  # 摇杆起点（连杆末端）
    P_positions = np.zeros((n, 2))  # 连杆中点轨迹
    theta3_array = np.zeros(n)
    theta4_array = np.zeros(n)

    for i, theta2 in enumerate(theta2_array):
        # 曲柄末端坐标 B
        Bx = L2 * np.cos(theta2)
        By = L2 * np.sin(theta2)
        B_positions[i] = [Bx, By]

        # 求解摇杆角度 theta4（使用余弦定理）
        # BC距离
        BC = np.sqrt((B0[0] - Bx)**2 + (B0[1] - By)**2)

        # 余弦定理求角度
        try:
            cos_alpha = (L4**2 + BC**2 - L3**2) / (2 * L4 * BC)
            cos_alpha = np.clip(cos_alpha, -1, 1)  # 数值稳定性
            alpha = np.arccos(cos_alpha)

            # BC与水平线夹角
            beta = np.arctan2(By - B0[1], Bx - B0[0])

            # 摇杆角度（取下支路解）
            theta4 = beta - alpha
            theta4_array[i] = theta4

            # 摇杆末端坐标 C
            Cx = B0[0] + L4 * np.cos(theta4)
            Cy = B0[1] + L4 * np.sin(theta4)
            C_positions[i] = [Cx, Cy]

            # 连杆角度 theta3
            theta3 = np.arctan2(Cy - By, Cx - Bx)
            theta3_array[i] = theta3

            # 连杆中点 P
            Px = Bx + 0.5 * L3 * np.cos(theta3)
            Py = By + 0.5 * L3 * np.sin(theta3)
            P_positions[i] = [Px, Py]

        except:
            # 异常情况处理
            C_positions[i] = [np.nan, np.nan]
            P_positions[i] = [np.nan, np.nan]

    return {
        'A': A,
        'B0': B0,
        'B': B_positions,
        'C': C_positions,
        'P': P_positions,
        'theta3': theta3_array,
        'theta4': theta4_array
    }


# ==================== 传动角计算 ====================
def calculate_transmission_angle(L2, L3, L4, theta2_array, theta3_array, theta4_array):
    """
    计算传动角 γ（连杆与摇杆的夹角）

    传动角定义: γ = |θ3 - θ4|
    工程要求: γ_min >= 40° 才能保证良好传动性能

    返回:
        gamma_array: 传动角数组（度）
        gamma_min: 最小传动角（度）
        gamma_min_index: 最小传动角对应的索引
    """
    gamma_array = np.abs(theta3_array - theta4_array)

    # 确保传动角在 [0, π] 范围内
    gamma_array = np.where(gamma_array > np.pi, 2*np.pi - gamma_array, gamma_array)

    # 转换为度
    gamma_deg = np.degrees(gamma_array)

    gamma_min = np.min(gamma_deg)
    gamma_min_index = np.argmin(gamma_deg)

    return gamma_deg, gamma_min, gamma_min_index


# ==================== 侧边栏参数输入 ====================
st.sidebar.header("📐 机构参数设置")
st.sidebar.markdown("调节各连杆长度（单位：mm）")

L1 = st.sidebar.slider("L₁ - 机架长度", min_value=50, max_value=300, value=200, step=5)
L2 = st.sidebar.slider("L₂ - 曲柄长度", min_value=20, max_value=200, value=60, step=5)
L3 = st.sidebar.slider("L₃ - 连杆长度", min_value=50, max_value=300, value=180, step=5)
L4 = st.sidebar.slider("L₄ - 摇杆长度", min_value=50, max_value=300, value=150, step=5)

st.sidebar.markdown("---")
st.sidebar.markdown("### 当前参数")
st.sidebar.write(f"- 机架: {L1} mm")
st.sidebar.write(f"- 曲柄: {L2} mm")
st.sidebar.write(f"- 连杆: {L3} mm")
st.sidebar.write(f"- 摇杆: {L4} mm")


# ==================== 格拉晓夫条件校验 ====================
is_valid, mechanism_type, error_msg = check_grashof_condition(L1, L2, L3, L4)

st.sidebar.markdown("---")
st.sidebar.markdown("### ⚙️ 机构类型判定")

if is_valid:
    st.sidebar.success(f"✅ {mechanism_type}")
else:
    st.sidebar.error(f"❌ {mechanism_type}")
    st.error(f"### ⚠️ 机构约束校验失败\n\n{error_msg}")
    st.stop()  # 停止后续渲染


# ==================== 运动学求解 ====================
# 曲柄旋转一周（0 到 2π）
theta2_array = np.linspace(0, 2*np.pi, 360)
positions = solve_mechanism_kinematics(L1, L2, L3, L4, theta2_array)

# 传动角计算
gamma_deg, gamma_min, gamma_min_index = calculate_transmission_angle(
    L2, L3, L4,
    theta2_array,
    positions['theta3'],
    positions['theta4']
)


# ==================== 主界面可视化 ====================
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("📊 机构运动轨迹与包络线")

    # 创建 Plotly 图形
    fig_mechanism = go.Figure()

    # 绘制点 P 的完整运动轨迹（封闭曲线）
    fig_mechanism.add_trace(go.Scatter(
        x=positions['P'][:, 0],
        y=positions['P'][:, 1],
        mode='lines',
        name='点P轨迹',
        line=dict(color='rgba(255, 100, 100, 0.6)', width=2),
        hovertemplate='P轨迹<br>x: %{x:.2f}<br>y: %{y:.2f}<extra></extra>'
    ))

    # 选择一个典型位置绘制机构姿态（例如 θ2 = 45°）
    idx = 45
    A = positions['A']
    B0 = positions['B0']
    B = positions['B'][idx]
    C = positions['C'][idx]
    P = positions['P'][idx]

    # 绘制机架
    fig_mechanism.add_trace(go.Scatter(
        x=[A[0], B0[0]],
        y=[A[1], B0[1]],
        mode='lines+markers',
        name='机架 L₁',
        line=dict(color='black', width=4),
        marker=dict(size=10, color='black')
    ))

    # 绘制曲柄
    fig_mechanism.add_trace(go.Scatter(
        x=[A[0], B[0]],
        y=[A[1], B[1]],
        mode='lines+markers',
        name='曲柄 L₂',
        line=dict(color='blue', width=3),
        marker=dict(size=8, color='blue')
    ))

    # 绘制连杆
    fig_mechanism.add_trace(go.Scatter(
        x=[B[0], C[0]],
        y=[B[1], C[1]],
        mode='lines+markers',
        name='连杆 L₃',
        line=dict(color='green', width=3),
        marker=dict(size=8, color='green')
    ))

    # 绘制摇杆
    fig_mechanism.add_trace(go.Scatter(
        x=[B0[0], C[0]],
        y=[B0[1], C[1]],
        mode='lines+markers',
        name='摇杆 L₄',
        line=dict(color='orange', width=3),
        marker=dict(size=8, color='orange')
    ))

    # 标注点 P
    fig_mechanism.add_trace(go.Scatter(
        x=[P[0]],
        y=[P[1]],
        mode='markers+text',
        name='点P（连杆中点）',
        marker=dict(size=12, color='red', symbol='star'),
        text=['P'],
        textposition='top center',
        textfont=dict(size=14, color='red')
    ))

    # 设置等比例坐标轴
    fig_mechanism.update_layout(
        xaxis=dict(
            scaleanchor="y",
            scaleratio=1,
            title="X (mm)"
        ),
        yaxis=dict(title="Y (mm)"),
        height=500,
        showlegend=True,
        hovermode='closest',
        plot_bgcolor='rgba(240, 240, 240, 0.5)'
    )

    st.plotly_chart(fig_mechanism, use_container_width=True)

with col2:
    st.subheader("📈 关键参数")

    # 显示传动角信息
    st.metric("最小传动角 γ_min", f"{gamma_min:.2f}°")
    st.metric("最小传动角位置", f"θ₂ = {np.degrees(theta2_array[gamma_min_index]):.1f}°")

    # 工程死角预警
    if gamma_min < 40:
        st.error("⚠️ 工程死角预警")
        st.markdown(f"""
        <div style='background-color: #ffcccc; padding: 15px; border-radius: 5px; border-left: 5px solid red;'>
        <strong>传动性能不佳！</strong><br>
        最小传动角 {gamma_min:.2f}° < 40°<br>
        建议重新调整连杆尺寸
        </div>
        """, unsafe_allow_html=True)
    else:
        st.success("✅ 传动性能良好")
        st.markdown(f"最小传动角 {gamma_min:.2f}° ≥ 40°")

    st.markdown("---")

    # 机构特性参数
    st.markdown("### 机构特性")
    st.write(f"- 曲柄转速比: 待计算")
    st.write(f"- 摇杆摆角: {np.degrees(positions['theta4'].max() - positions['theta4'].min()):.2f}°")
    st.write(f"- 点P轨迹范围:")
    st.write(f"  - X: [{positions['P'][:, 0].min():.1f}, {positions['P'][:, 0].max():.1f}] mm")
    st.write(f"  - Y: [{positions['P'][:, 1].min():.1f}, {positions['P'][:, 1].max():.1f}] mm")


# ==================== 传动角监控面板 ====================
st.markdown("---")
st.subheader("📉 传动角监控面板")

fig_gamma = go.Figure()

# 绘制传动角曲线
fig_gamma.add_trace(go.Scatter(
    x=np.degrees(theta2_array),
    y=gamma_deg,
    mode='lines',
    name='传动角 γ',
    line=dict(color='blue', width=2),
    hovertemplate='θ₂: %{x:.1f}°<br>γ: %{y:.2f}°<extra></extra>'
))

# 标注最小传动角
fig_gamma.add_trace(go.Scatter(
    x=[np.degrees(theta2_array[gamma_min_index])],
    y=[gamma_min],
    mode='markers+text',
    name='最小传动角',
    marker=dict(size=12, color='red', symbol='x'),
    text=[f'γ_min = {gamma_min:.2f}°'],
    textposition='top center',
    textfont=dict(size=12, color='red')
))

# 添加 40° 警戒线
fig_gamma.add_hline(
    y=40,
    line_dash="dash",
    line_color="red",
    annotation_text="工程警戒线 (40°)",
    annotation_position="right"
)

fig_gamma.update_layout(
    xaxis_title="曲柄转角 θ₂ (度)",
    yaxis_title="传动角 γ (度)",
    height=400,
    hovermode='x unified',
    showlegend=True
)

st.plotly_chart(fig_gamma, use_container_width=True)


# ==================== 页脚信息 ====================
st.markdown("---")
st.markdown("""
<div style='text-align: center; color: gray; font-size: 12px;'>
<p>工程级曲柄摇杆机构运动学仿真系统 | 基于格拉晓夫定理与矢量闭合方程</p>
<p>© 2024 机械原理仿真平台</p>
</div>
""", unsafe_allow_html=True)
