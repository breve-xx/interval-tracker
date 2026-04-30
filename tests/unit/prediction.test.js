import { describe, it, expect } from 'vitest';
import { predictNext } from '../../src/js/prediction.js';

// ─── Dataset helpers ──────────────────────────────────────────────────────────

const MIN = 60_000;
const HR  = 3_600_000;
const DAY = 86_400_000;

const ORIGIN = Date.UTC(2024, 0, 1); // 2024-01-01T00:00:00Z

function fromGaps(origin, gapsMs) {
  const ts = [origin];
  for (const g of gapsMs) ts.push(ts[ts.length - 1] + g);
  return ts.map((t) => new Date(t).toISOString());
}

// ── Perfectly uniform — 7-day gaps (very regular, stable) ────────────────────
const UNIFORM = fromGaps(ORIGIN, [7*DAY, 7*DAY, 7*DAY, 7*DAY, 7*DAY, 7*DAY]);

// ── Highly irregular stable — big variance, near-zero regression slope ────────
// gaps: 30d, 1d, 1d, 30d → symmetric, slope = 0, CV ≈ 93 % → highly irregular + stable
const IRREGULAR = fromGaps(ORIGIN, [30*DAY, 1*DAY, 1*DAY, 30*DAY]);

// ── Clearly increasing — gaps grow linearly ───────────────────────────────────
const INCREASING = fromGaps(ORIGIN, [1*DAY, 2*DAY, 3*DAY, 4*DAY, 5*DAY]);

// ── Clearly decreasing — gaps shrink ─────────────────────────────────────────
const DECREASING = fromGaps(ORIGIN, [10*DAY, 8*DAY, 6*DAY, 4*DAY, 2*DAY]);

// ── Exactly 2 occurrences ────────────────────────────────────────────────────
const TWO = fromGaps(ORIGIN, [7*DAY]);

// ── Aggressively decreasing (will extrapolate to negative interval) ───────────
// gaps: 10d, 5d, 2d, 1d  → slope steeply negative; next extrapolated ≈ −2d
const STEEP_DECREASE = fromGaps(ORIGIN, [10*DAY, 5*DAY, 2*DAY, 1*DAY]);

// ── Large uniform set (to verify sampleBonus) ────────────────────────────────
const UNIFORM_SMALL = fromGaps(ORIGIN, [7*DAY, 7*DAY]);           // 3 occurrences
const UNIFORM_LARGE = fromGaps(ORIGIN, Array(9).fill(7*DAY));     // 10 occurrences

// ─── Guard conditions ─────────────────────────────────────────────────────────

describe('predictNext — guard conditions', () => {
  it('returns null for empty input', () => {
    expect(predictNext([])).toBeNull();
  });

  it('returns null for a single occurrence', () => {
    expect(predictNext([new Date(ORIGIN).toISOString()])).toBeNull();
  });

  it('returns a non-null result for exactly 2 occurrences', () => {
    expect(predictNext(TWO)).not.toBeNull();
  });

  it('accepts Date objects as well as ISO strings', () => {
    const dates = UNIFORM.map((iso) => new Date(iso));
    expect(predictNext(dates)).not.toBeNull();
  });
});

// ─── Strategy selection ───────────────────────────────────────────────────────

describe('predictNext — strategy selection', () => {
  it('uses "mean" for a very regular stable series', () => {
    expect(predictNext(UNIFORM).strategy).toBe('mean');
  });

  it('uses "median" for a highly irregular stable series', () => {
    expect(predictNext(IRREGULAR).strategy).toBe('median');
  });

  it('uses "regression" for a clearly increasing series', () => {
    expect(predictNext(INCREASING).strategy).toBe('regression');
  });

  it('uses "regression" for a clearly decreasing series', () => {
    expect(predictNext(DECREASING).strategy).toBe('regression');
  });
});

// ─── Predicted date ───────────────────────────────────────────────────────────

