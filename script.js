// ============================================================
// STATE
// ============================================================
let gameState = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const pieceSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟'
};

const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

const board = document.getElementById('chessboard');
const turnIndicator = document.getElementById('turn-indicator');
const turnDot = turnIndicator.querySelector('.turn-dot');
const turnText = turnIndicator.querySelector('.turn-text');

let currentTurn = 'white';
let selectedSquare = null;
let lastMove = null;
let isFlipped = false;
let capturedPieces = { white: [], black: [] };

let castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};

// ============================================================
// BOARD CREATION & RENDERING
// ============================================================
function createBoard() {
    board.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        let row = isFlipped ? 7 - r : r;
        for (let c = 0; c < 8; c++) {
            let col = isFlipped ? 7 - c : c;
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((row + col) % 2 === 0 ? 'white-sq' : 'black-sq');
            square.dataset.row = row;
            square.dataset.col = col;
            board.appendChild(square);
        }
    }
    updateLabels();
}

function updateLabels() {
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['8','7','6','5','4','3','2','1'];
    const fileEls = document.querySelectorAll('.file-labels span');
    const rankEls = document.querySelectorAll('#rank-labels-left span');
    
    fileEls.forEach((el, i) => {
        const idx = i % 8;
        el.textContent = isFlipped ? files[7 - idx] : files[idx];
    });
    rankEls.forEach((el, i) => {
        el.textContent = isFlipped ? ranks[7 - i] : ranks[i];
    });
}

function renderPieces() {
    // Clear highlights
    document.querySelectorAll('.last-move').forEach(el => el.classList.remove('last-move'));
    document.querySelectorAll('.in-check').forEach(el => el.classList.remove('in-check'));
    document.querySelectorAll('.valid-move, .valid-capture').forEach(el => {
        el.classList.remove('valid-move', 'valid-capture');
    });

    // Last move highlight
    if (lastMove) {
        getSquareEl(lastMove.fromRow, lastMove.fromCol)?.classList.add('last-move');
        getSquareEl(lastMove.toRow, lastMove.toCol)?.classList.add('last-move');
    }

    // Check highlight
    if (isKingInCheck(currentTurn)) {
        const kingChar = currentTurn === 'white' ? 'K' : 'k';
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (gameState[r][c] === kingChar)
                    getSquareEl(r, c)?.classList.add('in-check');
    }

    // Pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const el = getSquareEl(row, col);
            if (!el) continue;
            const piece = gameState[row][col];
            if (piece) {
                const colorClass = piece === piece.toUpperCase() ? 'white-piece' : 'black-piece';
                el.innerHTML = `<span class="piece ${colorClass}">${pieceSymbols[piece]}</span>`;
            } else {
                el.innerHTML = '';
            }
        }
    }

    updatePlayerBars();
    updateTurnIndicator();
}

function getSquareEl(row, col) {
    return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

function showValidMoves(fromRow, fromCol) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(fromRow, fromCol, r, c) && simulatesToSafe(fromRow, fromCol, r, c)) {
                const el = getSquareEl(r, c);
                if (!el) continue;
                el.classList.add(gameState[r][c] !== '' ? 'valid-capture' : 'valid-move');
            }
        }
    }
}

function clearValidMoves() {
    document.querySelectorAll('.valid-move, .valid-capture').forEach(el => {
        el.classList.remove('valid-move', 'valid-capture');
    });
}

// ============================================================
// UI UPDATES
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
// PIECE LOGIC
// ============================================================
function getPieceColor(piece) {
    if (piece === '') return null;
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    while (currentRow !== toRow || currentCol !== toCol) {
        if (gameState[currentRow][currentCol] !== '') return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = gameState[fromRow][fromCol];
    const targetPiece = gameState[toRow][toCol];
    const color = getPieceColor(piece);
    if (color === getPieceColor(targetPiece)) return false;

    const type = piece.toLowerCase();
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    if (type === 'p') {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        if (colDiff === 0 && targetPiece === '') {
            if (rowDiff === direction) return true;
            if (fromRow === startRow && rowDiff === direction * 2 && gameState[fromRow + direction][fromCol] === '') return true;
        } else if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece !== '') return true;
        else if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece === '') {
            if (lastMove && lastMove.piece.toLowerCase() === 'p' && getPieceColor(lastMove.piece) !== color) {
                if (Math.abs(lastMove.toRow - lastMove.fromRow) === 2 && lastMove.toRow === fromRow && lastMove.toCol === toCol) return true;
            }
        }
        return false;
    }
    if (type === 'r') {
        if (rowDiff !== 0 && colDiff !== 0) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol);
    }
    if (type === 'n') {
        return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) || (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);
    }
    if (type === 'b') {
        if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol);
    }
    if (type === 'q') {
        if (rowDiff !== 0 && colDiff !== 0 && Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol);
    }
    if (type === 'k') {
        if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) return true;
        if (rowDiff === 0 && Math.abs(colDiff) === 2) {
            if (isKingInCheck(color)) return false;
            if (colDiff === 2) {
                if (!castlingRights[color].kingSide) return false;
                if (!isPathClear(fromRow, fromCol, fromRow, fromCol + 3)) return false;
                if (!simulatesToSafe(fromRow, fromCol, fromRow, fromCol + 1)) return false;
                return true;
            } else if (colDiff === -2) {
                if (!castlingRights[color].queenSide) return false;
                if (!isPathClear(fromRow, fromCol, fromRow, fromCol - 4)) return false;
                if (!simulatesToSafe(fromRow, fromCol, fromRow, fromCol - 1)) return false;
                return true;
            }
        }
        return false;
    }
    return false;
}

