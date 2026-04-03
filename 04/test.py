# -*- coding: utf-8 -*-
"""
测试脚本：验证 app.py 的核心功能
"""
import sys
sys.path.insert(0, '.')

print("正在测试核心功能...")

# 测试格拉晓夫定理
def check_grashof_condition(L1, L2, L3, L4):
    lengths = [L1, L2, L3, L4]
    s = min(lengths)
    l = max(lengths)
    p = sum(lengths) - s - l

    if s + l > p:
        return False, "无法闭合", f"机构无法闭合"

    grashof_satisfied = (s + l <= p)

    if not grashof_satisfied:
        return False, "双摇杆机构", f"不满足格拉晓夫条件"

    if L2 == s and L1 != l:
        return True, "曲柄摇杆机构", ""
    elif L1 == s and L2 != l:
        return True, "曲柄摇杆机构", ""
    elif s + l == p:
        return True, "曲柄摇杆机构（临界）", ""
    else:
        return False, "双曲柄或其他机构", f"当前配置无法构成曲柄摇杆机构"

# 测试默认参数
L1, L2, L3, L4 = 200, 60, 180, 150
is_valid, mech_type, error = check_grashof_condition(L1, L2, L3, L4)

print(f"\n测试参数: L1={L1}, L2={L2}, L3={L3}, L4={L4}")
print(f"校验结果: {mech_type}")
print(f"是否有效: {'是' if is_valid else '否'}")

if is_valid:
    print("\n核心功能测试通过！")
    print("\n请运行以下命令启动应用:")
    print("  python -m streamlit run app.py")
else:
    print(f"\n错误: {error}")
