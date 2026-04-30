/**
 * parser.js — Freeform datetime text parser.
 *
 * Exports a single function that accepts a raw string (e.g. pasted by the
 * user) and attempts to extract valid datetime occurrences from it.
 *
 * ## Format Registry
 *
 * Each handler exposes:
 *   id      — stable string identifier; used as the homogeneity fingerprint.
 *   detect  — fast predicate: returns true when this handler owns the token.
 *   parse   — extracts a Date from the token, or returns null on failure.
 *
 * Handlers are tried in order; the first matching handler wins.
 *
 * ## Format Descriptions
 *
 * ### ISO handlers (year-first, run before the flexible handler)
 *   iso-T     — "2024-03-15T14:30:00"
 *   iso-space — "2024-03-15 14:30:00"
 *   iso-date  — "2024-03-15"
 *
 * ### flexible (catch-all for day/month-first formats)
 *   Matches any line containing:
 *     (any prefix)
 *     (1–2 digits) <any single char> (1–2 digits) <any single char> (4 digits)
 *     (any multi-char separator)
 *     (1–2 digits) <any single char> (2 digits)
 *     [ <any single char> (2 digits) ]   ← optional seconds
 *     (any suffix)
 *
 *   Day/month disambiguation (see docs/decisions.md DEC-0002):
 *     d1 > 12  → d1 is day,   d2 is month
 *     d2 > 12  → d2 is day,   d1 is month
 *     both ≤ 12 → d1 is day,  d2 is month  (European-first default)
 */

// ─── Format Handlers ──────────────────────────────────────────────────────────

const FORMATS = [
  {
    // "2024-03-15T14:30:00"  or  "2024-03-15T14:30"
    id: 'iso-T',
    detect: (t) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t),
    parse(t) {
      const d = new Date(t.trim());
      return isNaN(d.getTime()) ? null : d;
    },
  },
  {
    // "2024-03-15 14:30:00"  or  "2024-03-15 14:30"
    id: 'iso-space',
    detect: (t) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t),
    parse(t) {
      const d = new Date(t.trim().replace(' ', 'T'));
      return isNaN(d.getTime()) ? null : d;
    },
  },
  {
    // "2024-03-15"
    id: 'iso-date',
    detect: (t) => /^\d{4}-\d{2}-\d{2}$/.test(t.trim()),
    parse(t) {
      const d = new Date(`${t.trim()}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    },
  },
  {
    // Flexible catch-all for day/month-first formats with arbitrary separators.
    //
    // Detection pattern (unanchored — ignores any prefix/suffix on the line):
    //   \d{1,2} . \d{1,2} . \d{4} .+ \d{1,2} . \d{2}
    //   └─ d1 ─┘   └─ d2 ─┘  └year┘     └─ HH ─┘  └MM┘
    //
    // Each "." matches exactly one arbitrary character (the separator).
    // The ".+" between the year and the hour matches one-or-more characters
    // (the date–time gap, which may be " - ", "T", "  ", etc.).
    id: 'flexible',
    detect: (t) => /\d{1,2}.\d{1,2}.\d{4}.+\d{1,2}.\d{2}/.test(t),
    parse(t) {
      // Non-greedy match so the date–time separator is consumed minimally,
      // leaving the hour digits for the next capture group.
      const m = t.match(
        /(\d{1,2}).(\d{1,2}).(\d{4}).+?(\d{1,2}).(\d{2})(?:.(\d{2}))?/
      );
      if (!m) return null;

      const [, raw1, raw2, year, hour, minute, second = '0'] = m;
      const n1 = parseInt(raw1, 10);
      const n2 = parseInt(raw2, 10);

      // Resolve day/month ambiguity:
      //   n1 > 12  → n1 must be the day  (months only go to 12)
      //   n2 > 12  → n2 must be the day  (months only go to 12), so n1 is month
      //   both ≤ 12 → default to n1 = day (European-first convention)
      let day, month;
      if (n1 > 12) {
        day = raw1; month = raw2;
      } else if (n2 > 12) {
        day = raw2; month = raw1;
      } else {
        day = raw1; month = raw2;
      }

      return _buildDate(year, month, day, hour, minute, second);
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construct a Date from individual components, building an unambiguous
 * local-time ISO string first so the JS engine cannot misinterpret the input.
 *
 * @param {string|number} year
 * @param {string|number} month   1-based
 * @param {string|number} day
 * @param {string|number} hour
 * @param {string|number} minute
 * @param {string|number} second
 * @returns {Date|null}
 */
function _buildDate(year, month, day, hour, minute, second) {
  const iso =
    `${String(year).padStart(4, '0')}-` +
    `${String(month).padStart(2, '0')}-` +
    `${String(day).padStart(2, '0')}T` +
    `${String(hour).padStart(2, '0')}:` +
    `${String(minute).padStart(2, '0')}:` +
    `${String(second).padStart(2, '0')}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Split raw input text into individual tokens (one per line).
 * Also splits on semicolons, commas, and pipes for inline lists.
 * Empty tokens produced by consecutive delimiters are discarded.
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
 * Match a single token against the format registry.
 *
 * @param {string} token
 * @returns {{ date: Date, formatId: string }|null}
 */
function matchToken(token) {
  for (const fmt of FORMATS) {
    if (fmt.detect(token)) {
      const date = fmt.parse(token);
      if (date) return { date, formatId: fmt.id };
      // detect matched but parse returned null → the token targets this format
      // but is malformed (e.g. month=13). Do not fall through.
      return null;
    }
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * parseOccurrences — Main export.
 *
 * Accepts a freeform string and returns:
 *   valid       — Date objects successfully parsed.
 *   invalid     — raw token strings that matched no known format.
 *   homogeneous — true when all valid tokens share the same format id.
 *                 Single-token and all-invalid inputs are trivially true.
 *   formatId    — the detected format id, or null when there are no valid
 *                 tokens or when formats are mixed.
 *
 * When homogeneous is false, valid still contains the parsed dates so the
 * caller can inspect them, but the submission must be rejected without
 * persisting (enforced in uiController per DEC-0002).
 *
 * @param {string} rawText
 * @returns {{ valid: Date[], invalid: string[], homogeneous: boolean, formatId: string|null }}
 */
export function parseOccurrences(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { valid: [], invalid: [], homogeneous: true, formatId: null };
  }

  const tokens = tokenise(rawText);
  const valid = [];
  const invalid = [];
  const formatIds = new Set();

  for (const token of tokens) {
    const result = matchToken(token);
    if (result) {
      valid.push(result.date);
      formatIds.add(result.formatId);
    } else {
      invalid.push(token);
    }
  }

  const homogeneous = formatIds.size <= 1;
  const formatId = formatIds.size === 1 ? [...formatIds][0] : null;

  return { valid, invalid, homogeneous, formatId };
}
