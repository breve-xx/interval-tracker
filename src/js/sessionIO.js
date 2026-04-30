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
