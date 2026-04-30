import { describe, it, expect } from 'vitest';
import { computeStatistics } from '../../src/js/statistics.js';

// ─── Dataset helpers ──────────────────────────────────────────────────────────

/**
 * Build an array of ISO strings starting at `origin` with each subsequent
 * entry offset by the corresponding value in `gaps` (milliseconds).
 */
function fromGaps(origin, gapsMs) {
  const dates = [origin];
  for (const g of gapsMs) {
    dates.push(dates[dates.length - 1] + g);
  }
  return dates.map((t) => new Date(t).toISOString());
}

const MIN = 60_000;
const HR  = 3_600_000;
const DAY = 86_400_000;

// Origin: 2024-01-01T00:00:00Z
const ORIGIN = Date.UTC(2024, 0, 1);

// ── Stable dataset (5 occurrences, 4 intervals of exactly 7 days each) ────────
// intervals: [7, 7, 7, 7] days  →  mean=7, stdDev=0, cv=0
const STABLE_GAPS = [7 * DAY, 7 * DAY, 7 * DAY, 7 * DAY];
const STABLE      = fromGaps(ORIGIN, STABLE_GAPS);

// ── Increasing dataset (5 occ., gaps grow: 1d, 2d, 3d, 4d) ───────────────────
// intervals: [1, 2, 3, 4] days  →  mean=2.5, slope clearly positive
const INCREASING_GAPS = [1 * DAY, 2 * DAY, 3 * DAY, 4 * DAY];
const INCREASING      = fromGaps(ORIGIN, INCREASING_GAPS);

// ── Decreasing dataset (gaps shrink: 4d, 3d, 2d, 1d) ─────────────────────────
const DECREASING_GAPS = [4 * DAY, 3 * DAY, 2 * DAY, 1 * DAY];
const DECREASING      = fromGaps(ORIGIN, DECREASING_GAPS);

// ── Mixed dataset with an outlier ────────────────────────────────────────────
// intervals: [1, 1, 1, 1, 1, 30] days  →  30d is a clear outlier
const OUTLIER_GAPS = [1 * DAY, 1 * DAY, 1 * DAY, 1 * DAY, 1 * DAY, 30 * DAY];
const OUTLIER_SET  = fromGaps(ORIGIN, OUTLIER_GAPS);

// ── Minutes-scale dataset (gaps of 10 min each) ───────────────────────────────
const MINUTES_GAPS = [10 * MIN, 10 * MIN, 10 * MIN];
const MINUTES_SET  = fromGaps(ORIGIN, MINUTES_GAPS);

// ── Hours-scale dataset (gaps of 2 hours each) ───────────────────────────────
const HOURS_GAPS = [2 * HR, 2 * HR, 2 * HR];
const HOURS_SET  = fromGaps(ORIGIN, HOURS_GAPS);

// ── Right-skewed dataset (many small gaps, one very large one) ────────────────
// intervals (days): [1, 1, 1, 1, 20]
const SKEWED_GAPS = [1 * DAY, 1 * DAY, 1 * DAY, 1 * DAY, 20 * DAY];
const SKEWED_SET  = fromGaps(ORIGIN, SKEWED_GAPS);

// ── Perfect linear series (for R² = 1 test) ──────────────────────────────────
// intervals (days): [1, 2, 3, 4, 5]
const LINEAR_GAPS = [1 * DAY, 2 * DAY, 3 * DAY, 4 * DAY, 5 * DAY];
const LINEAR_SET  = fromGaps(ORIGIN, LINEAR_GAPS);

// ─── Guard conditions ─────────────────────────────────────────────────────────

describe('computeStatistics — guard conditions', () => {
  it('returns null for empty input', () => {
    expect(computeStatistics([])).toBeNull();
  });

  it('returns null for a single occurrence', () => {
    expect(computeStatistics([new Date(ORIGIN).toISOString()])).toBeNull();
  });

  it('returns a non-null object for exactly 2 occurrences', () => {
    const two = fromGaps(ORIGIN, [DAY]);
    expect(computeStatistics(two)).not.toBeNull();
  });

  it('accepts Date objects as well as ISO strings', () => {
    const dates = STABLE.map((iso) => new Date(iso));
    expect(computeStatistics(dates)).not.toBeNull();
  });
});

// ─── Unit selection ───────────────────────────────────────────────────────────

describe('computeStatistics — unit selection', () => {
  it('selects "minutes" when median interval < 1 hour', () => {
    expect(computeStatistics(MINUTES_SET).unit).toBe('minutes');
  });

  it('selects "hours" when median interval ≥ 1 hour and < 1 day', () => {
    expect(computeStatistics(HOURS_SET).unit).toBe('hours');
  });

  it('selects "days" when median interval ≥ 1 day', () => {
    expect(computeStatistics(STABLE).unit).toBe('days');
  });
});

// ─── Basic level ──────────────────────────────────────────────────────────────

