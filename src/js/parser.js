/**
 * parser.js — Freeform datetime text parser.
 *
 * Exports a single function that accepts a raw string (e.g. pasted by the
 * user) and attempts to extract valid datetime occurrences from it.
 */

/**
 * Normalise a raw token string to improve the chances of `Date` parsing:
 *  - Replace common date separators (dots, slashes) so dd/MM/yyyy → dd-MM-yyyy
 *    but only when they look like date-parts (digits around them).
 *  - Collapse multiple whitespace characters.
 *  - Handle "T"-less ISO-style strings like "2024-03-15 14:30:00".
 *
 * The function intentionally stays lightweight: it improves coverage without
 * trying to enumerate every locale format explicitly.
 *
 * @param {string} token
 * @returns {string}
 */
function normaliseToken(token) {
  let t = token.trim();

  // Collapse whitespace
  t = t.replace(/\s+/g, ' ');

  // Replace dot-separated dates: 15.03.2024 → 15-03-2024
  // Only replace dots that are surrounded by digits to avoid hitting
  // decimal numbers or ellipsis characters.
  t = t.replace(/(\d)\.(\d)/g, '$1-$2');

  // Normalise slash-separated dates: 15/03/2024 → 15-03-2024
  t = t.replace(/(\d)\/(\d)/g, '$1-$2');

  return t;
}

/**
 * Attempt to detect and swap day/month for ambiguous dd-MM-yyyy strings
 * (where the native Date constructor would interpret them as MM-dd-yyyy).
 * Only reorders when the first numeric segment is > 12 (unambiguously a day).
 *
 * @param {string} token  Already normalised token.
 * @returns {string}  Possibly reordered token.
 */
function reorderDayMonth(token) {
  // Match: dd-MM-yyyy [HH:mm[:ss]] or dd-MM-yy ...
  const match = token.match(
    /^(\d{1,2})-(\d{1,2})-(\d{2,4})(.*)$/
  );
  if (!match) return token;

  const [, part1, part2, year, rest] = match;
  const d1 = parseInt(part1, 10);
  const d2 = parseInt(part2, 10);

  // If part1 > 12 it must be the day; reorder to yyyy-MM-dd for safe parsing.
  if (d1 > 12) {
    return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}${rest}`;
  }

  // Ambiguous (both ≤ 12): leave as-is and let the Date constructor handle it.
  return token;
}

/**
 * Split raw input text into individual tokens.
 * Splits on: newlines, semicolons, commas, pipes.
 *
 * @param {string} rawText
 * @returns {string[]}
 */
function tokenise(rawText) {
  return rawText
    .split(/[\n\r,;|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Parse a single normalised token into a Date, or return null on failure.
 *
 * @param {string} token  Raw (un-normalised) token.
 * @returns {Date|null}
 */
function parseToken(token) {
  const normalised = reorderDayMonth(normaliseToken(token));

  const date = new Date(normalised);
  if (!isNaN(date.getTime())) return date;

  // Second attempt: if there's no time component add midnight so that date-only
  // strings like "2024-03-15" are reliably parsed (some engines treat bare
  // date strings as UTC midnight which is fine for us).
  if (!/[\d]T[\d]|[\d] [\d]{1,2}:/.test(normalised)) {
    const withTime = new Date(`${normalised}T00:00:00`);
    if (!isNaN(withTime.getTime())) return withTime;
  }

  return null;
}

/**
 * parseOccurrences — Main export.
 *
 * Accepts a freeform string and returns two collections:
 *  - `valid`   — array of Date objects successfully parsed.
 *  - `invalid` — array of raw token strings that could not be parsed.
 *
 * @param {string} rawText
 * @returns {{ valid: Date[], invalid: string[] }}
 */
export function parseOccurrences(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { valid: [], invalid: [] };
  }

  const tokens = tokenise(rawText);
  const valid = [];
  const invalid = [];

  for (const token of tokens) {
    const date = parseToken(token);
    if (date) {
      valid.push(date);
    } else {
      invalid.push(token);
    }
  }

  return { valid, invalid };
}
