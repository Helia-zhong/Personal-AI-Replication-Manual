"""
基于机器学习的线控转向传感器故障诊断系统
Steer-by-Wire Sensor Fault Diagnosis System using Machine Learning
"""

import streamlit as st
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import time
from datetime import datetime

# 错误处理：检查 sklearn 是否正确安装
try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
except ImportError as e:
    st.error(f"⚠️ 依赖库导入失败：{e}")
    st.info("请运行以下命令安装依赖：\n\n```bash\npip install scikit-learn\n```")
    st.stop()

# ==================== 页面配置 ====================
st.set_page_config(
    page_title="线控转向传感器故障诊断系统",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==================== 数据生成函数 ====================
def generate_sensor_data(label, length=100, base_angle=0):
    """
    生成线控转向传感器时序数据

    参数:
        label: 0=正常, 1=电磁干扰, 2=传感器卡死/漂移
        length: 数据点数量
        base_angle: 基准转向角度

    返回:
        true_signal: 真实转向信号
        sensor_signal: 传感器读取信号（含故障）
    """
    t = np.linspace(0, 4*np.pi, length)
    # 真实转向信号：正弦波模拟方向盘转动
    true_signal = 30 * np.sin(t) + base_angle

    if label == 0:  # 正常状态
        # 微小的高斯白噪声
        noise = np.random.normal(0, 0.5, length)
        sensor_signal = true_signal + noise

    elif label == 1:  # 电磁干扰
        # 极大的高斯噪声 + 随机尖刺
        noise = np.random.normal(0, 5, length)
        spikes = np.random.choice([0, 15, -15], size=length, p=[0.9, 0.05, 0.05])
        sensor_signal = true_signal + noise + spikes

    elif label == 2:  # 传感器卡死/漂移
        # 随机选择卡死或漂移
        sensor_signal = true_signal.copy()
        if np.random.rand() > 0.5:
            # 卡死：信号突然变为直线
            stuck_point = np.random.randint(int(length * 0.2), int(length * 0.8))
            stuck_value = sensor_signal[stuck_point]
            sensor_signal[stuck_point:] = stuck_value + np.random.normal(0, 0.3, length - stuck_point)
        else:
            # 漂移：缓慢偏离真实值
            drift = np.linspace(0, 20, length)
            sensor_signal = true_signal + drift + np.random.normal(0, 1, length)
    else:
        # 默认返回正常信号
        sensor_signal = true_signal + np.random.normal(0, 0.5, length)

    return true_signal, sensor_signal

def extract_features(signal):
    """
    从时序信号中提取统计特征用于机器学习
    """
    # 确保信号是 numpy 数组且长度足够
    signal = np.array(signal)
    if len(signal) < 2:
        # 如果信号太短，返回默认特征
        return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

    try:
        features = [
            np.mean(signal),           # 均值
            np.std(signal),            # 标准差
            np.var(signal),            # 方差
            np.max(signal) - np.min(signal),  # 极差
            np.percentile(signal, 75) - np.percentile(signal, 25),  # 四分位距
            np.mean(np.abs(np.diff(signal))),  # 平均变化率
            np.max(np.abs(np.diff(signal))),   # 最大变化率
        ]
        return features
    except Exception as e:
        # 如果计算出错，返回默认特征
        return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

# ==================== 模型训练函数 ====================
@st.cache_resource(show_spinner=False)
def train_model():
    """
    训练随机森林分类模型（使用缓存避免重复训练）
    """
    # 生成训练数据（优化：减少样本数以加快速度）
    X = []
    y = []

    # 每种状态生成200个样本（优化：从300减少到200）
    for label in [0, 1, 2]:
        for _ in range(200):
            _, sensor_signal = generate_sensor_data(label, length=100)
            features = extract_features(sensor_signal)
            X.append(features)
            y.append(label)

    X = np.array(X)
    y = np.array(y)

    # 分割训练集和测试集
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 训练随机森林模型（优化：减少树的数量，启用并行）
    model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=8, n_jobs=-1)
    model.fit(X_train, y_train)

    # 计算准确率
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    return model, accuracy