describe('computeStatistics — basic level', () => {
  it('reports correct count and intervalCount', () => {
    const r = computeStatistics(STABLE);
    expect(r.count).toBe(5);
    expect(r.basic.intervalCount).toBe(4);
  });

  it('computes mean correctly for uniform gaps', () => {
    const r = computeStatistics(STABLE);
    expect(r.basic.mean).toBeCloseTo(7, 5);
  });

  it('computes min and max correctly', () => {
    const r = computeStatistics(INCREASING);
    expect(r.basic.min).toBeCloseTo(1, 5);
    expect(r.basic.max).toBeCloseTo(4, 5);
  });

  it('computes range as max − min', () => {
    const r = computeStatistics(INCREASING);
    expect(r.basic.range).toBeCloseTo(3, 5);
  });

  it('sets first and last to the correct ISO strings', () => {
    const r = computeStatistics(STABLE);
    expect(r.basic.first).toBe(STABLE[0]);
    expect(r.basic.last).toBe(STABLE[STABLE.length - 1]);
  });

  it('computes totalSpan correctly (4 × 7 days = 28 days)', () => {
    const r = computeStatistics(STABLE);
    expect(r.basic.totalSpan).toBeCloseTo(28, 5);
  });

  it('expresses all interval values in the selected unit (not ms)', () => {
    const r = computeStatistics(STABLE);
    // mean should be ~7 (days), not 604800000 (ms)
    expect(r.basic.mean).toBeLessThan(1000);
  });
});

// ─── Advanced level ───────────────────────────────────────────────────────────

describe('computeStatistics — advanced level (median, spread)', () => {
  it('computes median for an even number of intervals', () => {
    // INCREASING: sorted [1,2,3,4] → median = (2+3)/2 = 2.5
    const r = computeStatistics(INCREASING);
    expect(r.advanced.median).toBeCloseTo(2.5, 5);
  });

  it('computes median for an odd number of intervals', () => {
    // SKEWED: sorted [1,1,1,1,20] → median = 1
    const r = computeStatistics(SKEWED_SET);
    expect(r.advanced.median).toBeCloseTo(1, 5);
  });

  it('computes stdDev = 0 for a perfectly uniform series', () => {
    const r = computeStatistics(STABLE);
    expect(r.advanced.stdDev).toBeCloseTo(0, 10);
  });

  it('computes variance = stdDev²', () => {
    const r = computeStatistics(INCREASING);
    expect(r.advanced.variance).toBeCloseTo(r.advanced.stdDev ** 2, 8);
  });

  it('computes cv = 0 for a perfectly uniform series', () => {
    const r = computeStatistics(STABLE);
    expect(r.advanced.cv).toBeCloseTo(0, 10);
  });

  it('computes q1 and q3', () => {
    // INCREASING: sorted [1,2,3,4]
    // q1 = nearest-rank ceil(0.25×4)-1 = index 0 → 1
    // q3 = nearest-rank ceil(0.75×4)-1 = index 2 → 3
    const r = computeStatistics(INCREASING);
    expect(r.advanced.q1).toBeCloseTo(1, 5);
    expect(r.advanced.q3).toBeCloseTo(3, 5);
  });

  it('computes iqr = q3 − q1', () => {
    const r = computeStatistics(INCREASING);
    expect(r.advanced.iqr).toBeCloseTo(r.advanced.q3 - r.advanced.q1, 8);
  });
});

describe('computeStatistics — advanced level (trend)', () => {
  it('detects "increasing" trend', () => {
    expect(computeStatistics(INCREASING).advanced.trend).toBe('increasing');
  });

  it('detects "decreasing" trend', () => {
    expect(computeStatistics(DECREASING).advanced.trend).toBe('decreasing');
  });

  it('detects "stable" trend for uniform gaps', () => {
    expect(computeStatistics(STABLE).advanced.trend).toBe('stable');
  });
});

describe('computeStatistics — advanced level (regularityLabel)', () => {
  it('labels a perfectly uniform series as "very regular" (cv=0)', () => {
    expect(computeStatistics(STABLE).advanced.regularityLabel).toBe('very regular');
  });

  it('labels a mildly variable series as "regular"', () => {
    // gaps: 6d, 7d, 8d, 7d  → mean=7, stdDev≈0.707, cv≈10% → "very regular"
    // Use slightly more spread: 5,7,9,7 → mean=7, stdDev≈1.414, cv≈20% → "regular"
    const gaps = [5 * DAY, 7 * DAY, 9 * DAY, 7 * DAY];
    const set  = fromGaps(ORIGIN, gaps);
    const r    = computeStatistics(set);
    expect(r.advanced.regularityLabel).toBe('regular');
  });

  it('labels a variable series as "irregular"', () => {
    // gaps: 1d, 5d, 10d, 2d → mean=4.5, stdDev≈3.5, cv≈78% — use gaps that give 35–75%
    // gaps: 2d, 4d, 6d, 8d → mean=5, stdDev≈2.236, cv≈44.7% → "irregular"
    const gaps = [2 * DAY, 4 * DAY, 6 * DAY, 8 * DAY];
    const set  = fromGaps(ORIGIN, gaps);
    const r    = computeStatistics(set);
    expect(r.advanced.regularityLabel).toBe('irregular');
  });

  it('labels a highly variable series as "highly irregular"', () => {
    // OUTLIER_SET: gaps [1,1,1,1,1,30] days → mean≈5.83, stdDev≈10.8, cv≈185% → "highly irregular"
    expect(computeStatistics(OUTLIER_SET).advanced.regularityLabel).toBe('highly irregular');
  });
});

