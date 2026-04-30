/**
 * uiController.js — DOM event wiring and rudimentary list rendering.
 *
 * Connects the input textarea and submit button to the parser and data
 * service. Rendering here is intentionally minimal; definitive display
 * is deferred to a future task.
 */

import { parseOccurrences } from './parser.js';
import { loadRecords, addRecords } from './dataService.js';

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

// ─── List Renderer ────────────────────────────────────────────────────────────

/**
 * renderList — Loads all persisted records and renders them as a plain list.
 * This is the rudimentary implementation; definitive display is a future task.
 */
export function renderList() {
  const listEl = getEl('occurrence-list');
  if (!listEl) return;

  const records = loadRecords();

  if (records.length === 0) {
    listEl.innerHTML = '<li class="occurrence-list__empty">No occurrences recorded yet.</li>';
    return;
  }

  listEl.innerHTML = records
    .map((iso) => {
      // Format as a human-readable local datetime for display
      const d = new Date(iso);
      const label = d.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return `<li class="occurrence-list__item" data-iso="${iso}">${label}</li>`;
    })
    .join('');
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
}
