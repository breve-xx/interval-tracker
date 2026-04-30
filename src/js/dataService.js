/**
 * dataService.js — localStorage persistence layer.
 *
 * All read/write operations for interval records are centralised here.
 * Records are stored as an array of UTC ISO 8601 strings under a single key.
 */

const STORAGE_KEY = 'intervalTracker.records';

/**
 * Load all persisted records from localStorage.
 *
 * @returns {string[]}  Array of UTC ISO 8601 strings, sorted ascending.
 *                      Returns an empty array if nothing is stored yet.
 */
export function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[dataService] Failed to load records:', e);
    return [];
  }
}

/**
 * Persist the provided records array to localStorage, replacing any
 * previously stored data.
 *
 * @param {string[]} records  Array of UTC ISO 8601 strings.
 */
export function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('[dataService] Failed to save records:', e);
  }
}

/**
 * Merge new dates into the existing record set, deduplicate, sort
 * chronologically ascending, and persist.
 *
 * @param {Date[]} newDates  Array of Date objects to add.
 * @returns {string[]}       The complete updated array of ISO strings.
 */
export function addRecords(newDates) {
  const existing = loadRecords();

  // Convert incoming Dates to ISO strings
  const incoming = newDates.map((d) => d.toISOString());

  // Merge and deduplicate using a Set
  const merged = Array.from(new Set([...existing, ...incoming]));

  // Sort chronologically (string ISO comparison works for UTC ISO 8601)
  merged.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  saveRecords(merged);
  return merged;
}

/**
 * Erase all persisted records from localStorage.
 */
export function clearRecords() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns the ISO string of the most recent persisted record, or null if the
 * store is empty.
 *
 * Because loadRecords() always returns a chronologically sorted array, the
 * last element is always the newest record.
 *
 * @returns {string|null}
 */
export function getLastRecord() {
  const records = loadRecords();
  return records.length > 0 ? records[records.length - 1] : null;
}
