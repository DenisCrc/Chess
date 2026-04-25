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

    document.getElementById('white-captures').textContent =
        capturedPieces.white.map(p => pieceSymbols[p]).join('');
    document.getElementById('black-captures').textContent =
        capturedPieces.black.map(p => pieceSymbols[p]).join('');

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
        document.getElementById('white-captures').parentElement === topBar.querySelector('.player-info')
            ? null
            : swapCaptures();
    } else {
        topName.textContent = 'Negru';
        bottomName.textContent = 'Alb';
        topAvatar.textContent = '♚';
        topAvatar.className = 'player-avatar black-avatar';
        bottomAvatar.textContent = '♔';
        bottomAvatar.className = 'player-avatar white-avatar';
    }
}

function swapCaptures() { /* handled via render */ }

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

function completePromotion(chosenPiece) {
    const { fromRow, fromCol, toRow, toCol } = pendingPromotion;
    const captured = gameState[toRow][toCol];
    if (captured) {
        const capColor = getPieceColor(captured);
        const sortedArr = capColor === 'black' ? capturedPieces.white : capturedPieces.black;
        sortedArr.push(captured);
        sortedArr.sort((a, b) => pieceValues[b.toLowerCase()] - pieceValues[a.toLowerCase()]);
    }

    gameState[toRow][toCol] = chosenPiece;
    gameState[fromRow][fromCol] = '';
    lastMove = { piece: chosenPiece, fromRow, fromCol, toRow, toCol };

    document.getElementById('promotion-modal').classList.remove('visible');
    pendingPromotion = null;

    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    clearSelection();
    renderPieces();
    checkEndConditions();
    analyzePosition();
}

// ============================================================
// RESULT MODAL
// ============================================================
function showResultModal(title, subtitle, icon) {
    document.getElementById('result-icon').textContent = icon || '♛';
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-subtitle').textContent = subtitle;
    document.getElementById('result-modal').classList.add('visible');
}
