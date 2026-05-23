import { describe, it, expect } from 'vitest';
import {
  formatOccurrenceDate,
  formatOccurrenceTime,
  formatOccurrenceTell,
  formatGap,
} from '../../src/js/formatters.js';

// Helper: build a local Date with explicit fields to avoid UTC/local mismatch.
function d(year, month /* 1-based */, day, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute);
}

// ─── formatOccurrenceDate ─────────────────────────────────────────────────────

describe('formatOccurrenceDate', () => {
  it('formats a typical date correctly', () => {
    expect(formatOccurrenceDate(d(2024, 3, 15))).toBe('15/03/2024');
  });

  it('zero-pads single-digit day and month', () => {
    expect(formatOccurrenceDate(d(2024, 1, 5))).toBe('05/01/2024');
  });

  it('handles midnight (start of day) correctly', () => {
    expect(formatOccurrenceDate(d(2024, 12, 31, 0, 0))).toBe('31/12/2024');
  });

  it('handles noon correctly', () => {
    expect(formatOccurrenceDate(d(2024, 6, 1, 12, 0))).toBe('01/06/2024');
  });

  it('includes the full four-digit year', () => {
    expect(formatOccurrenceDate(d(2000, 1, 1))).toBe('01/01/2000');
  });
});

// ─── formatOccurrenceTime ─────────────────────────────────────────────────────

describe('formatOccurrenceTime', () => {
  it('formats a typical 24-hour time correctly', () => {
    expect(formatOccurrenceTime(d(2024, 3, 15, 14, 30))).toBe('14:30');
  });

  it('returns 00:00 for midnight', () => {
    expect(formatOccurrenceTime(d(2024, 1, 1, 0, 0))).toBe('00:00');
  });

  it('returns 12:00 for noon', () => {
    expect(formatOccurrenceTime(d(2024, 1, 1, 12, 0))).toBe('12:00');
  });

  it('zero-pads single-digit hours', () => {
    expect(formatOccurrenceTime(d(2024, 1, 1, 8, 45))).toBe('08:45');
  });

  it('zero-pads single-digit minutes', () => {
    expect(formatOccurrenceTime(d(2024, 1, 1, 11, 5))).toBe('11:05');
  });

  it('renders 23:59 correctly', () => {
    expect(formatOccurrenceTime(d(2024, 1, 1, 23, 59))).toBe('23:59');
  });
});

// ─── formatOccurrenceTell ─────────────────────────────────────────────────────

describe('formatOccurrenceTell', () => {
  it('uses "st" suffix for the 1st', () => {
    expect(formatOccurrenceTell(d(2024, 1, 1, 11, 55))).toBe('The 1st of January at 11:55');
  });

  it('uses "nd" suffix for the 2nd', () => {
    expect(formatOccurrenceTell(d(2024, 2, 2, 8, 4))).toBe('The 2nd of February at 08:04');
  });

  it('uses "rd" suffix for the 3rd', () => {
    expect(formatOccurrenceTell(d(2024, 3, 3, 0, 0))).toBe('The 3rd of March at 00:00');
  });

  it('uses "th" suffix for the 11th (exception)', () => {
    expect(formatOccurrenceTell(d(2024, 4, 11, 9, 0))).toBe('The 11th of April at 09:00');
  });

  it('uses "th" suffix for the 12th (exception)', () => {
    expect(formatOccurrenceTell(d(2024, 5, 12, 10, 0))).toBe('The 12th of May at 10:00');
  });

  it('uses "th" suffix for the 13th (exception)', () => {
    expect(formatOccurrenceTell(d(2024, 6, 13, 14, 0))).toBe('The 13th of June at 14:00');
  });

  it('uses "st" suffix for the 21st', () => {
    expect(formatOccurrenceTell(d(2024, 7, 21, 7, 30))).toBe('The 21st of July at 07:30');
  });

  it('uses "nd" suffix for the 22nd', () => {
    expect(formatOccurrenceTell(d(2024, 8, 22, 16, 0))).toBe('The 22nd of August at 16:00');
  });

  it('uses "rd" suffix for the 23rd', () => {
    expect(formatOccurrenceTell(d(2024, 9, 23, 20, 0))).toBe('The 23rd of September at 20:00');
  });

  it('uses "st" suffix for the 31st', () => {
    expect(formatOccurrenceTell(d(2024, 10, 31, 12, 0))).toBe('The 31st of October at 12:00');
  });

  it('uses "th" suffix for a generic day (e.g. 4th)', () => {
    expect(formatOccurrenceTell(d(2024, 11, 4, 18, 45))).toBe('The 4th of November at 18:45');
  });

  it('uses "th" suffix for the 15th', () => {
    expect(formatOccurrenceTell(d(2024, 12, 15, 23, 59))).toBe('The 15th of December at 23:59');
  });

  it('embeds the correct HH:mm in the tell string', () => {
    const result = formatOccurrenceTell(d(2024, 3, 15, 8, 5));
    expect(result).toContain('08:05');
  });
});

// ─── formatGap ────────────────────────────────────────────────────────────────

describe('formatGap', () => {
  it('returns "0 m" for exactly zero milliseconds', () => {
    expect(formatGap(0)).toBe('0 m');
  });

  it('returns "< 1 m" for sub-minute positive durations', () => {
    expect(formatGap(1)).toBe('< 1 m');
    expect(formatGap(59_999)).toBe('< 1 m');
  });

  it('returns "{m} m" for exact minute counts under an hour', () => {
    expect(formatGap(43 * 60_000)).toBe('43 m');
    expect(formatGap(60_000)).toBe('1 m');
    expect(formatGap(59 * 60_000)).toBe('59 m');
  });

  it('returns "{h} h {mm} m" for durations under a day', () => {
    expect(formatGap(2 * 3_600_000 + 5 * 60_000)).toBe('2 h 05 m');
    expect(formatGap(1 * 3_600_000 + 0 * 60_000)).toBe('1 h 00 m');
    expect(formatGap(23 * 3_600_000 + 59 * 60_000)).toBe('23 h 59 m');
  });

  it('zero-pads minutes to 2 digits in the hours format', () => {
    expect(formatGap(3 * 3_600_000 + 9 * 60_000)).toBe('3 h 09 m');
  });

  it('returns "{d} d {h} h {mm} m" for multi-day durations with non-zero hours', () => {
    expect(formatGap(3 * 86_400_000 + 4 * 3_600_000 + 12 * 60_000)).toBe('3 d 4 h 12 m');
  });

  it('omits the hours term when hours === 0 and days > 0', () => {
    expect(formatGap(3 * 86_400_000 + 30 * 60_000)).toBe('3 d 30 m');
  });

  it('handles exactly 1 day', () => {
    expect(formatGap(86_400_000)).toBe('1 d 00 m');
  });

  it('handles large values correctly (100 days)', () => {
    expect(formatGap(100 * 86_400_000)).toBe('100 d 00 m');
  });

  it('handles 100 days with leftover hours and minutes', () => {
    expect(formatGap(100 * 86_400_000 + 2 * 3_600_000 + 15 * 60_000)).toBe('100 d 2 h 15 m');
  });
});
