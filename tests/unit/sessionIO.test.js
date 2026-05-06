import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildExportPayload, parseImportPayload, buildMarkdownReport } from '../../src/js/sessionIO.js';
import { computeStatistics } from '../../src/js/statistics.js';
import { predictNext } from '../../src/js/prediction.js';
import { STATS_GLOSSARY, STRATEGY_DESC } from '../../src/js/reportConstants.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OCCURRENCES = [
  '2024-01-01T00:00:00.000Z',
  '2024-01-08T00:00:00.000Z',
  '2024-01-15T00:00:00.000Z',
];

const MOCK_STATISTICS = { unit: 'days', count: 3, basic: {}, advanced: {}, nerd: {} };
const MOCK_PREDICTION = { predictedDate: '2024-01-22T00:00:00.000Z', confidence: 90 };

function makePayload(overrides = {}) {
  return JSON.stringify({
    version    : 1,
    exportedAt : '2024-01-15T00:00:00.000Z',
    occurrences: OCCURRENCES,
    statistics : MOCK_STATISTICS,
    prediction : MOCK_PREDICTION,
    ...overrides,
  });
}

// ─── buildExportPayload ───────────────────────────────────────────────────────

describe('buildExportPayload', () => {
  it('returns an object with version === 1', () => {
    const p = buildExportPayload(OCCURRENCES, MOCK_STATISTICS, MOCK_PREDICTION);
    expect(p.version).toBe(1);
  });

  it('exportedAt is a valid ISO date string', () => {
    const p = buildExportPayload(OCCURRENCES, MOCK_STATISTICS, MOCK_PREDICTION);
    expect(typeof p.exportedAt).toBe('string');
    expect(isNaN(new Date(p.exportedAt).getTime())).toBe(false);
  });

  it('occurrences array is passed through unchanged', () => {
    const p = buildExportPayload(OCCURRENCES, MOCK_STATISTICS, MOCK_PREDICTION);
    expect(p.occurrences).toBe(OCCURRENCES);
  });

  it('statistics field matches the provided value when non-null', () => {
    const p = buildExportPayload(OCCURRENCES, MOCK_STATISTICS, MOCK_PREDICTION);
    expect(p.statistics).toBe(MOCK_STATISTICS);
  });

  it('statistics field is null when null is provided', () => {
    const p = buildExportPayload(OCCURRENCES, null, null);
    expect(p.statistics).toBeNull();
  });

  it('prediction field matches the provided value when non-null', () => {
    const p = buildExportPayload(OCCURRENCES, MOCK_STATISTICS, MOCK_PREDICTION);
    expect(p.prediction).toBe(MOCK_PREDICTION);
  });

  it('prediction field is null when null is provided', () => {
    const p = buildExportPayload(OCCURRENCES, null, null);
    expect(p.prediction).toBeNull();
  });
});

// ─── parseImportPayload — valid input ─────────────────────────────────────────

describe('parseImportPayload — valid', () => {
  it('returns ok:true and the occurrences array for a well-formed payload', () => {
    const result = parseImportPayload(makePayload());
    expect(result.ok).toBe(true);
    expect(result.occurrences).toEqual(OCCURRENCES);
  });

  it('ignores statistics and prediction fields — they are not in the result', () => {
    const result = parseImportPayload(makePayload());
    expect(result).not.toHaveProperty('statistics');
    expect(result).not.toHaveProperty('prediction');
  });

  it('accepts an occurrences array with a single entry', () => {
    const result = parseImportPayload(makePayload({ occurrences: [OCCURRENCES[0]] }));
    expect(result.ok).toBe(true);
    expect(result.occurrences).toHaveLength(1);
  });

  it('accepts occurrences with various valid ISO formats', () => {
    const mixed = [
      '2024-03-15T14:30:00.000Z',
      '2024-06-01T00:00:00Z',
    ];
    const result = parseImportPayload(makePayload({ occurrences: mixed }));
    expect(result.ok).toBe(true);
  });
});

