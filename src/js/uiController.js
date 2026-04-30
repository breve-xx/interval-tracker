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
 *
 * Theme (DEC-0005):
 *   - Light/dark via data-theme on <html>. Initialised from localStorage or
 *     prefers-color-scheme. Toggle button persists the choice.
 *
 * Icons (DEC-0005):
 *   - Lucide icons loaded via CDN UMD. refreshIcons() calls lucide.createIcons()
 *     after every DOM mutation that introduces icon placeholders.
 */

import { parseOccurrences } from './parser.js';
import { loadRecords, addRecords, clearRecords, getLastRecord } from './dataService.js';
import { formatOccurrenceDate, formatOccurrenceTime, formatOccurrenceTell } from './formatters.js';
import { computeStatistics } from './statistics.js';
import { predictNext } from './prediction.js';
import { buildExportPayload, parseImportPayload, buildMarkdownReport } from './sessionIO.js';

// ─── Static Explanatory Content ───────────────────────────────────────────────

/**
 * Plain-English descriptions for every statistics key, organised by level.
 * Used to populate the expandable help panel in the statistics section.
 */
const STATS_GLOSSARY = {
  basic: {
    intervalCount : 'The number of gaps between consecutive occurrences.',
    mean          : 'The average gap length — a typical interval between events.',
    min           : 'The shortest gap observed between two consecutive occurrences.',
    max           : 'The longest gap observed between two consecutive occurrences.',
    range         : 'The difference between the longest and shortest gaps. Larger values indicate more variability.',
    first         : 'The date and time of the earliest recorded occurrence.',
    last          : 'The date and time of the most recent recorded occurrence.',
    totalSpan     : 'Total time elapsed from the first to the last occurrence.',
  },
  advanced: {
    median        : 'The middle gap value when all gaps are sorted. More resistant to outliers than the mean.',
    stdDev        : 'Standard deviation — how much gaps typically deviate from the mean. Lower = more consistent.',
    variance      : 'The square of the standard deviation. A raw measure of how spread-out the gaps are.',
    cv            : 'Coefficient of variation — standard deviation as a percentage of the mean. Below 15% is very regular; above 75% is highly irregular.',
    regularityLabel: 'A plain-English summary of how consistent the intervals are, derived from the CV.',
    q1            : 'First quartile — 25% of all gaps are shorter than this value.',
    q3            : 'Third quartile — 75% of all gaps are shorter than this value.',
    iqr           : 'Interquartile range (Q3 − Q1) — the spread of the middle 50% of gaps. Resistant to outliers.',
    trend         : 'Whether gaps are growing longer (increasing), shorter (decreasing), or staying the same (stable).',
  },
  nerd: {
    mad                : 'Mean absolute deviation — the average distance of each gap from the mean. A robust alternative to standard deviation.',
    skewness           : 'Asymmetry of the distribution. Positive = occasional very long gaps; negative = occasional very short ones.',
    kurtosis           : 'Excess kurtosis — how heavy the tails of the distribution are compared to a normal bell curve.',
    outliers           : 'Gap values that fall far outside the typical range (beyond 1.5× IQR from Q1 or Q3).',
    outlierCount       : 'The number of gaps identified as statistical outliers.',
    longestStreak      : 'The longest consecutive run of gaps all within one standard deviation of the mean.',
    regressionSlope    : 'Rate of change in gap length per occurrence. Positive = gaps are growing; negative = gaps are shrinking.',
    regressionIntercept: 'The estimated gap length at occurrence zero — the starting point of the regression line.',
    r2                 : 'R² score — how well the trend line fits. Near 1 = strong trend; near 0 = no discernible trend.',
  },
};

/**
 * One-line descriptions for each statistical analysis level.
 */
const STATS_LEVEL_DESC = {
  basic   : 'Core descriptive statistics about the gaps between your occurrences.',
  advanced: 'Distribution shape, consistency, and long-term trend of your intervals.',
  nerd    : 'High-precision measures: regression fit, outlier detection, and distribution shape.',
};

/**
 * Plain-English description for each prediction strategy.
 */
const STRATEGY_DESC = {
  mean      : 'Projects from the last occurrence using the average gap. Best for very consistent patterns.',
  median    : 'Projects using the median gap — more robust when a few unusual intervals exist.',
  regression: 'Fits a trend line to the interval series and extrapolates. Used when gaps are clearly growing or shrinking.',
};

// ─── DOM References ───────────────────────────────────────────────────────────

function getEl(id) {
  return document.getElementById(id);
}

