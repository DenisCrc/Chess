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

// ── Tree state ────────────────────────────────────────────────
let treeData = null;        // full serialized tree from backend
let currentNodeId = null;   // UUID of the currently displayed node

// ── Apply a serialized tree response to local display state ───
function syncFromTree(data) {
    treeData = data;
    currentNodeId = data.current_node_id;

    _applyBoardState(data);

    renderTree();
    renderPieces();
    updateUI();
}

// ── Low-level: update board/turn/captures from a data object ─
function _applyBoardState(data) {
    const fen = data.fen;
    const parts = fen.split(' ');
    const boardPart   = parts[0];
    const castlingPart = parts[2];

    gameState = Array(8).fill(null).map(() => Array(8).fill(''));
    const rows = boardPart.split('/');
    for (let r = 0; r < 8; r++) {
        let col = 0;
        for (const char of rows[r]) {
            if (isNaN(char)) { gameState[r][col] = char; col++; }
            else              { col += parseInt(char); }
        }
    }

    currentTurn    = data.turn;
    gameOverStatus = data.game_over;

    castlingRights.white.kingSide  = castlingPart.includes('K');
    castlingRights.white.queenSide = castlingPart.includes('Q');
    castlingRights.black.kingSide  = castlingPart.includes('k');
    castlingRights.black.queenSide = castlingPart.includes('q');

    capturedPieces.white = data.captured.white;
    capturedPieces.black = data.captured.black;

    if (data.last_move) {
        const from = data.last_move.substring(0, 2);
        const to   = data.last_move.substring(2, 4);
        lastMove = {
            piece: '?',
            fromRow: 8 - parseInt(from[1]),
            fromCol: from.charCodeAt(0) - 97,
            toRow:   8 - parseInt(to[1]),
            toCol:   to.charCodeAt(0) - 97
        };
    } else {
        lastMove = null;
    }
}

// ============================================================
// TREE NAVIGATION
// ============================================================
async function navigateToNode(nodeId) {
    if (!nodeId || nodeId === currentNodeId) return;
    try {
        const res  = await fetch('/api/tree/navigate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node_id: nodeId })
        });
        const data = await res.json();
        if (data.error) { console.error('Navigate error:', data.error); return; }
        syncFromTree(data);
        clearSelection();
    } catch (err) {
        console.error('Navigate failed:', err);
    }
}

// Prev — go to parent node
function navigatePrev() {
    if (!treeData || !currentNodeId) return;
    const node = treeData.nodes[currentNodeId];
    if (node && node.parent_id) navigateToNode(node.parent_id);
}

// Next — follow first child
function navigateNext() {
    if (!treeData || !currentNodeId) return;
    const node = treeData.nodes[currentNodeId];
    if (node && node.children.length > 0) navigateToNode(node.children[0]);
}

// Start — go to root
function navigateStart() {
    if (!treeData) return;
    navigateToNode(treeData.root_id);
}

// End — follow first-child chain to deepest leaf
function navigateEnd() {
    if (!treeData || !currentNodeId) return;
    let nid = currentNodeId;
    while (true) {
        const node = treeData.nodes[nid];
        if (!node || node.children.length === 0) break;
        nid = node.children[0];
    }
    navigateToNode(nid);
}

// ============================================================
// TREE RENDERING
// ============================================================

/**
 * renderTree() — builds a Lichess-style move list with indented branches.
 *
 * Layout: each "move pair row" shows the move number + white cell + black cell.
 * When a node has multiple children, the first child continues in-line (main line),
 * and additional children appear as indented branch blocks below.
 */
function renderTree() {
    const body = document.getElementById('move-history-body');
    if (!body) return;

    if (!treeData) {
        body.innerHTML = '<div class="move-history-empty">Nicio mutare încă.</div>';
        updateNavButtons();
        return;
    }

    const rootNode = treeData.nodes[treeData.root_id];
    if (!rootNode || rootNode.children.length === 0) {
        body.innerHTML = '<div class="move-history-empty">Nicio mutare încă.</div>';
        updateNavButtons();
        return;
    }

    body.innerHTML = '';

    // Render the main line starting from root, recursing into branches
    _renderLine(body, treeData.root_id, 0);

    // Scroll active move into view
    const activeEl = body.querySelector('.move--active');
    if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
        body.scrollTop = body.scrollHeight;
    }

    updateNavButtons();
}

/**
 * Render a sequence of moves (a "line") starting from parentId's first child.
 * Branches are rendered recursively as indented sub-blocks.
 *
 * @param {HTMLElement} container - where to append elements
 * @param {string}      parentId  - render children of this node
 * @param {number}      indent    - indentation level (0 = main line)
 */
