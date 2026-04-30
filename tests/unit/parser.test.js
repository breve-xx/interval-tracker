import { describe, it, expect } from 'vitest';
import { parseOccurrences } from '../../src/js/parser.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Assert that every element of `dates` is a real, non-NaN Date instance. */
function allValidDates(dates) {
  for (const d of dates) {
    expect(d).toBeInstanceOf(Date);
    expect(d.getTime()).not.toBeNaN();
  }
}

// ─── Empty / whitespace input ─────────────────────────────────────────────────

describe('parseOccurrences — empty / whitespace input', () => {
  it('returns empty arrays for a blank string', () => {
    const { valid, invalid } = parseOccurrences('');
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(0);
  });

  it('returns empty arrays for a whitespace-only string', () => {
    const { valid, invalid } = parseOccurrences('   \n\t  ');
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(0);
  });

  it('returns empty arrays for a non-string input (null guard)', () => {
    const { valid, invalid } = parseOccurrences(null);
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(0);
  });

  it('is homogeneous and has null formatId for empty input', () => {
    const { homogeneous, formatId } = parseOccurrences('');
    expect(homogeneous).toBe(true);
    expect(formatId).toBeNull();
  });
});

// ─── ISO handlers ─────────────────────────────────────────────────────────────

describe('parseOccurrences — ISO formats', () => {
  it('parses ISO 8601 with T separator → formatId iso-T', () => {
    const { valid, invalid, formatId } = parseOccurrences('2024-03-15T14:30:00');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    expect(formatId).toBe('iso-T');
    allValidDates(valid);
  });

  it('parses ISO 8601 with space separator → formatId iso-space', () => {
    const { valid, invalid, formatId } = parseOccurrences('2024-03-15 14:30:00');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    expect(formatId).toBe('iso-space');
    allValidDates(valid);
  });

  it('parses ISO date-only string → formatId iso-date', () => {
    const { valid, invalid, formatId } = parseOccurrences('2024-03-15');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    expect(formatId).toBe('iso-date');
    allValidDates(valid);
  });

  it('parses ISO 8601 without seconds', () => {
    const { valid } = parseOccurrences('2024-03-15T14:30');
    expect(valid).toHaveLength(1);
    allValidDates(valid);
  });
});

// ─── Flexible format — separator variants ────────────────────────────────────

describe('parseOccurrences — flexible: separator variants', () => {
  it('parses slash-separated date with colon time  (DD/MM/YYYY HH:MM)', () => {
    const { valid, formatId } = parseOccurrences('15/03/2024 14:30');
    expect(valid).toHaveLength(1);
    expect(formatId).toBe('flexible');
    allValidDates(valid);
  });

  it('parses dot-separated date with colon time  (DD.MM.YYYY HH:MM)', () => {
    const { valid, formatId } = parseOccurrences('15.03.2024 14:30');
    expect(valid).toHaveLength(1);
    expect(formatId).toBe('flexible');
    allValidDates(valid);
  });

  it('parses dash-separated date with colon time  (DD-MM-YYYY HH:MM)', () => {
    const { valid, formatId } = parseOccurrences('15-03-2024 14:30');
    expect(valid).toHaveLength(1);
    expect(formatId).toBe('flexible');
    allValidDates(valid);
  });

  it('parses date with dot time separator  (DD/MM/YYYY HH.MM)', () => {
    const { valid, formatId } = parseOccurrences('20/02/2026 15.10');
    expect(valid).toHaveLength(1);
    expect(formatId).toBe('flexible');
    allValidDates(valid);
  });

  it('parses date with " - " as date–time separator  (DD/MM/YYYY - HH.MM)', () => {
    const { valid } = parseOccurrences('20/02/2026 - 15.10');
    expect(valid).toHaveLength(1);
    allValidDates(valid);
  });

  it('parses with seconds appended  (DD/MM/YYYY HH:MM:SS)', () => {
    const { valid } = parseOccurrences('15/03/2024 14:30:45');
    expect(valid).toHaveLength(1);
    expect(valid[0].getSeconds()).toBe(45);
  });

  it('parses with dot seconds  (DD.MM.YYYY HH.MM.SS)', () => {
    const { valid } = parseOccurrences('15.03.2024 14.30.45');
    expect(valid).toHaveLength(1);
    expect(valid[0].getHours()).toBe(14);
    expect(valid[0].getMinutes()).toBe(30);
    expect(valid[0].getSeconds()).toBe(45);
  });
});

// ─── Flexible format — prefix/suffix tolerance ───────────────────────────────