describe('predictNext — predicted date', () => {
  it('predictedDate is after the last occurrence for a uniform series', () => {
    const result = predictNext(UNIFORM);
    const last   = UNIFORM[UNIFORM.length - 1];
    expect(result.predictedDate > last).toBe(true);
  });

  it('predictedDate is after the last occurrence for an increasing series', () => {
    const result = predictNext(INCREASING);
    const last   = INCREASING[INCREASING.length - 1];
    expect(result.predictedDate > last).toBe(true);
  });

  it('predictedDate is after the last occurrence for a decreasing series', () => {
    const result = predictNext(DECREASING);
    const last   = DECREASING[DECREASING.length - 1];
    expect(result.predictedDate > last).toBe(true);
  });

  it('for a uniform series predictedDate equals last + mean interval (within 1 ms)', () => {
    const result   = predictNext(UNIFORM);
    const lastTs   = new Date(UNIFORM[UNIFORM.length - 1]).getTime();
    const expected = new Date(lastTs + 7 * DAY).toISOString();
    // Allow 1 ms rounding tolerance
    const diff = Math.abs(
      new Date(result.predictedDate).getTime() - new Date(expected).getTime()
    );
    expect(diff).toBeLessThanOrEqual(1);
  });

  it('for an increasing series predictedDate is further than mean-based projection', () => {
    const result   = predictNext(INCREASING);
    const lastTs   = new Date(INCREASING[INCREASING.length - 1]).getTime();
    // mean of [1,2,3,4,5] days = 3 days; regression next index=5 → slope≈1 → ~6 days
    const meanBased = lastTs + 3 * DAY;
    expect(new Date(result.predictedDate).getTime()).toBeGreaterThan(meanBased);
  });

  it('intervalUsedMs is a positive number', () => {
    expect(predictNext(UNIFORM).intervalUsedMs).toBeGreaterThan(0);
    expect(predictNext(INCREASING).intervalUsedMs).toBeGreaterThan(0);
    expect(predictNext(DECREASING).intervalUsedMs).toBeGreaterThan(0);
  });
});

// ─── Confidence score ─────────────────────────────────────────────────────────

describe('predictNext — confidence score', () => {
  it('score is in [0, 100] for a uniform series', () => {
    const { confidence } = predictNext(UNIFORM);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it('score is in [0, 100] for an irregular series', () => {
    const { confidence } = predictNext(IRREGULAR);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it('a perfectly uniform series scores higher than a highly irregular one', () => {
    expect(predictNext(UNIFORM).confidence).toBeGreaterThan(predictNext(IRREGULAR).confidence);
  });

  it('a larger uniform dataset scores higher than or equal to a smaller one (sampleBonus)', () => {
    const small = predictNext(UNIFORM_SMALL).confidence;
    const large = predictNext(UNIFORM_LARGE).confidence;
    expect(large).toBeGreaterThanOrEqual(small);
  });

  it('score is an integer', () => {
    const { confidence } = predictNext(UNIFORM);
    expect(Number.isInteger(confidence)).toBe(true);
  });
});

// ─── Confidence label ─────────────────────────────────────────────────────────

describe('predictNext — confidence label', () => {
  it('returns "high" for a large uniform series', () => {
    // UNIFORM_LARGE: 10 occurrences, perfectly uniform → cv=0, sampleBonus=10 → score=110 → clamped to 100
    expect(predictNext(UNIFORM_LARGE).confidenceLabel).toBe('high');
  });

  it('returns "low" for a highly irregular series with few occurrences', () => {
    // IRREGULAR: cv very high → base near 0
    expect(predictNext(IRREGULAR).confidenceLabel).toBe('low');
  });

  it('confidenceLabel matches the score thresholds', () => {
    const result = predictNext(UNIFORM);
    const { confidence, confidenceLabel } = result;
    if      (confidence >= 75) expect(confidenceLabel).toBe('high');
    else if (confidence >= 40) expect(confidenceLabel).toBe('moderate');
    else                       expect(confidenceLabel).toBe('low');
  });
});

// ─── Confidence window ────────────────────────────────────────────────────────

describe('predictNext — confidence window', () => {
  it('earliestDate <= predictedDate <= latestDate', () => {
    for (const dataset of [UNIFORM, INCREASING, DECREASING, IRREGULAR]) {
      const { earliestDate, predictedDate, latestDate } = predictNext(dataset);
      expect(earliestDate <= predictedDate).toBe(true);
      expect(predictedDate <= latestDate).toBe(true);
    }
  });

  it('earliestDate is strictly after the last occurrence', () => {
    for (const dataset of [UNIFORM, INCREASING, DECREASING, IRREGULAR]) {
      const last = dataset[dataset.length - 1];
      const { earliestDate } = predictNext(dataset);
      expect(earliestDate > last).toBe(true);
    }
  });

  it('for a perfectly uniform series (stdDev=0) all three dates are equal', () => {
    const { earliestDate, predictedDate, latestDate } = predictNext(UNIFORM);
    expect(earliestDate).toBe(predictedDate);
    expect(predictedDate).toBe(latestDate);
  });
});

// ─── Regression clamping ──────────────────────────────────────────────────────

describe('predictNext — regression interval clamping', () => {
  it('a steeply decreasing series still produces a predictedDate after last', () => {
    const result = predictNext(STEEP_DECREASE);
    const last   = STEEP_DECREASE[STEEP_DECREASE.length - 1];
    expect(result.predictedDate > last).toBe(true);
  });

  it('intervalUsedMs is at least 60 000 ms (1 minute) for an extrapolated negative interval', () => {
    expect(predictNext(STEEP_DECREASE).intervalUsedMs).toBeGreaterThanOrEqual(60_000);
  });
});
