// ============================================================
// UI UPDATES — Turn indicator, player bars, modals (Analysis)
// ============================================================
function updateTurnIndicator() {
    if (!turnText || !turnDot) return;
    turnText.textContent = currentTurn === 'white' ? 'Rândul Albului' : 'Rândul Negrului';
    turnDot.classList.toggle('black-turn', currentTurn === 'black');

    const inCheck = isKingInCheck(currentTurn);
    if (turnIndicator) turnIndicator.classList.toggle('in-check-indicator', inCheck);
    if (inCheck && turnText) turnText.textContent += ' — ȘAH!';
}

function updatePlayerBars() {
    const topBar = document.getElementById('player-top');
    const bottomBar = document.getElementById('player-bottom');
    if (!topBar || !bottomBar) return;

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
// PROMOTION MODAL (Analysis)
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

    const result = await executeMove(fromRow, fromCol, toRow, toCol, promoChar);
    
    if (result === true) {
        document.getElementById('promotion-modal').classList.remove('visible');
        pendingPromotion = null;
    }
}
