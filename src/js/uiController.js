/**
 * uiController.js — DOM event wiring and rendering.
 *
 * Connects the input textarea and submit button to the parser and data
 * service, and renders occurrences as cards in the occurrences section.
 *
 * Session model (DEC-0003):
 *   - No-session mode  : #input-section visible, #single-add-section hidden.
 *   - Active-session   : #input-section hidden,  #single-add-section visible.
 * The session state is derived solely from whether loadRecords() is non-empty.
 *
 * Export/import (DEC-0004):
 *   - Export button triggers a JSON file download of the full session snapshot.
 *   - Import file input (no-session mode only) loads a v1 snapshot and replaces
 *     the current session with the imported occurrences.
 */

import { parseOccurrences } from './parser.js';
import { loadRecords, addRecords, clearRecords, getLastRecord } from './dataService.js';
import { formatOccurrenceDate, formatOccurrenceTime, formatOccurrenceTell } from './formatters.js';
import { computeStatistics } from './statistics.js';
import { predictNext } from './prediction.js';
import { buildExportPayload, parseImportPayload } from './sessionIO.js';

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

/**
 * Display a message in #single-add-feedback.
 *
 * @param {string} message
 * @param {'error'|'success'|''} type
 */
function setSingleFeedback(message, type = '') {
  const el = getEl('single-add-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = type;
}

function clearSingleFeedback() {
  setSingleFeedback('', '');
}

/**
 * Display a message in #import-feedback.
 *
 * @param {string} message
 * @param {'error'|'success'|''} type
 */
function setImportFeedback(message, type = '') {
  const el = getEl('import-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = type;
}

// ─── Session Mode ─────────────────────────────────────────────────────────────

/**
 * Switch the entire UI between no-session and active-session modes.
 *
 * @param {boolean} active  true = session running, false = no session.
 */
function applySessionMode(active) {
  const inputSection  = getEl('input-section');
  const singleSection = getEl('single-add-section');

  if (inputSection)  inputSection.classList.toggle('hidden', active);
  if (singleSection) singleSection.classList.toggle('hidden', !active);
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
 * Always applies the correct session mode.
 */
export function renderList() {
  const listEl    = getEl('occurrence-list');
  const sectionEl = getEl('occurrences-section');
  if (!listEl || !sectionEl) return;

  const records = loadRecords();
  applySessionMode(records.length > 0);

  if (records.length === 0) {
    listEl.innerHTML = '';
    sectionEl.classList.add('hidden');
    renderStatistics();
    renderPrediction();
    return;
  }

  listEl.innerHTML = records.map(buildCardHTML).join('');
  sectionEl.classList.remove('hidden');
  renderStatistics();
  renderPrediction();
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

// ─── Prediction Renderer ──────────────────────────────────────────────────────

/**
 * renderPrediction — Computes and renders the prediction section.
 * Hides #prediction-section when fewer than 2 occurrences exist.
 */
export function renderPrediction() {
  const sectionEl = getEl('prediction-section');
  const outputEl  = getEl('prediction-output');
  if (!sectionEl || !outputEl) return;

  const result = predictNext(loadRecords());

  if (!result) {
    sectionEl.classList.add('hidden');
    return;
  }

  const {
    predictedDate, earliestDate, latestDate,
    confidence, confidenceLabel: label,
    strategy, intervalUsedMs,
  } = result;

  const predicted = new Date(predictedDate);
  const earliest  = new Date(earliestDate);
  const latest    = new Date(latestDate);

  const isoPredicted = `${formatOccurrenceDate(predicted)} ${formatOccurrenceTime(predicted)}`;
  const isoEarliest  = `${formatOccurrenceDate(earliest)} ${formatOccurrenceTime(earliest)}`;
  const isoLatest    = `${formatOccurrenceDate(latest)} ${formatOccurrenceTime(latest)}`;

  outputEl.innerHTML = `
    <p class="prediction-tell">${formatOccurrenceTell(predicted)}</p>
    <dl class="prediction-details">
      <dt>Predicted date</dt><dd>${isoPredicted}</dd>
      <dt>Window (earliest)</dt><dd>${isoEarliest}</dd>
      <dt>Window (latest)</dt><dd>${isoLatest}</dd>
      <dt>Confidence</dt><dd>${confidence}% — <strong>${label}</strong></dd>
      <dt>Strategy</dt><dd>${strategy}</dd>
      <dt>Interval used</dt><dd>${Math.round(intervalUsedMs / 60_000).toLocaleString()} minutes</dd>
    </dl>
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

      // Reset batch input area
      const inputEl = getEl('occurrence-input');
      if (inputEl) inputEl.value = '';
      clearFeedback();

      // Reset single-add area
      const singleEl = getEl('single-occurrence-input');
      if (singleEl) singleEl.value = '';
      clearSingleFeedback();

      renderList();         // calls applySessionMode(false) internally
      renderStatistics();
      renderPrediction();
    }
  });
}

// ─── Single-Add Handler ───────────────────────────────────────────────────────

/**
 * Handle a single-occurrence add attempt.
 * Rules (DEC-0003):
 *   - Input must parse to exactly one valid datetime.
 *   - The parsed datetime must be strictly after getLastRecord().
 *   - On success: persist, clear input, re-render all sections.
 *   - On failure: show descriptive error in #single-add-feedback, persist nothing.
 */
function handleSingleAdd() {
  const inputEl = getEl('single-occurrence-input');
  if (!inputEl) return;

  const rawText = inputEl.value.trim();
  clearSingleFeedback();

  if (!rawText) {
    setSingleFeedback('Please enter an occurrence datetime.', 'error');
    return;
  }

  const { valid, invalid, homogeneous } = parseOccurrences(rawText);

  if (valid.length !== 1 || !homogeneous) {
    const hint = invalid.length
      ? `Unrecognised token: "${invalid[0]}".`
      : valid.length > 1
        ? 'Please enter exactly one occurrence datetime.'
        : 'No recognisable datetime value found.';
    setSingleFeedback(hint, 'error');
    return;
  }

  const newIso   = valid[0].toISOString();
  const lastIso  = getLastRecord();

  if (lastIso !== null && newIso <= lastIso) {
    const lastDate = new Date(lastIso);
    const lastFmt  = `${formatOccurrenceDate(lastDate)} ${formatOccurrenceTime(lastDate)}`;
    setSingleFeedback(
      `The new occurrence must be after the last recorded occurrence (${lastFmt}).`,
      'error'
    );
    return;
  }

  addRecords(valid);
  inputEl.value = '';
  setSingleFeedback('Occurrence added.', 'success');
  renderList();
}

/**
 * Wire up the single-add input field and button.
 * Enter key in the text input triggers the same action as the Add button.
 */
function initSingleAddSection() {
  const btn     = getEl('add-single-btn');
  const inputEl = getEl('single-occurrence-input');

  if (btn)     btn.addEventListener('click', handleSingleAdd);
  if (inputEl) inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSingleAdd();
    }
  });
}

// ─── Export Handler ───────────────────────────────────────────────────────────

/**
 * Build a full session snapshot and trigger a JSON file download.
 * Statistics and prediction are computed live at export time (DEC-0004).
 */
function handleExport() {
  const occurrences = loadRecords();
  const statistics  = computeStatistics(occurrences);
  const prediction  = predictNext(occurrences);
  const payload     = buildExportPayload(occurrences, statistics, prediction);

  const blob   = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url    = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = `interval-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ─── Import Handler ───────────────────────────────────────────────────────────

/**
 * Read the selected file, validate it with parseImportPayload, and if valid
 * replace the current session with the imported occurrences.
 *
 * @param {File} file
 */
function handleImport(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = parseImportPayload(e.target.result);

    const fileInput = getEl('import-file-input');

    if (!result.ok) {
      setImportFeedback(result.error, 'error');
      if (fileInput) fileInput.value = '';
      return;
    }

    // Replace session: clear existing data then add imported occurrences
    clearRecords();
    addRecords(result.occurrences.map((iso) => new Date(iso)));

    if (fileInput) fileInput.value = '';
    setImportFeedback('', '');

    renderList();
  };
  reader.readAsText(file);
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
 * initUI — Binds DOM event listeners and applies the initial session mode.
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
  initSingleAddSection();

  // Export
  const exportBtn = getEl('export-session-btn');
  if (exportBtn) exportBtn.addEventListener('click', handleExport);

  // Import
  const importInput = getEl('import-file-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleImport(e.target.files[0]);
    });
  }

  renderList();   // applies the correct session mode on page load
}
