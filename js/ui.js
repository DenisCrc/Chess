// ============================================================
// UI UPDATES — Turn indicator, player bars, modals
// ============================================================
function updateTurnIndicator() {
    turnText.textContent = currentTurn === 'white' ? 'Rândul Albului' : 'Rândul Negrului';
    turnDot.classList.toggle('black-turn', currentTurn === 'black');

    const inCheck = isKingInCheck(currentTurn);
    turnIndicator.classList.toggle('in-check-indicator', inCheck);
    if (inCheck) turnText.textContent += ' — ȘAH!';
}

function updatePlayerBars() {
    const topBar = document.getElementById('player-top');
    const bottomBar = document.getElementById('player-bottom');

    topBar.classList.toggle('active-player',
        (isFlipped ? 'white' : 'black') === currentTurn);
    bottomBar.classList.toggle('active-player',
        (isFlipped ? 'black' : 'white') === currentTurn);

    // Swap player bar labels when flipped
    const topName = topBar.querySelector('.player-name');
    const bottomName = bottomBar.querySelector('.player-name');
    const topAvatar = topBar.querySelector('.player-avatar');
    const bottomAvatar = bottomBar.querySelector('.player-avatar');

    if (isFlipped) {
        topName.textContent = 'Alb';
        bottomName.textContent = 'Negru';
        topAvatar.textContent = '♔';
        topAvatar.className = 'player-avatar white-avatar';
        bottomAvatar.textContent = '♚';
        bottomAvatar.className = 'player-avatar black-avatar';
    } else {
        topName.textContent = 'Negru';
        bottomName.textContent = 'Alb';
        topAvatar.textContent = '♚';
        topAvatar.className = 'player-avatar black-avatar';
        bottomAvatar.textContent = '♔';
        bottomAvatar.className = 'player-avatar white-avatar';
    }
}

// ============================================================
// PROMOTION MODAL
// ============================================================
let pendingPromotion = null;

function showPromotionModal(color, fromRow, fromCol, toRow, toCol) {
    pendingPromotion = { fromRow, fromCol, toRow, toCol };
    const modal = document.getElementById('promotion-modal');
    const choices = document.getElementById('promotion-choices');
    const pieces = color === 'white' ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];

    choices.innerHTML = '';
    pieces.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'promotion-choice';
        btn.textContent = pieceSymbols[p];
        btn.onclick = () => completePromotion(p);
        choices.appendChild(btn);
    });
    modal.classList.add('visible');
}

async function completePromotion(chosenPiece) {
    const { fromRow, fromCol, toRow, toCol } = pendingPromotion;
    const promoChar = chosenPiece.toLowerCase();

    // Call executeMove with promotion
    const result = await executeMove(fromRow, fromCol, toRow, toCol, promoChar);
    
    if (result === true) {
        document.getElementById('promotion-modal').classList.remove('visible');
        pendingPromotion = null;
    }
}

// ============================================================
// RESULT MODAL
// ============================================================
function showResultModal(title, subtitle, icon) {
    stopTimer();
    document.getElementById('result-icon').textContent = icon || '♛';
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-subtitle').textContent = subtitle;
    document.getElementById('result-modal').classList.add('visible');
}

// ============================================================
// TIME SELECTION & CLOCK
// ============================================================
function showTimeFormatModal() {
    // Hide result modal if open
    document.getElementById('result-modal').classList.remove('visible');
    // Reset state before choosing time
    resetGameData();
    document.getElementById('time-format-modal').classList.add('visible');
}

function selectTimeFormat(seconds) {
    initialTime = seconds;
    whiteTime = seconds;
    blackTime = seconds;
    gameStarted = false;
    isTimerActive = false;
    stopTimer();
    
    updateTimerDisplay('white', whiteTime);
    updateTimerDisplay('black', blackTime);
    
    document.getElementById('time-format-modal').classList.remove('visible');
    resetGame(); // calls API to reset board
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay(color, seconds) {
    const el = document.getElementById(`${color}-timer`);
    if (el) {
        el.textContent = formatTime(seconds);
        el.classList.toggle('low-time', seconds <= 10);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isTimerActive = true;
    timerInterval = setInterval(() => {
        if (!isTimerActive || gameOverStatus) return;

        if (currentTurn === 'white') {
            whiteTime--;
            updateTimerDisplay('white', whiteTime);
            if (whiteTime <= 0) handleTimeout('white');
        } else {
            blackTime--;
            updateTimerDisplay('black', blackTime);
            if (blackTime <= 0) handleTimeout('black');
        }
    }, 1000);
}

function stopTimer() {
    isTimerActive = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function handleTimeout(color) {
    stopTimer();
    const winner = color === 'white' ? 'Negrul' : 'Albul';
    showResultModal('Timp Expirat!', `${winner} câștigă prin timp.`, '⏰');
}

function resetGameData() {
    stopTimer();
    gameStarted = false;
}
