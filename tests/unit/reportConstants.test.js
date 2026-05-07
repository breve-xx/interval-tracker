import { describe, it, expect } from 'vitest';
import {
  STATS_GLOSSARY,
  STATS_LEVEL_DESC,
  STRATEGY_DESC,
  CONFIDENCE_HIGH_THRESHOLD,
  CONFIDENCE_MEDIUM_THRESHOLD,
  CONFIDENCE_NARRATIVE,
} from '../../src/js/reportConstants.js';

// ─── STATS_GLOSSARY ───────────────────────────────────────────────────────────

describe('STATS_GLOSSARY', () => {
  it('has basic, advanced, and nerd top-level keys', () => {
    expect(STATS_GLOSSARY).toHaveProperty('basic');
    expect(STATS_GLOSSARY).toHaveProperty('advanced');
    expect(STATS_GLOSSARY).toHaveProperty('nerd');
  });

  it('basic sub-object has all 8 expected keys', () => {
    const expected = ['intervalCount', 'mean', 'min', 'max', 'range', 'first', 'last', 'totalSpan'];
    expected.forEach((k) => {
      expect(STATS_GLOSSARY.basic).toHaveProperty(k);
    });
    expect(Object.keys(STATS_GLOSSARY.basic)).toHaveLength(8);
  });

  it('advanced sub-object has all 9 expected keys', () => {
    const expected = ['median', 'stdDev', 'variance', 'cv', 'regularityLabel', 'q1', 'q3', 'iqr', 'trend'];
    expected.forEach((k) => {
      expect(STATS_GLOSSARY.advanced).toHaveProperty(k);
    });
    expect(Object.keys(STATS_GLOSSARY.advanced)).toHaveLength(9);
  });

  it('nerd sub-object has all 9 expected keys', () => {
    const expected = ['mad', 'skewness', 'kurtosis', 'outliers', 'outlierCount',
      'longestStreak', 'regressionSlope', 'regressionIntercept', 'r2'];
    expected.forEach((k) => {
      expect(STATS_GLOSSARY.nerd).toHaveProperty(k);
    });
    expect(Object.keys(STATS_GLOSSARY.nerd)).toHaveLength(9);
  });

  it('all description values are non-empty strings', () => {
    ['basic', 'advanced', 'nerd'].forEach((level) => {
      Object.values(STATS_GLOSSARY[level]).forEach((desc) => {
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      });
    });
  });
});

// ─── STATS_LEVEL_DESC ─────────────────────────────────────────────────────────

describe('STATS_LEVEL_DESC', () => {
  it('has basic, advanced, and nerd keys', () => {
    expect(STATS_LEVEL_DESC).toHaveProperty('basic');
    expect(STATS_LEVEL_DESC).toHaveProperty('advanced');
    expect(STATS_LEVEL_DESC).toHaveProperty('nerd');
  });

  it('all values are non-empty strings', () => {
    Object.values(STATS_LEVEL_DESC).forEach((desc) => {
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    });
  });
});

// ─── STRATEGY_DESC ────────────────────────────────────────────────────────────

describe('STRATEGY_DESC', () => {
  it('has mean, median, and regression keys', () => {
    expect(STRATEGY_DESC).toHaveProperty('mean');
    expect(STRATEGY_DESC).toHaveProperty('median');
    expect(STRATEGY_DESC).toHaveProperty('regression');
  });

  it('all values are non-empty strings', () => {
    Object.values(STRATEGY_DESC).forEach((desc) => {
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    });
  });
});

// ─── CONFIDENCE_HIGH_THRESHOLD / CONFIDENCE_MEDIUM_THRESHOLD ─────────────────

describe('CONFIDENCE_HIGH_THRESHOLD / CONFIDENCE_MEDIUM_THRESHOLD', () => {
  it('CONFIDENCE_HIGH_THRESHOLD is a number', () => {
    expect(typeof CONFIDENCE_HIGH_THRESHOLD).toBe('number');
  });

  it('CONFIDENCE_MEDIUM_THRESHOLD is a number', () => {
    expect(typeof CONFIDENCE_MEDIUM_THRESHOLD).toBe('number');
  });

  it('CONFIDENCE_HIGH_THRESHOLD > CONFIDENCE_MEDIUM_THRESHOLD', () => {
    expect(CONFIDENCE_HIGH_THRESHOLD).toBeGreaterThan(CONFIDENCE_MEDIUM_THRESHOLD);
  });
});

// ─── CONFIDENCE_NARRATIVE ─────────────────────────────────────────────────────

describe('CONFIDENCE_NARRATIVE', () => {
  it('has high, medium, and low keys', () => {
    expect(CONFIDENCE_NARRATIVE).toHaveProperty('high');
    expect(CONFIDENCE_NARRATIVE).toHaveProperty('medium');
    expect(CONFIDENCE_NARRATIVE).toHaveProperty('low');
  });

  it('all values are non-empty strings', () => {
    Object.values(CONFIDENCE_NARRATIVE).forEach((text) => {
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });
  });

  it('high narrative includes the CONFIDENCE_HIGH_THRESHOLD value', () => {
    expect(CONFIDENCE_NARRATIVE.high).toContain(String(CONFIDENCE_HIGH_THRESHOLD));
  });

  it('medium narrative includes both threshold values', () => {
    expect(CONFIDENCE_NARRATIVE.medium).toContain(String(CONFIDENCE_MEDIUM_THRESHOLD));
    expect(CONFIDENCE_NARRATIVE.medium).toContain(String(CONFIDENCE_HIGH_THRESHOLD - 1));
  });

  it('low narrative includes the CONFIDENCE_MEDIUM_THRESHOLD value', () => {
    expect(CONFIDENCE_NARRATIVE.low).toContain(String(CONFIDENCE_MEDIUM_THRESHOLD));
  });
});
