/**
 * prediction.js — Next-occurrence prediction engine.
 *
 * Selects the best strategy based on the statistical profile of the
 * interval series and returns a predicted date with a confidence score
 * and a ±1 stdDev window. No statistical calculations are duplicated
 * here; all numbers come from computeStatistics().
 */

import { computeStatistics, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from './statistics.js';
import { CONFIDENCE_HIGH_THRESHOLD, CONFIDENCE_MEDIUM_THRESHOLD } from './reportConstants.js';

// ─── Constants ────────────────────────────────────────────────────────────────

// MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY imported from statistics.js (ISSUE-08)

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert a display-unit value back to milliseconds.
 *
 * @param {number} value
 * @param {'days'|'hours'|'minutes'} unit
 * @returns {number}
 */
function unitToMs(value, unit) {
  if (unit === 'days')  return value * MS_PER_DAY;
  if (unit === 'hours') return value * MS_PER_HOUR;
  return value * MS_PER_MINUTE;
}

/**
 * Clamp a number to [min, max].
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Derive the confidence label from a numeric score.
 *
 * @param {number} score  Integer 0–100.
 * @returns {'high'|'moderate'|'low'}
 */
function confidenceLabel(score) {
  if (score >= CONFIDENCE_HIGH_THRESHOLD)   return 'high';
  if (score >= CONFIDENCE_MEDIUM_THRESHOLD) return 'moderate';
  return 'low';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Predict the next occurrence from a series of past occurrences.
 *
 * @param {string[]|Date[]} occurrences  Chronologically sorted ISO strings or Date objects.
 *                                        Must contain at least 2 entries.
 * @returns {PredictionResult|null}       null if fewer than 2 occurrences are provided.
 */
export function predictNext(occurrences) {
  const stats = computeStatistics(occurrences);
  if (!stats) return null;

  const { unit, count, basic, advanced, nerd } = stats;
  const { trend, regularityLabel, stdDev } = advanced;
  const { intervalCount, mean } = basic;

  // ── Strategy selection & interval calculation ───────────────────────────────

  let strategy;
  let intervalUsedMs;

  if (trend === 'stable' &&
      (regularityLabel === 'very regular' || regularityLabel === 'regular')) {
    strategy       = 'mean';
    intervalUsedMs = unitToMs(mean, unit);
  } else if (trend === 'stable') {
    // irregular or highly irregular stable series → use median
    strategy       = 'median';
    intervalUsedMs = unitToMs(advanced.median, unit);
  } else {
    // trending (increasing or decreasing) → linear regression extrapolation
    strategy = 'regression';
    const nextIndex     = intervalCount; // index of the interval we are predicting
    const rawInterval   = nerd.regressionSlope * nextIndex + nerd.regressionIntercept;
    const rawIntervalMs = unitToMs(rawInterval, unit);
    // Clamp to a minimum of 1 minute so the prediction is never in the past
    intervalUsedMs = clamp(rawIntervalMs, MS_PER_MINUTE, Infinity);
  }

  // ── Predicted date ──────────────────────────────────────────────────────────

  const lastTimestamp  = new Date(basic.last).getTime();
  const predictedTs    = lastTimestamp + intervalUsedMs;
  const predictedDate  = new Date(predictedTs).toISOString();

  // ── Confidence window (±1 stdDev around prediction) ────────────────────────

  const stdDevMs = unitToMs(stdDev, unit);

  let earliestTs = predictedTs - stdDevMs;
  // Ensure the window never extends into the past relative to last occurrence
  if (earliestTs <= lastTimestamp) earliestTs = lastTimestamp + 1;

  const earliestDate = new Date(earliestTs).toISOString();
  const latestDate   = new Date(predictedTs + stdDevMs).toISOString();

  // ── Confidence score ────────────────────────────────────────────────────────

  const cv             = advanced.cv;
  const outlierCount   = nerd.outlierCount;

  const base           = Math.max(0, 100 - cv);
  const sampleBonus    = Math.min(10, (count - 2) * 2);
  const outlierPenalty = (outlierCount / intervalCount) * 30;
  const confidence     = clamp(Math.round(base + sampleBonus - outlierPenalty), 0, 100);
  const label          = confidenceLabel(confidence);

  return {
    predictedDate,
    earliestDate,
    latestDate,
    confidence,
    confidenceLabel : label,
    strategy,
    intervalUsedMs,
  };
}
