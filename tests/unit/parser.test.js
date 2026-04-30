import { describe, it, expect } from 'vitest';
import { parseOccurrences } from '../../src/js/parser.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Assert that every Date in the valid array is a real, non-NaN Date. */
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
});

// ─── Single valid tokens ──────────────────────────────────────────────────────

describe('parseOccurrences — single valid tokens', () => {
  it('parses ISO 8601 with T separator', () => {
    const { valid, invalid } = parseOccurrences('2024-03-15T14:30:00');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    allValidDates(valid);
  });

  it('parses ISO 8601 with space separator', () => {
    const { valid, invalid } = parseOccurrences('2024-03-15 14:30:00');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    allValidDates(valid);
  });

  it('parses a date-only string (no time component)', () => {
    const { valid, invalid } = parseOccurrences('2024-03-15');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    allValidDates(valid);
  });

  it('parses a slash-separated date with time', () => {
    const { valid, invalid } = parseOccurrences('15/03/2024 14:30');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    allValidDates(valid);
  });

  it('parses a dot-separated date with time', () => {
    const { valid, invalid } = parseOccurrences('15.03.2024 14:30');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    allValidDates(valid);
  });
});

// ─── Unambiguous day-first ordering ──────────────────────────────────────────

describe('parseOccurrences — day-first ordering', () => {
  it('correctly parses an unambiguous dd/MM/yyyy date (day > 12)', () => {
    const { valid, invalid } = parseOccurrences('25/03/2024 09:00');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
    // Day must be 25, month must be March (2)
    const d = valid[0];
    expect(d.getUTCDate()).toBe(25);
    expect(d.getUTCMonth()).toBe(2); // March = index 2
  });

  it('correctly parses an unambiguous dd.MM.yyyy date (day > 12)', () => {
    const { valid } = parseOccurrences('28.11.2023 18:45');
    expect(valid).toHaveLength(1);
    expect(valid[0].getUTCDate()).toBe(28);
    expect(valid[0].getUTCMonth()).toBe(10); // November = index 10
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
    // Two commas in a row produce an empty token — should not appear in invalid
    const { valid, invalid } = parseOccurrences('2024-01-01,,2024-02-01');
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(0);
  });

  it('does not put empty tokens in invalid', () => {
    const { invalid } = parseOccurrences('\n\n2024-03-01\n\n');
    expect(invalid).toHaveLength(0);
  });
});

// ─── Multiple tokens — delimiter variants ────────────────────────────────────

describe('parseOccurrences — delimiter variants', () => {
  const three = ['2024-01-10 08:00', '2024-02-20 09:00', '2024-03-30 10:00'];

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
    const input = '2024-01-01\nbad-token\n2024-06-15 12:00:00';
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

// ─── Return type guarantees ───────────────────────────────────────────────────

describe('parseOccurrences — return type guarantees', () => {
  it('always returns an object with valid and invalid arrays', () => {
    const result = parseOccurrences('2024-05-01');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('invalid');
    expect(Array.isArray(result.valid)).toBe(true);
    expect(Array.isArray(result.invalid)).toBe(true);
  });

  it('valid entries are Date instances with non-NaN time', () => {
    const { valid } = parseOccurrences('2024-07-04T12:00:00\n2024-08-15 06:30');
    expect(valid).toHaveLength(2);
    allValidDates(valid);
  });
});