describe('parseOccurrences — flexible: any prefix and suffix', () => {
  it('strips a "- " bullet prefix  (- DD/MM/YYYY - HH.MM)', () => {
    const { valid, formatId } = parseOccurrences('- 20/02/2026 - 15.10');
    expect(valid).toHaveLength(1);
    expect(formatId).toBe('flexible');
    allValidDates(valid);
  });

  it('strips a "* " bullet prefix', () => {
    const { valid } = parseOccurrences('* 15/06/2025 - 10.30');
    expect(valid).toHaveLength(1);
    allValidDates(valid);
  });

  it('strips a "• " bullet prefix', () => {
    const { valid } = parseOccurrences('• 15/06/2025 - 10.30');
    expect(valid).toHaveLength(1);
    allValidDates(valid);
  });

  it('strips a numbered-list prefix  (1. DD/MM/YYYY HH:MM)', () => {
    const { valid } = parseOccurrences('1. 20/02/2026 15:10');
    expect(valid).toHaveLength(1);
    allValidDates(valid);
  });

  it('ignores trailing text after the time', () => {
    const { valid } = parseOccurrences('20/02/2026 15.10 some note');
    expect(valid).toHaveLength(1);
    allValidDates(valid);
  });
});

// ─── Flexible format — day/month disambiguation ──────────────────────────────

describe('parseOccurrences — flexible: day/month disambiguation', () => {
  it('d1 > 12 → d1 is day  (25/03/2024 09:00 → 25 March)', () => {
    const { valid } = parseOccurrences('25/03/2024 09:00');
    expect(valid).toHaveLength(1);
    expect(valid[0].getDate()).toBe(25);
    expect(valid[0].getMonth()).toBe(2); // March = index 2
  });

  it('d2 > 12 → d2 is day  (03/25/2024 09:00 → 25 March)', () => {
    const { valid } = parseOccurrences('03/25/2024 09:00');
    expect(valid).toHaveLength(1);
    expect(valid[0].getDate()).toBe(25);
    expect(valid[0].getMonth()).toBe(2); // March = index 2
  });

  it('both ≤ 12 → d1 is day (European default)  (01/03/2026 14:17 → 1 March)', () => {
    const { valid } = parseOccurrences('01/03/2026 14:17');
    expect(valid).toHaveLength(1);
    expect(valid[0].getFullYear()).toBe(2026);
    expect(valid[0].getMonth()).toBe(2);  // March = index 2
    expect(valid[0].getDate()).toBe(1);
    expect(valid[0].getHours()).toBe(14);
    expect(valid[0].getMinutes()).toBe(17);
  });

  it('correctly parses the full user sample (8 bulleted entries)', () => {
    const input = [
      '- 20/02/2026 - 15.10',
      '- 01/03/2026 - 14.17',
      '- 10/03/2026 - 18.15',
      '- 20/03/2026 - 09.17',
      '- 28/03/2026 - 19.43',
      '- 07/04/2026 - 10.00',
      '- 16/04/2026 - 19.04',
      '- 25/04/2026 - 20.07',
    ].join('\n');
    const { valid, invalid, homogeneous, formatId } = parseOccurrences(input);
    expect(valid).toHaveLength(8);
    expect(invalid).toHaveLength(0);
    expect(homogeneous).toBe(true);
    expect(formatId).toBe('flexible');
    allValidDates(valid);
  });

  it('correctly extracts components for first entry of user sample', () => {
    const { valid } = parseOccurrences('- 20/02/2026 - 15.10');
    const d = valid[0];
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1);   // February = index 1
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(10);
  });
});

// ─── Invalid tokens ───────────────────────────────────────────────────────────

describe('parseOccurrences — invalid tokens', () => {
  it('places an unrecognisable string in invalid', () => {
    const { valid, invalid } = parseOccurrences('not-a-date');
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]).toBe('not-a-date');
  });

  it('silently ignores empty tokens between delimiters', () => {
    const { valid, invalid } = parseOccurrences('2024-01-01T00:00:00,,2024-02-01T00:00:00');
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(0);
  });

  it('does not put empty tokens in invalid', () => {
    const { invalid } = parseOccurrences('\n\n2024-03-01\n\n');
    expect(invalid).toHaveLength(0);
  });

  it('treats an impossible date (month=13) as invalid', () => {
    const { valid, invalid } = parseOccurrences('- 31/13/2026 - 10.00');
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(1);
  });

  it('treats an impossible date (day=32) as invalid', () => {
    const { valid, invalid } = parseOccurrences('32/01/2024 10:00');
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(1);
  });

  it('treats a flexible-style date without time as invalid', () => {
    // date-only without ISO year-first format → no time part → no match
    const { valid, invalid } = parseOccurrences('15/03/2024');
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(1);
  });
});

