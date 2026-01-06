#!/usr/bin/env python3
"""
OCR工具Python后端服务器 - 增强版
支持表格结构识别和手写识别增强
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
import re
import numpy as np

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

# 尝试导入OpenCV用于表格检测
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    print("提示: OpenCV 未安装，表格检测功能受限")

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置
CONFIG = {
    'use_easyocr': True,
    'use_paddleocr': True,
    'use_ocrspace': True,
    'ocrspace_api_key': 'helloworld',  # OCR.space免费API密钥
    'history_dir': 'ocr_history',
    'max_history': 100,
    'enhance_handwriting': True,
    'detect_tables': True
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

def enhance_handwriting_text(text):
    """增强手写文本识别结果"""
    if not CONFIG['enhance_handwriting']:
        return text
    
    # 常见手写识别错误纠正
    corrections = {
        # 数字纠正
        'O': '0', 'o': '0', 'l': '1', 'I': '1', 'i': '1',
        'Z': '2', 'z': '2', 'S': '5', 's': '5',
        'B': '8', 'b': '8',
        
        # 中文常见错误
        '人': '入', '入': '人',
        '大': '太', '太': '大',
        '日': '曰', '曰': '日',
        '未': '末', '末': '未',
    }
    
    # 应用纠正
    enhanced = []
    for char in text:
        enhanced.append(corrections.get(char, char))
    
    return ''.join(enhanced)

def detect_table_structure(image):
    """检测图像中的表格结构"""
    if not OPENCV_AVAILABLE:
        return None
    
    try:
        # 转换为OpenCV格式
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 保存为临时文件
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp.name, 'JPEG')
            tmp_path = tmp.name
        
        # 读取图像
        img = cv2.imread(tmp_path)
        if img is None:
            os.unlink(tmp_path)
            return None
        
        # 转换为灰度图
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 二值化
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # 检测水平线
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        
        # 检测垂直线
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
        
        # 合并线条
        table_lines = cv2.add(horizontal_lines, vertical_lines)
        
        # 清理临时文件
        os.unlink(tmp_path)
        
        # 计算表格密度（线条像素比例）
        table_density = np.sum(table_lines > 0) / (img.shape[0] * img.shape[1])
        
        return {
            'has_table': table_density > 0.01,  # 如果线条像素超过1%，认为有表格
            'table_density': float(table_density),
            'horizontal_lines': int(np.sum(horizontal_lines > 0)),
            'vertical_lines': int(np.sum(vertical_lines > 0))
        }
        
    except Exception as e:
        print(f"表格检测错误: {e}")
        return None

def extract_table_from_text(text, table_structure=None):
    """从文本中提取表格数据"""
    lines = text.strip().split('\n')
    if not lines:
        return []
    
    # 简单的表格检测：寻找对齐的列
    table_data = []
    
    # 尝试按空格或制表符分割
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 尝试多种分隔符
        for delimiter in ['\t', '  ', '    ', '|']:
            if delimiter in line:
                cells = [cell.strip() for cell in line.split(delimiter) if cell.strip()]
                if len(cells) > 1:
                    table_data.append(cells)
                    break
        else:
            # 如果没有明显分隔符，按固定宽度分割（假设是表格）
            if len(line) > 20:  # 长行可能是表格行
                # 尝试按字符数分割
                chunks = [line[i:i+20].strip() for i in range(0, len(line), 20)]
                chunks = [chunk for chunk in chunks if chunk]
                if len(chunks) > 1:
                    table_data.append(chunks)
    
    return table_data

def ocr_with_easyocr(image, language='ch_sim', mode='text'):
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
        positions = []
        
        for detection in result:
            text = detection[1]
            confidence = detection[2]
            bbox = detection[0]
            
            texts.append(text)
            confidences.append(confidence)
            positions.append({
                'x': float(bbox[0][0]),
                'y': float(bbox[0][1]),
                'width': float(bbox[2][0] - bbox[0][0]),
                'height': float(bbox[2][1] - bbox[0][1])
            })
        
        full_text = ' '.join(texts)
        
        # 如果是手写模式，增强文本
        if mode == 'handwriting':
            full_text = enhance_handwriting_text(full_text)
        
        # 如果是表格模式，尝试提取表格
        table_data = []
        if mode == 'table' and CONFIG['detect_tables']:
            table_data = extract_table_from_text(full_text)
        
        return {
            'text': full_text,
            'confidence': sum(confidences) / len(confidences) if confidences else 0,
            'engine': 'easyocr',
            'details': result,
            'positions': positions,
            'table_data': table_data if table_data else None
        }
    except Exception as e:
        print(f"EasyOCR识别错误: {e}")
        return None

def ocr_with_paddleocr(image, language='ch', mode='text'):
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
            positions = []
            
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1]
                bbox = line[0]
                
                texts.append(text)
                confidences.append(confidence)
                positions.append({
                    'x': float(bbox[0][0]),
                    'y': float(bbox[0][1]),
                    'width': float(bbox[2][0] - bbox[0][0]),
                    'height': float(bbox[2][1] - bbox[0][1])
                })
            
            full_text = ' '.join(texts)
            
            # 如果是手写模式，增强文本
            if mode == 'handwriting':
                full_text = enhance_handwriting_text(full_text)
            
            # 如果是表格模式，尝试提取表格
            table_data = []
            if mode == 'table' and CONFIG['detect_tables']:
                table_data = extract_table_from_text(full_text)
            
            return {
                'text': full_text,
                'confidence': sum(confidences) / len(confidences) if confidences else 0,
                'engine': 'paddleocr',
                'details': result[0],
                'positions': positions,
                'table_data': table_data if table_data else None
            }
        return None
    except Exception as e:
        print(f"PaddleOCR识别错误: {e}")
        return None

def ocr_with_ocrspace(image, language='chs', mode='text'):
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
                
                # 如果是手写模式，增强文本
                if mode == 'handwriting':
                    text = enhance_handwriting_text(text)
                
                # 如果是表格模式，尝试提取表格
                table_data = []
                if mode == 'table' and CONFIG['detect_tables']:
                    table_data = extract_table_from_text(text)
                
                return {
                    'text': text.strip(),
                    'confidence': 0.9,  # OCR.space不提供置信度
                    'engine': 'ocrspace',
                    'details': parsed_results,
                    'table_data': table_data if table_data else None
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
        'name': 'OCR工具Python后端 - 增强版',
        'version': '2.0.0',
        'available_engines': {
            'easyocr': EASYOCR_AVAILABLE,
            'paddleocr': PADDLEOCR_AVAILABLE,
            'ocrspace': CONFIG['use_ocrspace']
        },
        'enhanced_features': {
            'handwriting_enhancement': CONFIG['enhance_handwriting'],
            'table_detection': CONFIG['detect_tables'] and OPENCV_AVAILABLE,
            'opencv_available': OPENCV_AVAILABLE
        },
        'endpoints': {
            '/ocr': 'POST - 执行OCR识别',
            '/history': 'GET - 获取历史记录',
            '/export': 'POST - 导出结果',
            '/health': 'GET - 健康检查',
            '/config': 'GET/POST - 配置管理'
        }
    })

@app.route('/health')
def health():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'enhanced_features': {
            'handwriting_enhancement': CONFIG['enhance_handwriting'],
            'table_detection': CONFIG['detect_tables']
        }
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
        
        # 检测表格结构（如果启用）
        table_structure = None
        if mode == 'table' and CONFIG['detect_tables']:
            table_structure = detect_table_structure(image)
        
        results = []
        
        # 根据偏好选择引擎
        if engine_preference == 'auto' or engine_preference == 'easyocr':
            if CONFIG['use_easyocr'] and EASYOCR_AVAILABLE:
                result = ocr_with_easyocr(image, language, mode)
                if result:
                    results.append(result)
        
        if engine_preference == 'auto' or engine_preference == 'paddleocr':
            if CONFIG['use_paddleocr'] and PADDLEOCR_AVAILABLE:
                result = ocr_with_paddleocr(image, language, mode)
                if result:
                    results.append(result)
        
        if engine_preference == 'auto' or engine_preference == 'ocrspace':
            if CONFIG['use_ocrspace']:
                result = ocr_with_ocrspace(image, language, mode)
                if result:
                    results.append(result)
        
        if not results:
            return jsonify({
                'success': False,
                'error': '所有OCR引擎都失败了'
            }), 500
        
        # 选择最佳结果（基于置信度）
        best_result = max(results, key=lambda x: x['confidence'])
        
        # 添加表格结构信息
        if table_structure:
            best_result['table_structure'] = table_structure
        
        # 保存到历史记录
        history_entry = {
            'timestamp': datetime.now().isoformat(),
            'language': language,
            'mode': mode,
            'engine': best_result['engine'],
            'confidence': best_result['confidence'],
            'text': best_result['text'],
            'has_table_data': best_result.get('table_data') is not None,
            'table_structure': table_structure,
            'all_results': results
        }
        save_to_history(history_entry)
        
        response_data = {
            'success': True,
            'text': best_result['text'],
            'confidence': best_result['confidence'],
            'engine': best_result['engine'],
            'all_engines': [r['engine'] for r in results],
            'timestamp': datetime.now().isoformat(),
            'enhanced': True
        }
        
        # 添加表格数据（如果有）
        if best_result.get('table_data'):
            response_data['table_data'] = best_result['table_data']
            response_data['has_table'] = True
        
        # 添加表格结构信息（如果有）
        if table_structure:
            response_data['table_structure'] = table_structure
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"OCR处理错误: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 其他路由保持不变（/history, /export, /download, /config）

if __name__ == '__main__':
    print("=" * 50)
    print("OCR工具Python后端服务器 - 增强版")
    print("=" * 50)
    
    # 初始化OCR阅读器
    init_ocr_readers()
    
    # 确保历史记录目录存在
    ensure_history_dir()
    
    print(f"可用引擎:")
    print(f"  - EasyOCR: {'可用' if EASYOCR_AVAILABLE else '不可用'}")
    print(f"  - PaddleOCR: {'可用' if PADDLEOCR_AVAILABLE else '不可用'}")
    print(f"  - OCR.space API: {'启用' if CONFIG['use_ocrspace'] else '禁用'}")
    print(f"增强功能:")
    print(f"  - 手写识别增强: {'启用' if CONFIG['enhance_handwriting'] else '禁用'}")
    print(f"  - 表格检测: {'启用' if CONFIG['detect_tables'] else '禁用'}")
    print(f"  - OpenCV: {'可用' if OPENCV_AVAILABLE else '不可用'}")
    print(f"历史记录目录: {os.path.abspath(CONFIG['history_dir'])}")
    print(f"服务器地址: http://localhost:5000")
    print("=" * 50)
    
    # 启动服务器
    app.run(debug=True, host='0.0.0.0', port=5000)