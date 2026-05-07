/**
 * script.js — Main application entry point.
 * Initializes the Interval Tracker SPA on page load.
 */

import { initUI } from './uiController.js';

/**
 * initializeApp — bootstraps the application.
 * Reads persisted state from localStorage and sets up the initial UI.
 */
function initializeApp() {
  initUI();
}

// Execute once the DOM is fully parsed
document.addEventListener('DOMContentLoaded', initializeApp);