function _renderLine(container, parentId, indent) {
    // Walk the main line (always following children[0])
    let currentParentId = parentId;

    while (true) {
        const parentNode = treeData.nodes[currentParentId];
        if (!parentNode || parentNode.children.length === 0) break;

        const whiteNodeId = parentNode.children[0];
        const whiteNode   = treeData.nodes[whiteNodeId];
        if (!whiteNode) break;

        const moveNum = Math.ceil(whiteNode.depth / 2);

        // Build the pair row
        const row = document.createElement('div');
        row.className = 'move-row';
        if (indent > 0) row.style.marginLeft = (indent * 14) + 'px';

        const numSpan = document.createElement('span');
        numSpan.className = 'move-number';
        numSpan.textContent = moveNum + '.';
        row.appendChild(numSpan);

        // White move cell
        row.appendChild(_makeMoveSpan(whiteNode, whiteNodeId, 'move-white'));

        // Black move cell (first child of white node on main line)
        let blackNodeId = whiteNode.children.length > 0 ? whiteNode.children[0] : null;
        let blackNode   = blackNodeId ? treeData.nodes[blackNodeId] : null;

        if (blackNode) {
            row.appendChild(_makeMoveSpan(blackNode, blackNodeId, 'move-black'));
        } else {
            // Empty placeholder so the row still has 3 columns
            const ph = document.createElement('span');
            ph.className = 'move-black move-placeholder';
            row.appendChild(ph);
        }

        container.appendChild(row);

        // Render alternative branches for the WHITE node (siblings of whiteNodeId)
        _renderAlternatives(container, currentParentId, whiteNodeId, indent);

        if (blackNodeId && blackNode) {
            // Render alternative branches for the BLACK node (siblings of blackNodeId)
            _renderAlternatives(container, whiteNodeId, blackNodeId, indent);
            currentParentId = blackNodeId;
        } else {
            // White was the leaf — render alternatives and stop
            break;
        }
    }
}

function _makeMoveSpan(node, nodeId, baseClass) {
    const span = document.createElement('span');
    const isActive = nodeId === currentNodeId;
    span.className = baseClass + (isActive ? ' move--active' : '');
    span.textContent = node.move_san || '';
    span.dataset.nodeId = nodeId;
    span.onclick = () => navigateToNode(nodeId);
    return span;
}

/**
 * Render alternative children of parentId (skipping mainChildId).
 * Each alternative is rendered as an indented block.
 */
function _renderAlternatives(container, parentId, mainChildId, indent, whiteOnly = false) {
    const parent = treeData.nodes[parentId];
    if (!parent) return;

    const alts = parent.children.filter(cid => cid !== mainChildId);
    for (const altId of alts) {
        const altNode = treeData.nodes[altId];
        if (!altNode) continue;
        if (whiteOnly && altNode.depth % 2 !== 1) continue;

        // Branch header
        const branchWrap = document.createElement('div');
        branchWrap.className = 'branch-block';
        if (indent > 0) branchWrap.style.marginLeft = (indent * 14) + 'px';

        const connector = document.createElement('span');
        connector.className = 'branch-connector';
        connector.textContent = '└';
        branchWrap.appendChild(connector);

        // The alternative move itself
        const altSpan = _makeMoveSpan(altNode, altId, altNode.depth % 2 === 1 ? 'move-white move--branch' : 'move-black move--branch');
        const moveNum = Math.ceil(altNode.depth / 2);
        const prefix  = document.createElement('span');
        prefix.className = 'branch-num';
        prefix.textContent = altNode.depth % 2 === 1 ? moveNum + '.' : moveNum + '…';
        branchWrap.appendChild(prefix);
        branchWrap.appendChild(altSpan);
        container.appendChild(branchWrap);

        // Recursively render this branch's continuation
        if (altNode.children.length > 0) {
            _renderLine(container, altId, indent + 1);
        }
    }
}

// ============================================================
// NAV BUTTONS
// ============================================================
function updateNavButtons() {
    const btnStart = document.getElementById('nav-start');
    const btnPrev  = document.getElementById('nav-prev');
    const btnNext  = document.getElementById('nav-next');
    const btnEnd   = document.getElementById('nav-end');
    const historyBanner = document.getElementById('history-banner');

    if (!treeData || !currentNodeId) {
        [btnStart, btnPrev, btnNext, btnEnd].forEach(b => { if (b) b.disabled = true; });
        return;
    }

    const node = treeData.nodes[currentNodeId];
    const atRoot = currentNodeId === treeData.root_id;
    const atLeaf = !node || node.children.length === 0;

    if (btnStart) btnStart.disabled = atRoot;
    if (btnPrev)  btnPrev.disabled  = atRoot;
    if (btnNext)  btnNext.disabled  = atLeaf;
    if (btnEnd)   btnEnd.disabled   = atLeaf;

    // Show banner when not on the deepest main-line leaf
    if (historyBanner) {
        // "not at end of main line" — simplified: just show if not a leaf
        historyBanner.style.display = !atLeaf ? 'flex' : 'none';
    }
}

// ============================================================
// UI UPDATES
// ============================================================
function updateUI() {
    if (!turnIndicator) return;
    turnIndicator.className = 'turn-indicator turn--' + currentTurn;
    turnIndicator.classList.toggle('turn--white', currentTurn === 'white');
    turnIndicator.classList.toggle('turn--black', currentTurn === 'black');
    if (turnText) turnText.textContent = currentTurn === 'white' ? 'Rândul Albului' : 'Rândul Negrului';

    const wCap = document.getElementById('white-captures');
    const bCap = document.getElementById('black-captures');
    if (wCap) wCap.innerHTML = capturedPieces.white.map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');
    if (bCap) bCap.innerHTML = capturedPieces.black.map(p => `<span>${pieceSymbols[p] || p}</span>`).join('');

    updatePlayerBars();
}
