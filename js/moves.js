// ============================================================
// GAME ACTIONS — Flip, reset, selection, end conditions
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
    // Clear highlights
    document.querySelectorAll('.last-move, .in-check, .valid-move, .valid-capture, .dragging-source, .drag-over').forEach(el => {
        el.classList.remove('last-move', 'in-check', 'valid-move', 'valid-capture', 'dragging-source', 'drag-over');
    });
    document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
    });
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
            renderPieces();
        }
    }, 60);
}

// ============================================================
// SHARED MOVE EXECUTION
// ============================================================
function executeMove(fromRow, fromCol, toRow, toCol) {
    if (!isValidMove(fromRow, fromCol, toRow, toCol) || !simulatesToSafe(fromRow, fromCol, toRow, toCol)) {
        return false;
    }

    let pieceMoving = gameState[fromRow][fromCol];
    const color = getPieceColor(pieceMoving);

    const captured = gameState[toRow][toCol];
    if (captured) {
        const capColor = getPieceColor(captured);
        const arr = capColor === 'black' ? capturedPieces.white : capturedPieces.black;
        arr.push(captured);
        arr.sort((a, b) => pieceValues[b.toLowerCase()] - pieceValues[a.toLowerCase()]);
    }

    if (pieceMoving.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
        if (captured) {
            const capColor = getPieceColor(captured);
            const arr = capColor === 'black' ? capturedPieces.white : capturedPieces.black;
            arr.pop();
        }
        clearSelection();
        showPromotionModal(color, fromRow, fromCol, toRow, toCol);
        return 'promotion';
    }

    if (pieceMoving.toLowerCase() === 'p' && fromCol !== toCol && gameState[toRow][toCol] === '') {
        const epPiece = gameState[fromRow][toCol];
        const epColor = getPieceColor(epPiece);
        const arr = epColor === 'black' ? capturedPieces.white : capturedPieces.black;
        arr.push(epPiece);
        arr.sort((a, b) => pieceValues[b.toLowerCase()] - pieceValues[a.toLowerCase()]);
        gameState[fromRow][toCol] = '';
    }

    if (pieceMoving.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
        if (toCol > fromCol) {
            gameState[toRow][toCol - 1] = gameState[toRow][toCol + 1];
            gameState[toRow][toCol + 1] = '';
        } else {
            gameState[toRow][toCol + 1] = gameState[toRow][toCol - 2];
            gameState[toRow][toCol - 2] = '';
        }
    }

    if (pieceMoving === 'K') { castlingRights.white.kingSide = false; castlingRights.white.queenSide = false; }
    if (pieceMoving === 'k') { castlingRights.black.kingSide = false; castlingRights.black.queenSide = false; }
    if (pieceMoving === 'R' && fromRow === 7 && fromCol === 0) castlingRights.white.queenSide = false;
    if (pieceMoving === 'R' && fromRow === 7 && fromCol === 7) castlingRights.white.kingSide = false;
    if (pieceMoving === 'r' && fromRow === 0 && fromCol === 0) castlingRights.black.queenSide = false;
    if (pieceMoving === 'r' && fromRow === 0 && fromCol === 7) castlingRights.black.kingSide = false;

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
