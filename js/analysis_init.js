// ============================================================
// ANALYSIS INIT — Bootstrap the analysis page
// ============================================================
const PAGE_MODE = 'analysis';

async function initApp() {
    createBoard();

    // Fetch the full analysis tree on load
    try {
        const response = await fetch('/api/tree');
        const data = await response.json();
        syncFromTree(data);
    } catch (err) {
        console.error('Initial tree fetch failed:', err);
    }

    initEngine();
}

initApp();
