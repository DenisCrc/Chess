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
