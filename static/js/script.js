let isDrawing = false;
let animationTimer = null;
let startTime = null;
let timerDisplay = null;

function startDraw() {
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
    
    if (drawCount > participants.length) {
        alert(`抽奖人数(${drawCount})不能大于参与人数(${participants.length})`);
        return;
    }

    if (isDrawing) {
        return;
    }

    isDrawing = true;
    startTime = Date.now();
    drawButton.style.display = 'none';
    
    // 添加计时器显示
    timerDisplay = document.createElement('div');
    timerDisplay.className = 'timer';
    document.querySelector('.button-container').appendChild(timerDisplay);

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    
    // 显示停止按钮
    const stopButton = document.createElement('button');
    stopButton.id = 'stopButton';
    stopButton.textContent = '停止抽奖';
    stopButton.onclick = stopDraw;
    document.querySelector('.button-container').appendChild(stopButton);

    // 添加drawing类到输入区域
    document.querySelector('.input-section').classList.add('drawing');

    // 开始动画和计时器
    startAnimation(participants, drawCount);
    updateTimer();
}

function updateTimer() {
    if (!isDrawing) return;
    
    const elapsed = Date.now() - startTime;
    const ms = elapsed % 1000;
    const seconds = Math.floor(elapsed / 1000);
    
    if (timerDisplay) {
        timerDisplay.textContent = `${seconds}.${ms.toString().padStart(3, '0')}s`;
    }
    
    requestAnimationFrame(updateTimer);
}

function startAnimation(participants, drawCount) {
    const resultDiv = document.getElementById('result');
    
    animationTimer = setInterval(() => {
        const displayNames = [];
        for (let i = 0; i < drawCount; i++) {
            const index = Math.floor(Math.random() * participants.length);
            displayNames.push(participants[index]);
        }

        resultDiv.innerHTML = `
            <div class="rolling">
                抽奖中...<br>
                ${displayNames.map(name => `<div class="rolling-name">${name}</div>`).join('')}
            </div>
        `;
    }, 50);
}

function stopDraw() {
    if (!isDrawing) return;
    
    const finalTime = Date.now() - startTime;
    
    // 清除动画和计时器
    clearInterval(animationTimer);
    
    // 使用最终时间进行抽奖请求
    const drawRequest = {
        count: parseInt(document.getElementById('drawCount').value),
        players: document.getElementById('participants').value
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0),
        elapsedTime: finalTime  // 添加抽奖时长
    };

    fetch('/api/draw', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(drawRequest)
    })
    .then(response => response.json())
    .then(data => {
        // 显示最终结果
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <div class="winner">
                <h3>🎉 中奖名单 🎉</h3>
                ${data.winners.map(winner => `
                    <div class="winner-name">
                        <span class="winner-icon">🌟</span>
                        ${winner}
                    </div>
                `).join('')}
                <div class="seed">随机种子: ${data.seed}</div>
                <div class="timer">抽奖时长: ${(finalTime/1000).toFixed(3)}秒</div>
                <button id="resetButton" onclick="resetDraw()" class="reset-button">重新抽奖</button>
            </div>
        `;

        // 移除drawing类
        document.querySelector('.input-section').classList.remove('drawing');
        document.querySelector('.input-section').style.display = 'none';

        // 移除停止按钮和计时器显示
        const stopButton = document.getElementById('stopButton');
        if (stopButton) {
            stopButton.remove();
        }
        if (timerDisplay) {
            timerDisplay.remove();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('抽奖失败，请重试');
        resetDraw();
    });

    isDrawing = false;
    startTime = null;
}

function resetDraw() {
    const inputSection = document.querySelector('.input-section');
    const drawButton = document.getElementById('drawButton');
    const stopButton = document.getElementById('stopButton');
    
    if (animationTimer) {
        clearInterval(animationTimer);
        animationTimer = null;
    }
    
    if (timerDisplay) {
        timerDisplay.remove();
        timerDisplay = null;
    }
    
    inputSection.style.display = 'block';
    inputSection.classList.remove('drawing');
    
    drawButton.style.display = 'block';
    if (stopButton) {
        stopButton.remove();
    }
    
    document.getElementById('result').innerHTML = '';
    isDrawing = false;
    startTime = null;
}

document.addEventListener('DOMContentLoaded', () => {
    const drawButton = document.getElementById('drawButton');
    if (drawButton) {
        drawButton.addEventListener('click', startDraw);
    }
});