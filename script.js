// 全局变量
let currentImage = null;
let ocrResult = null;
let tesseractWorker = null;
let appSettings = {
    autoDetectUrls: true,
    autoDetectApis: true,
    enhanceHandwriting: true,
    saveSettings: true,
    // 百度OCR API配置（直接写死）
    baiduApiKey: 'aijosotgUB7lg8E0Oaqqt9y8',
    baiduSecretKey: 'JB8fXEXlKG78tADksbaMZ6dpVUpugeY3'
};
let extractedUrls = [];

// DOM元素
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const imagePreview = document.getElementById('imagePreview');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const startOcrBtn = document.getElementById('startOcrBtn');
const languageSelect = document.getElementById('languageSelect');
const selectImageBtn = document.getElementById('selectImageBtn');
const textOutput = document.getElementById('textOutput');
const tableOutput = document.getElementById('tableOutput');
const rawOutput = document.getElementById('rawOutput');
const urlList = document.getElementById('urlList');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');
const progressPercent = document.getElementById('progressPercent');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== OCR工具初始化开始 ===');
    console.log('DOM元素检查:');
    console.log('fileInput:', fileInput ? '找到' : '未找到');
    console.log('uploadArea:', uploadArea ? '找到' : '未找到');
    console.log('imagePreview:', imagePreview ? '找到' : '未找到');
    console.log('startOcrBtn:', startOcrBtn ? '找到' : '未找到');
    console.log('selectImageBtn:', selectImageBtn ? '找到' : '未找到');
    
    loadSettings();
    initEventListeners();
    initTabSystem();
    initEngineSelection();
    updateStartButton();
    updateModeUI();
    updateHistoryList(); // 初始化历史记录显示
    
    console.log('=== OCR工具初始化完成 ===');
});

// 初始化事件监听
function initEventListeners() {
    // 文件输入变化
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖放上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
        uploadArea.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.backgroundColor = 'white';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.backgroundColor = 'white';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });
    
    // 选择图片按钮
    if (selectImageBtn) {
        selectImageBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            fileInput.click();
        });
    }
    
    // 点击上传区域（除了按钮以外的区域）
    uploadArea.addEventListener('click', (e) => {
        // 如果点击的是按钮，不处理
        if (e.target === selectImageBtn || selectImageBtn.contains(e.target)) {
            return;
        }
        fileInput.click();
    });
    
    // 开始识别按钮
    startOcrBtn.addEventListener('click', startOcr);
    
    // 语言选择变化
    languageSelect.addEventListener('change', updateStartButton);
    
    // 模式选择变化
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateStartButton();
            updateModeUI();
        });
    });
    
    // 引擎选择变化
    document.querySelectorAll('input[name="engine"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateStartButton();
            updateEngineUI();
        });
    });
    
    // API配置输入变化
    apiUrlInput.addEventListener('input', updateApiConfig);
    apiKeyInput.addEventListener('input', updateApiConfig);
}

// 初始化标签页系统
function initTabSystem() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // 更新按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新内容显示
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

// 处理图片文件
function handleImageFile(file) {
    // 检查文件类型
    if (!file.type.match('image.*')) {
        alert('请选择图片文件（JPG、PNG、BMP等格式）');
        return;
    }
    
    // 检查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过10MB');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        currentImage = e.target.result;
        console.log('图片已加载，currentImage:', currentImage ? '有值' : 'null');
        console.log('图片数据长度:', currentImage ? currentImage.length : 0);
        
        // 显示预览
        imagePreview.src = currentImage;
        imagePreview.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        console.log('图片预览已设置');
        
        // 启用开始按钮
        console.log('调用 updateStartButton...');
        updateStartButton();
    };
    
    reader.readAsDataURL(file);
}

// 更新开始按钮状态
function updateStartButton() {
    console.log('=== updateStartButton 被调用 ===');
    const hasImage = currentImage !== null;
    console.log('hasImage:', hasImage, 'currentImage:', currentImage ? '有值' : 'null');
    
    const selectedLanguage = languageSelect.value;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const engine = document.querySelector('input[name="engine"]:checked').value;
    
    let disabled = !hasImage;
    let buttonText = '开始识别';
    
    console.log('初始 disabled:', disabled);
    
    if (hasImage) {
        buttonText = `开始识别 (${getLanguageName(selectedLanguage)})`;
        
        if (mode === 'handwriting') {
            buttonText += ' - 手写识别';
        } else if (mode === 'table') {
            buttonText += ' - 表格识别';
        }
        
        if (engine === 'baidu') {
            buttonText += ' [百度OCR]';
            // 百度OCR已经有写死的API密钥，不需要检查
            console.log('百度OCR引擎，使用写死的API密钥');
        }
    }
    
    console.log('最终 disabled:', disabled);
    console.log('buttonText:', buttonText);
    console.log('startOcrBtn:', startOcrBtn ? '找到' : '未找到');
    
    if (startOcrBtn) {
        startOcrBtn.disabled = disabled;
        startOcrBtn.innerHTML = `<i class="fas fa-play"></i> ${buttonText}`;
        console.log('按钮状态已更新');
    } else {
        console.error('错误: startOcrBtn 未找到!');
    }
    
    console.log('=== updateStartButton 结束 ===');
}

