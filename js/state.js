// ============================================================
// STATE — Global game state and constants (Analysis mode)
// ============================================================
let gameState = Array(8).fill(null).map(() => Array(8).fill(''));

const pieceSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟'
};

const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

const board = document.getElementById('chessboard');
const turnIndicator = document.getElementById('turn-indicator');
const turnDot = turnIndicator ? turnIndicator.querySelector('.turn-dot') : null;
const turnText = turnIndicator ? turnIndicator.querySelector('.turn-text') : null;

let currentTurn = 'white';
let selectedSquare = null;
let lastMove = null;
let isFlipped = false;
let capturedPieces = { white: [], black: [] };
let gameOverStatus = null;
let castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};

let moveHistory = [];
let currentHistoryIndex = -1; // -1 = live (at end of game)
let totalMoves = 0;

// --- FEN to Internal State ---
function syncStateFromBackend(data) {
    const fen = data.fen;
    const parts = fen.split(' ');
    const boardPart = parts[0];
    const castlingPart = parts[2];
    
    // Reset local state
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
    
    // Sync castling
    castlingRights.white.kingSide = castlingPart.includes('K');
    castlingRights.white.queenSide = castlingPart.includes('Q');
    castlingRights.black.kingSide = castlingPart.includes('k');
    castlingRights.black.queenSide = castlingPart.includes('q');

    // Sync captured pieces
    capturedPieces.white = data.captured.white;
    capturedPieces.black = data.captured.black;
    
    // Sync last move
    if (data.last_move) {
        const from = data.last_move.substring(0, 2);
        const to = data.last_move.substring(2, 4);
        lastMove = {
            piece: '?',
            fromRow: 8 - parseInt(from[1]),
            fromCol: from.charCodeAt(0) - 97,
            toRow: 8 - parseInt(to[1]),
            toCol: to.charCodeAt(0) - 97
        };
    } else {
        lastMove = null;
    }

    // Sync move history
    moveHistory = data.move_history || [];
    totalMoves = moveHistory.length;
    currentHistoryIndex = totalMoves; // back to live/latest
    renderMoveHistory();

    renderPieces();
    updateUI();
}

// ============================================================
// HISTORY NAVIGATION
// ============================================================
function isViewingHistory() {
    return currentHistoryIndex !== totalMoves;
}

async function navigateToMove(index) {
    // Clamp index
    index = Math.max(0, Math.min(index, totalMoves));

    if (index === currentHistoryIndex) return;

    try {
        let data;
        if (index === totalMoves) {
            // Return to live position
            const response = await fetch('/api/state');
            data = await response.json();
            syncStateFromBackend(data); // resets currentHistoryIndex to totalMoves
            return;
        }

        const response = await fetch(`/api/state_at/${index}`);
        data = await response.json();

        // Manually update display state without overriding backend
        const fen = data.fen;
        const parts = fen.split(' ');
        const boardPart = parts[0];
        const castlingPart = parts[2];

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
        castlingRights.white.kingSide = castlingPart.includes('K');
        castlingRights.white.queenSide = castlingPart.includes('Q');
        castlingRights.black.kingSide = castlingPart.includes('k');
        castlingRights.black.queenSide = castlingPart.includes('q');
        capturedPieces.white = data.captured.white;
        capturedPieces.black = data.captured.black;

        if (data.last_move) {
            const from = data.last_move.substring(0, 2);
            const to = data.last_move.substring(2, 4);
            lastMove = {
                piece: '?',
                fromRow: 8 - parseInt(from[1]),
                fromCol: from.charCodeAt(0) - 97,
                toRow: 8 - parseInt(to[1]),
                toCol: to.charCodeAt(0) - 97
            };
        } else {
            lastMove = null;
        }

        currentHistoryIndex = index;
        gameOverStatus = null;

        renderMoveHistory();
        renderPieces();
        updateUI();
    } catch (err) {
        console.error('History navigation failed:', err);
    }
}