function isKingInCheck(color) {
    let kingRow = -1, kingCol = -1;
    const kingChar = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (gameState[r][c] === kingChar) { kingRow = r; kingCol = c; break; }
        }
        if (kingRow !== -1) break;
    }
    const opponentColor = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(gameState[r][c]) === opponentColor) {
                if (isValidMove(r, c, kingRow, kingCol)) return true;
            }
        }
    }
    return false;
}

function simulatesToSafe(fromRow, fromCol, toRow, toCol) {
    const movingPiece = gameState[fromRow][fromCol];
    const targetPiece = gameState[toRow][toCol];
    const color = getPieceColor(movingPiece);
    let epCapturedPiece = '', epRow = -1, epCol = -1;
    if (movingPiece.toLowerCase() === 'p' && fromCol !== toCol && targetPiece === '') {
        epRow = fromRow; epCol = toCol;
        epCapturedPiece = gameState[epRow][epCol];
        gameState[epRow][epCol] = '';
    }
    gameState[toRow][toCol] = movingPiece;
    gameState[fromRow][fromCol] = '';
    const safe = !isKingInCheck(color);
    gameState[fromRow][fromCol] = movingPiece;
    gameState[toRow][toCol] = targetPiece;
    if (epRow !== -1) gameState[epRow][epCol] = epCapturedPiece;
    return safe;
}

function isCheckmate(color) {
    if (!isKingInCheck(color)) return false;
    return !hasLegalMoves(color);
}

function isStalemate(color) {
    if (isKingInCheck(color)) return false;
    return !hasLegalMoves(color);
}

function hasLegalMoves(color) {
    for (let fromR = 0; fromR < 8; fromR++) {
        for (let fromC = 0; fromC < 8; fromC++) {
            if (getPieceColor(gameState[fromR][fromC]) === color) {
                for (let toR = 0; toR < 8; toR++) {
                    for (let toC = 0; toC < 8; toC++) {
                        if (isValidMove(fromR, fromC, toR, toC) && simulatesToSafe(fromR, fromC, toR, toC)) return true;
                    }
                }
            }
        }
    }
    return false;
}

// ============================================================
// PROMOTION MODAL
// ============================================================
let pendingPromotion = null;