// 获取语言名称
function getLanguageName(code) {
    const languages = {
        'chi_sim': '简体中文',
        'eng': '英语',
        'chi_tra': '繁体中文',
        'jpn': '日语',
        'kor': '韩语',
        'rus': '俄语',
        'fra': '法语',
        'deu': '德语',
        'spa': '西班牙语'
    };
    return languages[code] || code;
}

// 开始OCR识别
async function startOcr() {
    if (!currentImage) {
        alert('请先上传图片');
        return;
    }
    
    const language = languageSelect.value;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const engine = document.querySelector('input[name="engine"]:checked').value;
    
    // 重置结果
    resetResults();
    
    // 显示进度条
    progressSection.style.display = 'block';
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    progressStatus.textContent = '正在初始化OCR引擎...';
    
    // 禁用按钮
    startOcrBtn.disabled = true;
    
    try {
        console.log('开始OCR识别，引擎:', engine, '语言:', language, '模式:', mode);
        
        if (engine === 'local') {
            // 本地Tesseract识别
            await startLocalOcr(language, mode);
        } else if (engine === 'baidu') {
            // 百度OCR识别
            await startBaiduOcr(language, mode);
        } else if (engine === 'python') {
            // Python后端识别
            await startPythonOcr(language, mode);
        } else {
            throw new Error(`不支持的OCR引擎: ${engine}`);
        }
        
        // 启用按钮
        startOcrBtn.disabled = false;
        console.log('OCR识别完成，按钮已启用');
        
        // 3秒后隐藏进度条
        setTimeout(() => {
            progressSection.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('OCR识别错误:', error);
        handleOcrError(error);
    }
}

// 本地OCR识别
async function startLocalOcr(language, mode) {
    try {
        // 创建Tesseract worker
        tesseractWorker = await Tesseract.createWorker({
            logger: m => updateProgress(m),
            errorHandler: err => handleOcrError(err)
        });
        
        // 加载语言
        await tesseractWorker.loadLanguage(language);
        await tesseractWorker.initialize(language);
        
        // 设置识别参数
        await tesseractWorker.setParameters({
            tessedit_pageseg_mode: mode === 'table' ? Tesseract.PSM.AUTO : Tesseract.PSM.SINGLE_BLOCK,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?@#$%^&*()_+-=[]{}|\\/"\'<>~` \u4e00-\u9fff'
        });
        
        // 开始识别
        progressStatus.textContent = '正在识别图片文字...';
        const result = await tesseractWorker.recognize(currentImage);
        
        // 处理结果
        await processOcrResult(result, mode, 'local');
        
        // 更新进度完成
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
        progressStatus.textContent = '识别完成！';
        
    } catch (error) {
        throw error;
    }
}

// 云端AI识别

// 百度OCR识别
async function startBaiduOcr(language, mode) {
    console.log('开始百度OCR识别');
    
    try {
        progressStatus.textContent = '正在连接百度OCR服务...';
        
        // 获取百度API密钥
        const baiduApiKey = appSettings.baiduApiKey;
        const baiduSecretKey = appSettings.baiduSecretKey;
        
        if (!baiduApiKey || !baiduSecretKey) {
            throw new Error('百度OCR API密钥未配置');
        }
        
        // 百度OCR需要先获取access_token
        progressStatus.textContent = '正在获取百度OCR访问令牌...';
        progressFill.style.width = '20%';
        progressPercent.textContent = '20%';
        
        // 获取access_token
        const tokenResponse = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${baiduApiKey}&client_secret=${baiduSecretKey}`, {
            method: 'POST'
        });
        
        if (!tokenResponse.ok) {
            throw new Error(`获取百度访问令牌失败: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        
        if (!accessToken) {
            throw new Error('获取百度访问令牌失败');
        }
        
        // 准备图片数据
        progressStatus.textContent = '正在准备图片数据...';
        progressFill.style.width = '40%';
        progressPercent.textContent = '40%';
        
        // 将base64图片转换为二进制
        const base64Data = currentImage.split(',')[1];
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // 构建百度OCR请求
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('image', blob, 'image.jpg');
        
        // 设置语言参数
        let languageParam = 'CHN_ENG';
        if (language === 'eng') languageParam = 'ENG';
        else if (language === 'jpn') languageParam = 'JAP';
        else if (language === 'kor') languageParam = 'KOR';
        
        // 发送OCR请求
        progressStatus.textContent = '正在上传图片到百度OCR...';
        progressFill.style.width = '60%';
        progressPercent.textContent = '60%';
        
        const ocrResponse = await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (!ocrResponse.ok) {
            throw new Error(`百度OCR服务错误: ${ocrResponse.status}`);
        }
        
        progressStatus.textContent = '正在处理百度OCR结果...';
        progressFill.style.width = '80%';
        progressPercent.textContent = '80%';
        
        const result = await ocrResponse.json();
        
        // 处理百度OCR结果格式
        const processedResult = {
            success: !result.error_code,
            text: result.words_result ? result.words_result.map(item => item.words).join('\n') : '',
            confidence: 0.95,
            engine: 'baidu'
        };
        
        if (result.error_code) {
            throw new Error(`百度OCR错误: ${result.error_msg}`);
        }
        
        // 处理结果
        await processOcrResult(processedResult, mode, 'baidu');
        
        // 更新进度完成
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
        progressStatus.textContent = '百度OCR识别完成！';
        
    } catch (error) {
        console.error('百度OCR识别错误:', error);
        throw error;
    }
}

// Python后端识别
async function startPythonOcr(language, mode) {
    console.log('开始Python后端OCR识别');
    
    try {
        progressStatus.textContent = '正在连接Python后端服务...';
        
        // 获取Python服务器URL
        const pythonServerUrl = document.getElementById('pythonServerUrl')?.value.trim() || 'http://localhost:5000';
        
        if (!pythonServerUrl) {
            throw new Error('请配置Python后端服务器URL');
        }
        
        // 准备请求数据
        progressStatus.textContent = '正在准备图片数据...';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';
        
        const requestData = {
            image: currentImage,
            language: language,
            mode: mode,
            enhance_handwriting: appSettings.enhanceHandwriting
        };
        
        // 发送请求
        progressStatus.textContent = '正在上传图片到Python后端...';
        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';
        
        const response = await fetch(`${pythonServerUrl}/ocr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`Python后端错误: ${response.status} ${response.statusText}`);
        }
        
        progressStatus.textContent = '正在处理Python后端结果...';
        progressFill.style.width = '70%';
        progressPercent.textContent = '70%';
        
        const result = await response.json();
        
        // 处理结果
        await processOcrResult(result, mode, 'python');
        
        // 更新进度完成
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
        progressStatus.textContent = 'Python后端识别完成！';
        
    } catch (error) {
        console.error('Python后端识别错误:', error);
        throw error;
    }
}

// 更新进度
function updateProgress(message) {
    if (message.status === 'recognizing text') {
        const progress = Math.min(100, Math.round(message.progress * 100));
        progressFill.style.width = `${progress}%`;
        progressPercent.textContent = `${progress}%`;
        
        if (progress < 30) {
            progressStatus.textContent = '正在预处理图片...';
        } else if (progress < 70) {
            progressStatus.textContent = '正在识别文字...';
        } else {
            progressStatus.textContent = '正在处理结果...';
        }
    }
}

// 处理OCR结果
async function processOcrResult(result, mode, engine) {
    ocrResult = result;
    
    // 提取文本内容
    let text = '';
    let tableData = null;
    let hasEnhancedFeatures = false;
    
    if (engine === 'local') {
        text = result.data.text;
    } else if (engine === 'cloud') {
        text = result.text || result.data?.text || '';
        // 检查是否有增强功能返回的表格数据
        if (result.table_data) {
            tableData = result.table_data;
            hasEnhancedFeatures = true;
        }
    }
    
    // 更新文本结果
    textOutput.value = text;
    
    // 更新原始数据
    rawOutput.textContent = JSON.stringify({
        engine: engine,
        language: languageSelect.options[languageSelect.selectedIndex].text,
        mode: mode,
        confidence: result.data?.confidence || result.confidence || 0,
        enhanced: result.enhanced || hasEnhancedFeatures,
        table_data: tableData,
        table_structure: result.table_structure,
        data: result.data || result
    }, null, 2);
    
    // 处理表格数据
    if (mode === 'table') {
        if (tableData) {
            // 使用API返回的表格数据
            updateTableOutput(tableData);
            showToast('表格识别完成（使用AI增强）', 'success');
        } else {
            // 使用本地提取的表格数据
            const extractedTableData = extractTableData(result.data || result);
            updateTableOutput(extractedTableData);
            if (extractedTableData.length > 0) {
                showToast('表格识别完成（基础模式）', 'info');
            } else {
                showToast('未检测到表格数据，请尝试使用AI增强模式', 'warning');
            }
        }
    }
    
    // 如果是手写模式且使用了增强功能
    if (mode === 'handwriting' && (result.enhanced || hasEnhancedFeatures)) {
        showToast('手写识别完成（使用AI增强）', 'success');
    }
    
    // 提取网址和API端点
    if (appSettings.autoDetectUrls || appSettings.autoDetectApis) {
        extractedUrls = extractUrlsAndApis(text);
        updateUrlList(extractedUrls);
    }
    
    // 显示成功消息
    if (!tableData && mode !== 'table') {
        showToast('识别完成！', 'success');
    }
}

// 提取表格数据（简单实现）
function extractTableData(ocrData) {
    const lines = ocrData.text.split('\n').filter(line => line.trim() !== '');
    const tableData = [];
    
    // 简单按行分割，假设每行用空格或制表符分隔
    lines.forEach((line, index) => {
        const cells = line.split(/\s+/).filter(cell => cell.trim() !== '');
        if (cells.length > 0) {
            tableData.push(cells);
        }
    });
    
    return tableData;
}

// 更新表格输出
function updateTableOutput(tableData) {
    const tbody = tableOutput.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (tableData.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.className = 'no-data';
        cell.textContent = '未检测到表格数据，请尝试文字识别模式';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    // 确定最大列数
    let maxCols = Math.max(...tableData.map(row => row.length));
    maxCols = Math.max(maxCols, 3); // 至少3列
    
    // 更新表头
    const thead = tableOutput.querySelector('thead tr');
    thead.innerHTML = '';
    for (let i = 0; i < maxCols; i++) {
        const th = document.createElement('th');
        th.textContent = `列${i + 1}`;
        thead.appendChild(th);
    }
    
    // 添加数据行
    tableData.forEach(rowData => {
        const row = document.createElement('tr');
        
        for (let i = 0; i < maxCols; i++) {
            const cell = document.createElement('td');
            cell.textContent = rowData[i] || '';
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    });
}

// 重置结果
function resetResults() {
    textOutput.value = '';
    rawOutput.textContent = JSON.stringify({
        "识别状态": "正在识别中...",
        "语言": languageSelect.options[languageSelect.selectedIndex].text,
        "引擎": document.querySelector('input[name="engine"]:checked').value === 'api' ? '云端AI' : '本地',
        "置信度": 0,
        "数据": {}
    }, null, 2);
    
    // 重置表格
    const tbody = tableOutput.querySelector('tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="3" class="no-data">识别表格数据将显示在这里</td>
        </tr>
    `;
    
    // 重置网址列表
    urlList.innerHTML = '<div class="no-data">识别结果中的网址和API将显示在这里</div>';
    extractedUrls = [];
}

// 处理OCR错误
function handleOcrError(error) {
    console.error('OCR识别错误:', error);
    
    progressStatus.textContent = '识别失败';
    progressFill.style.width = '100%';
    progressPercent.textContent = '错误';
    progressFill.style.background = '#e53e3e';
    
    showToast(`识别失败: ${error.message || '未知错误'}`, 'error');
    
    startOcrBtn.disabled = false;
    
    // 清理worker
    if (tesseractWorker) {
        tesseractWorker.terminate();
        tesseractWorker = null;
    }
}

// 工具函数
function copyText() {
    if (!textOutput.value.trim()) {
        showToast('没有可复制的文字', 'warning');
        return;
    }
    
    textOutput.select();
    textOutput.setSelectionRange(0, 99999);
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('文字已复制到剪贴板', 'success');
        } else {
            showToast('复制失败，请手动选择并复制', 'error');
        }
    } catch (err) {
        // 使用现代 Clipboard API
        navigator.clipboard.writeText(textOutput.value)
            .then(() => showToast('文字已复制到剪贴板', 'success'))
            .catch(() => showToast('复制失败，请手动选择并复制', 'error'));
    }
}

// 保存到历史记录
function saveToHistory() {
    if (!textOutput.value.trim()) {
        showToast('没有可保存的内容', 'warning');
        return;
    }
    
    try {
        // 获取当前时间
        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN');
        
        // 创建历史记录项
        const historyItem = {
            id: Date.now(),
            timestamp: timestamp,
            text: textOutput.value.trim(),
            image: currentImage ? currentImage.substring(0, 100) + '...' : null, // 只保存图片预览
            language: languageSelect.value,
            mode: document.querySelector('input[name="mode"]:checked').value,
            engine: document.querySelector('input[name="engine"]:checked').value
        };
        
        // 从本地存储获取现有历史记录
        let history = JSON.parse(localStorage.getItem('ocrHistory') || '[]');
        
        // 添加到历史记录
        history.unshift(historyItem); // 添加到开头
        
        // 限制历史记录数量（最多50条）
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        // 保存到本地存储
        localStorage.setItem('ocrHistory', JSON.stringify(history));
        
        // 更新历史记录显示
        updateHistoryList();
        
        showToast('已保存到历史记录', 'success');
        
    } catch (error) {
        console.error('保存历史记录错误:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

// 更新历史记录列表
function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('ocrHistory') || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="no-data">暂无历史记录</div>';
            return;
        }
        
        let html = '';
        history.forEach(item => {
            const textPreview = item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text;
            html += `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-time">${item.timestamp}</span>
                        <span class="history-info">${getLanguageName(item.language)} | ${getModeName(item.mode)} | ${getEngineName(item.engine)}</span>
                    </div>
                    <div class="history-text">${textPreview}</div>
                    <div class="history-actions">
                        <button class="btn btn-small" onclick="loadHistoryItem(${item.id})">
                            <i class="fas fa-eye"></i> 查看
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteHistoryItem(${item.id})">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
    } catch (error) {
        console.error('更新历史记录列表错误:', error);
        historyList.innerHTML = '<div class="no-data">加载历史记录失败</div>';
    }
}

// 获取模式名称
function getModeName(mode) {
    const modes = {
        'text': '文字识别',
        'table': '表格识别',
        'handwriting': '手写识别'
    };
    return modes[mode] || mode;
}

// 获取引擎名称
function getEngineName(engine) {
    const engines = {
        'local': '本地引擎',
        'baidu': '百度OCR',
        'python': 'Python后端'
    };
    return engines[engine] || engine;
}

// 加载历史记录项
function loadHistoryItem(id) {
    try {
        const history = JSON.parse(localStorage.getItem('ocrHistory') || '[]');
        const item = history.find(h => h.id === id);
        
        if (item) {
            textOutput.value = item.text;
            showToast('已加载历史记录', 'success');
            
            // 切换到文字结果标签页
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            document.querySelector('.tab-btn[data-tab="textResult"]').classList.add('active');
            document.getElementById('textResult').classList.add('active');
        }
    } catch (error) {
        console.error('加载历史记录项错误:', error);
        showToast('加载失败: ' + error.message, 'error');
    }
}

// 删除历史记录项
function deleteHistoryItem(id) {
    if (!confirm('确定要删除这条历史记录吗？')) {
        return;
    }
    
    try {
        let history = JSON.parse(localStorage.getItem('ocrHistory') || '[]');
        history = history.filter(h => h.id !== id);
        localStorage.setItem('ocrHistory', JSON.stringify(history));
        updateHistoryList();
        showToast('已删除历史记录', 'success');
    } catch (error) {
        console.error('删除历史记录项错误:', error);
        showToast('删除失败: ' + error.message, 'error');
    }
}

// 清空历史记录
function clearHistory() {
    if (!confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        localStorage.removeItem('ocrHistory');
        updateHistoryList();
        showToast('已清空历史记录', 'success');
    } catch (error) {
        console.error('清空历史记录错误:', error);
        showToast('清空失败: ' + error.message, 'error');
    }
}

// 导出历史记录
function exportHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('ocrHistory') || '[]');
        
        if (history.length === 0) {
            showToast('没有可导出的历史记录', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ocr_history_${new Date().getTime()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('历史记录已导出为JSON文件', 'success');
    } catch (error) {
        console.error('导出历史记录错误:', error);
        showToast('导出失败: ' + error.message, 'error');
    }
}

function downloadText() {
    if (!textOutput.value.trim()) {
        showToast('没有可下载的内容', 'warning');
        return;
    }
    
    const blob = new Blob([textOutput.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr_result_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('文件下载中...', 'success');
}

function clearText() {
    if (!textOutput.value.trim()) {
        return;
    }
    
    if (confirm('确定要清空所有识别结果吗？')) {
        textOutput.value = '';
        showToast('已清空文字结果', 'info');
    }
}

function exportTable() {
    const rows = tableOutput.querySelectorAll('tbody tr');
    if (rows.length === 0 || (rows.length === 1 && rows[0].querySelector('.no-data'))) {
        showToast('没有表格数据可导出', 'warning');
        return;
    }
    
    let csvContent = '';
    const headers = Array.from(tableOutput.querySelectorAll('thead th'))
        .map(th => `"${th.textContent}"`)
        .join(',');
    csvContent += headers + '\n';
    
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'))
            .map(td => `"${td.textContent}"`)
            .join(',');
        csvContent += cells + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr_table_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('表格已导出为CSV文件', 'success');
}

// 导出文本到不同格式
function exportText(format) {
    const text = textOutput.value.trim();
    if (!text) {
        showToast('没有可导出的文字', 'warning');
        return;
    }
    
    let content = '';
    let mimeType = '';
    let filename = `ocr_result_${new Date().getTime()}`;
    
    switch(format) {
        case 'txt':
            content = text;
            mimeType = 'text/plain;charset=utf-8';
            filename += '.txt';
            break;
            
        case 'json':
            content = JSON.stringify({
                text: text,
                timestamp: new Date().toISOString(),
                language: languageSelect.options[languageSelect.selectedIndex].text,
                engine: document.querySelector('input[name="engine"]:checked').value
            }, null, 2);
            mimeType = 'application/json;charset=utf-8';
            filename += '.json';
            break;
            
        case 'html':
            content = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OCR识别结果</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .timestamp { color: #666; font-size: 0.9em; margin-bottom: 20px; }
        .content { white-space: pre-wrap; background: #f5f5f5; padding: 20px; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>OCR识别结果</h1>
    <div class="timestamp">生成时间: ${new Date().toLocaleString()}</div>
    <div class="content">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</body>
</html>`;
            mimeType = 'text/html;charset=utf-8';
            filename += '.html';
            break;
            
        case 'md':
            content = `# OCR识别结果

**生成时间**: ${new Date().toLocaleString()}
**语言**: ${languageSelect.options[languageSelect.selectedIndex].text}
**引擎**: ${document.querySelector('input[name="engine"]:checked').value}

## 识别内容

${text}

---
*由OCR工具生成*`;
            mimeType = 'text/markdown;charset=utf-8';
            filename += '.md';
            break;
            
        case 'docx':
        case 'pdf':
            // 简化处理：导出为HTML，用户可自行转换
            content = `<!DOCTYPE html>
<html>
<body>
    <h1>OCR识别结果</h1>
    <p>生成时间: ${new Date().toLocaleString()}</p>
    <p>语言: ${languageSelect.options[languageSelect.selectedIndex].text}</p>
    <p>引擎: ${document.querySelector('input[name="engine"]:checked').value}</p>
    <div style="white-space: pre-wrap;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</body>
</html>`;
            mimeType = 'text/html;charset=utf-8';
            filename += '.html';
            showToast(`已导出为HTML，可另存为${format.toUpperCase()}格式`, 'info');
            break;
            
        default:
            showToast(`不支持的格式: ${format}`, 'error');
            return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`已导出为${format.toUpperCase()}格式`, 'success');
}

// 显示Toast通知
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // 添加样式
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getToastColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
    
    // 添加动画关键帧
    if (!document.querySelector('#toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function getToastColor(type) {
    switch(type) {
        case 'success': return 'linear-gradient(135deg, #38b2ac 0%, #319795 100%)';
        case 'error': return 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)';
        case 'warning': return 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)';
        default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// 模态框函数
function showAbout() {
    document.getElementById('aboutModal').style.display = 'flex';
}

function showPythonSetup() {
    document.getElementById('pythonSetupModal').style.display = 'flex';
}

function closePythonSetup() {
    document.getElementById('pythonSetupModal').style.display = 'none';
}

function copyPythonCode() {
    const codeElement = document.querySelector('#pythonSetupModal pre code');
    if (codeElement) {
        navigator.clipboard.writeText(codeElement.textContent)
            .then(() => showToast('Python代码已复制到剪贴板', 'success'))
            .catch(err => showToast('复制失败: ' + err.message, 'error'));
    }
}

function closeModal() {
    document.getElementById('aboutModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('aboutModal');
    if (event.target === modal) {
        closeModal();
    }
};

// 初始化引擎选择
function initEngineSelection() {
    updateEngineUI();
}

// 更新引擎UI
function updateEngineUI() {
    const engine = document.querySelector('input[name="engine"]:checked').value;
    const baiduConfig = document.querySelector('.baidu-config');
    const pythonConfig = document.querySelector('.python-config');
    
    // 隐藏所有配置区域
    baiduConfig.style.display = 'none';
    pythonConfig.style.display = 'none';
    
    if (engine === 'baidu') {
        baiduConfig.style.display = 'block';
        // 填充百度OCR配置
        const baiduApiKeyInput = document.getElementById('baiduApiKey');
        const baiduSecretKeyInput = document.getElementById('baiduSecretKey');
        if (baiduApiKeyInput && appSettings.baiduApiKey) {
            baiduApiKeyInput.value = appSettings.baiduApiKey;
        }
        if (baiduSecretKeyInput && appSettings.baiduSecretKey) {
            baiduSecretKeyInput.value = appSettings.baiduSecretKey;
        }
    } else if (engine === 'python') {
        pythonConfig.style.display = 'block';
    }
    
    updateStartButton();
}

// 更新模式UI
function updateModeUI() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const uploadArea = document.getElementById('uploadArea');
    
    // 移除所有模式类
    uploadArea.classList.remove('handwriting-mode');
    
    if (mode === 'handwriting') {
        uploadArea.classList.add('handwriting-mode');
        uploadArea.querySelector('i').className = 'fas fa-pen-fancy';
        uploadArea.querySelector('h3').textContent = '点击或拖拽手写图片到此区域';
        uploadArea.querySelector('p').textContent = '支持手写文字图片，AI识别效果更佳';
    } else {
        uploadArea.querySelector('i').className = 'fas fa-cloud-upload-alt';
        uploadArea.querySelector('h3').textContent = '点击或拖拽图片到此区域';
        uploadArea.querySelector('p').textContent = '支持 JPG、PNG、BMP 格式，最大 10MB';
    }
}

// 更新API配置
function updateApiConfig() {
    appSettings.apiUrl = apiUrlInput.value.trim();
    appSettings.apiKey = apiKeyInput.value.trim();
    updateStartButton();
}

// 提取网址和API端点
function extractUrlsAndApis(text) {
    const urls = [];
    
    // URL正则表达式
    const urlPatterns = [
        /https?:\/\/[^\s/$.?#].[^\s]*/gi,  // HTTP/HTTPS URLs
        /www\.[^\s/$.?#].[^\s]*/gi,        // www URLs
        /[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi  // 域名
    ];
    
    // API端点模式
    const apiPatterns = [
        /api\.[^\s/$.?#].[^\s]*/gi,        // api. 开头的域名
        /\/api\/[^\s]*/gi,                 // /api/ 路径
        /\/v[0-9]+\/[^\s]*/gi,             // /v1/, /v2/ 等版本化API
        /graphql\/?/gi,                    // GraphQL端点
        /rest\/?/gi,                       // REST端点
        /json\/?/gi,                       // JSON端点
        /soap\/?/gi,                       // SOAP端点
        /webhook\/?/gi,                    // Webhook端点
        /endpoint\/?/gi,                   // 通用端点
        /[a-zA-Z0-9._-]+\.com\/api\/[^\s]*/gi  // 域名下的API
    ];
    
    // 提取URLs
    urlPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(url => {
                if (!urls.some(u => u.url === url)) {
                    urls.push({
                        url: url,
                        type: 'url',
                        source: 'url_pattern'
                    });
                }
            });
        }
    });
    
    // 提取API端点
    apiPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(api => {
                if (!urls.some(u => u.url === api)) {
                    urls.push({
                        url: api.startsWith('/') ? `https://example.com${api}` : api,
                        type: 'api',
                        source: 'api_pattern'
                    });
                }
            });
        }
    });
    
    // 去重和排序
    return urls.filter((url, index, self) =>
        index === self.findIndex((u) => u.url === url.url)
    ).sort((a, b) => a.url.localeCompare(b.url));
}

// 更新网址列表
function updateUrlList(urls) {
    if (urls.length === 0) {
        urlList.innerHTML = '<div class="no-data">未检测到网址或API端点</div>';
        return;
    }
    
    urlList.innerHTML = '';
    
    urls.forEach((item, index) => {
        const urlItem = document.createElement('div');
        urlItem.className = `url-item ${item.type}`;
        
        const typeLabel = item.type === 'api' ? 'API' : '网址';
        
        urlItem.innerHTML = `
            <div class="url-content">${item.url}</div>
            <span class="url-type">${typeLabel}</span>
            <div class="url-actions">
                <button class="url-btn" onclick="copyUrl('${item.url}')" title="复制">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="url-btn" onclick="openUrl('${item.url}')" title="打开">
                    <i class="fas fa-external-link-alt"></i>
                </button>
                ${item.type === 'api' ? `
                <button class="url-btn" onclick="testApi('${item.url}')" title="测试API">
                    <i class="fas fa-bolt"></i>
                </button>
                ` : ''}
            </div>
        `;
        
        urlList.appendChild(urlItem);
    });
}

// 网址操作函数
function copyUrl(url) {
    navigator.clipboard.writeText(url)
        .then(() => showToast('网址已复制到剪贴板', 'success'))
        .catch(() => showToast('复制失败', 'error'));
}

function openUrl(url) {
    window.open(url, '_blank');
}

function testApi(apiUrl) {
    showToast(`正在测试API: ${apiUrl}`, 'info');
    // 这里可以添加实际的API测试逻辑
}

function copyUrls() {
    if (extractedUrls.length === 0) {
        showToast('没有可复制的网址', 'warning');
        return;
    }
    
    const urlsText = extractedUrls.map(u => u.url).join('\n');
    navigator.clipboard.writeText(urlsText)
        .then(() => showToast('所有网址已复制到剪贴板', 'success'))
        .catch(() => showToast('复制失败', 'error'));
}

function openUrls() {
    if (extractedUrls.length === 0) {
        showToast('没有可打开的网址', 'warning');
        return;
    }
    
    extractedUrls.forEach(url => {
        if (url.type === 'url') {
            window.open(url.url, '_blank');
        }
    });
    
    showToast(`正在打开 ${extractedUrls.length} 个网址`, 'info');
}

function testApiEndpoints() {
    const apiEndpoints = extractedUrls.filter(u => u.type === 'api');
    if (apiEndpoints.length === 0) {
        showToast('没有可测试的API端点', 'warning');
        return;
    }
    
    showToast(`开始测试 ${apiEndpoints.length} 个API端点`, 'info');
    // 这里可以添加批量API测试逻辑
}

// 测试API连接

// 测试百度OCR连接
async function testBaiduConnection() {
    const baiduApiKey = document.getElementById('baiduApiKey')?.value.trim() || appSettings.baiduApiKey;
    const baiduSecretKey = document.getElementById('baiduSecretKey')?.value.trim() || appSettings.baiduSecretKey;
    
    if (!baiduApiKey || !baiduSecretKey) {
        showToast('请输入百度OCR API密钥', 'warning');
        return;
    }
    
    try {
        showToast('正在测试百度OCR连接...', 'info');
        
        // 测试获取access_token
        const response = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${baiduApiKey}&client_secret=${baiduSecretKey}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                showToast('百度OCR连接成功！', 'success');
            } else {
                showToast(`百度OCR连接失败: ${data.error_description || '未知错误'}`, 'error');
            }
        } else {
            showToast(`百度OCR连接失败: ${response.status}`, 'error');
        }
    } catch (error) {
        showToast(`百度OCR连接错误: ${error.message}`, 'error');
    }
}

// 测试Python后端连接
async function testPythonConnection() {
    const pythonServerUrl = document.getElementById('pythonServerUrl')?.value.trim() || 'http://localhost:5000';
    
    if (!pythonServerUrl) {
        showToast('请输入Python后端服务器URL', 'warning');
        return;
    }
    
    try {
        showToast('正在测试Python后端连接...', 'info');
        
        const response = await fetch(`${pythonServerUrl}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Python后端连接成功！', 'success');
        } else {
            showToast(`Python后端连接失败: ${response.status}`, 'error');
        }
    } catch (error) {
        showToast(`Python后端连接错误: ${error.message}`, 'error');
    }
}

// 工具函数：DataURL转Blob
function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// 设置管理函数
function showSettings() {
    // 填充设置表单
    document.getElementById('autoDetectUrls').checked = appSettings.autoDetectUrls;
    document.getElementById('autoDetectApis').checked = appSettings.autoDetectApis;
    document.getElementById('enhanceHandwriting').checked = appSettings.enhanceHandwriting;
    document.getElementById('saveSettings').checked = appSettings.saveSettings;
    
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    appSettings.autoDetectUrls = document.getElementById('autoDetectUrls').checked;
    appSettings.autoDetectApis = document.getElementById('autoDetectApis').checked;
    appSettings.enhanceHandwriting = document.getElementById('enhanceHandwriting').checked;
    appSettings.saveSettings = document.getElementById('saveSettings').checked;
    
    // 保存到本地存储
    if (appSettings.saveSettings) {
        localStorage.setItem('ocrToolSettings', JSON.stringify(appSettings));
    } else {
        localStorage.removeItem('ocrToolSettings');
    }
    
    showToast('设置已保存', 'success');
    closeSettings();
    updateStartButton();
}

function resetSettings() {
    if (confirm('确定要恢复默认设置吗？')) {
        appSettings = {
            autoDetectUrls: true,
            autoDetectApis: true,
            enhanceHandwriting: true,
            saveSettings: true,
            // 百度OCR API配置（直接写死）
            baiduApiKey: 'aijosotgUB7lg8E0Oaqqt9y8',
            baiduSecretKey: 'JB8fXEXlKG78tADksbaMZ6dpVUpugeY3'
        };
        
        localStorage.removeItem('ocrToolSettings');
        
        // 更新表单
        document.getElementById('autoDetectUrls').checked = true;
        document.getElementById('autoDetectApis').checked = true;
        document.getElementById('enhanceHandwriting').checked = true;
        document.getElementById('saveSettings').checked = true;
        
        showToast('已恢复默认设置', 'info');
    }
}

function loadSettings() {
    const savedSettings = localStorage.getItem('ocrToolSettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            appSettings = { ...appSettings, ...parsed };
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const aboutModal = document.getElementById('aboutModal');
    const settingsModal = document.getElementById('settingsModal');
    
    if (event.target === aboutModal) {
        closeModal();
    }
    if (event.target === settingsModal) {
        closeSettings();
    }
};

// 清理worker（页面卸载时）
window.addEventListener('beforeunload', () => {
    if (tesseractWorker) {
        tesseractWorker.terminate();
    }
});