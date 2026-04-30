/**
 * uiController.js — DOM event wiring and rendering.
 *
 * Connects the input textarea and submit button to the parser and data
 * service, and renders occurrences as cards in the occurrences section.
 */

import { parseOccurrences } from './parser.js';
import { loadRecords, addRecords, clearRecords } from './dataService.js';
import { formatOccurrenceDate, formatOccurrenceTime, formatOccurrenceTell } from './formatters.js';
import { computeStatistics } from './statistics.js';

// ─── DOM References ───────────────────────────────────────────────────────────

function getEl(id) {
  return document.getElementById(id);
}

// ─── Feedback helpers ─────────────────────────────────────────────────────────

/**
 * Display a message in #input-feedback.
 *
 * @param {string} message
 * @param {'error'|'success'|''} type
 */
function setFeedback(message, type = '') {
  const el = getEl('input-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = type;
}

function clearFeedback() {
  setFeedback('', '');
}

// ─── Card Renderer ────────────────────────────────────────────────────────────

/**
 * Build the inner HTML for a single occurrence card.
 *
 * @param {string} iso  UTC ISO 8601 string
 * @returns {string}    HTML string for an <li> element
 */
function buildCardHTML(iso) {
  const d    = new Date(iso);
  const date = formatOccurrenceDate(d);
  const time = formatOccurrenceTime(d);
  const tell = formatOccurrenceTell(d);
  return `<li class="occurrence-card" data-iso="${iso}">
  <div class="occurrence-card__primary">
    <span class="occurrence-card__date">${date}</span>
    <span class="occurrence-card__time">${time}</span>
  </div>
  <p class="occurrence-card__tell">${tell}</p>
</li>`;
}

/**
 * renderList — Loads all persisted records and renders them as occurrence cards.
 * Toggles #occurrences-section visibility based on whether records exist.
 */
export function renderList() {
  const listEl    = getEl('occurrence-list');
  const sectionEl = getEl('occurrences-section');
  if (!listEl || !sectionEl) return;

  const records = loadRecords();

  if (records.length === 0) {
    listEl.innerHTML = '';
    sectionEl.classList.add('hidden');
    renderStatistics();
    return;
  }

  listEl.innerHTML = records.map(buildCardHTML).join('');
  sectionEl.classList.remove('hidden');
  renderStatistics();
}

// ─── Statistics Renderer ──────────────────────────────────────────────────────

/**
 * Build a <dl> of key/value pairs from a flat object.
 *
 * @param {object} obj
 * @returns {string}  HTML string
 */
function buildDL(obj) {
  return '<dl>' + Object.entries(obj).map(([k, v]) => {
    const display = Array.isArray(v) ? (v.length === 0 ? '—' : v.join(', ')) : v;
    return `<dt>${k}</dt><dd>${display}</dd>`;
  }).join('') + '</dl>';
}

/**
 * renderStatistics — Computes and renders the statistics section.
 * Hides #statistics-section when fewer than 2 occurrences exist.
 */
export function renderStatistics() {
  const sectionEl = getEl('statistics-section');
  const outputEl  = getEl('statistics-output');
  if (!sectionEl || !outputEl) return;

  const result = computeStatistics(loadRecords());

  if (!result) {
    sectionEl.classList.add('hidden');
    return;
  }

  const { unit, count, basic, advanced, nerd } = result;

  outputEl.innerHTML = `
    <p class="statistics-unit">Unit: <strong>${unit}</strong> &nbsp;·&nbsp; Occurrences: <strong>${count}</strong></p>
    <div class="statistics-level">
      <h3>Basic</h3>
      ${buildDL(basic)}
    </div>
    <div class="statistics-level">
      <h3>Advanced</h3>
      ${buildDL(advanced)}
    </div>
    <div class="statistics-level">
      <h3>Nerd</h3>
      ${buildDL(nerd)}
    </div>
  `;

  sectionEl.classList.remove('hidden');
}

// ─── New Session Handler ──────────────────────────────────────────────────────

/**
 * Wire up the "New Session" button with a two-step confirmation guard.
 * First click changes the button label; second click (confirm) erases all data.
 * Clicking anywhere else on the page cancels the pending confirmation.
 */
function initNewSessionBtn() {
  const btn = getEl('new-session-btn');
  if (!btn) return;

  const originalLabel  = btn.textContent;
  const confirmLabel   = 'Confirm — this will erase all data';
  let   pendingConfirm = false;

  function cancelConfirm() {
    pendingConfirm       = false;
    btn.textContent      = originalLabel;
    btn.classList.remove('new-session-btn--confirm');
  }

  function handleOutsideClick(e) {
    if (e.target !== btn) {
      cancelConfirm();
      document.removeEventListener('click', handleOutsideClick);
    }
  }

  btn.addEventListener('click', () => {
    if (!pendingConfirm) {
      // First click: enter confirmation state
      pendingConfirm      = true;
      btn.textContent     = confirmLabel;
      btn.classList.add('new-session-btn--confirm');
      // Next click anywhere outside the button cancels
      setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
      }, 0);
    } else {
      // Second click on button: confirm and execute
      document.removeEventListener('click', handleOutsideClick);
      cancelConfirm();
      clearRecords();

      // Reset input area
      const inputEl = getEl('occurrence-input');
      if (inputEl) inputEl.value = '';
      clearFeedback();

      renderList();
      renderStatistics();
    }
  });
}

// ─── Submit Handler ───────────────────────────────────────────────────────────

function handleSubmit() {
  const inputEl = getEl('occurrence-input');
  if (!inputEl) return;

  const rawText = inputEl.value;
  clearFeedback();

  if (!rawText.trim()) {
    setFeedback('Please paste at least one occurrence timestamp before submitting.', 'error');
    return;
  }

  const { valid, invalid, homogeneous } = parseOccurrences(rawText);

  if (valid.length === 0) {
    const skipped = invalid.length
      ? `Unrecognised tokens: ${invalid.map((t) => `"${t}"`).join(', ')}`
      : 'No recognisable datetime values found.';
    setFeedback(`No valid occurrences could be parsed. ${skipped}`, 'error');
    return;
  }

  if (!homogeneous) {
    setFeedback(
      'Mixed formats detected. All entries in a submission must use the same datetime format. Please check your input and try again.',
      'error'
    );
    return;
  }

  addRecords(valid);
  inputEl.value = '';

  const addedMsg = `${valid.length} occurrence${valid.length !== 1 ? 's' : ''} saved.`;
  const skippedMsg =
    invalid.length > 0
      ? ` ${invalid.length} token${invalid.length !== 1 ? 's' : ''} skipped: ${invalid.map((t) => `"${t}"`).join(', ')}.`
      : '';

  setFeedback(addedMsg + skippedMsg, 'success');

  renderList();
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * initUI — Binds DOM event listeners.
 * Must be called after the DOM is ready.
 */
export function initUI() {
  const btn = getEl('submit-occurrences');
  if (btn) {
    btn.addEventListener('click', handleSubmit);
  }

  // Also allow submitting via Enter key inside the textarea (Shift+Enter = newline)
  const inputEl = getEl('occurrence-input');
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });
  }

  initNewSessionBtn();
}
