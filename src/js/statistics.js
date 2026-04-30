/**
 * statistics.js — Pure statistics engine for the interval series.
 *
 * All calculations operate on the series of gaps between consecutive
 * occurrences. No DOM or localStorage dependencies; fully unit-testable.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR   = 3_600_000;
const MS_PER_DAY    = 86_400_000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert a millisecond value to the chosen display unit.
 *
 * @param {number} ms
 * @param {'days'|'hours'|'minutes'} unit
 * @returns {number}
 */
function msToUnit(ms, unit) {
  if (unit === 'days')  return ms / MS_PER_DAY;
  if (unit === 'hours') return ms / MS_PER_HOUR;
  return ms / MS_PER_MINUTE;
}

/**
 * Select the display unit from the median interval (in ms).
 *
 * @param {number} medianMs
 * @returns {'days'|'hours'|'minutes'}
 */
function selectUnit(medianMs) {
  if (medianMs >= MS_PER_DAY)  return 'days';
  if (medianMs >= MS_PER_HOUR) return 'hours';
  return 'minutes';
}

/**
 * Compute the median of a sorted numeric array.
 *
 * @param {number[]} sorted  Already sorted ascending.
 * @returns {number}
 */
function median(sorted) {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Nearest-rank quartile.
 *
 * @param {number[]} sorted  Already sorted ascending.
 * @param {number}   p       Percentile as a fraction (0.25 or 0.75).
 * @returns {number}
 */
function quartile(sorted, p) {
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Fit a simple linear regression y = a·x + b over an array of y values
 * where x is the 0-based index.
 *
 * @param {number[]} ys
 * @returns {{ slope: number, intercept: number }}
 */
function linearRegression(ys) {
  const n    = ys.length;
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((s, v) => s + v, 0) / n;

  let ssXX = 0;
  let ssXY = 0;
  for (let i = 0; i < n; i++) {
    ssXX += (i - xMean) ** 2;
    ssXY += (i - xMean) * (ys[i] - yMean);
  }

  const slope     = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

/**
 * Coefficient of determination R² for a linear fit.
 *
 * @param {number[]} ys
 * @param {number}   slope
 * @param {number}   intercept
 * @returns {number}
 */
function r2Score(ys, slope, intercept) {
  const yMean = ys.reduce((s, v) => s + v, 0) / ys.length;
  const ssTot = ys.reduce((s, v) => s + (v - yMean) ** 2, 0);
  if (ssTot === 0) return 1;
  const ssRes = ys.reduce((s, v, i) => s + (v - (slope * i + intercept)) ** 2, 0);
  return 1 - ssRes / ssTot;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute all statistics for a series of occurrences.
 *
 * @param {string[]|Date[]} occurrences  Chronologically sorted ISO strings or Date objects.
 *                                        Must contain at least 2 entries.
 * @returns {StatisticsResult|null}       null if fewer than 2 occurrences are provided.
 */
export function computeStatistics(occurrences) {
  if (!occurrences || occurrences.length < 2) return null;

  // Normalise to timestamps (ms)
  const timestamps = occurrences.map((o) =>
    o instanceof Date ? o.getTime() : new Date(o).getTime()
  );

  // Build raw interval series (ms)
  const intervalsMs = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervalsMs.push(timestamps[i] - timestamps[i - 1]);
  }

  const n  = timestamps.length;   // occurrence count
  const ni = intervalsMs.length;  // interval count = n - 1

  // ── Unit selection ──────────────────────────────────────────────────────────

  const sortedMs   = [...intervalsMs].sort((a, b) => a - b);
  const medianMs   = median(sortedMs);
  const unit       = selectUnit(medianMs);

  // Scale all intervals to the chosen unit
  const intervals  = intervalsMs.map((ms) => msToUnit(ms, unit));
  const sorted     = intervals.map((_, i) => msToUnit(sortedMs[i], unit));

  // ── Basic ───────────────────────────────────────────────────────────────────

  const sum  = intervals.reduce((s, v) => s + v, 0);
  const mean = sum / ni;
  const minV = sorted[0];
  const maxV = sorted[sorted.length - 1];

  const basic = {
    intervalCount : ni,
    mean,
    min           : minV,
    max           : maxV,
    range         : maxV - minV,
    first         : new Date(timestamps[0]).toISOString(),
    last          : new Date(timestamps[n - 1]).toISOString(),
    totalSpan     : msToUnit(timestamps[n - 1] - timestamps[0], unit),
  };

  // ── Advanced ────────────────────────────────────────────────────────────────

  const med     = median(sorted);
  const varVal  = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / ni;
  const stdDev  = Math.sqrt(varVal);
  const cv      = mean === 0 ? 0 : (stdDev / mean) * 100;

  const q1  = quartile(sorted, 0.25);
  const q3  = quartile(sorted, 0.75);
  const iqr = q3 - q1;

  let regularityLabel;
  if      (cv < 15) regularityLabel = 'very regular';
  else if (cv < 35) regularityLabel = 'regular';
  else if (cv < 75) regularityLabel = 'irregular';
  else              regularityLabel = 'highly irregular';

  // Linear regression on the (unscaled-index, interval-value) series
  const { slope, intercept } = linearRegression(intervals);
  const threshold = mean * 0.05;
  let trend;
  if      (slope >  threshold) trend = 'increasing';
  else if (slope < -threshold) trend = 'decreasing';
  else                         trend = 'stable';

  const advanced = {
    median         : med,
    stdDev,
    variance       : varVal,
    cv,
    regularityLabel,
    q1,
    q3,
    iqr,
    trend,
  };

  // ── Nerd ────────────────────────────────────────────────────────────────────

  const mad = intervals.reduce((s, v) => s + Math.abs(v - mean), 0) / ni;

  const skewness = stdDev === 0
    ? 0
    : (intervals.reduce((s, v) => s + (v - mean) ** 3, 0) / ni) / stdDev ** 3;

  const kurtosis = stdDev === 0
    ? 0
    : (intervals.reduce((s, v) => s + (v - mean) ** 4, 0) / ni) / stdDev ** 4 - 3;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers   = intervals.filter((v) => v < lowerFence || v > upperFence);

  // Longest streak of consecutive intervals within one stdDev of the mean
  let longestStreak = 0;
  let currentStreak = 0;
  for (const v of intervals) {
    if (Math.abs(v - mean) <= stdDev) {
      currentStreak++;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const r2 = r2Score(intervals, slope, intercept);

  const nerd = {
    mad,
    skewness,
    kurtosis,
    outliers,
    outlierCount     : outliers.length,
    longestStreak,
    regressionSlope  : slope,
    regressionIntercept: intercept,
    r2,
  };

  return { unit, count: n, basic, advanced, nerd };
}
