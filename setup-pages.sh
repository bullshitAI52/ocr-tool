#!/bin/bash

# GitHub Pages设置脚本

echo "🚀 设置GitHub Pages..."
echo "================================"

# 检查是否已登录GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "❌ 请先登录GitHub CLI: gh auth login"
    exit 1
fi

# 获取仓库信息
REPO_OWNER="bullshitAI52"
REPO_NAME="ocr-tool"

echo "📦 仓库: $REPO_OWNER/$REPO_NAME"

# 启用GitHub Pages
echo "📦 启用GitHub Pages..."
gh api repos/$REPO_OWNER/$REPO_NAME/pages --method POST --field build_type=legacy --field source.branch=gh-pages --field source.path="/" || {
    echo "⚠️  Pages可能已经启用，继续..."
}

# 检查Pages状态
echo "📦 检查Pages状态..."
gh api repos/$REPO_OWNER/$REPO_NAME/pages --jq '{status: .status, url: .html_url, branch: .source.branch, path: .source.path}'

echo ""
echo "🌐 GitHub Pages URL: https://$REPO_OWNER.github.io/$REPO_NAME/"
echo ""
echo "📝 手动设置步骤（如果需要）："
echo "1. 访问 https://github.com/$REPO_OWNER/$REPO_NAME/settings/pages"
echo "2. 选择 'Deploy from a branch'"
echo "3. 选择分支: gh-pages"
echo "4. 选择文件夹: / (root)"
echo "5. 点击 Save"
echo ""
echo "⏳ 部署可能需要几分钟时间..."
echo "完成后访问: https://$REPO_OWNER.github.io/$REPO_NAME/"