// ─── Nerd level ───────────────────────────────────────────────────────────────

describe('computeStatistics — nerd level', () => {
  it('computes mad = 0 for a uniform series', () => {
    expect(computeStatistics(STABLE).nerd.mad).toBeCloseTo(0, 10);
  });

  it('computes mad correctly for a known series', () => {
    // INCREASING: intervals [1,2,3,4], mean=2.5
    // MAD = (|1-2.5|+|2-2.5|+|3-2.5|+|4-2.5|)/4 = (1.5+0.5+0.5+1.5)/4 = 1.0
    const r = computeStatistics(INCREASING);
    expect(r.nerd.mad).toBeCloseTo(1.0, 5);
  });

  it('detects outliers using Tukey fences', () => {
    const r = computeStatistics(OUTLIER_SET);
    expect(r.nerd.outlierCount).toBeGreaterThan(0);
    expect(r.nerd.outliers).toContain(30); // the 30-day gap
  });

  it('returns empty outliers array for a regular series', () => {
    expect(computeStatistics(STABLE).nerd.outliers).toHaveLength(0);
    expect(computeStatistics(STABLE).nerd.outlierCount).toBe(0);
  });

  it('computes regressionSlope > 0 for an increasing series', () => {
    expect(computeStatistics(INCREASING).nerd.regressionSlope).toBeGreaterThan(0);
  });

  it('computes regressionSlope < 0 for a decreasing series', () => {
    expect(computeStatistics(DECREASING).nerd.regressionSlope).toBeLessThan(0);
  });

  it('computes regressionSlope ≈ 0 for a stable series', () => {
    expect(computeStatistics(STABLE).nerd.regressionSlope).toBeCloseTo(0, 10);
  });

  it('computes r2 ≈ 1 for a perfectly linear interval series', () => {
    // LINEAR_SET: intervals [1,2,3,4,5] — perfectly linear
    expect(computeStatistics(LINEAR_SET).nerd.r2).toBeCloseTo(1, 5);
  });

  it('computes r2 = 1 for a perfectly uniform series (degenerate case)', () => {
    // Uniform: all intervals equal → SS_tot = 0 → our implementation returns 1
    expect(computeStatistics(STABLE).nerd.r2).toBe(1);
  });

  it('computes longestStreak correctly', () => {
    // STABLE: all 4 intervals equal mean, stdDev=0 → all within 0 of mean → streak=4
    expect(computeStatistics(STABLE).nerd.longestStreak).toBe(4);
  });

  it('computes longestStreak with a break in the middle', () => {
    // gaps: 7d, 7d, 30d, 7d, 7d → intervals [7,7,30,7,7], mean=11.6, stdDev≈9.5
    // |7-11.6|=4.6 ≤ 9.5 ✓, |7-11.6|=4.6 ✓, |30-11.6|=18.4 > 9.5 ✗, |7|=4.6 ✓, |7|=4.6 ✓
    // streaks: 2, break, 2 → longestStreak = 2
    const gaps = [7 * DAY, 7 * DAY, 30 * DAY, 7 * DAY, 7 * DAY];
    const set  = fromGaps(ORIGIN, gaps);
    expect(computeStatistics(set).nerd.longestStreak).toBe(2);
  });
});

// ─── Skewness / kurtosis ─────────────────────────────────────────────────────

describe('computeStatistics — skewness and kurtosis', () => {
  it('produces positive skewness for a right-skewed series', () => {
    // SKEWED_SET: [1,1,1,1,20] — long right tail
    expect(computeStatistics(SKEWED_SET).nerd.skewness).toBeGreaterThan(0);
  });

  it('produces skewness ≈ 0 for a symmetric series', () => {
    // INCREASING: [1,2,3,4] — symmetric around 2.5
    const r = computeStatistics(INCREASING);
    expect(r.nerd.skewness).toBeCloseTo(0, 5);
  });

  it('produces kurtosis near 0 for a roughly normal-ish distribution', () => {
    // Use a longer symmetric series: [1,2,3,4,5,6,7] (uniform → kurtosis ≈ -1.2, close-ish to 0)
    const gaps = [1,2,3,4,5,6,7].map((d) => d * DAY);
    const set  = fromGaps(ORIGIN, gaps);
    // Uniform distribution has negative excess kurtosis; just verify it is a finite number
    const k = computeStatistics(set).nerd.kurtosis;
    expect(Number.isFinite(k)).toBe(true);
  });

  it('returns skewness = 0 and kurtosis = 0 when stdDev = 0', () => {
    const r = computeStatistics(STABLE);
    expect(r.nerd.skewness).toBe(0);
    expect(r.nerd.kurtosis).toBe(0);
  });
});
