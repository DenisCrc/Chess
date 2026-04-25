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
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
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
                const isDraggable = getPieceColor(piece) === currentTurn;
                el.innerHTML = `<span class="piece ${colorClass}" draggable="${isDraggable}">${pieceSymbols[piece]}</span>`;
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
    analyzePosition();
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
// SHARED MOVE EXECUTION
// ============================================================
/**
 * Attempts to execute a move. Returns true if the move was made,
 * false if the move was invalid, or 'promotion' if a promotion modal was shown.
 */
function executeMove(fromRow, fromCol, toRow, toCol) {
    if (!isValidMove(fromRow, fromCol, toRow, toCol) || !simulatesToSafe(fromRow, fromCol, toRow, toCol)) {
        return false;
    }

    let pieceMoving = gameState[fromRow][fromCol];
    const color = getPieceColor(pieceMoving);

    // Capture tracking
    const captured = gameState[toRow][toCol];
    if (captured) {
        const capColor = getPieceColor(captured);
        const arr = capColor === 'black' ? capturedPieces.white : capturedPieces.black;
        arr.push(captured);
        arr.sort((a, b) => pieceValues[b.toLowerCase()] - pieceValues[a.toLowerCase()]);
    }

    // Pawn promotion
    if (pieceMoving.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
        // Undo capture tracking (promotion modal will redo it)
        if (captured) {
            const capColor = getPieceColor(captured);
            const arr = capColor === 'black' ? capturedPieces.white : capturedPieces.black;
            arr.pop();
        }
        clearSelection();
        showPromotionModal(color, fromRow, fromCol, toRow, toCol);
        return 'promotion';
    }

    // En passant capture
    if (pieceMoving.toLowerCase() === 'p' && fromCol !== toCol && gameState[toRow][toCol] === '') {
        const epPiece = gameState[fromRow][toCol];
        const epColor = getPieceColor(epPiece);
        const arr = epColor === 'black' ? capturedPieces.white : capturedPieces.black;
        arr.push(epPiece);
        arr.sort((a, b) => pieceValues[b.toLowerCase()] - pieceValues[a.toLowerCase()]);
        gameState[fromRow][toCol] = '';
    }

    // Castling
    if (pieceMoving.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
        if (toCol > fromCol) {
            gameState[toRow][toCol - 1] = gameState[toRow][toCol + 1];
            gameState[toRow][toCol + 1] = '';
        } else {
            gameState[toRow][toCol + 1] = gameState[toRow][toCol - 2];
            gameState[toRow][toCol - 2] = '';
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
    gameState[toRow][toCol] = pieceMoving;
    gameState[fromRow][fromCol] = '';
    lastMove = { piece: pieceMoving, fromRow, fromCol, toRow, toCol };

    clearSelection();
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    renderPieces();
    checkEndConditions();
    analyzePosition();
    return true;
}

// ============================================================
// CLICK HANDLER
// ============================================================
board.addEventListener('click', function (event) {
    if (isDragging) return; // Ignore clicks that are part of a drag
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

        // Attempt move via shared function
        const result = executeMove(fromRow, fromCol, row, col);
        if (!result) {
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
// DRAG AND DROP
// ============================================================
let isDragging = false;
let dragFrom = null;

board.addEventListener('dragstart', function (event) {
    const square = event.target.closest('.square');
    if (!square) { event.preventDefault(); return; }

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = gameState[row][col];

    if (!piece || getPieceColor(piece) !== currentTurn) {
        event.preventDefault();
        return;
    }

    isDragging = true;
    dragFrom = { row, col };

    // Clear any click-based selection and show valid moves for the dragged piece
    clearSelection();
    selectedSquare = { row, col };
    square.classList.add('selected');
    showValidMoves(row, col);

    // Create a custom drag image from the piece
    const pieceEl = square.querySelector('.piece');
    if (pieceEl) {
        const ghost = pieceEl.cloneNode(true);
        ghost.classList.add('drag-ghost');
        document.body.appendChild(ghost);
        event.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
        // Remove ghost from DOM after the drag image is captured
        requestAnimationFrame(() => ghost.remove());
    }

    event.dataTransfer.effectAllowed = 'move';
    // Mark the source square as being dragged
    square.classList.add('dragging-source');
});

board.addEventListener('dragover', function (event) {
    if (!dragFrom) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Highlight the square being hovered
    const square = event.target.closest('.square');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (square) {
        square.classList.add('drag-over');
    }
});

board.addEventListener('dragleave', function (event) {
    const square = event.target.closest('.square');
    if (square) square.classList.remove('drag-over');
});

board.addEventListener('drop', function (event) {
    event.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

    if (!dragFrom) return;

    const square = event.target.closest('.square');
    if (!square) return;

    const toRow = parseInt(square.dataset.row);
    const toCol = parseInt(square.dataset.col);

    // Don't move to same square
    if (dragFrom.row === toRow && dragFrom.col === toCol) {
        return;
    }

    executeMove(dragFrom.row, dragFrom.col, toRow, toCol);
});

board.addEventListener('dragend', function (event) {
    document.querySelectorAll('.dragging-source').forEach(el => el.classList.remove('dragging-source'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    clearSelection();
    dragFrom = null;
    // Delay resetting isDragging so the click event that fires after dragend is suppressed
    setTimeout(() => { isDragging = false; }, 0);
});

// ============================================================
// STOCKFISH ENGINE INTEGRATION
// ============================================================
let stockfishWorker = null;
let engineReady = false;
let engineAnalyzing = false;
let currentAnalysis = [null, null, null, null, null];
let analysisDepth = 0;

// --- FEN Generation ---
function gameStateToFEN() {
    let fen = '';
    for (let r = 0; r < 8; r++) {
        let empty = 0;
        for (let c = 0; c < 8; c++) {
            const piece = gameState[r][c];
            if (piece === '') { empty++; }
            else {
                if (empty > 0) { fen += empty; empty = 0; }
                fen += piece;
            }
        }
        if (empty > 0) fen += empty;
        if (r < 7) fen += '/';
    }
    fen += ' ' + (currentTurn === 'white' ? 'w' : 'b');
    let castling = '';
    if (castlingRights.white.kingSide) castling += 'K';
    if (castlingRights.white.queenSide) castling += 'Q';
    if (castlingRights.black.kingSide) castling += 'k';
    if (castlingRights.black.queenSide) castling += 'q';
    fen += ' ' + (castling || '-');
    let ep = '-';
    if (lastMove && lastMove.piece.toLowerCase() === 'p' && Math.abs(lastMove.toRow - lastMove.fromRow) === 2) {
        const epRow = (lastMove.fromRow + lastMove.toRow) / 2;
        ep = String.fromCharCode(97 + lastMove.toCol) + (8 - epRow);
    }
    fen += ' ' + ep + ' 0 1';
    return fen;
}

// --- UCI to SAN conversion ---
function isPathClearOnBoard(board, fr, fc, tr, tc) {
    const rs = Math.sign(tr - fr), cs = Math.sign(tc - fc);
    let r = fr + rs, c = fc + cs;
    while (r !== tr || c !== tc) {
        if (board[r][c] !== '') return false;
        r += rs; c += cs;
    }
    return true;
}

function canReachSquare(board, fr, fc, tr, tc) {
    const type = board[fr][fc].toLowerCase();
    const rd = tr - fr, cd = tc - fc;
    if (type === 'n') return (Math.abs(rd) === 2 && Math.abs(cd) === 1) || (Math.abs(rd) === 1 && Math.abs(cd) === 2);
    if (type === 'r') return (rd === 0 || cd === 0) && isPathClearOnBoard(board, fr, fc, tr, tc);
    if (type === 'b') return Math.abs(rd) === Math.abs(cd) && rd !== 0 && isPathClearOnBoard(board, fr, fc, tr, tc);
    if (type === 'q') return ((rd === 0 || cd === 0) || (Math.abs(rd) === Math.abs(cd) && rd !== 0)) && isPathClearOnBoard(board, fr, fc, tr, tc);
    return false;
}

function applyUCIMove(board, move, turnColor) {
    const nb = board.map(row => [...row]);
    const fc = move.charCodeAt(0) - 97, fr = 8 - parseInt(move[1]);
    const tc = move.charCodeAt(2) - 97, tr = 8 - parseInt(move[3]);
    const promo = move.length > 4 ? move[4] : null;
    const piece = nb[fr][fc];
    // En passant capture
    if (piece.toLowerCase() === 'p' && fc !== tc && nb[tr][tc] === '') nb[fr][tc] = '';
    // Castling rook
    if (piece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
        if (tc > fc) { nb[tr][tc - 1] = nb[tr][7]; nb[tr][7] = ''; }
        else { nb[tr][tc + 1] = nb[tr][0]; nb[tr][0] = ''; }
    }
    nb[tr][tc] = promo ? (turnColor === 'white' ? promo.toUpperCase() : promo.toLowerCase()) : piece;
    nb[fr][fc] = '';
    return nb;
}

function uciMoveToSAN(move, board, turnColor) {
    const fc = move.charCodeAt(0) - 97, fr = 8 - parseInt(move[1]);
    const tc = move.charCodeAt(2) - 97, tr = 8 - parseInt(move[3]);
    const promo = move.length > 4 ? move[4] : null;
    const piece = board[fr][fc];
    if (!piece) return move; // fallback
    const type = piece.toLowerCase();
    const target = board[tr][tc];
    const isCapture = target !== '' || (type === 'p' && fc !== tc);

    // Castling
    if (type === 'k' && Math.abs(tc - fc) === 2) return tc > fc ? 'O-O' : 'O-O-O';

    let san = '';
    if (type === 'p') {
        if (isCapture) san += String.fromCharCode(97 + fc) + 'x';
        san += String.fromCharCode(97 + tc) + (8 - tr);
        if (promo) san += '=' + promo.toUpperCase();
    } else {
        san += type.toUpperCase();
        // Disambiguation
        let needFile = false, needRank = false;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (r === fr && c === fc) continue;
                if (board[r][c].toLowerCase() === type && getPieceColor(board[r][c]) === turnColor) {
                    if (canReachSquare(board, r, c, tr, tc)) {
                        if (c !== fc) needFile = true;
                        else needRank = true;
                    }
                }
            }
        }
        if (needFile) san += String.fromCharCode(97 + fc);
        if (needRank) san += (8 - fr);
        if (isCapture) san += 'x';
        san += String.fromCharCode(97 + tc) + (8 - tr);
    }
    return san;
}

function convertPVtoSAN(pvMoves, initialBoard, initialTurn) {
    let board = initialBoard.map(row => [...row]);
    let turn = initialTurn;
    const result = [];
    for (const m of pvMoves) {
        if (!m || m.length < 4) break;
        result.push(uciMoveToSAN(m, board, turn));
        board = applyUCIMove(board, m, turn);
        turn = turn === 'white' ? 'black' : 'white';
    }
    return result;
}

// --- Engine Status UI ---
function updateEngineStatus(state, text) {
    const el = document.getElementById('engine-status');
    if (!el) return;
    el.className = 'engine-status status--' + state;
    el.querySelector('.status-text').textContent = text;
}

function updateDepthUI(depth) {
    const el = document.getElementById('engine-depth');
    if (el) el.textContent = 'Adâncime: ' + depth;
}

// --- Analysis Panel UI ---
function renderAnalysisLines() {
    const container = document.getElementById('engine-lines');
    if (!container) return;
    container.innerHTML = '';

    const hasAny = currentAnalysis.some(l => l !== null);
    if (!hasAny) {
        for (let i = 0; i < 5; i++) {
            const line = document.createElement('div');
            line.className = 'engine-line engine-line--empty';
            line.innerHTML = '<div class="line-rank">#' + (i + 1) + '</div>'
                + '<div class="line-moves"><span class="line-placeholder">Se așteaptă analiza...</span></div>';
            container.appendChild(line);
        }
        return;
    }

    for (let i = 0; i < 5; i++) {
        const data = currentAnalysis[i];
        const line = document.createElement('div');
        line.className = 'engine-line' + (i === 0 ? ' engine-line--best' : '');

        if (!data) {
            line.classList.add('engine-line--empty');
            line.innerHTML = '<div class="line-rank">#' + (i + 1) + '</div>'
                + '<div class="line-moves"><span class="line-placeholder">—</span></div>';
        } else {
            // Eval display
            let evalText, evalClass;
            if (data.scoreMate !== null) {
                evalText = 'M' + Math.abs(data.scoreMate);
                evalClass = 'line-eval--mate';
            } else {
                const cp = data.scoreCp || 0;
                // Adjust sign: Stockfish reports from engine POV (current turn)
                const adjusted = currentTurn === 'black' ? -cp : cp;
                evalText = (adjusted >= 0 ? '+' : '') + (adjusted / 100).toFixed(2);
                evalClass = adjusted > 0 ? 'line-eval--positive' : adjusted < 0 ? 'line-eval--negative' : 'line-eval--neutral';
            }

            // Convert PV to SAN
            const sanMoves = convertPVtoSAN(data.pv, gameState, currentTurn);
            const bestMove = sanMoves[0] || data.pv[0] || '?';
            const continuation = sanMoves.slice(1, 8).join(' ');

            line.innerHTML = '<div class="line-rank">#' + (i + 1) + '</div>'
                + '<div class="line-eval ' + evalClass + '">' + evalText + '</div>'
                + '<div class="line-moves">'
                + '<span class="line-best-move">' + bestMove + '</span>'
                + (continuation ? '<span class="line-continuation">' + continuation + '</span>' : '')
                + '</div>';
        }
        container.appendChild(line);
    }
}

// --- Engine Communication ---
function initEngine() {
    updateEngineStatus('loading', 'Se încarcă...');
    try {
        const workerCode = "importScripts('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js');";
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        stockfishWorker = new Worker(URL.createObjectURL(blob));
        stockfishWorker.onmessage = onEngineMessage;
        stockfishWorker.onerror = onEngineError;
        sendEngine('uci');
    } catch (err) {
        console.error('Engine init failed:', err);
        updateEngineStatus('error', 'Motor indisponibil');
    }
}

function sendEngine(cmd) {
    if (stockfishWorker) stockfishWorker.postMessage(cmd);
}

function onEngineMessage(e) {
    const line = typeof e.data === 'string' ? e.data : '';
    if (line === 'uciok') {
        sendEngine('setoption name MultiPV value 5');
        sendEngine('isready');
    } else if (line === 'readyok') {
        engineReady = true;
        updateEngineStatus('ready', 'Pregătit');
        analyzePosition();
    } else if (line.startsWith('info') && line.includes(' pv ')) {
        parseEngineLine(line);
    } else if (line.startsWith('bestmove')) {
        engineAnalyzing = false;
        updateEngineStatus('ready', 'Complet');
    }
}

function onEngineError(err) {
    console.error('Engine error:', err);
    updateEngineStatus('error', 'Eroare motor');
}

function parseEngineLine(line) {
    const tokens = line.split(' ');
    let depth = 0, multipv = 0, scoreCp = null, scoreMate = null, pv = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === 'depth') depth = parseInt(tokens[i + 1]);
        if (tokens[i] === 'multipv') multipv = parseInt(tokens[i + 1]);
        if (tokens[i] === 'score') {
            if (tokens[i + 1] === 'cp') scoreCp = parseInt(tokens[i + 2]);
            else if (tokens[i + 1] === 'mate') scoreMate = parseInt(tokens[i + 2]);
        }
        if (tokens[i] === 'pv') { pv = tokens.slice(i + 1); break; }
    }
    if (multipv >= 1 && multipv <= 5 && pv.length > 0) {
        currentAnalysis[multipv - 1] = { depth, scoreCp, scoreMate, pv };
        if (multipv === 1) {
            analysisDepth = depth;
            updateDepthUI(depth);
        }
        renderAnalysisLines();
    }
}

function analyzePosition() {
    if (!engineReady || !stockfishWorker) return;
    sendEngine('stop');
    currentAnalysis = [null, null, null, null, null];
    analysisDepth = 0;
    renderAnalysisLines();
    updateDepthUI('—');

    // Don't analyze finished games
    if (isCheckmate(currentTurn) || isStalemate(currentTurn)) {
        updateEngineStatus('ready', 'Joc terminat');
        return;
    }

    engineAnalyzing = true;
    updateEngineStatus('analyzing', 'Analizează...');
    const fen = gameStateToFEN();
    sendEngine('position fen ' + fen);
    sendEngine('go depth 20');
}

// ============================================================
// INIT
// ============================================================
createBoard();
renderPieces();
renderAnalysisLines();
initEngine();