function showPromotionModal(color, fromRow, fromCol, toRow, toCol) {
    pendingPromotion = { fromRow, fromCol, toRow, toCol };
    const modal = document.getElementById('promotion-modal');
    const choices = document.getElementById('promotion-choices');
    const pieces = color === 'white' ? ['Q','R','B','N'] : ['q','r','b','n'];
    
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

// ============================================================
// GAME ACTIONS
// ============================================================
function flipBoard() {
    isFlipped = !isFlipped;
    clearSelection();
    createBoard();
    renderPieces();
}

function resetGame() {
    gameState = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    currentTurn = 'white';
    selectedSquare = null;
    lastMove = null;
    capturedPieces = { white: [], black: [] };
    castlingRights = {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
    };
    document.getElementById('result-modal').classList.remove('visible');
    document.getElementById('promotion-modal').classList.remove('visible');
    createBoard();
    renderPieces();
}

function clearSelection() {
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    clearValidMoves();
    selectedSquare = null;
}

function checkEndConditions() {
    setTimeout(() => {
        if (isCheckmate(currentTurn)) {
            const winner = currentTurn === 'white' ? 'Negrul' : 'Albul';
            showResultModal('Șah-Mat!', `${winner} câștigă!`, '👑');
        } else if (isStalemate(currentTurn)) {
            showResultModal('Pat!', 'Jocul s-a terminat la egalitate.', '🤝');
        } else {
            renderPieces(); // refresh check highlight
        }
    }, 60);
}

// ============================================================
// CLICK HANDLER
// ============================================================
board.addEventListener('click', function (event) {
    const target = event.target.closest('.square');
    if (!target) return;

    const row = parseInt(target.dataset.row);
    const col = parseInt(target.dataset.col);
    const clickedPiece = gameState[row][col];

    if (selectedSquare) {
        const fromRow = selectedSquare.row;
        const fromCol = selectedSquare.col;

        // Clicked same square — deselect
        if (fromRow === row && fromCol === col) {
            clearSelection();
            return;
        }

        // Clicked another own piece — re-select
        if (clickedPiece && getPieceColor(clickedPiece) === currentTurn) {
            clearSelection();
            selectedSquare = { row, col };
            target.classList.add('selected');
            showValidMoves(row, col);
            return;
        }

        // Attempt move
        if (isValidMove(fromRow, fromCol, row, col) && simulatesToSafe(fromRow, fromCol, row, col)) {
            let pieceMoving = gameState[fromRow][fromCol];
            const color = getPieceColor(pieceMoving);

            // Capture tracking
            const captured = gameState[row][col];
            if (captured) {
                const capColor = getPieceColor(captured);
                const arr = capColor === 'black' ? capturedPieces.white : capturedPieces.black;
                arr.push(captured);
                arr.sort((a, b) => pieceValues[b.toLowerCase()] - pieceValues[a.toLowerCase()]);
            }

            // Pawn promotion
            if (pieceMoving.toLowerCase() === 'p' && (row === 0 || row === 7)) {
                // Undo capture tracking (promotion modal will redo it)
                if (captured) {
                    const capColor = getPieceColor(captured);
                    const arr = capColor === 'black' ? capturedPieces.white : capturedPieces.black;
                    arr.pop();
                }
                clearSelection();
                showPromotionModal(color, fromRow, fromCol, row, col);
                return;
            }

            // En passant capture
            if (pieceMoving.toLowerCase() === 'p' && fromCol !== col && gameState[row][col] === '') {
                const epPiece = gameState[fromRow][col];
                const epColor = getPieceColor(epPiece);
                const arr = epColor === 'black' ? capturedPieces.white : capturedPieces.black;
                arr.push(epPiece);
                arr.sort((a, b) => pieceValues[b.toLowerCase()] - pieceValues[a.toLowerCase()]);
                gameState[fromRow][col] = '';
            }

            // Castling
            if (pieceMoving.toLowerCase() === 'k' && Math.abs(col - fromCol) === 2) {
                if (col > fromCol) {
                    gameState[row][col - 1] = gameState[row][col + 1];
                    gameState[row][col + 1] = '';
                } else {
                    gameState[row][col + 1] = gameState[row][col - 2];
                    gameState[row][col - 2] = '';
                }
            }

            // Update castling rights
            if (pieceMoving === 'K') { castlingRights.white.kingSide = false; castlingRights.white.queenSide = false; }
            if (pieceMoving === 'k') { castlingRights.black.kingSide = false; castlingRights.black.queenSide = false; }
            if (pieceMoving === 'R' && fromRow === 7 && fromCol === 0) castlingRights.white.queenSide = false;
            if (pieceMoving === 'R' && fromRow === 7 && fromCol === 7) castlingRights.white.kingSide = false;
            if (pieceMoving === 'r' && fromRow === 0 && fromCol === 0) castlingRights.black.queenSide = false;
            if (pieceMoving === 'r' && fromRow === 0 && fromCol === 7) castlingRights.black.kingSide = false;

            // Execute move
            gameState[row][col] = pieceMoving;
            gameState[fromRow][fromCol] = '';
            lastMove = { piece: pieceMoving, fromRow, fromCol, toRow: row, toCol: col };

            clearSelection();
            currentTurn = currentTurn === 'white' ? 'black' : 'white';
            renderPieces();
            checkEndConditions();
        } else {
            clearSelection();
        }
    } else {
        if (clickedPiece !== '' && getPieceColor(clickedPiece) === currentTurn) {
            selectedSquare = { row, col };
            target.classList.add('selected');
            showValidMoves(row, col);
        }
    }
});

// ============================================================
// INIT
// ============================================================
createBoard();
renderPieces();