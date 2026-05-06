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

import { formatOccurrenceTell, formatOccurrenceDate, formatOccurrenceTime } from './formatters.js';
import { STATS_GLOSSARY, STATS_LEVEL_DESC, STRATEGY_DESC } from './reportConstants.js';

// ── Internal formatting helpers ───────────────────────────────────────────────

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
 * Convert a camelCase key to a human-readable Title Case label.
 * @param {string} key
 * @returns {string}
 */
function humaniseKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Round a number to 2 decimal places.
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Keys whose numeric values represent interval lengths and should receive
 * a unit suffix in the Markdown report.
 */
const INTERVAL_KEYS = new Set([
  'mean', 'min', 'max', 'range', 'totalSpan',
  'median', 'stdDev', 'variance',
  'q1', 'q3', 'iqr',
  'mad', 'outliers',
  'regressionSlope', 'regressionIntercept',
]);

/**
 * Keys whose string values are ISO datetime strings (first / last).
 */
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Format a statistics value for the Markdown report.
 *
 * @param {*}      v    The raw value.
 * @param {string} key  The statistics key name.
 * @param {string} unit The session display unit ('days' | 'hours' | 'minutes').
 * @returns {string}
 */
function fmtStatVal(v, key, unit) {
  const needsUnit = INTERVAL_KEYS.has(key);

  if (Array.isArray(v)) {
    if (v.length === 0) return '—';
    const nums = v.map((n) => (typeof n === 'number' ? round2(n) : n)).join(', ');
    return needsUnit ? `${nums} ${unit}` : nums;
  }

  if (typeof v === 'string' && ISO_DATETIME_RE.test(v)) {
    const d = new Date(v);
    return `${formatOccurrenceDate(d)} ${formatOccurrenceTime(d)}`;
  }

  if (typeof v === 'number') {
    const formatted = String(round2(v));
    return needsUnit ? `${formatted} ${unit}` : formatted;
  }

  return String(v);
}

// ── Section builders ──────────────────────────────────────────────────────────

/**
 * Build the prediction section (§2 of the template).
 *
 * @param {object} prediction  Result of predictNext().
 * @param {string} unit        Session display unit.
 * @returns {string}
 */
function buildPredictionSection(prediction, unit) {
  const {
    predictedDate, earliestDate, latestDate,
    confidence, confidenceLabel,
    strategy, intervalUsedMs,
  } = prediction;

  const tell          = formatOccurrenceTell(new Date(predictedDate));
  const dateStr       = isoToDate(predictedDate);
  const timeStr       = isoToTime(predictedDate);
  const earliestStr   = `${isoToDate(earliestDate)} ${isoToTime(earliestDate)}`;
  const latestStr     = `${isoToDate(latestDate)} ${isoToTime(latestDate)}`;
  const stratDesc     = STRATEGY_DESC[strategy] ?? strategy;

  // Confidence narrative (mirrors uiController.js renderPrediction)
  let confNarrative;
  if (confidence >= 70) {
    confNarrative = 'High confidence (≥70 %) — historical intervals are very consistent, so the estimate is likely accurate.';
  } else if (confidence >= 40) {
    confNarrative = 'Moderate confidence (40–69 %) — some variability in your intervals; treat the window as a rough guide.';
  } else {
    confNarrative = 'Low confidence (<40 %) — intervals are irregular, so the prediction may be off by a significant margin.';
  }

  // Interval used in the session unit (rounded to 2 dp)
  const unitDivisor = unit === 'days' ? 86_400_000 : unit === 'hours' ? 3_600_000 : 60_000;
  const intervalUsedInUnit = round2(intervalUsedMs / unitDivisor);

  // Time remaining from now to the predicted date
  const nowMs         = Date.now();
  const predictedMs   = new Date(predictedDate).getTime();
  const diffMs        = predictedMs - nowMs;

  let timeBlock;
  if (diffMs > 0) {
    const totalMins = Math.floor(diffMs / 60_000);
    const days      = Math.floor(totalMins / 1440);
    const hours     = Math.floor((totalMins % 1440) / 60);
    const mins      = totalMins % 60;
    timeBlock       = `**Time remaining:** ${days} d  ${hours} h  ${mins} min`;
  } else {
    timeBlock = '**Note:** The predicted date has already passed.';
  }

  const lines = [
    '---',
    '',
    '## ▶ Next predicted occurrence',
    '',
    `**${tell}**`,
    `${dateStr}  ·  ${timeStr}`,
    '',
    `**Confidence: ${confidence}% — ${confidenceLabel}**`,
    `_${confNarrative}_`,
    '',
    `**Prediction window:** ${earliestStr} → ${latestStr}`,
    '_Likely range: ± one standard deviation around the predicted date._',
    '',
    timeBlock,
    '',
    `**Strategy:** ${strategy}`,
    `_${stratDesc}_`,
    '',
    `**Interval used:** ${intervalUsedInUnit} ${unit}`,
    '',
  ];

  return lines.join('\n');
}

