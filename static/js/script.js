let isDrawing = false;
let animationTimer = null;
let startTime = null;
let timerDisplay = null;
let shuffleCount = 0;
const TOTAL_SHUFFLES = 3;

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化事件监听器');
    const drawButton = document.getElementById('drawButton');
    if (drawButton) {
        drawButton.onclick = startDraw;
        console.log('已绑定抽奖按钮点击事件');
    }
});

function startDraw() {
    console.log('开始抽奖');
    const participantsText = document.getElementById('participants').value;
    const drawCount = parseInt(document.getElementById('drawCount').value);
    const drawButton = document.getElementById('drawButton');
    
    if (!participantsText || !drawCount) {
        alert('请输入参与者名单和抽奖人数');
        return;
    }

    const participants = participantsText
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    console.log(`参与者数量: ${participants.length}, 抽奖人数: ${drawCount}`);
    
    if (drawCount > participants.length) {
        alert(`抽奖人数(${drawCount})不能大于参与人数(${participants.length})`);
        return;
    }

    if (isDrawing) return;

    isDrawing = true;
    startTime = Date.now();
    shuffleCount = 0;
    
    // 准备结果区域（提前准备UI）
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="cards-container" id="cardsContainer"></div>
        <div class="shuffle-progress">
            <div class="shuffle-progress-bar" id="shuffleProgress"></div>
        </div>
        <div class="shuffle-status" id="shuffleStatus">正在洗牌...</div>
    `;
    resultDiv.style.display = 'block';
    resultDiv.classList.add('show');
    
    // 立即开始显示卡片
    const container = document.getElementById('cardsContainer');
    participants.forEach((name, index) => {
        const card = createCard(name, index, participants.length);
        container.appendChild(card);
    });
    
    // 使用requestAnimationFrame来确保UI更新后再进行下一步
    requestAnimationFrame(() => {
        // 隐藏抽奖按钮，显示停止按钮
        drawButton.style.display = 'none';
        
        // 添加计时器显示
        timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer';
        document.querySelector('.button-container').appendChild(timerDisplay);
        
        // 显示停止按钮
        const stopButton = document.createElement('button');
        stopButton.id = 'stopButton';
        stopButton.textContent = '停止抽奖';
        stopButton.onclick = stopDraw;
        document.querySelector('.button-container').appendChild(stopButton);
        
        // 添加drawing类到输入区域
        document.querySelector('.input-section').classList.add('drawing');
        
        // 开始洗牌动画
        console.log('开始洗牌动画');
        startShuffleAnimation(participants, drawCount);
        updateTimer();
    });
}

function createCard(name, index, total) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-content">
            <div class="card-number">#${(index + 1).toString().padStart(2, '0')}</div>
            <div class="card-name">${name}</div>
        </div>
    `;
    return card;
}

function startShuffleAnimation(participants, drawCount) {
    console.log(`开始第 ${shuffleCount + 1} 轮洗牌`);
    
    const container = document.getElementById('cardsContainer');
    const progressBar = document.getElementById('shuffleProgress');
    const statusText = document.getElementById('shuffleStatus');
    
    if (!container || !progressBar || !statusText) {
        console.error('找不到必要的DOM元素');
        return;
    }
    
    // 更新进度条
    const progress = ((shuffleCount + 1) / TOTAL_SHUFFLES) * 100;
    progressBar.style.width = `${progress}%`;
    
    // 获取现有卡片
    const cards = Array.from(container.getElementsByClassName('card'));
    
    // 立即开始洗牌动画
    cards.forEach((card, index) => {
        if (index % 2 === 0) {
            card.classList.add('shuffle-left');
        } else {
            card.classList.add('shuffle-right');
        }
    });
    
    // 减少延迟时间
    setTimeout(() => {
        cards.forEach(card => {
            card.classList.remove('shuffle-left', 'shuffle-right');
            card.classList.add('combine');
        });
        
        setTimeout(() => {
            shuffleCount++;
            if (shuffleCount < TOTAL_SHUFFLES) {
                startShuffleAnimation(participants, drawCount);
            } else {
                startAnimation(participants, drawCount);
            }
        }, 400); // 减少等待时间
    }, 400); // 减少等待时间
}

function startAnimation(participants, drawCount) {
    console.log('开始抽奖动画');
    const container = document.getElementById('cardsContainer');
    const statusText = document.getElementById('shuffleStatus');
    const result = document.getElementById('result');
    
    if (!container || !statusText || !result) {
        console.error('找不到必要的DOM元素');
        return;
    }
    
    // 确保结果区域可见
    result.classList.add('show');
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建初始卡片
    const displayNames = [];
    for (let i = 0; i < drawCount; i++) {
        const index = Math.floor(Math.random() * participants.length);
        displayNames.push(participants[index]);
    }
    
    // 创建并添加卡片，使用setTimeout确保DOM更新和动画正确触发
    displayNames.forEach((name, index) => {
        const card = createCard(name, index, drawCount);
        container.appendChild(card);
        
        // 使用setTimeout确保DOM更新后再添加动画类
        setTimeout(() => {
            card.classList.add('deal');
            console.log(`添加deal类到卡片 ${index}`);
        }, 50 * index); // 错开每张卡片的动画时间
    });
    
    statusText.textContent = '抽奖中...';
    
    // 设置动画循环
    animationTimer = setInterval(() => {
        // 更新卡片内容
        const cards = container.querySelectorAll('.card');
        displayNames.forEach((_, index) => {
            const newIndex = Math.floor(Math.random() * participants.length);
            const newName = participants[newIndex];
            displayNames[index] = newName;
            
            if (cards[index]) {
                const nameElement = cards[index].querySelector('.card-name');
                if (nameElement) {
                    nameElement.textContent = newName;
                }
            }
        });
    }, 100);
}

