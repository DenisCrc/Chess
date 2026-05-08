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

    // Set default time format and highlight it
    updateTimerDisplay('white', whiteTime);
    updateTimerDisplay('black', blackTime);
    highlightActiveTimeOption(initialTime);
}

initApp();
