import { describe, it, expect, beforeEach } from 'vitest';
import { loadRecords, saveRecords, addRecords } from '../../src/js/dataService.js';

const STORAGE_KEY = 'intervalTracker.records';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // jsdom provides localStorage; wipe it before every test for isolation.
  localStorage.clear();
});

// ─── loadRecords ──────────────────────────────────────────────────────────────

describe('loadRecords', () => {
  it('returns an empty array when localStorage is empty', () => {
    const records = loadRecords();
    expect(records).toEqual([]);
  });

  it('returns the stored array of ISO strings', () => {
    const stored = ['2024-01-01T00:00:00.000Z', '2024-06-15T12:00:00.000Z'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    expect(loadRecords()).toEqual(stored);
  });

  it('returns an empty array and does not throw for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'THIS IS NOT JSON{{{');
    expect(() => loadRecords()).not.toThrow();
    expect(loadRecords()).toEqual([]);
  });

  it('returns an empty array when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(loadRecords()).toEqual([]);
  });
});

// ─── saveRecords ──────────────────────────────────────────────────────────────

describe('saveRecords', () => {
  it('persists records so a subsequent loadRecords returns the same values', () => {
    const records = ['2024-03-01T08:00:00.000Z', '2024-04-01T09:00:00.000Z'];
    saveRecords(records);
    expect(loadRecords()).toEqual(records);
  });

  it('overwrites previously stored data', () => {
    saveRecords(['2023-01-01T00:00:00.000Z']);
    saveRecords(['2024-07-04T12:00:00.000Z']);
    const result = loadRecords();
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('2024-07-04T12:00:00.000Z');
  });

  it('persists an empty array, clearing prior data', () => {
    saveRecords(['2024-01-01T00:00:00.000Z']);
    saveRecords([]);
    expect(loadRecords()).toEqual([]);
  });
});

// ─── addRecords ───────────────────────────────────────────────────────────────

describe('addRecords', () => {
  it('adds new Date objects and returns ISO strings', () => {
    const result = addRecords([new Date('2024-05-10T10:00:00Z')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('2024-05-10T10:00:00.000Z');
  });

  it('deduplicates: the same datetime added twice appears only once', () => {
    const date = new Date('2024-05-10T10:00:00Z');
    addRecords([date]);
    const result = addRecords([date]);
    expect(result).toHaveLength(1);
  });

  it('sorts records chronologically ascending', () => {
    const later  = new Date('2024-12-01T00:00:00Z');
    const earlier = new Date('2024-01-01T00:00:00Z');
    addRecords([later]);
    const result = addRecords([earlier]);
    expect(result[0]).toBe(earlier.toISOString());
    expect(result[1]).toBe(later.toISOString());
  });

  it('merges with existing records and preserves them', () => {
    const first = new Date('2024-03-01T00:00:00Z');
    addRecords([first]);
    const second = new Date('2024-09-15T00:00:00Z');
    const result = addRecords([second]);
    expect(result).toHaveLength(2);
    expect(result).toContain(first.toISOString());
    expect(result).toContain(second.toISOString());
  });

  it('returns the complete updated array', () => {
    const a = new Date('2024-02-01T00:00:00Z');
    const b = new Date('2024-08-01T00:00:00Z');
    const result = addRecords([a, b]);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('handles an empty array without error', () => {
    saveRecords(['2024-01-01T00:00:00.000Z']);
    const result = addRecords([]);
    expect(result).toHaveLength(1);
  });
});