// ─── Delimiter variants ───────────────────────────────────────────────────────

describe('parseOccurrences — delimiter variants', () => {
  const three = [
    '2024-01-10T08:00:00',
    '2024-02-20T09:00:00',
    '2024-03-30T10:00:00',
  ];

  it('splits on newlines', () => {
    const { valid } = parseOccurrences(three.join('\n'));
    expect(valid).toHaveLength(3);
    allValidDates(valid);
  });

  it('splits on commas', () => {
    const { valid } = parseOccurrences(three.join(','));
    expect(valid).toHaveLength(3);
    allValidDates(valid);
  });

  it('splits on semicolons', () => {
    const { valid } = parseOccurrences(three.join(';'));
    expect(valid).toHaveLength(3);
    allValidDates(valid);
  });

  it('splits on pipes', () => {
    const { valid } = parseOccurrences(three.join('|'));
    expect(valid).toHaveLength(3);
    allValidDates(valid);
  });
});

// ─── Mixed valid and invalid ──────────────────────────────────────────────────

describe('parseOccurrences — mixed valid and invalid tokens', () => {
  it('separates 2 valid and 1 invalid token correctly', () => {
    const input = '2024-01-01T00:00:00\nbad-token\n2024-06-15T12:00:00';
    const { valid, invalid } = parseOccurrences(input);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]).toBe('bad-token');
    allValidDates(valid);
  });

  it('handles all-invalid input without throwing', () => {
    const { valid, invalid } = parseOccurrences('foo;bar;baz');
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(3);
  });
});

// ─── Homogeneity ──────────────────────────────────────────────────────────────

describe('parseOccurrences — homogeneity', () => {
  it('is homogeneous when all tokens share the same format', () => {
    const { homogeneous, formatId } = parseOccurrences(
      '2024-01-01T08:00:00\n2024-06-15T12:00:00'
    );
    expect(homogeneous).toBe(true);
    expect(formatId).toBe('iso-T');
  });

  it('is homogeneous for a single token', () => {
    const { homogeneous } = parseOccurrences('2024-03-15');
    expect(homogeneous).toBe(true);
  });

  it('is homogeneous when all tokens are invalid (vacuously true)', () => {
    const { homogeneous, formatId } = parseOccurrences('foo\nbar');
    expect(homogeneous).toBe(true);
    expect(formatId).toBeNull();
  });

  it('is homogeneous mixing list-prefixed and plain flexible entries', () => {
    // Both resolve to formatId "flexible" — same format, different decorations
    const input = '- 20/02/2026 - 15.10\n15/03/2024 14:30';
    const { homogeneous, formatId } = parseOccurrences(input);
    expect(homogeneous).toBe(true);
    expect(formatId).toBe('flexible');
  });

  it('is NOT homogeneous when mixing iso-T and flexible', () => {
    const input = '2024-03-15T14:30:00\n- 20/02/2026 - 15.10';
    const { homogeneous } = parseOccurrences(input);
    expect(homogeneous).toBe(false);
  });

  it('is NOT homogeneous when mixing iso-space and flexible', () => {
    const input = '2024-03-15 14:30:00\n15/03/2024 14:30';
    const { homogeneous } = parseOccurrences(input);
    expect(homogeneous).toBe(false);
  });

  it('returns null formatId when formats are mixed', () => {
    const { formatId } = parseOccurrences(
      '2024-03-15T14:30:00\n15/03/2024 14:30'
    );
    expect(formatId).toBeNull();
  });

  it('still populates valid array even when not homogeneous', () => {
    const { valid, homogeneous } = parseOccurrences(
      '2024-03-15T14:30:00\n15/03/2024 14:30'
    );
    expect(homogeneous).toBe(false);
    expect(valid).toHaveLength(2);
  });
});

// ─── Return shape guarantee ───────────────────────────────────────────────────

describe('parseOccurrences — return shape', () => {
  it('always returns valid, invalid, homogeneous, and formatId', () => {
    const result = parseOccurrences('2024-05-01');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('invalid');
    expect(result).toHaveProperty('homogeneous');
    expect(result).toHaveProperty('formatId');
    expect(Array.isArray(result.valid)).toBe(true);
    expect(Array.isArray(result.invalid)).toBe(true);
  });

  it('valid entries are Date instances with non-NaN time', () => {
    const { valid } = parseOccurrences('2024-07-04T12:00:00\n2024-08-15T06:30:00');
    expect(valid).toHaveLength(2);
    allValidDates(valid);
  });
});
