#!/bin/bash
# 线控转向传感器故障诊断系统 - 启动脚本

echo "🚗 启动线控转向传感器故障诊断系统..."
echo ""
echo "应用地址: http://localhost:8501"
echo "按 Ctrl+C 停止"
echo ""

python -m streamlit run app.py
