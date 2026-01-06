# 使用Python官方镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements-minimal.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements-minimal.txt

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p ocr_history

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV FLASK_APP=server_enhanced.py
ENV FLASK_ENV=production

# 启动命令
CMD ["python", "server_enhanced.py"]