# ==================== 实时数据生成 ====================
def get_real_time_data(fault_type, time_step):
    """
    根据故障类型生成实时数据点
    """
    # 映射故障类型到标签
    fault_map = {
        "模拟正常行驶": 0,
        "注入电磁干扰故障": 1,
        "注入传感器卡死故障": 2
    }
    label = fault_map[fault_type]

    # 生成一小段数据并返回最新点
    try:
        true_sig, sensor_sig = generate_sensor_data(label, length=50)
        idx = time_step % 50

        # 确保索引有效
        if idx >= len(true_sig):
            idx = len(true_sig) - 1

        # 确保有足够的数据用于特征提取
        if len(sensor_sig) >= 20:
            recent_data = sensor_sig[-20:]
        else:
            recent_data = sensor_sig

        return true_sig[idx], sensor_sig[idx], recent_data
    except Exception as e:
        # 如果出错，返回默认值
        return 0.0, 0.0, np.zeros(20)

# ==================== 主应用 ====================
def main():
    # 标题
    st.title("🚗 基于机器学习的线控转向传感器故障诊断系统")
    st.markdown("**Steer-by-Wire Sensor Fault Diagnosis System**")
    st.markdown("---")

    # 初始化 session_state
    if 'history_true' not in st.session_state:
        st.session_state.history_true = []
        st.session_state.history_sensor = []
        st.session_state.time_steps = []
        st.session_state.current_step = 0
        st.session_state.fault_detected = False
        st.session_state.fault_message = ""
        st.session_state.confidence = 0.0

    # 训练模型（使用缓存，第二次启动会很快）
    model, accuracy = train_model()

    # ==================== 侧边栏控制台 ====================
    with st.sidebar:
        st.header("⚙️ 控制台")
        st.markdown("---")

        # 故障注入控制
        st.subheader("🎛️ 故障注入控制")
        fault_type = st.selectbox(
            "选择运行模式",
            ["模拟正常行驶", "注入电磁干扰故障", "注入传感器卡死故障"],
            index=0
        )

        st.markdown("---")
        st.subheader("🤖 AI模型信息")
        st.metric("模型训练准确率", f"{accuracy*100:.2f}%")
        st.info(f"✓ 模型类型: RandomForest\n\n✓ 特征维度: 7\n\n✓ 决策树数量: 50 (已优化)\n\n✓ 多核并行加速")

        st.markdown("---")
        st.subheader("📊 系统参数")
        update_speed = st.slider("数据刷新速度 (Hz)", 1, 10, 3, help="推荐设置为3-5 Hz以获得最佳流畅度")

        # 重置按钮
        if st.button("🔄 重置系统", type="primary"):
            st.session_state.history_true = []
            st.session_state.history_sensor = []
            st.session_state.time_steps = []
            st.session_state.current_step = 0
            st.session_state.fault_detected = False
            st.rerun()

    # ==================== 顶部指标卡片 ====================
    col1, col2, col3 = st.columns(3)

    with col1:
        vehicle_speed = 60  # 模拟固定车速
        st.metric(
            label="🚙 当前车速",
            value=f"{vehicle_speed} km/h",
            delta="稳定"
        )

    with col2:
        confidence = st.session_state.confidence
        st.metric(
            label="🎯 AI模型置信度",
            value=f"{confidence*100:.1f}%",
            delta=f"{(confidence-0.8)*100:.1f}%" if confidence > 0 else None
        )

    with col3:
        if st.session_state.fault_detected:
            status = "⚠️ 警告"
            status_color = "🔴"
        else:
            status = "✓ 正常"
            status_color = "🟢"

        st.metric(
            label="🏥 系统健康状态",
            value=status,
            delta=status_color
        )

    st.markdown("---")

    # ==================== 主区域：实时图表 ====================
    st.subheader("📈 实时转向角度监控")

    # 图表占位符
    chart_placeholder = st.empty()

    # ==================== 底部：AI诊断日志 ====================
    st.markdown("---")
    st.subheader("🤖 AI诊断日志")
    log_placeholder = st.empty()

    # ==================== 实时数据更新循环 ====================
    max_points = 100  # 图表最多显示100个点

    # 生成实时数据
    true_angle, sensor_angle, recent_data = get_real_time_data(fault_type, st.session_state.current_step)

    # 更新历史数据
    st.session_state.history_true.append(true_angle)
    st.session_state.history_sensor.append(sensor_angle)
    st.session_state.time_steps.append(st.session_state.current_step)
    st.session_state.current_step += 1

    # 保持最多max_points个点
    if len(st.session_state.history_true) > max_points:
        st.session_state.history_true.pop(0)
        st.session_state.history_sensor.pop(0)
        st.session_state.time_steps.pop(0)

    # AI诊断
    if len(recent_data) >= 20:
        features = extract_features(recent_data)
        prediction = model.predict([features])[0]
        proba = model.predict_proba([features])[0]
        st.session_state.confidence = np.max(proba)

        fault_names = {
            0: "系统正常",
            1: "电磁干扰",
            2: "传感器卡死/漂移"
        }

        # 故障检测逻辑
        if prediction == 1:
            st.session_state.fault_detected = True
            st.session_state.fault_message = f"⚠️ **危险警告：检测到{fault_names[prediction]}！**\n\n置信度: {st.session_state.confidence*100:.1f}%\n\n建议：立即降低车速并启动冗余系统！"
        elif prediction == 2:
            st.session_state.fault_detected = True
            st.session_state.fault_message = f"⚠️ **危险警告：检测到{fault_names[prediction]}！**\n\n置信度: {st.session_state.confidence*100:.1f}%\n\n建议：启动备用转向系统，安全靠边停车！"
        else:
            st.session_state.fault_detected = False
            st.session_state.fault_message = f"✅ **系统运行正常**\n\n置信度: {st.session_state.confidence*100:.1f}%\n\n所有传感器工作正常。"

    # 绘制图表
    fig = go.Figure()

    # 真实转角曲线
    fig.add_trace(go.Scatter(
        x=st.session_state.time_steps,
        y=st.session_state.history_true,
        mode='lines',
        name='方向盘真实转角',
        line=dict(color='#00CC96', width=3),
        hovertemplate='时间: %{x}<br>真实转角: %{y:.2f}°<extra></extra>'
    ))

    # 传感器读取曲线
    fig.add_trace(go.Scatter(
        x=st.session_state.time_steps,
        y=st.session_state.history_sensor,
        mode='lines',
        name='传感器读取转角',
        line=dict(color='#EF553B', width=2, dash='solid'),
        hovertemplate='时间: %{x}<br>传感器转角: %{y:.2f}°<extra></extra>'
    ))

    fig.update_layout(
        title="转向角度实时对比（°）",
        xaxis_title="时间步 (Time Step)",
        yaxis_title="转向角度 (Degree)",
        hovermode='x unified',
        height=500,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        template="plotly_dark",
        # 优化性能：禁用动画
        transition_duration=0,
        # 优化渲染
        uirevision='constant'
    )

    chart_placeholder.plotly_chart(fig, use_container_width=True, key='main_chart')

    # 显示诊断日志
    if st.session_state.fault_detected:
        log_placeholder.error(st.session_state.fault_message)
    else:
        log_placeholder.success(st.session_state.fault_message)

    # 优化自动刷新：减少延迟
    time.sleep(0.8 / update_speed)
    st.rerun()

# ==================== 运行应用 ====================
if __name__ == "__main__":
    main()