// ─── parseImportPayload — validation failures ─────────────────────────────────

describe('parseImportPayload — invalid', () => {
  it('returns ok:false for non-JSON input', () => {
    const result = parseImportPayload('this is not json {{{');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });

  it('returns ok:false for a JSON array (not an object)', () => {
    const result = parseImportPayload(JSON.stringify([1, 2, 3]));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/expected a JSON object/i);
  });

  it('returns ok:false for a JSON null', () => {
    const result = parseImportPayload(JSON.stringify(null));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/expected a JSON object/i);
  });

  it('returns ok:false when version is missing', () => {
    const result = parseImportPayload(makePayload({ version: undefined }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/version/i);
  });

  it('returns ok:false when version !== 1 (e.g. 2)', () => {
    const result = parseImportPayload(makePayload({ version: 2 }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/version/i);
  });

  it('returns ok:false when occurrences is not an array', () => {
    const result = parseImportPayload(makePayload({ occurrences: 'not-an-array' }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/occurrences must be an array/i);
  });

  it('returns ok:false when occurrences is an empty array', () => {
    const result = parseImportPayload(makePayload({ occurrences: [] }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no occurrences found/i);
  });

  it('returns ok:false when an occurrence element is not a string', () => {
    const result = parseImportPayload(makePayload({ occurrences: [12345] }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not a valid datetime/i);
  });

  it('returns ok:false when an occurrence string is not a valid date', () => {
    const result = parseImportPayload(makePayload({ occurrences: ['not-a-date'] }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not a valid datetime/i);
  });

  it('error message for an invalid date includes the offending index', () => {
    const result = parseImportPayload(makePayload({
      occurrences: [OCCURRENCES[0], 'bad-date', OCCURRENCES[2]],
    }));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('index 1');
  });
});

// ─── buildMarkdownReport ──────────────────────────────────────────────────────

// Fixture: 5 occurrences spaced ~7 days apart (well in the past so we can
// test the "predicted date has already passed" branch).
const REPORT_OCCS = [
  '2020-01-01T09:00:00.000Z',
  '2020-01-08T09:00:00.000Z',
  '2020-01-15T09:00:00.000Z',
  '2020-01-22T09:00:00.000Z',
  '2020-01-29T09:00:00.000Z',
];

// Real statistics + prediction derived from the fixture above.
const REPORT_STATS = computeStatistics(REPORT_OCCS);
const REPORT_PRED  = predictNext(REPORT_OCCS);

// Future-dated fixture for the "time remaining" branch.
const FUTURE_BASE = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year from now
function makeIso(offsetDays) {
  return new Date(FUTURE_BASE + offsetDays * 86_400_000).toISOString();
}
const FUTURE_OCCS  = [0, 7, 14, 21, 28].map(makeIso);
const FUTURE_STATS = computeStatistics(FUTURE_OCCS);
const FUTURE_PRED  = predictNext(FUTURE_OCCS);

// 55-occurrence fixture for the truncation test.
const LONG_OCCS = Array.from({ length: 55 }, (_, i) =>
  new Date(Date.UTC(2021, 0, 1 + i * 7)).toISOString()
);

describe('buildMarkdownReport', () => {
  // ── Basic shape ────────────────────────────────────────────────────────────

  it('returns a non-empty string', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
  });

  it('contains the report title "# Interval Tracker"', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('# Interval Tracker');
  });

  // ── Header ─────────────────────────────────────────────────────────────────

  it('header contains today\'s date in DD/MM/YYYY format', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    const now    = new Date();
    const dd     = String(now.getDate()).padStart(2, '0');
    const mm     = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy   = now.getFullYear();
    expect(report).toContain(`${dd}/${mm}/${yyyy}`);
  });

  it('header contains the occurrence count', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain(`${REPORT_OCCS.length} occurrences recorded`);
  });

  // ── Prediction section ──────────────────────────────────────────────────────

  it('contains the prediction section when prediction is provided', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('Next predicted occurrence');
  });

  it('omits the prediction section when prediction is null', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, null);
    expect(report).not.toContain('Next predicted occurrence');
  });

  it('contains a confidence narrative', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    // At least one of the three narrative substrings must be present.
    const hasNarrative =
      report.includes('historical intervals are very consistent') ||
      report.includes('some variability in your intervals')        ||
      report.includes('intervals are irregular');
    expect(hasNarrative).toBe(true);
  });

  it('shows "Time remaining" when the predicted date is in the future', () => {
    const report = buildMarkdownReport(FUTURE_OCCS, FUTURE_STATS, FUTURE_PRED);
    expect(report).toContain('Time remaining:');
  });

  it('shows "The predicted date has already passed" when prediction is past', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('The predicted date has already passed.');
  });

  it('contains the strategy description text', () => {
    const report    = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    const strategy  = REPORT_PRED.strategy;
    const stratText = STRATEGY_DESC[strategy];
    expect(report).toContain(stratText);
  });

  // ── Chart section ───────────────────────────────────────────────────────────

  it('contains the interval chart when statistics is provided', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('Interval Chart');
  });

  it('omits the interval chart when statistics is null', () => {
    const report = buildMarkdownReport(REPORT_OCCS, null, null);
    expect(report).not.toContain('Interval Chart');
  });

  it('chart section contains a fenced code block with Unicode block characters', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    // The fenced code block contains at least one block character.
    const hasFencedBlock = /```[\s\S]*[▁▂▃▄▅▆▇█][\s\S]*```/.test(report);
    expect(hasFencedBlock).toBe(true);
  });

  // ── Statistics section ──────────────────────────────────────────────────────

  it('contains the statistics section when statistics is provided', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('## Statistics');
  });

  it('omits the statistics section when statistics is null', () => {
    const report = buildMarkdownReport(REPORT_OCCS, null, null);
    expect(report).not.toContain('## Statistics');
  });

  it('statistics section contains Basic, Advanced, and Nerd subsections', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('### Basic');
    expect(report).toContain('### Advanced');
    expect(report).toContain('### Nerd');
  });

  it('definition blocks include description text from STATS_GLOSSARY', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    // Spot-check one description from each level.
    expect(report).toContain(STATS_GLOSSARY.basic.mean);
    expect(report).toContain(STATS_GLOSSARY.advanced.trend);
    expect(report).toContain(STATS_GLOSSARY.nerd.r2);
  });

  it('statistics are not rendered as a pipe table', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).not.toMatch(/\| Metric \| Value \|/);
  });

  // ── Occurrences section ─────────────────────────────────────────────────────

  it('contains the occurrences section', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('## Occurrences');
  });

  it('occurrences list is a plain numbered list, not a table', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).not.toMatch(/\| # \|/);
    expect(report).toContain('1. ');
  });

  it('truncates long lists (>50 occurrences) with a "more occurrences" separator', () => {
    const report = buildMarkdownReport(
      LONG_OCCS,
      computeStatistics(LONG_OCCS),
      predictNext(LONG_OCCS),
    );
    expect(report).toContain('more occurrences');
  });

  // ── Footer ─────────────────────────────────────────────────────────────────

  it('footer contains the GitHub URL', () => {
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, REPORT_PRED);
    expect(report).toContain('https://github.com/breve-xx/interval-tracker');
  });

  // ── Edge case: single occurrence ────────────────────────────────────────────

  it('renders correctly for a single occurrence (statistics and prediction both null)', () => {
    const report = buildMarkdownReport([REPORT_OCCS[0]], null, null);
    expect(report).toContain('# Interval Tracker');
    expect(report).toContain('1 occurrences recorded');
    expect(report).toContain('## Occurrences');
    expect(report).not.toContain('## Statistics');
    expect(report).not.toContain('Next predicted occurrence');
  });

  // ── Confidence narrative branches ────────────────────────────────────────────

  it('uses moderate confidence narrative for scores 40–69', () => {
    // Build a synthetic prediction with confidence in the moderate range.
    const modPred = {
      predictedDate  : '2020-02-05T09:00:00.000Z',
      earliestDate   : '2020-02-03T09:00:00.000Z',
      latestDate     : '2020-02-07T09:00:00.000Z',
      confidence     : 55,
      confidenceLabel: 'moderate',
      strategy       : 'median',
      intervalUsedMs : 7 * 86_400_000,
    };
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, modPred);
    expect(report).toContain('Moderate confidence (40–69 %)');
  });

  it('uses low confidence narrative for scores below 40', () => {
    const lowPred = {
      predictedDate  : '2020-02-05T09:00:00.000Z',
      earliestDate   : '2020-02-03T09:00:00.000Z',
      latestDate     : '2020-02-07T09:00:00.000Z',
      confidence     : 20,
      confidenceLabel: 'low',
      strategy       : 'median',
      intervalUsedMs : 7 * 86_400_000,
    };
    const report = buildMarkdownReport(REPORT_OCCS, REPORT_STATS, lowPred);
    expect(report).toContain('Low confidence (<40 %)');
  });

  // ── Trend branches in chart section ──────────────────────────────────────────

  it('chart section shows increasing trend arrow for a dataset with growing intervals', () => {
    // Gaps grow: 1d, 5d, 10d, 20d, 40d — strong increasing trend.
    const base = Date.UTC(2023, 0, 1);
    const growingOccs = [
      new Date(base).toISOString(),
      new Date(base + 1  * 86_400_000).toISOString(),
      new Date(base + 6  * 86_400_000).toISOString(),
      new Date(base + 16 * 86_400_000).toISOString(),
      new Date(base + 36 * 86_400_000).toISOString(),
      new Date(base + 76 * 86_400_000).toISOString(),
    ];
    const stats  = computeStatistics(growingOccs);
    const report = buildMarkdownReport(growingOccs, stats, null);
    expect(report).toContain('▲ intervals are growing');
  });

  it('chart section shows decreasing trend arrow for a dataset with shrinking intervals', () => {
    // Gaps shrink: 40d, 20d, 10d, 5d, 1d — strong decreasing trend.
    const base = Date.UTC(2023, 0, 1);
    const shrinkingOccs = [
      new Date(base).toISOString(),
      new Date(base + 40 * 86_400_000).toISOString(),
      new Date(base + 60 * 86_400_000).toISOString(),
      new Date(base + 70 * 86_400_000).toISOString(),
      new Date(base + 75 * 86_400_000).toISOString(),
      new Date(base + 76 * 86_400_000).toISOString(),
    ];
    const stats  = computeStatistics(shrinkingOccs);
    const report = buildMarkdownReport(shrinkingOccs, stats, null);
    expect(report).toContain('▼ intervals are shrinking');
  });

  // ── Hours unit ───────────────────────────────────────────────────────────────

  it('chart and statistics work correctly for an hours-unit dataset', () => {
    // Gaps ~2 hours apart → unit = 'hours'
    const base  = Date.UTC(2024, 5, 1, 0, 0, 0);
    const hourlyOccs = Array.from({ length: 6 }, (_, i) =>
      new Date(base + i * 2 * 3_600_000).toISOString()
    );
    const stats  = computeStatistics(hourlyOccs);
    const report = buildMarkdownReport(hourlyOccs, stats, null);
    expect(report).toContain('hours');
  });

  // ── Dense chart (>12 intervals, labels omitted) ───────────────────────────────

  it('omits gap labels for datasets with more than 12 intervals', () => {
    // 14 occurrences → 13 intervals
    const base = Date.UTC(2024, 0, 1);
    const denseOccs = Array.from({ length: 14 }, (_, i) =>
      new Date(base + i * 7 * 86_400_000).toISOString()
    );
    const stats  = computeStatistics(denseOccs);
    const report = buildMarkdownReport(denseOccs, stats, null);
    // No "Gap #1" label should appear when >12 intervals
    expect(report).not.toContain('Gap #1');
  });
});
