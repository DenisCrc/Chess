// ============================================================
// GAME ACTIONS — Flip, reset, selection, end conditions
// ============================================================
function flipBoard() {
    isFlipped = !isFlipped;
    clearSelection();
    createBoard();
    renderPieces();
}

async function resetGame() {
    try {
        const response = await fetch('/api/reset', { method: 'POST' });
        const data = await response.json();
        syncStateFromBackend(data);
        document.getElementById('result-modal').classList.remove('visible');
        document.getElementById('promotion-modal').classList.remove('visible');
        clearSelection();
    } catch (err) {
        console.error('Failed to reset game:', err);
    }
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

// ============================================================
// SHARED MOVE EXECUTION
// ============================================================
async function executeMove(fromRow, fromCol, toRow, toCol, promotion = null) {
    const fromSq = String.fromCharCode(97 + fromCol) + (8 - fromRow);
    const toSq = String.fromCharCode(97 + toCol) + (8 - toRow);

    try {
        const response = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromSq, to: toSq, promotion: promotion })
        });

        const data = await response.json();

        if (data.status === 'promotion_required') {
            showPromotionModal(currentTurn, fromRow, fromCol, toRow, toCol);
            return 'promotion';
        }

        if (data.error) {
            console.error('Illegal move:', data.error);
            clearSelection();
            return false;
        }

        syncStateFromBackend(data);
        clearSelection();
        return true;
    } catch (err) {
        console.error('Failed to execute move:', err);
        clearSelection();
        return false;
    }
}
