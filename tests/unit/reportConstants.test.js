import { describe, it, expect } from 'vitest';
import { STATS_GLOSSARY, STATS_LEVEL_DESC, STRATEGY_DESC } from '../../src/js/reportConstants.js';

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
