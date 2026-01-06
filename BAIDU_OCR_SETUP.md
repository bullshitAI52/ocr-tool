# 百度OCR配置指南

## 问题：百度OCR连接错误 "Failed to fetch"

这个错误通常是由于以下原因：

### 1. API密钥未配置
- 百度OCR需要有效的API密钥才能使用
- 默认情况下，工具没有预置API密钥

### 2. 网络连接问题
- 网络连接不稳定
- 防火墙或代理阻止了请求
- CORS策略限制

### 3. API服务问题
- 百度OCR服务暂时不可用
- API配额已用完

## 解决方案

### 步骤1：获取百度OCR API密钥

1. 访问 [百度AI开放平台](https://ai.baidu.com/)
2. 注册并登录账号
3. 进入控制台 → 文字识别
4. 创建应用，获取 `API Key` 和 `Secret Key`

### 步骤2：在工具中配置API密钥

1. 打开OCR工具
2. 点击右上角"设置"按钮
3. 在"百度OCR配置"部分输入：
   - **API Key**: 你的百度OCR API Key
   - **Secret Key**: 你的百度OCR Secret Key
4. 点击"保存设置"

### 步骤3：测试连接

1. 在设置界面点击"测试百度连接"按钮
2. 如果显示"百度OCR连接成功！"，说明配置正确
3. 如果失败，请检查错误信息

## 常见错误及解决方法

### 错误1：`unknown client id` 或 `invalid_client`
- **原因**: API密钥错误
- **解决**: 检查API Key和Secret Key是否正确

### 错误2：`network connection failed`
- **原因**: 网络问题
- **解决**: 
  - 检查网络连接
  - 关闭VPN或代理
  - 尝试使用手机热点

### 错误3：`CORS policy` 错误
- **原因**: 浏览器安全限制
- **解决**: 
  - 使用最新版Chrome/Firefox
  - 确保从 `http://localhost` 或 `file://` 协议访问
  - 或部署到服务器使用HTTPS

### 错误4：`quota exceeded`
- **原因**: API调用次数超限
- **解决**: 
  - 等待配额重置（通常每月）
  - 升级到付费套餐

## 备选方案

如果无法使用百度OCR，可以尝试：

### 1. 使用本地引擎 (Tesseract)
- 不需要API密钥
- 完全离线使用
- 支持多种语言

### 2. 使用Python后端
- 需要安装Python环境
- 支持多种OCR引擎
- 免费使用

### 3. 使用Google Vision API
- 需要Google Cloud账号
- 有免费额度
- 识别准确率高

## 技术支持

如果问题仍未解决：
1. 查看浏览器控制台错误信息 (F12 → Console)
2. 检查网络请求状态 (F12 → Network)
3. 联系开发者提供详细错误信息

## 注意事项

- 百度OCR有免费额度限制
- 大图片可能需要更长时间处理
- 确保图片格式正确 (JPG/PNG/BMP)
- 图片大小不超过10MB