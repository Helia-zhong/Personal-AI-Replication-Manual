"""
快速验证脚本
"""
print("=" * 50)
print("曲柄摇杆机构仿真系统 - 环境检查")
print("=" * 50)

# 检查 Python 版本
import sys
print(f"\nPython 版本: {sys.version.split()[0]}")

# 检查依赖
try:
    import streamlit as st
    print(f"[OK] Streamlit: {st.__version__}")
except:
    print("[FAIL] Streamlit 未安装")

try:
    import numpy as np
    print(f"[OK] NumPy: {np.__version__}")
except:
    print("[FAIL] NumPy 未安装")

try:
    import plotly
    print(f"[OK] Plotly: {plotly.__version__}")
except:
    print("[FAIL] Plotly 未安装")

print("\n" + "=" * 50)
print("环境检查完成！")
print("=" * 50)
print("\n请运行以下命令启动应用：")
print("  python -m streamlit run app.py")
print("\n或者双击 启动.bat 文件")
print("\n启动后在浏览器中访问：http://localhost:8501")
print("=" * 50)
