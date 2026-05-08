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
    renderMoveHistory();

    renderPieces();
    updateUI();
}

function renderMoveHistory() {
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