function updateTimer() {
    if (!isDrawing || !timerDisplay) return;
    
    const elapsed = Date.now() - startTime;
    const ms = elapsed % 1000;
    const seconds = Math.floor(elapsed / 1000);
    
    timerDisplay.textContent = `${seconds}.${ms.toString().padStart(3, '0')}s`;
    requestAnimationFrame(updateTimer);
}

function stopDraw() {
    console.log('停止抽奖');
    if (!isDrawing) return;
    
    isDrawing = false;
    const resultDiv = document.getElementById('result');
    const participants = document.getElementById('participants').value
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    const drawCount = parseInt(document.getElementById('drawCount').value);
    
    // 移除计时器显示
    if (timerDisplay) {
        timerDisplay.remove();
        timerDisplay = null;
    }
    
    // 清除动画
    if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
    }
    
    // 显示最终结果
    const winners = [];
    for (let i = 0; i < drawCount; i++) {
        const index = Math.floor(Math.random() * participants.length);
        winners.push(participants.splice(index, 1)[0]);
    }
    
    const endTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    resultDiv.innerHTML = `
        <div class="winner-section">
            <h2>抽奖结果</h2>
            <div class="timer">用时：${endTime}秒</div>
            <div class="cards-container">
                ${winners.map((name, index) => `
                    <div class="card">
                        <div class="card-content">
                            <div class="card-number">#${(index + 1).toString().padStart(2, '0')}</div>
                            <div class="card-name">${name}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="participant-list">
                <h3>参与者名单</h3>
                <div class="participant-grid">
                    ${participants.map(name => `<div class="participant-item">${name}</div>`).join('')}
                </div>
            </div>
            <div class="seed-info">
                <small>随机种子：${new Date().toISOString()}</small>
            </div>
        </div>
    `;
    resultDiv.classList.add('show');
    
    // 移除停止按钮
    const stopButton = document.getElementById('stopButton');
    if (stopButton) {
        stopButton.remove();
    }
    
    // 显示重置按钮
    const resetButton = document.createElement('button');
    resetButton.id = 'resetButton';
    resetButton.className = 'primary-button';
    resetButton.textContent = '重新抽奖';
    resetButton.onclick = resetDraw;
    resetButton.style.marginTop = '10px';
    document.querySelector('.button-container').appendChild(resetButton);
}

function resetDraw() {
    isDrawing = false;
    
    // 移除drawing类
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
        inputSection.classList.remove('drawing');
    }
    
    // 显示抽奖按钮
    const drawButton = document.getElementById('drawButton');
    if (drawButton) {
        drawButton.style.display = 'block';
    }
    
    // 移除重置按钮
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.remove();
    }
    
    // 清空结果区域
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.innerHTML = '';
        resultDiv.classList.remove('show');
    }
    
    // 移除计时器显示
    if (timerDisplay) {
        timerDisplay.remove();
        timerDisplay = null;
    }
    
    // 清除任何可能的动画计时器
    if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
    }
    
    // 重置其他状态
    startTime = null;
    shuffleCount = 0;
}

// 文件导入相关函数
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const names = processImportedText(text, file.name);
        if (names.length > 0) {
            const textarea = document.getElementById('participants');
            textarea.value = names.join('\n');
            showNotification(`成功导入 ${names.length} 个名字`, 'success');
        }
    };
    reader.onerror = function() {
        showNotification('文件读取失败，请重试', 'error');
    };
    reader.readAsText(file);
}

function processImportedText(text, filename) {
    // 移除 BOM 标记
    text = text.replace(/^\uFEFF/, '');
    
    let names;
    if (filename.endsWith('.csv')) {
        // CSV 文件处理
        names = text.split(/[\r\n]+/)
            .map(line => line.split(',')[0]) // 取第一列作为名字
            .map(name => name.trim())
            .filter(name => name.length > 0);
    } else {
        // 普通文本文件处理
        names = text.split(/[\r\n]+/)
            .map(name => name.trim())
            .filter(name => name.length > 0);
    }
    
    // 去重
    return [...new Set(names)];
}

function clearParticipants() {
    const textarea = document.getElementById('participants');
    if (textarea.value && !confirm('确定要清空当前名单吗？')) {
        return;
    }
    textarea.value = '';
    textarea.focus();
}

document.addEventListener('DOMContentLoaded', () => {
    const drawButton = document.getElementById('drawButton');
    if (drawButton) {
        drawButton.addEventListener('click', startDraw);
    }
    
    // 添加输入验证
    const drawCount = document.getElementById('drawCount');
    if (drawCount) {
        drawCount.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value < 1) {
                e.target.value = 1;
            }
        });
    }
    
    // 文件导入相关事件监听
    const fileInput = document.getElementById('fileInput');
    const importBtn = document.getElementById('importBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    if (fileInput && importBtn) {
        fileInput.addEventListener('change', handleFileSelect);
        importBtn.addEventListener('click', () => fileInput.click());
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearParticipants);
    }
});