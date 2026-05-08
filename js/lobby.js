// ============================================================
// LOBBY & PLAY — Socket.IO based multiplayer
// ============================================================
const PAGE_MODE = 'play';

const socket = io();

// ── Lobby State ──────────────────────────────────────────────
let lobbyTimeFormat = 300;
let lobbyColor = 'white';
let myColor = null;
let currentRoomId = null;
let playGameStarted = false;

// ── Piece rendering constants (duplicated for standalone page) ──
const pieceSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟'
};

let gameState = Array(8).fill(null).map(() => Array(8).fill(''));
let currentTurn = 'white';
let lastMove = null;
let isFlipped = false;
let capturedPieces = { white: [], black: [] };
let gameOverStatus = null;
let castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};
let moveHistory = [];
let selectedSquare = null;
let isDragging = false;
let dragFrom = null;


// ══════════════════════════════════════════════════════════════
// LOBBY UI
// ══════════════════════════════════════════════════════════════
function setLobbyTime(seconds) {
    lobbyTimeFormat = seconds;
    document.querySelectorAll('.lobby-time-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.time) === seconds);
    });
}

function setLobbyColor(color) {
    lobbyColor = color;
    document.querySelectorAll('.lobby-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
}

function createRoom() {
    socket.emit('create_room', {
        time_format: lobbyTimeFormat,
        color: lobbyColor,
    });
}

function joinRoom() {
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (code.length !== 4) {
        document.getElementById('join-error').textContent = 'Codul trebuie să aibă 4 caractere.';
        return;
    }
    document.getElementById('join-error').textContent = '';
    socket.emit('join_room', { room_id: code });
}

function copyRoomCode() {
    const code = currentRoomId;
    if (code) {
        navigator.clipboard.writeText(code).then(() => {
            document.getElementById('copy-hint').textContent = 'Copiat!';
            setTimeout(() => {
                document.getElementById('copy-hint').textContent = '';
            }, 2000);
        });
    }
}

function resignGame() {
    if (currentRoomId && !gameOverStatus) {
        socket.emit('resign', { room_id: currentRoomId });
    }
}

// View switching
function showView(viewId) {
    document.querySelectorAll('.lobby-view, .waiting-view, .game-view').forEach(v => {
        v.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}


// ══════════════════════════════════════════════════════════════
// SOCKET.IO EVENT HANDLERS
// ══════════════════════════════════════════════════════════════
socket.on('room_created', (data) => {
    currentRoomId = data.room_id;
    myColor = data.your_color;
    document.getElementById('room-code-display').textContent = data.room_id;
    showView('waiting-view');
});

socket.on('room_joined', (data) => {
    currentRoomId = data.room_id;
    myColor = data.your_color;
    // Will transition to game view on game_start
});

socket.on('join_error', (data) => {
    document.getElementById('join-error').textContent = data.error;
});

socket.on('game_start', (data) => {
    showView('game-view');
    
    // Flip board if we're black
    isFlipped = (myColor === 'black');
    
    // Set up player names
    setupPlayerNames();
    
    // Initialize the board
    initPlayBoard();
    
    // Apply initial state
    syncPlayState(data.state);
});

socket.on('game_update', (data) => {
    syncPlayState(data.state);
});

socket.on('timer_update', (data) => {
    updateTimerDisplay('white', data.white_time);
    updateTimerDisplay('black', data.black_time);
});

socket.on('game_over', (data) => {
    gameOverStatus = data.reason;
    showPlayResultModal(data.title, data.subtitle, data.icon);
});

socket.on('promotion_required', (data) => {
    // Show promotion modal
    pendingPlayPromotion = { from: data.from, to: data.to };
    showPlayPromotionModal();
});

socket.on('move_error', (data) => {
    console.error('Move error:', data.error);
    clearPlaySelection();
});


// ══════════════════════════════════════════════════════════════
// PLAY GAME LOGIC (self-contained, no shared imports)
// ══════════════════════════════════════════════════════════════

function setupPlayerNames() {
    const topName = document.getElementById('player-top-name');
    const bottomName = document.getElementById('player-bottom-name');
    const topBar = document.getElementById('player-top');
    const bottomBar = document.getElementById('player-bottom');
    const topAvatar = topBar.querySelector('.player-avatar');
    const bottomAvatar = bottomBar.querySelector('.player-avatar');
    
    if (myColor === 'white') {
        bottomName.textContent = 'Tu (Alb)';
        topName.textContent = 'Adversar (Negru)';
        bottomAvatar.textContent = '♔';
        bottomAvatar.className = 'player-avatar white-avatar';
        topAvatar.textContent = '♚';
        topAvatar.className = 'player-avatar black-avatar';
    } else {
        bottomName.textContent = 'Tu (Negru)';
        topName.textContent = 'Adversar (Alb)';
        bottomAvatar.textContent = '♚';
        bottomAvatar.className = 'player-avatar black-avatar';
        topAvatar.textContent = '♔';
        topAvatar.className = 'player-avatar white-avatar';
    }
}

function initPlayBoard() {
    const board = document.getElementById('chessboard');
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
    updatePlayLabels();
    setupPlayInput(board);
}

function updatePlayLabels() {
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

function syncPlayState(data) {
    const fen = data.fen;
    const parts = fen.split(' ');
    const boardPart = parts[0];
    
    gameState = Array(8).fill(null).map(() => Array(8).fill(''));
    const rows = boardPart.split('/');
    for (let r = 0; r < 8; r++) {
        let col = 0;
        for (let char of rows[r]) {
            if (isNaN(char)) {
                gameState[r][col] = char;
                col++;
            } else {
                col += parseInt(char);
            }
        }
    }

    currentTurn = data.turn;
    gameOverStatus = data.game_over;
    
    capturedPieces.white = data.captured.white;
    capturedPieces.black = data.captured.black;
    
    if (data.last_move) {
        const from = data.last_move.substring(0, 2);
        const to = data.last_move.substring(2, 4);
        lastMove = {
            fromRow: 8 - parseInt(from[1]),
            fromCol: from.charCodeAt(0) - 97,
            toRow: 8 - parseInt(to[1]),
            toCol: to.charCodeAt(0) - 97
        };
    } else {
        lastMove = null;
    }
    
    moveHistory = data.move_history || [];
    
    updateTimerDisplay('white', data.white_time);
    updateTimerDisplay('black', data.black_time);
    
    renderPlayPieces();
    renderPlayMoveHistory();
    updatePlayUI();
}

function renderPlayPieces() {
    // Clear highlights
    document.querySelectorAll('.last-move, .in-check, .valid-move, .valid-capture, .dragging-source, .drag-over').forEach(el => {
        el.classList.remove('last-move', 'in-check', 'valid-move', 'valid-capture', 'dragging-source', 'drag-over');
    });

    // Last move highlight
    if (lastMove) {
        getPlaySquareEl(lastMove.fromRow, lastMove.fromCol)?.classList.add('last-move');
        getPlaySquareEl(lastMove.toRow, lastMove.toCol)?.classList.add('last-move');
    }

    // Pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const el = getPlaySquareEl(row, col);
            if (!el) continue;
            const piece = gameState[row][col];
            if (piece) {
                const colorClass = piece === piece.toUpperCase() ? 'white-piece' : 'black-piece';
                const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
                // Only allow dragging own pieces on own turn
                const isDraggable = (pieceColor === myColor && pieceColor === currentTurn && !gameOverStatus);
                el.innerHTML = `<span class="piece ${colorClass}" draggable="${isDraggable}">${pieceSymbols[piece]}</span>`;
            } else {
                el.innerHTML = '';
            }
        }
    }
    
    updatePlayPlayerBars();
    updatePlayTurnIndicator();
}

function getPlaySquareEl(row, col) {
    return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

function updatePlayUI() {
    // Update captures
    const topCap = document.getElementById('top-captures');
    const bottomCap = document.getElementById('bottom-captures');
    
    // Bottom bar is always 'myColor'
    // Top bar is always the opponent's color
    const opponentColor = (myColor === 'white' ? 'black' : 'white');

    if (bottomCap) {
        bottomCap.innerHTML = capturedPieces[myColor].map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');
    }
    if (topCap) {
        topCap.innerHTML = capturedPieces[opponentColor].map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');
    }
}

function updatePlayTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    const dot = indicator.querySelector('.turn-dot');
    const text = indicator.querySelector('.turn-text');
    
    text.textContent = currentTurn === 'white' ? 'Rândul Albului' : 'Rândul Negrului';
    dot.classList.toggle('black-turn', currentTurn === 'black');
    
    // Check indication — basic
    indicator.classList.remove('in-check-indicator');
}

function updatePlayPlayerBars() {
    const topBar = document.getElementById('player-top');
    const bottomBar = document.getElementById('player-bottom');
    
    // Bottom is always myColor, top is opponent
    bottomBar.classList.toggle('active-player', currentTurn === myColor);
    topBar.classList.toggle('active-player', currentTurn !== myColor);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay(color, seconds) {
    // If the color matches myColor, update the bottom timer.
    // Otherwise update the top timer.
    const isBottom = (color === myColor);
    const targetId = isBottom ? 'timer-bottom' : 'timer-top';
    const el = document.getElementById(targetId);
    
    if (el) {
        el.textContent = formatTime(seconds);
        el.classList.toggle('low-time', seconds <= 10);
    }
}

function renderPlayMoveHistory() {
    const body = document.getElementById('move-history-body');
    if (!body) return;

    if (moveHistory.length === 0) {
        body.innerHTML = '<div class="move-history-empty">Nicio mutare încă.</div>';
        return;
    }

    body.innerHTML = '';
    const totalPairs = Math.ceil(moveHistory.length / 2);

    for (let i = 0; i < totalPairs; i++) {
        const moveNum = i + 1;
        const whiteMove = moveHistory[i * 2] || '';
        const blackMove = moveHistory[i * 2 + 1] || '';
        const isLatest = (i === totalPairs - 1);

        const row = document.createElement('div');
        row.className = 'move-row' + (isLatest ? ' move-row--latest' : '');
        row.innerHTML =
            '<span class="move-number">' + moveNum + '.</span>' +
            '<span class="move-white">' + whiteMove + '</span>' +
            '<span class="move-black">' + blackMove + '</span>';
        body.appendChild(row);
    }

    body.scrollTop = body.scrollHeight;
}


// ══════════════════════════════════════════════════════════════
// INPUT — Click & Drag for Play mode
// ══════════════════════════════════════════════════════════════

function setupPlayInput(board) {
    board.addEventListener('click', async function (event) {
        if (isDragging || gameOverStatus) return;
        if (currentTurn !== myColor) return; // Not your turn
        
        const target = event.target.closest('.square');
        if (!target) return;

        const row = parseInt(target.dataset.row);
        const col = parseInt(target.dataset.col);
        const clickedPiece = gameState[row][col];
        const clickedColor = clickedPiece ? (clickedPiece === clickedPiece.toUpperCase() ? 'white' : 'black') : null;

        if (selectedSquare) {
            const fromRow = selectedSquare.row;
            const fromCol = selectedSquare.col;

            if (fromRow === row && fromCol === col) {
                clearPlaySelection();
                return;
            }

            if (clickedPiece && clickedColor === myColor) {
                clearPlaySelection();
                selectedSquare = { row, col };
                target.classList.add('selected');
                return;
            }

            // Try to make a move
            const fromSq = String.fromCharCode(97 + fromCol) + (8 - fromRow);
            const toSq = String.fromCharCode(97 + col) + (8 - row);
            socket.emit('play_move', {
                room_id: currentRoomId,
                from: fromSq,
                to: toSq,
            });
            clearPlaySelection();
        } else {
            if (clickedPiece && clickedColor === myColor) {
                selectedSquare = { row, col };
                target.classList.add('selected');
            }
        }
    });

    // Drag and drop
    board.addEventListener('dragstart', function (event) {
        if (gameOverStatus || currentTurn !== myColor) { event.preventDefault(); return; }
        
        const square = event.target.closest('.square');
        if (!square) { event.preventDefault(); return; }

        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = gameState[row][col];
        const pieceColor = piece ? (piece === piece.toUpperCase() ? 'white' : 'black') : null;

        if (!piece || pieceColor !== myColor) {
            event.preventDefault();
            return;
        }

        isDragging = true;
        dragFrom = { row, col };
        clearPlaySelection();
        selectedSquare = { row, col };
        square.classList.add('selected');

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
        if (square) square.classList.add('drag-over');
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

        if (dragFrom.row === toRow && dragFrom.col === toCol) return;

        const fromSq = String.fromCharCode(97 + dragFrom.col) + (8 - dragFrom.row);
        const toSq = String.fromCharCode(97 + toCol) + (8 - toRow);
        socket.emit('play_move', {
            room_id: currentRoomId,
            from: fromSq,
            to: toSq,
        });
    });

    board.addEventListener('dragend', function () {
        document.querySelectorAll('.dragging-source').forEach(el => el.classList.remove('dragging-source'));
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        clearPlaySelection();
        dragFrom = null;
        setTimeout(() => { isDragging = false; }, 0);
    });
}

function clearPlaySelection() {
    document.querySelectorAll('.selected, .valid-move, .valid-capture').forEach(el => {
        el.classList.remove('selected', 'valid-move', 'valid-capture');
    });
    selectedSquare = null;
}


// ══════════════════════════════════════════════════════════════
// PROMOTION & RESULT MODALS (Play)
// ══════════════════════════════════════════════════════════════

let pendingPlayPromotion = null;

function showPlayPromotionModal() {
    const modal = document.getElementById('promotion-modal');
    const choices = document.getElementById('promotion-choices');
    const pieces = myColor === 'white' ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];

    choices.innerHTML = '';
    pieces.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'promotion-choice';
        btn.textContent = pieceSymbols[p];
        btn.onclick = () => completePlayPromotion(p);
        choices.appendChild(btn);
    });
    modal.classList.add('visible');
}

function completePlayPromotion(chosenPiece) {
    if (!pendingPlayPromotion) return;
    const promoChar = chosenPiece.toLowerCase();
    
    socket.emit('play_move', {
        room_id: currentRoomId,
        from: pendingPlayPromotion.from,
        to: pendingPlayPromotion.to,
        promotion: promoChar,
    });
    
    document.getElementById('promotion-modal').classList.remove('visible');
    pendingPlayPromotion = null;
}

function showPlayResultModal(title, subtitle, icon) {
    document.getElementById('result-icon').textContent = icon || '♛';
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-subtitle').textContent = subtitle;
    document.getElementById('result-modal').classList.add('visible');
}

// Enter key on join input
document.getElementById('join-room-code')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
});
