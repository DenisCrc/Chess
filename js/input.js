// ============================================================
// CLICK HANDLER (Analysis — both colors playable)
// ============================================================
board.addEventListener('click', async function (event) {
    if (isDragging) return;
    if (isViewingHistory()) return; // block interaction when browsing history
    const target = event.target.closest('.square');
    if (!target) return;

    const row = parseInt(target.dataset.row);
    const col = parseInt(target.dataset.col);
    const clickedPiece = gameState[row][col];

    if (selectedSquare) {
        const fromRow = selectedSquare.row;
        const fromCol = selectedSquare.col;

        if (fromRow === row && fromCol === col) {
            clearSelection();
            return;
        }

        if (clickedPiece && getPieceColor(clickedPiece) === currentTurn) {
            clearSelection();
            selectedSquare = { row, col };
            target.classList.add('selected');
            showValidMoves(row, col);
            return;
        }

        const result = await executeMove(fromRow, fromCol, row, col);
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
// DRAG AND DROP (Analysis)
// ============================================================
let isDragging = false;
let dragFrom = null;

board.addEventListener('dragstart', function (event) {
    if (isViewingHistory()) { event.preventDefault(); return; } // block when browsing history
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

    clearSelection();
    selectedSquare = { row, col };
    square.classList.add('selected');
    showValidMoves(row, col);

    const pieceEl = square.querySelector('.piece');
    if (pieceEl) {
        const ghost = pieceEl.cloneNode(true);
        ghost.classList.add('drag-ghost');
        document.body.appendChild(ghost);
        event.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
        requestAnimationFrame(() => ghost.remove());
    }

    event.dataTransfer.effectAllowed = 'move';
    square.classList.add('dragging-source');
});

board.addEventListener('dragover', function (event) {
    if (!dragFrom) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

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

board.addEventListener('drop', async function (event) {
    event.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

    if (!dragFrom) return;

    const square = event.target.closest('.square');
    if (!square) return;

    const toRow = parseInt(square.dataset.row);
    const toCol = parseInt(square.dataset.col);

    if (dragFrom.row === toRow && dragFrom.col === toCol) {
        return;
    }

    await executeMove(dragFrom.row, dragFrom.col, toRow, toCol);
});

board.addEventListener('dragend', function (event) {
    document.querySelectorAll('.dragging-source').forEach(el => el.classList.remove('dragging-source'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    clearSelection();
    dragFrom = null;
    setTimeout(() => { isDragging = false; }, 0);
});

// ============================================================
// KEYBOARD NAVIGATION (Arrow keys for history playback)
// ============================================================
document.addEventListener('keydown', function (event) {
    // Only on analysis page
    if (typeof navigatePrev === 'undefined') return;

    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault();
            navigatePrev();
            break;
        case 'ArrowRight':
            event.preventDefault();
            navigateNext();
            break;
        case 'ArrowUp':
            event.preventDefault();
            navigateStart();
            break;
        case 'ArrowDown':
            event.preventDefault();
            navigateEnd();
            break;
    }
});
