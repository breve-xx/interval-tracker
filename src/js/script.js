/**
 * script.js — Main application entry point.
 * Initializes the Interval Tracker SPA on page load.
 */

import { loadRecords } from './dataService.js';
import { initUI, renderList } from './uiController.js';

/**
 * initializeApp — bootstraps the application.
 * Reads persisted state from localStorage and sets up the initial UI.
 */
function initializeApp() {
  const records = loadRecords();
  console.log(`[IntervalTracker] Application initialized. ${records.length} record(s) in storage.`);

  initUI();
  renderList();
}

// Execute once the DOM is fully parsed
document.addEventListener('DOMContentLoaded', initializeApp);