// ─── Icon Helper ──────────────────────────────────────────────────────────────

/**
 * Materialise all pending <i data-lucide="…"> placeholders.
 * Guarded against environments where the CDN script has not yet loaded
 * (e.g. during unit tests).
 */
function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

/**
 * Convert a camelCase key to a human-readable Title Case label.
 *
 * @param {string} key  e.g. "intervalCount"
 * @returns {string}    e.g. "Interval Count"
 */
function humaniseKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Regex that matches an ISO 8601 datetime string produced by Date#toISOString().
 * Used in fmtVal to pretty-print date values in statistics tiles.
 */
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Format a statistics value for display.
 * Numbers are rounded to 2 decimal places. Arrays are comma-joined or "—".
 * ISO datetime strings are formatted as "DD/MM/YYYY HH:mm".
 *
 * @param {*} v
 * @returns {string}
 */
function fmtVal(v) {
  if (Array.isArray(v)) {
    if (v.length === 0) return '—';
    return v.map((n) => (typeof n === 'number' ? round2(n) : n)).join(', ');
  }
  if (typeof v === 'string' && ISO_DATETIME_RE.test(v)) {
    const d = new Date(v);
    return `${formatOccurrenceDate(d)} ${formatOccurrenceTime(d)}`;
  }
  if (typeof v === 'number') return String(round2(v));
  return String(v);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Map a confidence score to a CSS modifier class.
 *
 * @param {number} score  0–100
 * @returns {'high'|'medium'|'low'}
 */
function confidenceClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ─── Feedback Helpers ─────────────────────────────────────────────────────────

function setFeedback(message, type = '') {
  const el = getEl('input-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = `feedback${type ? ` ${type}` : ''}`;
}

function clearFeedback() { setFeedback('', ''); }

function setSingleFeedback(message, type = '') {
  const el = getEl('single-add-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = `feedback ops-feedback${type ? ` ${type}` : ''}`;
}

function clearSingleFeedback() { setSingleFeedback('', ''); }

function setImportFeedback(message, type = '') {
  const el = getEl('import-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = `feedback${type ? ` ${type}` : ''}`;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

/**
 * Initialise the theme from localStorage or prefers-color-scheme,
 * then wire the toggle button.
 */
function initTheme() {
  const root    = document.documentElement;
  const stored  = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');

  root.dataset.theme = initial;
  updateThemeBtn(initial);

  const btn = getEl('theme-toggle-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('theme', next);
    updateThemeBtn(next);
  });
}

/**
 * Update the theme toggle button icon to reflect the current theme.
 * In dark mode the button shows "sun" (click to go light).
 * In light mode the button shows "moon" (click to go dark).
 *
 * @param {'light'|'dark'} theme
 */
function updateThemeBtn(theme) {
  const btn = getEl('theme-toggle-btn');
  if (!btn) return;
  const icon = theme === 'dark' ? 'sun' : 'moon';
  btn.innerHTML = `<i data-lucide="${icon}"></i>`;
  refreshIcons();
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

// ─── Occurrence Row Renderer ──────────────────────────────────────────────────

/**
 * Build the inner HTML for a single slim occurrence row.
 *
 * @param {string} iso  UTC ISO 8601 string
 * @param {number} idx  1-based index
 * @returns {string}    HTML string for an <li> element
 */
function buildCardHTML(iso, idx) {
  const d    = new Date(iso);
  const date = formatOccurrenceDate(d);
  const time = formatOccurrenceTime(d);
  const tell = formatOccurrenceTell(d);
  return `<li class="occ-row" data-iso="${iso}">
  <span class="occ-row__num">${idx}</span>
  <span class="occ-row__datetime">
    <span class="occ-row__date">${date}</span>
    <span class="occ-row__time">${time}</span>
  </span>
  <span class="occ-row__tell">${tell}</span>
</li>`;
}

/**
 * renderList — Loads all persisted records and renders them as occurrence rows.
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

  listEl.innerHTML = records.map((iso, i) => buildCardHTML(iso, i + 1)).join('');
  sectionEl.classList.remove('hidden');
  renderStatistics();
  renderPrediction();
  refreshIcons();
}

// ─── Statistics Renderer ──────────────────────────────────────────────────────

/**
 * Keys in the statistics output whose values are ISO datetime strings and
 * should be rendered as two stacked lines (date + time) in the stats tile.
 */
const DATETIME_STAT_KEYS = new Set(['first', 'last']);

/**
 * Build a stats-grid of tiles from a plain object.
 * Keys in DATETIME_STAT_KEYS are rendered as two stacked date/time lines.
 *
 * @param {object} obj
 * @returns {string}  HTML string
 */
function buildStatsGrid(obj) {
  const tiles = Object.entries(obj).map(([k, v]) => {
    let valueHtml;
    if (DATETIME_STAT_KEYS.has(k) && typeof v === 'string' && ISO_DATETIME_RE.test(v)) {
      const d = new Date(v);
      valueHtml = `<span class="stats-tile__dt-date">${formatOccurrenceDate(d)}</span><span class="stats-tile__dt-time">${formatOccurrenceTime(d)}</span>`;
    } else {
      valueHtml = fmtVal(v);
    }
    const label = humaniseKey(k);
    return `
    <div class="stats-tile">
      <span class="stats-tile__label" title="${label}">${label}</span>
      <span class="stats-tile__value">${valueHtml}</span>
    </div>`;
  }).join('');
  return `<div class="stats-grid">${tiles}</div>`;
}

/**
 * Build the full glossary panel HTML from STATS_GLOSSARY.
 *
 * @returns {string}  HTML string
 */
function buildGlossaryPanel() {
  const sections = ['basic', 'advanced', 'nerd'].map((level) => {
    const items = Object.entries(STATS_GLOSSARY[level]).map(([k, desc]) => `
      <div class="glossary-item">
        <dt class="glossary-item__term">${humaniseKey(k)}</dt>
        <dd class="glossary-item__def">${desc}</dd>
      </div>`).join('');
    return `
      <div class="glossary-section">
        <h4 class="glossary-section__title">${level.charAt(0).toUpperCase() + level.slice(1)}</h4>
        <p class="glossary-section__desc">${STATS_LEVEL_DESC[level]}</p>
        <dl class="glossary-list">${items}</dl>
      </div>`;
  }).join('');
  return `<div class="stats-help-panel hidden" id="stats-help-panel">${sections}</div>`;
}

/**
 * renderStatistics — Computes and renders the statistics section with tabs.
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
    <div class="stats-header">
      <i data-lucide="bar-chart-2"></i>
      <span>Unit: <strong>${unit}</strong> &nbsp;·&nbsp; <strong>${count}</strong> occurrences</span>
      <button class="stats-help-btn" id="stats-help-btn" type="button">
        <i data-lucide="circle-help"></i>
        Explain
      </button>
    </div>
    <div class="stats-tabbar" role="tablist">
      <button class="stats-tab is-active" data-tab="basic" type="button">Basic</button>
      <button class="stats-tab" data-tab="advanced" type="button">Advanced</button>
      <button class="stats-tab" data-tab="nerd" type="button">Nerd</button>
    </div>
    <div class="stats-panel is-active" data-panel="basic">
      <p class="stats-level-desc">${STATS_LEVEL_DESC.basic}</p>
      ${buildStatsGrid(basic)}
    </div>
    <div class="stats-panel" data-panel="advanced">
      <p class="stats-level-desc">${STATS_LEVEL_DESC.advanced}</p>
      ${buildStatsGrid(advanced)}
    </div>
    <div class="stats-panel" data-panel="nerd">
      <p class="stats-level-desc">${STATS_LEVEL_DESC.nerd}</p>
      ${buildStatsGrid(nerd)}
    </div>
    ${buildGlossaryPanel()}
  `;

  // Tab switching
  outputEl.querySelectorAll('.stats-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      outputEl.querySelectorAll('.stats-tab').forEach((t) => t.classList.remove('is-active'));
      outputEl.querySelectorAll('.stats-panel').forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      const panel = outputEl.querySelector(`[data-panel="${target}"]`);
      if (panel) panel.classList.add('is-active');
    });
  });

  // Help panel toggle
  const helpBtn   = getEl('stats-help-btn');
  const helpPanel = getEl('stats-help-panel');
  if (helpBtn && helpPanel) {
    helpBtn.addEventListener('click', () => {
      const isOpen = !helpPanel.classList.contains('hidden');
      helpPanel.classList.toggle('hidden', isOpen);
      helpBtn.classList.toggle('is-active', !isOpen);
    });
  }

  sectionEl.classList.remove('hidden');
  refreshIcons();
}

// ─── Prediction Renderer ──────────────────────────────────────────────────────

/**
 * renderPrediction — Computes and renders the prediction hero card.
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

  const dateFmt  = (d) => formatOccurrenceDate(d);
  const timeFmt  = (d) => formatOccurrenceTime(d);
  const cfClass  = confidenceClass(confidence);
  const minutes  = Math.round(intervalUsedMs / 60_000).toLocaleString();
  const stratDesc = STRATEGY_DESC[strategy] ?? '';

  const confidenceDesc = cfClass === 'high'
    ? `High confidence (≥70 %) — historical intervals are very consistent, so the estimate is likely accurate.`
    : cfClass === 'medium'
      ? `Moderate confidence (40–69 %) — some variability in your intervals; treat the window as a rough guide.`
      : `Low confidence (<40 %) — intervals are irregular, so the prediction may be off by a significant margin.`;

  outputEl.innerHTML = `
    <div class="pred-hero">
      <p class="pred-hero__label"><i data-lucide="target"></i> Next predicted occurrence</p>
      <p class="pred-hero__tell">${formatOccurrenceTell(predicted)}</p>
      <div class="pred-hero__primary">
        <span class="pred-hero__date">${dateFmt(predicted)}</span>
        <span class="pred-hero__time">${timeFmt(predicted)}</span>
        <span class="confidence-badge confidence-badge--${cfClass}">
          ${confidence}% &mdash; ${label}
        </span>
      </div>
      <p class="pred-field-desc">${confidenceDesc}</p>
      <div class="pred-hero__window">
        <i data-lucide="calendar-range"></i>
        <span>${dateFmt(earliest)} ${timeFmt(earliest)}</span>
        <span class="pred-hero__arrow">&#8594;</span>
        <span>${dateFmt(latest)} ${timeFmt(latest)}</span>
      </div>
      <p class="pred-field-desc">Likely window — the range within which the next occurrence is most expected to fall (± one standard deviation).</p>
      <div class="pred-hero__chips">
        <span class="chip"><i data-lucide="zap"></i><span class="chip__label">Strategy:</span> ${strategy}</span>
        <span class="chip"><i data-lucide="timer"></i><span class="chip__label">Interval used:</span> ${minutes}&thinsp;min</span>
      </div>
      <p class="pred-field-desc">${stratDesc}</p>
    </div>
  `;

  sectionEl.classList.remove('hidden');
  refreshIcons();
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

  const originalLabel  = btn.innerHTML;
  const confirmLabel   = '<i data-lucide="alert-triangle"></i><span>Confirm — this will erase all data</span>';
  let   pendingConfirm = false;

  function cancelConfirm() {
    pendingConfirm  = false;
    btn.innerHTML   = originalLabel;
    btn.classList.remove('new-session-btn--confirm');
    refreshIcons();
  }

  function handleOutsideClick(e) {
    if (e.target !== btn) {
      cancelConfirm();
      document.removeEventListener('click', handleOutsideClick);
    }
  }

  btn.addEventListener('click', () => {
    if (!pendingConfirm) {
      pendingConfirm = true;
      btn.innerHTML  = confirmLabel;
      btn.classList.add('new-session-btn--confirm');
      refreshIcons();
      setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
      }, 0);
    } else {
      document.removeEventListener('click', handleOutsideClick);
      cancelConfirm();
      clearRecords();

      const inputEl = getEl('occurrence-input');
      if (inputEl) inputEl.value = '';
      clearFeedback();

      const singleEl = getEl('single-occurrence-input');
      if (singleEl) singleEl.value = '';
      clearSingleFeedback();

      renderList();
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

  const newIso  = valid[0].toISOString();
  const lastIso = getLastRecord();

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

// ─── Download Report Handler ──────────────────────────────────────────────────

/**
 * Build a Markdown report from the current session and trigger a file download.
 */
function handleDownloadReport() {
  const occurrences = loadRecords();
  const statistics  = computeStatistics(occurrences);
  const prediction  = predictNext(occurrences);
  const markdown    = buildMarkdownReport(occurrences, statistics, prediction);

  const blob   = new Blob([markdown], { type: 'text/markdown' });
  const url    = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = `interval-tracker-report-${new Date().toISOString().slice(0, 10)}.md`;
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
  initTheme();

  const btn = getEl('submit-occurrences');
  if (btn) {
    btn.addEventListener('click', handleSubmit);
  }

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

  // Download Report
  const reportBtn = getEl('download-report-btn');
  if (reportBtn) reportBtn.addEventListener('click', handleDownloadReport);

  // Import — styled button triggers the hidden file input
  const importInput = getEl('import-file-input');
  const loadBtn     = getEl('load-session-btn');
  if (loadBtn && importInput) {
    loadBtn.addEventListener('click', () => importInput.click());
  }
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleImport(e.target.files[0]);
    });
  }

  renderList();   // applies the correct session mode on page load
  refreshIcons();
}