/**
 * Build the ASCII bar chart section (§3 of the template).
 *
 * @param {object} statistics  Result of computeStatistics().
 * @param {string[]} occurrences  Array of UTC ISO 8601 strings.
 * @returns {string}
 */
function buildChartSection(statistics, occurrences) {
  const { unit, advanced } = statistics;
  const { trend } = advanced;
  const mean = round2(statistics.basic.mean);

  // Build raw interval array in the session unit
  const unitDivisor = unit === 'days' ? 86_400_000 : unit === 'hours' ? 3_600_000 : 60_000;
  const dates     = occurrences.map((iso) => new Date(iso).getTime());
  const intervals = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push(Math.round((dates[i] - dates[i - 1]) / unitDivisor * 100) / 100);
  }

  if (intervals.length === 0) return '';

  // Normalise to bar heights 0–7
  const BLOCKS   = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const maxVal   = Math.max(...intervals);
  const barChars = intervals.map((v) => {
    const idx = maxVal === 0 ? 0 : Math.round((v / maxVal) * 7);
    return BLOCKS[Math.min(7, Math.max(0, idx))];
  });

  const chartLine = barChars.join(' ');

  // Gap labels (only for ≤ 12 intervals)
  let labelsLine = '';
  if (intervals.length <= 12) {
    labelsLine = intervals.map((_, i) => `Gap #${i + 1}`).join('  ');
  }

  // Trend arrow
  let trendLine;
  if (trend === 'increasing') {
    trendLine = '▲ intervals are growing';
  } else if (trend === 'decreasing') {
    trendLine = '▼ intervals are shrinking';
  } else {
    trendLine = '─ intervals are stable';
  }

  const lines = [
    '---',
    '',
    `## Interval Chart  [${unit}]`,
    '',
    '```',
    chartLine,
    '```',
  ];

  if (labelsLine) {
    lines.push(labelsLine);
  }

  lines.push(
    '',
    `Trend: ${trendLine}   ·   Mean: ${mean} ${unit}`,
    '',
  );

  return lines.join('\n');
}

/**
 * Render all three statistics levels as definition blocks (§4 of the template).
 *
 * @param {object} statistics  Result of computeStatistics().
 * @returns {string}
 */
