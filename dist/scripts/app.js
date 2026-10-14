/**
 * Main Application Orchestrator
 * Bootstraps Chalo SSCL Srinagar Passenger App for 100% Standalone & Real-World Testing.
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Chalo SSCL] Initializing Passenger Transit App...');

    // 1. Initialize Engines
    await window.timeSync.init();
    await window.stateStore.init();

    // 2. Initialize Passenger UI Component
    if (window.passengerApp) {
        window.passengerApp.init();
    }

    // 3. Bind Modal Controls
    bindModalEvents();

    console.log('[Chalo SSCL] Passenger App fully operational.');
});

function bindModalEvents() {
    const modal = document.getElementById('modal-generic');
    const closeBtn = document.getElementById('modal-generic-close');
    
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
}

