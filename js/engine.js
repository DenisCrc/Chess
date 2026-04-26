// ============================================================
// STOCKFISH ENGINE INTEGRATION (via Backend)
// ============================================================
let engineStatus = 'loading';
let currentAnalysis = [null, null, null, null, null];
let analysisDepth = 0;
let analysisInterval = null;

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
            const evalText = data.score;
            const evalClass = data.is_mate ? 'line-eval--mate' : (data.is_positive ? 'line-eval--positive' : 'line-eval--negative');

            const sanMoves = data.moves || [];
            const bestMove = sanMoves[0] || '?';
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

// --- Engine Communication ---
async function fetchAnalysis() {
    try {
        const response = await fetch('/api/analysis');
        const data = await response.json();

        currentAnalysis = data.lines;
        analysisDepth = data.depth;
        engineStatus = data.status;

        updateDepthUI(analysisDepth || '—');

        let statusText = 'Pregătit';
        if (engineStatus === 'analyzing') statusText = 'Analizează...';
        else if (engineStatus === 'loading') statusText = 'Se încarcă...';
        else if (engineStatus === 'ready') statusText = 'Pregătit';

        updateEngineStatus(engineStatus, statusText);
        renderAnalysisLines();
    } catch (err) {
        console.error('Failed to fetch analysis:', err);
        updateEngineStatus('error', 'Eroare conexiune');
    }
}

function initEngine() {
    updateEngineStatus('loading', 'Conectare la server...');
    if (analysisInterval) clearInterval(analysisInterval);
    analysisInterval = setInterval(fetchAnalysis, 100);
    fetchAnalysis();
}

function analyzePosition() {
    // In the backend-driven version, the backend automatically 
    // triggers analysis after a move is made via /api/move.
    // We just need to make sure we're polling.
    fetchAnalysis();
}