function buildStatisticsSection(statistics) {
  const { unit, count, basic, advanced, nerd } = statistics;

  /**
   * Build one level's definition blocks.
   * @param {object} obj        The level sub-object (basic | advanced | nerd).
   * @param {string} level      'basic' | 'advanced' | 'nerd'
   * @returns {string}
   */
  function buildLevel(obj, level) {
    const glossary = STATS_GLOSSARY[level] ?? {};
    const blocks = Object.entries(obj).map(([k, v]) => {
      const label = humaniseKey(k);
      const value = fmtStatVal(v, k, unit);
      const desc  = glossary[k] ?? '';
      return `**${label}:** ${value}\n_${desc}_`;
    });
    const levelTitle = level.charAt(0).toUpperCase() + level.slice(1);
    return [
      `### ${levelTitle}`,
      `_${STATS_LEVEL_DESC[level]}_`,
      '',
      blocks.join('\n\n'),
      '',
    ].join('\n');
  }

  const lines = [
    '---',
    '',
    `## Statistics  [${unit}  ·  ${count} occurrences]`,
    '',
    buildLevel(basic,    'basic'),
    buildLevel(advanced, 'advanced'),
    buildLevel(nerd,     'nerd'),
  ];

  return lines.join('\n');
}

/**
 * Build the compact occurrences list (§5 of the template).
 * Sessions longer than 50 occurrences are truncated to first 10 + last 10.
 *
 * @param {string[]} occurrences  Array of UTC ISO 8601 strings.
 * @returns {string}
 */
function buildOccurrencesSection(occurrences) {
  const count = occurrences.length;
  const TRUNCATE_THRESHOLD = 50;
  const SHOW_EDGES         = 10;

  let listLines;

  if (count > TRUNCATE_THRESHOLD) {
    const head = occurrences.slice(0, SHOW_EDGES);
    const tail = occurrences.slice(count - SHOW_EDGES);
    const headLines = head.map((iso, i) => `${i + 1}. ${isoToDate(iso)} ${isoToTime(iso)}`);
    const tailLines = tail.map((iso, i) => `${count - SHOW_EDGES + i + 1}. ${isoToDate(iso)} ${isoToTime(iso)}`);
    listLines = [
      ...headLines,
      '',
      `… ${count - SHOW_EDGES * 2} more occurrences …`,
      '',
      ...tailLines,
    ];
  } else {
    listLines = occurrences.map((iso, i) => `${i + 1}. ${isoToDate(iso)} ${isoToTime(iso)}`);
  }

  return [
    '---',
    '',
    `## Occurrences (${count})`,
    '',
    ...listLines,
    '',
  ].join('\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render a Markdown report string from a full session snapshot.
 *
 * Template order (mirroring the live page):
 *   1. Header
 *   2. Prediction (if available — most actionable, shown first)
 *   3. Interval chart (if statistics available)
 *   4. Statistics (if available)
 *   5. Occurrences (compact numbered list — at the end)
 *   6. Footer
 *
 * @param {string[]}    occurrences  Array of UTC ISO 8601 strings.
 * @param {object|null} statistics   Result of computeStatistics(), or null.
 * @param {object|null} prediction   Result of predictNext(), or null.
 * @returns {string}                 UTF-8 Markdown document.
 */
export function buildMarkdownReport(occurrences, statistics, prediction) {
  // ── Header ───────────────────────────────────────────────────────────────────
  const now     = new Date();
  const genDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const genTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const header = [
    '# Interval Tracker — Session Report',
    '',
    `Generated: ${genDate} at ${genTime}   ·   ${occurrences.length} occurrences recorded`,
    '',
  ].join('\n');

  // ── Section assembly ──────────────────────────────────────────────────────────
  const unit = statistics ? statistics.unit : 'minutes';

  const predSection   = prediction  !== null ? buildPredictionSection(prediction, unit)     : '';
  const chartSection  = statistics  !== null ? buildChartSection(statistics, occurrences)   : '';
  const statsSection  = statistics  !== null ? buildStatisticsSection(statistics)            : '';
  const occSection    = buildOccurrencesSection(occurrences);

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footer = [
    '---',
    '',
    '_Report generated by Interval Tracker · https://github.com/breve-xx/interval-tracker_',
  ].join('\n');

  return [header, predSection, chartSection, statsSection, occSection, footer]
    .filter((s) => s.length > 0)
    .join('\n');
}
