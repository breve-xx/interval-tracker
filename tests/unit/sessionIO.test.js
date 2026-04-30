import { describe, it, expect } from 'vitest';
import { buildExportPayload, parseImportPayload, buildMarkdownReport } from '../../src/js/sessionIO.js';

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

const FULL_STATISTICS = {
  unit    : 'days',
  count   : 3,
  basic   : { mean: 7, median: 7 },
  advanced: { stdDev: 0, variance: 0 },
  nerd    : { outliers: [], skewness: 0 },
};

const FULL_PREDICTION = {
  predictedDate  : '2024-01-22T00:00:00.000Z',
  earliestDate   : '2024-01-20T00:00:00.000Z',
  latestDate     : '2024-01-24T00:00:00.000Z',
  confidence     : 90,
  confidenceLabel: 'High',
  strategy       : 'mean',
  intervalUsedMs : 604800000, // 7 days = 10080 minutes
};

describe('buildMarkdownReport', () => {
  it('returns a non-empty string', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
  });

  it('contains the report title "# Interval Tracker"', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(report).toContain('# Interval Tracker');
  });

  it('contains an Occurrences section heading', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(report).toContain('## Occurrences');
  });

  it('lists every occurrence as a table row', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    // Each occurrence should appear as a date in DD/MM/YYYY format in the table
    expect(report).toContain('| 1 | 01/01/2024 |');
    expect(report).toContain('| 2 | 08/01/2024 |');
    expect(report).toContain('| 3 | 15/01/2024 |');
  });

  it('occurrence count in the header matches the array length', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(report).toContain(`Occurrences: ${OCCURRENCES.length}`);
  });

  it('contains a Statistics section when statistics is provided', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(report).toContain('## Statistics');
  });

  it('omits the Statistics section when statistics is null', () => {
    const report = buildMarkdownReport(OCCURRENCES, null, FULL_PREDICTION);
    expect(report).not.toContain('## Statistics');
  });

  it('contains Basic, Advanced, and Nerd subsections when statistics is present', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(report).toContain('### Basic');
    expect(report).toContain('### Advanced');
    expect(report).toContain('### Nerd');
  });

  it('contains a Prediction section when prediction is provided', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(report).toContain('## Prediction');
  });

  it('omits the Prediction section when prediction is null', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, null);
    expect(report).not.toContain('## Prediction');
  });

  it('renders the confidence score and label in the prediction table', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    expect(report).toContain('90% — High');
  });

  it('renders a valid report for exactly 1 occurrence (statistics and prediction both null)', () => {
    const report = buildMarkdownReport([OCCURRENCES[0]], null, null);
    expect(report).toContain('# Interval Tracker');
    expect(report).toContain('Occurrences: 1');
    expect(report).toContain('| 1 | 01/01/2024 |');
    expect(report).not.toContain('## Statistics');
    expect(report).not.toContain('## Prediction');
  });

  it('interval used is expressed in minutes (intervalUsedMs / 60 000, rounded)', () => {
    const report = buildMarkdownReport(OCCURRENCES, FULL_STATISTICS, FULL_PREDICTION);
    // 604800000 ms / 60000 = 10080 minutes
    expect(report).toContain('10080 minutes');
  });
});
