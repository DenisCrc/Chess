// ============================================================
// STATE — Global game state and constants
// ============================================================
let gameState = Array(8).fill(null).map(() => Array(8).fill(''));

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
let gameOverStatus = null;
let castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};

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
            piece: '?', // we don't strictly need this for highlighting
            fromRow: 8 - parseInt(from[1]),
            fromCol: from.charCodeAt(0) - 97,
            toRow: 8 - parseInt(to[1]),
            toCol: to.charCodeAt(0) - 97
        };
    } else {
        lastMove = null;
    }

    renderPieces();
    updateUI();
    
    if (gameOverStatus) {
        showResultModal(
            gameOverStatus === 'checkmate' ? 'Șah-Mat!' : 'Remiză!',
            gameOverStatus === 'checkmate' ? (currentTurn === 'white' ? 'Negrul câștigă!' : 'Albul câștigă!') : 'Jocul s-a terminat la egalitate.',
            gameOverStatus === 'checkmate' ? '👑' : '🤝'
        );
    }
}

function updateUI() {
    // Update turn indicator
    turnIndicator.className = 'turn-indicator turn--' + currentTurn;
    turnIndicator.classList.toggle('turn--white', currentTurn === 'white');
    turnIndicator.classList.toggle('turn--black', currentTurn === 'black');
    turnText.textContent = currentTurn === 'white' ? 'Rândul Albului' : 'Rândul Negrului';
    
    // Update captures
    document.getElementById('white-captures').innerHTML = capturedPieces.white.map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');
    document.getElementById('black-captures').innerHTML = capturedPieces.black.map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');
}
