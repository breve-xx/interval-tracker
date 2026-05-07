import { describe, it, expect } from 'vitest';
import { humaniseKey, round2, ISO_DATETIME_RE, msPerUnit } from '../../src/js/utils.js';

// ─── humaniseKey ──────────────────────────────────────────────────────────────

describe('humaniseKey', () => {
  it('converts a camelCase key to Title Case with spaces', () => {
    expect(humaniseKey('intervalCount')).toBe('Interval Count');
    expect(humaniseKey('stdDev')).toBe('Std Dev');
    expect(humaniseKey('regressionSlope')).toBe('Regression Slope');
  });

  it('handles single-word keys', () => {
    expect(humaniseKey('mean')).toBe('Mean');
    expect(humaniseKey('median')).toBe('Median');
  });

  it('trims the result', () => {
    expect(humaniseKey('r2')).toBe('R2');
  });
});

// ─── round2 ───────────────────────────────────────────────────────────────────

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
    expect(round2(1)).toBe(1);
    expect(round2(0.005)).toBe(0.01);
  });

  it('handles zero', () => {
    expect(round2(0)).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(round2(-1.234)).toBe(-1.23);
    expect(round2(-1.005)).toBe(-1);  // Math.round(-100.5) = -100 (rounds towards +Infinity)
  });
});

// ─── ISO_DATETIME_RE ──────────────────────────────────────────────────────────

describe('ISO_DATETIME_RE', () => {
  it('matches a full ISO datetime string', () => {
    expect(ISO_DATETIME_RE.test('2024-03-15T14:30:00.000Z')).toBe(true);
    expect(ISO_DATETIME_RE.test('2024-03-15T00:00:00')).toBe(true);
  });

  it('does not match an ISO date-only string', () => {
    expect(ISO_DATETIME_RE.test('2024-03-15')).toBe(false);
  });

  it('does not match arbitrary strings', () => {
    expect(ISO_DATETIME_RE.test('hello')).toBe(false);
    expect(ISO_DATETIME_RE.test('')).toBe(false);
  });
});

// ─── msPerUnit ────────────────────────────────────────────────────────────────

describe('msPerUnit', () => {
  it('returns 86 400 000 for days', () => {
    expect(msPerUnit('days')).toBe(86_400_000);
  });

  it('returns 3 600 000 for hours', () => {
    expect(msPerUnit('hours')).toBe(3_600_000);
  });

  it('returns 60 000 for minutes', () => {
    expect(msPerUnit('minutes')).toBe(60_000);
  });

  it('returns 60 000 for any other value (fallback)', () => {
    expect(msPerUnit('seconds')).toBe(60_000);
    expect(msPerUnit('')).toBe(60_000);
  });
});
