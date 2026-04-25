// ============================================================
// PIECE LOGIC — Move validation, check detection, checkmate
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