function navigatePrev() { navigateToMove(currentHistoryIndex - 1); }
function navigateNext() { navigateToMove(currentHistoryIndex + 1); }
function navigateStart() { navigateToMove(0); }
function navigateEnd() { navigateToMove(totalMoves); }

function renderMoveHistory() {
    const body = document.getElementById('move-history-body');
    if (!body) return;

    if (moveHistory.length === 0) {
        body.innerHTML = '<div class="move-history-empty">Nicio mutare încă.</div>';
        updateNavButtons();
        return;
    }

    body.innerHTML = '';
    const totalPairs = Math.ceil(moveHistory.length / 2);

    for (let i = 0; i < totalPairs; i++) {
        const moveNum = i + 1;
        const whiteMove = moveHistory[i * 2] || '';
        const blackMove = moveHistory[i * 2 + 1] || '';

        const row = document.createElement('div');
        row.className = 'move-row';

        const numSpan = document.createElement('span');
        numSpan.className = 'move-number';
        numSpan.textContent = moveNum + '.';

        // White move — move index is i*2+1 (1-based after start position)
        const whiteMoveIndex = i * 2 + 1;
        const whiteSpan = document.createElement('span');
        whiteSpan.className = 'move-white' + (currentHistoryIndex === whiteMoveIndex ? ' move--active' : '');
        whiteSpan.textContent = whiteMove;
        whiteSpan.dataset.moveIndex = whiteMoveIndex;
        if (whiteMove) {
            whiteSpan.onclick = () => navigateToMove(whiteMoveIndex);
        }

        // Black move — move index is i*2+2
        const blackMoveIndex = i * 2 + 2;
        const blackSpan = document.createElement('span');
        blackSpan.className = 'move-black' + (blackMove && currentHistoryIndex === blackMoveIndex ? ' move--active' : '');
        blackSpan.textContent = blackMove;
        blackSpan.dataset.moveIndex = blackMoveIndex;
        if (blackMove) {
            blackSpan.onclick = () => navigateToMove(blackMoveIndex);
        }

        row.appendChild(numSpan);
        row.appendChild(whiteSpan);
        row.appendChild(blackSpan);
        body.appendChild(row);
    }

    // Scroll active move into view, or bottom if at live position
    const activeEl = body.querySelector('.move--active');
    if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
        body.scrollTop = body.scrollHeight;
    }

    // Update nav button states
    updateNavButtons();
}

function updateNavButtons() {
    const btnStart = document.getElementById('nav-start');
    const btnPrev  = document.getElementById('nav-prev');
    const btnNext  = document.getElementById('nav-next');
    const btnEnd   = document.getElementById('nav-end');
    const historyBanner = document.getElementById('history-banner');

    const atStart = currentHistoryIndex === 0;
    const atEnd   = currentHistoryIndex === totalMoves;

    if (btnStart) btnStart.disabled = atStart;
    if (btnPrev)  btnPrev.disabled  = atStart;
    if (btnNext)  btnNext.disabled  = atEnd;
    if (btnEnd)   btnEnd.disabled   = atEnd;

    if (historyBanner) {
        historyBanner.style.display = isViewingHistory() ? 'flex' : 'none';
    }
}

function updateUI() {
    if (!turnIndicator) return;
    // Update turn indicator
    turnIndicator.className = 'turn-indicator turn--' + currentTurn;
    turnIndicator.classList.toggle('turn--white', currentTurn === 'white');
    turnIndicator.classList.toggle('turn--black', currentTurn === 'black');
    if (turnText) turnText.textContent = currentTurn === 'white' ? 'Rândul Albului' : 'Rândul Negrului';
    
    // Update captures
    const wCap = document.getElementById('white-captures');
    const bCap = document.getElementById('black-captures');
    if (wCap) wCap.innerHTML = capturedPieces.white.map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');
    if (bCap) bCap.innerHTML = capturedPieces.black.map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');

    updatePlayerBars();
}
