/**
 * reportConstants.js — Canonical shared descriptive text (DEC-0006).
 *
 * This module is the single source of truth for the statistics glossary,
 * level descriptions, and prediction strategy descriptions. It is imported
 * by both uiController.js (for the live UI) and sessionIO.js (for the
 * Markdown report) to guarantee identical wording in both surfaces.
 *
 * No imports, no side effects, no DOM or localStorage dependencies.
 */

// ─── Statistics Glossary ──────────────────────────────────────────────────────

/**
 * Plain-English descriptions for every statistics key, organised by level.
 * Used to populate the expandable help panel in the UI and the report.
 *
 * @type {{ basic: object, advanced: object, nerd: object }}
 */
export const STATS_GLOSSARY = {
  basic: {
    intervalCount : 'The number of gaps between consecutive occurrences.',
    mean          : 'The average gap length — a typical interval between events.',
    min           : 'The shortest gap observed between two consecutive occurrences.',
    max           : 'The longest gap observed between two consecutive occurrences.',
    range         : 'The difference between the longest and shortest gaps. Larger values indicate more variability.',
    first         : 'The date and time of the earliest recorded occurrence.',
    last          : 'The date and time of the most recent recorded occurrence.',
    totalSpan     : 'Total time elapsed from the first to the last occurrence.',
  },
  advanced: {
    median        : 'The middle gap value when all gaps are sorted. More resistant to outliers than the mean.',
    stdDev        : 'Standard deviation — how much gaps typically deviate from the mean. Lower = more consistent.',
    variance      : 'The square of the standard deviation. A raw measure of how spread-out the gaps are.',
    cv            : 'Coefficient of variation — standard deviation as a percentage of the mean. Below 15% is very regular; above 75% is highly irregular.',
    regularityLabel: 'A plain-English summary of how consistent the intervals are, derived from the CV.',
    q1            : 'First quartile — 25% of all gaps are shorter than this value.',
    q3            : 'Third quartile — 75% of all gaps are shorter than this value.',
    iqr           : 'Interquartile range (Q3 − Q1) — the spread of the middle 50% of gaps. Resistant to outliers.',
    trend         : 'Whether gaps are growing longer (increasing), shorter (decreasing), or staying the same (stable).',
  },
  nerd: {
    mad                : 'Mean absolute deviation — the average distance of each gap from the mean. A robust alternative to standard deviation.',
    skewness           : 'Asymmetry of the distribution. Positive = occasional very long gaps; negative = occasional very short ones.',
    kurtosis           : 'Excess kurtosis — how heavy the tails of the distribution are compared to a normal bell curve.',
    outliers           : 'Gap values that fall far outside the typical range (beyond 1.5× IQR from Q1 or Q3).',
    outlierCount       : 'The number of gaps identified as statistical outliers.',
    longestStreak      : 'The longest consecutive run of gaps all within one standard deviation of the mean.',
    regressionSlope    : 'Rate of change in gap length per occurrence. Positive = gaps are growing; negative = gaps are shrinking.',
    regressionIntercept: 'The estimated gap length at occurrence zero — the starting point of the regression line.',
    r2                 : 'R² score — how well the trend line fits. Near 1 = strong trend; near 0 = no discernible trend.',
  },
};

// ─── Level Descriptions ───────────────────────────────────────────────────────

/**
 * One-line descriptions for each statistical analysis level.
 *
 * @type {{ basic: string, advanced: string, nerd: string }}
 */
export const STATS_LEVEL_DESC = {
  basic   : 'Core descriptive statistics about the gaps between your occurrences.',
  advanced: 'Distribution shape, consistency, and long-term trend of your intervals.',
  nerd    : 'High-precision measures: regression fit, outlier detection, and distribution shape.',
};

// ─── Strategy Descriptions ────────────────────────────────────────────────────

/**
 * Plain-English description for each prediction strategy.
 *
 * @type {{ mean: string, median: string, regression: string }}
 */
export const STRATEGY_DESC = {
  mean      : 'Projects from the last occurrence using the average gap. Best for very consistent patterns.',
  median    : 'Projects using the median gap — more robust when a few unusual intervals exist.',
  regression: 'Fits a trend line to the interval series and extrapolates. Used when gaps are clearly growing or shrinking.',
};
