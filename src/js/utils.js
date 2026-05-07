/**
 * utils.js — Shared utility functions and constants.
 *
 * No imports, no side effects, no DOM or localStorage dependencies.
 * Exported symbols are imported by uiController.js, sessionIO.js, and any
 * other module that previously defined its own copy.
 */

// ─── String Helpers ───────────────────────────────────────────────────────────

/**
 * Convert a camelCase key to a human-readable Title Case label.
 *
 * @param {string} key  e.g. "intervalCount"
 * @returns {string}    e.g. "Interval Count"
 */
export function humaniseKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// ─── Numeric Helpers ──────────────────────────────────────────────────────────

/**
 * Round a number to 2 decimal places.
 *
 * @param {number} n
 * @returns {number}
 */
export function round2(n) {
  return Math.round(n * 100) / 100;
}

// ─── Regular Expressions ──────────────────────────────────────────────────────

/**
 * Matches an ISO 8601 datetime string produced by Date#toISOString().
 * Used to pretty-print date values in statistics tiles and reports.
 */
export const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// ─── Unit Conversion ──────────────────────────────────────────────────────────

/**
 * Return the number of milliseconds in one unit of the given display unit.
 *
 * @param {'days'|'hours'|'minutes'} unit
 * @returns {number}
 */
export function msPerUnit(unit) {
  if (unit === 'days')  return 86_400_000;
  if (unit === 'hours') return  3_600_000;
  return 60_000;
}
