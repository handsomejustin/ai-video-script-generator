// 页面加载时恢复数据
document.addEventListener('DOMContentLoaded', () => {
    // 恢复生成按钮状态
    const savedRaw = localStorage.getItem('rawResponse');
    if (savedRaw) {
        document.getElementById('raw-response').value = savedRaw;
    }

    // 恢复各个字段
    ['title', 'opening', 'script', 'direction', 'dialogue'].forEach(id => {
        const savedValue = localStorage.getItem(id);
        if (savedValue) {
            document.getElementById(id).value = savedValue;
        }
    });
});

async function generateScript() {
    const idea = document.getElementById('idea').value;

    try {
        const btn = document.querySelector('.generate-btn');
        btn.disabled = true;
        btn.innerHTML = '生成中...';

        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'title_requirements': '要求抓人眼球，看了就想点视频',
                'opening_requirements': '前5秒如何抓人眼球？',
                'idea': idea
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        // 保存到本地存储
        const cleanResponse = data.raw_response || '';
        document.getElementById('raw-response').value = cleanResponse;
        localStorage.setItem('rawResponse', cleanResponse);

        // 清空字段并移除旧存储
        ['title', 'opening', 'script', 'direction', 'dialogue'].forEach(id => {
            document.getElementById(id).value = '';
            localStorage.removeItem(id);
        });

    } catch (error) {
        alert('生成失败: ' + error.message);
    } finally {
        const btn = document.querySelector('.generate-btn');
        btn.disabled = false;
        btn.innerHTML = '🚀 生成策划方案';
    }
}

async function extractField(fieldType) {
    const rawText = document.getElementById('raw-response').value;
    const target = document.getElementById(fieldType);
    const btn = document.querySelector(`button[onclick="extractField('${fieldType}')"]`);

    if (!rawText) {
        alert('请先生成原始内容');
        return;
    }

    try {
        target.disabled = true;
        btn.disabled = true;
        btn.classList.add('loading');

        const response = await fetch('/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                field_type: fieldType,
                raw_text: rawText
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        // 保存到本地存储并显示
        const cleanContent = data.content || '';
        target.value = cleanContent;
        localStorage.setItem(fieldType, cleanContent);
        showVisualFeedback(target, true);

    } catch (error) {
        showVisualFeedback(target, false);
        alert('提取失败: ' + error.message);
    } finally {
        target.disabled = false;
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// 新增清除本地存储功能（可选）
function clearStorage() {
    localStorage.removeItem('rawResponse');
    ['title', 'opening', 'script', 'direction', 'dialogue'].forEach(id => {
        localStorage.removeItem(id);
    });
    location.reload();
}

function showVisualFeedback(element, isSuccess) {
    element.style.borderColor = isSuccess ? '#27ae60' : '#e74c3c';
    element.style.boxShadow = `0 0 0 3px ${isSuccess ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)'}`;
    
    setTimeout(() => {
        element.style.borderColor = '#e0e0e0';
        element.style.boxShadow = 'none';
    }, 1000);
}

async function saveData() {
    const formData = {
        title: document.getElementById('title').value,
        opening: document.getElementById('opening').value,
        script: document.getElementById('script').value,
        direction: document.getElementById('direction').value,
        dialogue: document.getElementById('dialogue').value
    };

    try {
        const btn = document.querySelector('.save-btn');
        btn.disabled = true;
        btn.innerHTML = '保存中...';

        const response = await fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(formData)
        });

        const result = await response.json();
        if (result.status === 'success') {
            alert('保存成功！');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        alert('保存失败: ' + error.message);
    } finally {
        const btn = document.querySelector('.save-btn');
        btn.disabled = false;
        btn.innerHTML = '💾 保存到数据库';
    }
}

// JavaScript修改（static/script.js）
const EXTRACTION_ORDER = [
    { id: 'title', name: '标题' },
    { id: 'opening', name: '精彩前五秒' },
    { id: 'script', name: '脚本' },
    { id: 'direction', name: '导演方式' },
    { id: 'dialogue', name: '演员台词' }
];

async function autoExtractAll() {
    const rawText = document.getElementById('raw-response').value;
    const extractBtn = document.querySelector('.extract-btn');
    
    if (!rawText) {
        alert('请先生成原始内容');
        return;
    }

    try {
        // 禁用按钮并显示进度
        extractBtn.disabled = true;
        extractBtn.innerHTML = '<div class="loader"></div>  正在准备...';
        
        // 顺序执行提取
        for (let i = 0; i < EXTRACTION_ORDER.length; i++) {
            const { id, name } = EXTRACTION_ORDER[i];
            const textarea = document.getElementById(id);
            
            // 更新进度显示
            extractBtn.innerHTML = `<div class="loader"></div>  正在提取 ${name} (${i+1}/${EXTRACTION_ORDER.length})`;
            textarea.placeholder = `正在提取${name}...`;
            
            try {
                const response = await fetch('/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        field_type: id,
                        raw_text: rawText
                    })
                });
                
                const data = await response.json();
                textarea.value = data.content || '内容提取失败';
                textarea.style.borderColor = data.content ? '#27ae60' : '#e74c3c';
                
            } catch (error) {
                textarea.value = `提取错误: ${error.message}`;
                textarea.style.borderColor = '#e74c3c';
            }
        }
        
    } catch (error) {
        alert('提取流程异常: ' + error.message);
    } finally {
        // 恢复按钮状态
        extractBtn.disabled = false;
        extractBtn.innerHTML = '一键提取全部内容';
        // 2秒后重置边框颜色
        setTimeout(() => {
            EXTRACTION_ORDER.forEach(({ id }) => {
                document.getElementById(id).style.borderColor = '#e0e0e0';
            });
        }, 2000);
    }
}
