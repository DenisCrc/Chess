// ============================================================
// INIT — Bootstrap the application
// ============================================================
async function initApp() {
    createBoard();
    
    // Initial state fetch
    try {
        const response = await fetch('/api/state');
        const data = await response.json();
        syncStateFromBackend(data);
    } catch (err) {
        console.error('Initial state fetch failed:', err);
    }
    
    initEngine();
}

initApp();
