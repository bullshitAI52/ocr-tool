# 🚀 智能OCR识别工具

一个功能强大的在线图片文字、表格、手写识别工具，支持多种OCR引擎和导出格式。

## ✨ 主要功能

### 🖼️ 图片识别
- 支持JPG、PNG、BMP格式图片
- 拖拽上传和点击选择
- 实时图片预览

### 🔤 多语言识别
- 简体中文、繁体中文
- 英语、日语、韩语
- 俄语、法语、德语、西班牙语

### 🎯 识别模式
- **文字识别**：普通印刷文字
- **表格识别**：提取表格数据
- **手写识别**：AI增强手写文字识别

### ⚙️ 多种OCR引擎
1. **本地引擎 (Tesseract.js)** - 浏览器端，完全免费
2. **Python后端** - 免费开源库（EasyOCR、PaddleOCR）
3. **百度OCR API** - 商业级识别精度
4. **其他云端AI** - 自定义API端点

### 💾 导出和保存
- **多种格式**：TXT、DOCX、PDF、JSON、HTML、Markdown
- **表格导出**：CSV、Excel、JSON、HTML、SQL
- **历史记录**：自动保存识别记录
- **本地存储**：设置和记录保存在浏览器

### 🔗 智能提取
- 自动提取网址和API端点
- 网址分类和快速操作
- API端点测试功能

## 🚀 快速开始

### 1. 纯前端使用（最简单）
直接双击打开 `index.html` 即可使用本地Tesseract引擎。

### 2. 使用Python后端（推荐）
```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务器
python server.py

# 访问工具
打开浏览器访问 http://localhost:5000
```

### 3. 配置百度OCR（可选）
1. 访问百度AI开放平台注册账号
2. 创建OCR应用获取API Key和Secret Key
3. 在工具设置中配置

## 📁 项目结构
```
ocr-tool/
├── index.html          # 主界面
├── style.css           # 样式表
├── script.js           # 前端逻辑
├── server.py           # Python后端服务器
├── requirements.txt    # Python依赖
├── README.md           # 说明文档
└── ocr_history/        # 历史记录目录（自动创建）
```

## 🔧 Python后端功能

### 支持的OCR库
- **EasyOCR**：支持80+种语言，安装简单
- **PaddleOCR**：百度开源，中文识别优秀
- **OCR.space**：免费API，每月500次调用

### 服务器API
- `POST /ocr` - 执行OCR识别
- `GET /history` - 获取历史记录
- `POST /export` - 导出结果
- `GET /health` - 健康检查
- `GET /config` - 配置管理

## 💡 使用技巧

### 费用节省策略
1. **优先使用本地引擎**：完全免费，保护隐私
2. **Python后端备用**：免费开源库，识别效果好
3. **百度OCR专业场景**：需要高精度时使用
4. **其他AI最后选择**：复杂场景或需要特定功能

### 最佳实践
1. **印刷文字**：使用本地引擎或Python后端
2. **手写文字**：使用Python后端（EasyOCR）或百度OCR
3. **复杂表格**：使用表格识别模式
4. **批量处理**：保存历史记录，批量导出

## 🌐 部署选项

### 本地部署
```bash
# 克隆项目
git clone <repository-url>
cd ocr-tool

# 安装Python依赖
pip install -r requirements.txt

# 启动服务器
python server.py
```

### Docker部署
```bash
# 构建镜像
docker build -t ocr-tool .

# 运行容器
docker run -p 5000:5000 ocr-tool
```

### 云服务器部署
1. 将项目上传到服务器
2. 安装Python和依赖
3. 使用systemd或supervisor管理进程
4. 配置Nginx反向代理

## 🔒 隐私和安全

### 数据保护
- **本地处理**：图片在浏览器中处理，不上传
- **Python后端**：图片仅发送到本地服务器
- **云端API**：需要用户明确配置和同意

### 设置保存
- 所有设置保存在浏览器本地存储
- 可随时清除或重置
- 不收集用户数据

## 🛠️ 开发指南

### 添加新OCR引擎
1. 在 `server.py` 中添加新的识别函数
2. 更新前端引擎选择界面
3. 添加对应的配置选项

### 添加新导出格式
1. 在 `server.py` 的 `export` 函数中添加格式处理
2. 更新前端导出下拉菜单
3. 添加对应的MIME类型处理

### 自定义样式
- 修改 `style.css` 文件
- 所有组件都有明确的CSS类名
- 支持响应式设计

## 📄 许可证

本项目基于MIT许可证开源，可自由使用和修改。

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题或建议，请：
1. 查看本README文档
2. 检查浏览器控制台错误
3. 提交GitHub Issue

---

**提示**：首次使用Python后端时，OCR库可能需要下载模型文件，请确保网络连接正常。