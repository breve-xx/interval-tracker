/**
 * script.js — Main application entry point.
 * Initializes the Interval Tracker SPA on page load.
 */

/**
 * initializeApp — bootstraps the application.
 * Reads persisted state from localStorage and sets up the initial UI.
 */
function initializeApp() {
  console.log('[IntervalTracker] Application initialized.');

  const appContainer = document.getElementById('app-container');
  if (!appContainer) {
    console.error('[IntervalTracker] #app-container not found in DOM.');
    return;
  }

  // Load persisted records from localStorage (or start with empty array)
  const stored = localStorage.getItem('intervalTracker.records');
  const records = stored ? JSON.parse(stored) : [];

  console.log(`[IntervalTracker] Loaded ${records.length} record(s) from storage.`);

  // Placeholder: render a welcome message until subsequent tasks build the full UI
  appContainer.innerHTML = `
    <h1>Interval Tracker</h1>
    <p>Application loaded. ${records.length} event record(s) found in storage.</p>
  `;
}

// Execute once the DOM is fully parsed
document.addEventListener('DOMContentLoaded', initializeApp);
