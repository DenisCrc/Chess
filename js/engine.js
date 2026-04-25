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
    if (piece.toLowerCase() === 'p' && fc !== tc && nb[tr][tc] === '') nb[fr][tc] = '';
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
    if (!piece) return move;
    const type = piece.toLowerCase();
    const target = board[tr][tc];
    const isCapture = target !== '' || (type === 'p' && fc !== tc);

    if (type === 'k' && Math.abs(tc - fc) === 2) return tc > fc ? 'O-O' : 'O-O-O';

    let san = '';
    if (type === 'p') {
        if (isCapture) san += String.fromCharCode(97 + fc) + 'x';
        san += String.fromCharCode(97 + tc) + (8 - tr);
        if (promo) san += '=' + promo.toUpperCase();
    } else {
        san += type.toUpperCase();
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
            let evalText, evalClass;
            if (data.scoreMate !== null) {
                evalText = 'M' + Math.abs(data.scoreMate);
                evalClass = 'line-eval--mate';
            } else {
                const cp = data.scoreCp || 0;
                const adjusted = currentTurn === 'black' ? -cp : cp;
                evalText = (adjusted >= 0 ? '+' : '') + (adjusted / 100).toFixed(2);
                evalClass = adjusted > 0 ? 'line-eval--positive' : adjusted < 0 ? 'line-eval--negative' : 'line-eval--neutral';
            }

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
