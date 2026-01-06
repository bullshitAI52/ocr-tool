#!/bin/bash

# OCR工具自动安装脚本
# 适用于Linux/macOS系统

set -e  # 遇到错误时退出

echo "🚀 开始安装OCR工具..."
echo "================================"

# 检查Python版本
echo "📦 检查Python版本..."
python3 --version || { echo "❌ 未找到Python3，请先安装Python3"; exit 1; }

# 检查pip
echo "📦 检查pip..."
python3 -m pip --version || { echo "❌ 未找到pip，请先安装pip"; exit 1; }

# 创建虚拟环境
echo "📦 创建Python虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ 虚拟环境创建成功"
else
    echo "⚠️  虚拟环境已存在，跳过创建"
fi

# 激活虚拟环境
echo "📦 激活虚拟环境..."
source venv/bin/activate

# 升级pip
echo "📦 升级pip..."
python3 -m pip install --upgrade pip

# 安装依赖
echo "📦 安装Python依赖..."
if [ -f "requirements-minimal.txt" ]; then
    echo "📋 使用最小依赖集安装..."
    python3 -m pip install -r requirements-minimal.txt
elif [ -f "requirements.txt" ]; then
    echo "📋 使用完整依赖集安装..."
    python3 -m pip install -r requirements.txt
else
    echo "📋 安装基础依赖..."
    python3 -m pip install flask flask-cors pillow requests
fi

# 创建必要目录
echo "📦 创建必要目录..."
mkdir -p ocr_history

# 设置文件权限
echo "📦 设置文件权限..."
chmod +x server.py server_enhanced.py

echo ""
echo "🎉 安装完成！"
echo "================================"
echo ""
echo "📝 使用说明："
echo ""
echo "1. 🖥️  纯前端使用（最简单）："
echo "   直接双击打开 index.html"
echo ""
echo "2. 🐍 使用Python后端："
echo "   source venv/bin/activate"
echo "   python server.py"
echo "   然后访问 http://localhost:5000"
echo ""
echo "3. 🚀 使用增强版后端（推荐）："
echo "   source venv/bin/activate"
echo "   python server_enhanced.py"
echo "   然后访问 http://localhost:5000"
echo ""
echo "4. 🌐 在线演示："
echo "   访问 https://bullshitai52.github.io/ocr-tool/"
echo ""
echo "📌 提示："
echo "   - 首次运行可能需要下载OCR模型，请确保网络连接"
echo "   - 手写识别建议使用Python后端"
echo "   - 表格识别建议使用增强版后端"
echo ""
echo "🔧 故障排除："
echo "   如果遇到问题，请检查："
echo "   1. Python和pip是否正确安装"
echo "   2. 网络连接是否正常"
echo "   3. 端口5000是否被占用"
echo ""
echo "📞 支持："
echo "   如有问题，请访问："
echo "   https://github.com/bullshitAI52/ocr-tool/issues"
echo ""
echo "================================"
echo "✨ OCR工具安装完成，开始使用吧！"