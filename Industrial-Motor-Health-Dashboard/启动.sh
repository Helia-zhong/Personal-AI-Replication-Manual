#!/bin/bash

echo "========================================"
echo "工业电机健康状态监测大屏"
echo "========================================"
echo ""
echo "选择启动方式："
echo "1. 使用默认浏览器直接打开 (推荐)"
echo "2. 使用 Python 启动本地服务器"
echo "3. 使用 Vite 开发服务器 (需要先运行 npm install)"
echo ""
read -p "请输入选项 (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "正在打开浏览器..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open index.html
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open index.html
        else
            echo "请手动打开 index.html 文件"
        fi
        echo "已在浏览器中打开项目！"
        ;;
    2)
        echo ""
        echo "正在启动 Python 服务器..."
        echo "请在浏览器中访问: http://localhost:8000"
        echo "按 Ctrl+C 停止服务器"
        python3 -m http.server 8000
        ;;
    3)
        echo ""
        echo "正在启动 Vite 开发服务器..."
        npm run dev
        ;;
    *)
        echo ""
        echo "无效的选项！"
        ;;
esac
