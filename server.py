#!/usr/bin/env python3
"""
OCR工具Python后端服务器
支持多种免费OCR库：EasyOCR, PaddleOCR, OCR.space API
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import base64
from io import BytesIO
from PIL import Image
import json
import os
from datetime import datetime
import requests
import tempfile

# 尝试导入各种OCR库
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("警告: EasyOCR 未安装，使用 'pip install easyocr' 安装")

try:
    from paddleocr import PaddleOCR
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False
    print("警告: PaddleOCR 未安装，使用 'pip install paddleocr' 安装")

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置
CONFIG = {
    'use_easyocr': True,
    'use_paddleocr': True,
    'use_ocrspace': True,
    'ocrspace_api_key': 'helloworld',  # OCR.space免费API密钥
    'history_dir': 'ocr_history',
    'max_history': 100
}

# 初始化OCR阅读器
easyocr_reader = None
paddleocr_reader = None

def init_ocr_readers():
    """初始化OCR阅读器"""
    global easyocr_reader, paddleocr_reader
    
    if CONFIG['use_easyocr'] and EASYOCR_AVAILABLE:
        try:
            print("正在初始化 EasyOCR...")
            easyocr_reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
            print("EasyOCR 初始化成功")
        except Exception as e:
            print(f"EasyOCR 初始化失败: {e}")
    
    if CONFIG['use_paddleocr'] and PADDLEOCR_AVAILABLE:
        try:
            print("正在初始化 PaddleOCR...")
            paddleocr_reader = PaddleOCR(use_angle_cls=True, lang='ch')
            print("PaddleOCR 初始化成功")
        except Exception as e:
            print(f"PaddleOCR 初始化失败: {e}")

def ensure_history_dir():
    """确保历史记录目录存在"""
    if not os.path.exists(CONFIG['history_dir']):
        os.makedirs(CONFIG['history_dir'])

def save_to_history(result):
    """保存识别结果到历史记录"""
    ensure_history_dir()
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{CONFIG['history_dir']}/ocr_{timestamp}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # 限制历史记录数量
    history_files = sorted(os.listdir(CONFIG['history_dir']))
    if len(history_files) > CONFIG['max_history']:
        for old_file in history_files[:-CONFIG['max_history']]:
            os.remove(os.path.join(CONFIG['history_dir'], old_file))

def base64_to_image(base64_str):
    """将base64字符串转换为PIL图像"""
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]
    image_data = base64.b64decode(base64_str)
    return Image.open(BytesIO(image_data))

def ocr_with_easyocr(image, language='ch_sim'):
    """使用EasyOCR进行识别"""
    if not easyocr_reader:
        return None
    
    try:
        # 转换图像格式
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 执行OCR
        result = easyocr_reader.readtext(image)
        
        # 提取文本和置信度
        texts = []
        confidences = []
        for detection in result:
            text = detection[1]
            confidence = detection[2]
            texts.append(text)
            confidences.append(confidence)
        
        return {
            'text': ' '.join(texts),
            'confidence': sum(confidences) / len(confidences) if confidences else 0,
            'engine': 'easyocr',
            'details': result
        }
    except Exception as e:
        print(f"EasyOCR识别错误: {e}")
        return None

def ocr_with_paddleocr(image, language='ch'):
    """使用PaddleOCR进行识别"""
    if not paddleocr_reader:
        return None
    
    try:
        # 保存临时文件供PaddleOCR使用
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp.name, 'JPEG')
            tmp_path = tmp.name
        
        # 执行OCR
        result = paddleocr_reader.ocr(tmp_path, cls=True)
        
        # 清理临时文件
        os.unlink(tmp_path)
        
        if result and result[0]:
            texts = []
            confidences = []
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1]
                texts.append(text)
                confidences.append(confidence)
            
            return {
                'text': ' '.join(texts),
                'confidence': sum(confidences) / len(confidences) if confidences else 0,
                'engine': 'paddleocr',
                'details': result[0]
            }
        return None
    except Exception as e:
        print(f"PaddleOCR识别错误: {e}")
        return None

def ocr_with_ocrspace(image, language='chs'):
    """使用OCR.space免费API进行识别"""
    if not CONFIG['use_ocrspace']:
        return None
    
    try:
        # 保存图像到临时文件
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp.name, 'JPEG')
            tmp_path = tmp.name
        
        # OCR.space API参数
        payload = {
            'apikey': CONFIG['ocrspace_api_key'],
            'language': language,
            'isOverlayRequired': False,
            'OCREngine': 2  # 引擎2支持中文
        }
        
        # 发送请求
        with open(tmp_path, 'rb') as image_file:
            response = requests.post(
                'https://api.ocr.space/parse/image',
                files={'image': image_file},
                data=payload
            )
        
        # 清理临时文件
        os.unlink(tmp_path)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('IsErroredOnProcessing'):
                print(f"OCR.space API错误: {result.get('ErrorMessage')}")
                return None
            
            parsed_results = result.get('ParsedResults', [])
            if parsed_results:
                text = parsed_results[0].get('ParsedText', '')
                return {
                    'text': text.strip(),
                    'confidence': 0.9,  # OCR.space不提供置信度
                    'engine': 'ocrspace',
                    'details': parsed_results
                }
        return None
    except Exception as e:
        print(f"OCR.space API错误: {e}")
        return None

@app.route('/')
def index():
    """首页"""
    return jsonify({
        'status': 'running',
        'name': 'OCR工具Python后端',
        'version': '1.0.0',
        'available_engines': {
            'easyocr': EASYOCR_AVAILABLE,
            'paddleocr': PADDLEOCR_AVAILABLE,
            'ocrspace': CONFIG['use_ocrspace']
        },
        'endpoints': {
            '/ocr': 'POST - 执行OCR识别',
            '/history': 'GET - 获取历史记录',
            '/export': 'POST - 导出结果',
            '/health': 'GET - 健康检查'
        }
    })

@app.route('/health')
def health():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/ocr', methods=['POST'])
def ocr():
    """执行OCR识别"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': '缺少图像数据'
            }), 400
        
        # 获取参数
        image_data = data['image']
        language = data.get('language', 'ch_sim')
        mode = data.get('mode', 'text')
        engine_preference = data.get('engine', 'auto')  # auto, easyocr, paddleocr, ocrspace
        
        # 转换图像
        image = base64_to_image(image_data)
        
        results = []
        
        # 根据偏好选择引擎
        if engine_preference == 'auto' or engine_preference == 'easyocr':
            if CONFIG['use_easyocr'] and EASYOCR_AVAILABLE:
                result = ocr_with_easyocr(image, language)
                if result:
                    results.append(result)
        
        if engine_preference == 'auto' or engine_preference == 'paddleocr':
            if CONFIG['use_paddleocr'] and PADDLEOCR_AVAILABLE:
                result = ocr_with_paddleocr(image, language)
                if result:
                    results.append(result)
        
        if engine_preference == 'auto' or engine_preference == 'ocrspace':
            if CONFIG['use_ocrspace']:
                result = ocr_with_ocrspace(image, language)
                if result:
                    results.append(result)
        
        if not results:
            return jsonify({
                'success': False,
                'error': '所有OCR引擎都失败了'
            }), 500
        
        # 选择最佳结果（基于置信度）
        best_result = max(results, key=lambda x: x['confidence'])
        
        # 保存到历史记录
        history_entry = {
            'timestamp': datetime.now().isoformat(),
            'language': language,
            'mode': mode,
            'engine': best_result['engine'],
            'confidence': best_result['confidence'],
            'text': best_result['text'],
            'all_results': results
        }
        save_to_history(history_entry)
        
        return jsonify({
            'success': True,
            'text': best_result['text'],
            'confidence': best_result['confidence'],
            'engine': best_result['engine'],
            'all_engines': [r['engine'] for r in results],
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"OCR处理错误: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/history', methods=['GET'])
def get_history():
    """获取历史记录"""
    try:
        ensure_history_dir()
        
        # 获取参数
        limit = request.args.get('limit', default=20, type=int)
        offset = request.args.get('offset', default=0, type=int)
        
        # 读取历史文件
        history_files = sorted(os.listdir(CONFIG['history_dir']), reverse=True)
        history_files = history_files[offset:offset + limit]
        
        history = []
        for filename in history_files:
            filepath = os.path.join(CONFIG['history_dir'], filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    data['id'] = filename.replace('.json', '')
                    history.append(data)
            except Exception as e:
                print(f"读取历史文件错误 {filename}: {e}")
        
        return jsonify({
            'success': True,
            'history': history,
            'total': len(os.listdir(CONFIG['history_dir'])),
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        print(f"获取历史记录错误: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/export', methods=['POST'])
def export():
    """导出结果到不同格式"""
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': '缺少文本数据'
            }), 400
        
        text = data['text']
        format_type = data.get('format', 'txt')
        filename = data.get('filename', f'ocr_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        
        # 根据格式生成内容
        if format_type == 'txt':
            content = text
            mime_type = 'text/plain'
            filename += '.txt'
        
        elif format_type == 'json':
            content = json.dumps({
                'text': text,
                'timestamp': datetime.now().isoformat(),
                'format': 'json'
            }, ensure_ascii=False, indent=2)
            mime_type = 'application/json'
            filename += '.json'
        
        elif format_type == 'html':
            content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>OCR识别结果</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
        .timestamp {{ color: #666; font-size: 0.9em; }}
        .content {{ white-space: pre-wrap; margin-top: 20px; }}
    </style>
</head>
<body>
    <h1>OCR识别结果</h1>
    <div class="timestamp">生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
    <div class="content">{text}</div>
</body>
</html>"""
            mime_type = 'text/html'
            filename += '.html'
        
        elif format_type == 'md':
            content = f"""# OCR识别结果

**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 识别内容

{text}

---
*由OCR工具生成*"""
            mime_type = 'text/markdown'
            filename += '.md'
        
        elif format_type == 'docx':
            # 简化版：返回HTML，前端可以转换为DOCX
            content = f"""<html>
<body>
    <h1>OCR识别结果</h1>
    <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    <div style="white-space: pre-wrap;">{text}</div>
</body>
</html>"""
            mime_type = 'text/html'
            filename += '.html'
        
        else:
            return jsonify({
                'success': False,
                'error': f'不支持的格式: {format_type}'
            }), 400
        
        # 保存导出文件
        ensure_history_dir()
        export_dir = os.path.join(CONFIG['history_dir'], 'exports')
        if not os.path.exists(export_dir):
            os.makedirs(export_dir)
        
        export_path = os.path.join(export_dir, filename)
        with open(export_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'format': format_type,
            'mime_type': mime_type,
            'content': content,
            'download_url': f'/download/{filename}'
        })
        
    except Exception as e:
        print(f"导出错误: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/download/<filename>')
def download(filename):
    """下载文件"""
    try:
        export_dir = os.path.join(CONFIG['history_dir'], 'exports')
        filepath = os.path.join(export_dir, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': '文件不存在'
            }), 404
        
        return send_file(filepath, as_attachment=True)
        
    except Exception as e:
        print(f"下载错误: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/config', methods=['GET', 'POST'])
def config():
    """获取或更新配置"""
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'config': CONFIG,
            'available': {
                'easyocr': EASYOCR_AVAILABLE,
                'paddleocr': PADDLEOCR_AVAILABLE
            }
        })
    
    elif request.method == 'POST':
        try:
            data = request.json
            for key in ['use_easyocr', 'use_paddleocr', 'use_ocrspace']:
                if key in data:
                    CONFIG[key] = bool(data[key])
            
            if 'ocrspace_api_key' in data:
                CONFIG['ocrspace_api_key'] = data['ocrspace_api_key']
            
            return jsonify({
                'success': True,
                'message': '配置已更新',
                'config': CONFIG
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

if __name__ == '__main__':
    print("=" * 50)
    print("OCR工具Python后端服务器")
    print("=" * 50)
    
    # 初始化OCR阅读器
    init_ocr_readers()
    
    # 确保历史记录目录存在
    ensure_history_dir()
    
    print(f"可用引擎:")
    print(f"  - EasyOCR: {'可用' if EASYOCR_AVAILABLE else '不可用'}")
    print(f"  - PaddleOCR: {'可用' if PADDLEOCR_AVAILABLE else '不可用'}")
    print(f"  - OCR.space API: {'启用' if CONFIG['use_ocrspace'] else '禁用'}")
    print(f"历史记录目录: {os.path.abspath(CONFIG['history_dir'])}")
    print(f"服务器地址: http://localhost:5000")
    print("=" * 50)
    
    # 启动服务器
    app.run(debug=True, host='0.0.0.0', port=5000)