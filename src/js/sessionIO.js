/**
 * sessionIO.js — Export/import serialisation layer (DEC-0004).
 *
 * Pure functions with no DOM or localStorage dependencies.
 * All exported data follows the v1 snapshot format:
 *
 *   {
 *     version    : 1,
 *     exportedAt : "<ISO 8601 UTC>",
 *     occurrences: [ "<ISO string>", … ],
 *     statistics : <computeStatistics() result | null>,
 *     prediction : <predictNext() result      | null>,
 *   }
 *
 * On import only `occurrences` is consumed; statistics and prediction are
 * ignored and recomputed from scratch (DEC-0004).
 */

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Assemble the full v1 export payload object.
 *
 * @param {string[]}    occurrences  Array of UTC ISO 8601 strings.
 * @param {object|null} statistics   Result of computeStatistics(), or null.
 * @param {object|null} prediction   Result of predictNext(), or null.
 * @returns {object}                 Export payload ready to be JSON-serialised.
 */
export function buildExportPayload(occurrences, statistics, prediction) {
  return {
    version    : 1,
    exportedAt : new Date().toISOString(),
    occurrences,
    statistics,
    prediction,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Parse and validate an import JSON string.
 *
 * Validation rules (first failure wins):
 *   1. Must be valid JSON.
 *   2. Top-level value must be a plain object (not array, null, etc.).
 *   3. `version` must be exactly 1.
 *   4. `occurrences` must be an array.
 *   5. `occurrences` must not be empty.
 *   6. Every element must be a non-empty string that parses as a valid date.
 *
 * @param {string} jsonString  Raw file content.
 * @returns {{ ok: true,  occurrences: string[] }
 *          |{ ok: false, error: string }}
 */
export function parseImportPayload(jsonString) {
  // 1. JSON parse
  let payload;
  try {
    payload = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'Invalid file: not valid JSON.' };
  }

  // 2. Must be a plain object
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'Invalid file: expected a JSON object.' };
  }

  // 3. Version check
  if (payload.version !== 1) {
    return { ok: false, error: 'Unsupported file version. Only version 1 is supported.' };
  }

  // 4. occurrences must be an array
  if (!Array.isArray(payload.occurrences)) {
    return { ok: false, error: 'Invalid file: occurrences must be an array.' };
  }

  // 5. occurrences must not be empty
  if (payload.occurrences.length === 0) {
    return { ok: false, error: 'Invalid file: no occurrences found.' };
  }

  // 6. Every element must be a valid datetime string
  for (let i = 0; i < payload.occurrences.length; i++) {
    const val = payload.occurrences[i];
    if (typeof val !== 'string' || isNaN(new Date(val).getTime())) {
      return {
        ok    : false,
        error : `Invalid file: occurrence at index ${i} is not a valid datetime.`,
      };
    }
  }

  return { ok: true, occurrences: payload.occurrences };
}

// ─── Markdown Report ──────────────────────────────────────────────────────────

/**
 * Format an ISO 8601 date string as DD/MM/YYYY.
 * @param {string} iso
 * @returns {string}
 */
function isoToDate(iso) {
  const [datePart] = iso.split('T');
  const [y, m, d]  = datePart.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Format an ISO 8601 datetime string as HH:MM.
 * Returns '—' when the ISO string has no time component.
 * @param {string} iso
 * @returns {string}
 */
function isoToTime(iso) {
  const parts = iso.split('T');
  if (parts.length < 2) return '—';
  return parts[1].slice(0, 5);
}

/**
 * Render a Markdown table from an object's entries.
 * Array values are comma-joined; empty arrays render as '—'.
 * @param {object} obj
 * @returns {string}
 */
function buildMdTable(obj) {
  const rows = Object.entries(obj).map(([k, v]) => {
    const display = Array.isArray(v) ? (v.length === 0 ? '—' : v.join(', ')) : v;
    return `| ${k} | ${display} |`;
  });
  return ['| Metric | Value |', '|--------|-------|', ...rows].join('\n');
}

/**
 * Render a Markdown report string from a full session snapshot.
 *
 * @param {string[]}    occurrences  Array of UTC ISO 8601 strings.
 * @param {object|null} statistics   Result of computeStatistics(), or null.
 * @param {object|null} prediction   Result of predictNext(), or null.
 * @returns {string}                 UTF-8 Markdown document.
 */
export function buildMarkdownReport(occurrences, statistics, prediction) {
  const lines = [];

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push('# Interval Tracker — Session Report', '');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Occurrences: ${occurrences.length}`, '');
  lines.push('---', '');

  // ── Occurrences table ────────────────────────────────────────────────────────
  lines.push('## Occurrences', '');
  lines.push('| # | Date | Time |');
  lines.push('|---|------|------|');
  occurrences.forEach((iso, i) => {
    lines.push(`| ${i + 1} | ${isoToDate(iso)} | ${isoToTime(iso)} |`);
  });
  lines.push('', '---', '');

  // ── Statistics ───────────────────────────────────────────────────────────────
  if (statistics !== null) {
    const { unit, basic, advanced, nerd } = statistics;
    lines.push('## Statistics', '');
    lines.push(`**Unit:** ${unit}`, '');
    lines.push('### Basic', '');
    lines.push(buildMdTable(basic), '');
    lines.push('### Advanced', '');
    lines.push(buildMdTable(advanced), '');
    lines.push('### Nerd', '');
    lines.push(buildMdTable(nerd), '');
    lines.push('---', '');
  }

  // ── Prediction ───────────────────────────────────────────────────────────────
  if (prediction !== null) {
    const {
      predictedDate, earliestDate, latestDate,
      confidence, confidenceLabel,
      strategy, intervalUsedMs,
    } = prediction;
    lines.push('## Prediction', '');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push(`| Predicted date | ${isoToDate(predictedDate)} ${isoToTime(predictedDate)} |`);
    lines.push(`| Window earliest | ${isoToDate(earliestDate)} ${isoToTime(earliestDate)} |`);
    lines.push(`| Window latest | ${isoToDate(latestDate)} ${isoToTime(latestDate)} |`);
    lines.push(`| Confidence | ${confidence}% — ${confidenceLabel} |`);
    lines.push(`| Strategy | ${strategy} |`);
    lines.push(`| Interval used | ${Math.round(intervalUsedMs / 60_000)} minutes |`);
    lines.push('');
  }

  return lines.join('\n');
}
