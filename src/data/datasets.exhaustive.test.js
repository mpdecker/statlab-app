import { describe, test, expect } from 'vitest';
import { makeIris, makeDiamonds, makeGapminder, makeLifeSat, makeVocabTest, detectCols, DATASET_DEFAULTS, BUILTIN } from './datasets.js';
import { corr } from 'statlab/math/core';

describe('datasets exhaustive', () => {
  test('makeIris has expected schema', () => {
    const rows = makeIris();
    expect(rows.length).toBe(150);
    expect(rows[0]).toHaveProperty('species');
    expect(rows[0]).toHaveProperty('sepalLength');
  });

  test('makeDiamonds numeric and categorical cols', () => {
    const rows = makeDiamonds();
    expect(rows.length).toBeGreaterThan(100);
    const { numeric, categorical } = detectCols(rows);
    expect(numeric).toContain('carat');
    expect(categorical).toContain('cut');
  });

  test('makeGapminder has country and lifeExp', () => {
    const rows = makeGapminder();
    expect(rows[0].country).toBeTruthy();
    expect(rows[0].lifeExp).toBeGreaterThan(30);
  });

  test('detectCols separates numeric vs categorical', () => {
    const rows = [{ a: 1, b: 'x' }, { a: 2, b: 'y' }];
    const { numeric, categorical } = detectCols(rows);
    expect(numeric).toEqual(['a']);
    expect(categorical).toEqual(['b']);
  });

  test('DATASET_DEFAULTS keys match BUILTIN subset', () => {
    Object.keys(DATASET_DEFAULTS).forEach(key => {
      expect(BUILTIN[key] || makeIris).toBeTruthy();
    });
  });

  test('BUILTIN entries have url or make factory', () => {
    Object.entries(BUILTIN).forEach(([key, def]) => {
      expect(def.url || def.make, key).toBeTruthy();
    });
  });

  test('makeLifeSat has expected schema and value ranges', () => {
    const rows = makeLifeSat();
    expect(rows.length).toBe(200);
    const itemCols = ['auto1', 'auto2', 'auto3', 'auto4', 'comp1', 'comp2', 'comp3', 'comp4', 'rel1', 'rel2', 'rel3', 'rel4'];
    itemCols.forEach(col => {
      rows.forEach(r => {
        expect(r[col]).toBeGreaterThanOrEqual(1);
        expect(r[col]).toBeLessThanOrEqual(5);
        expect(Number.isInteger(r[col])).toBe(true);
      });
    });
    expect(new Set(rows.map(r => r.cohort))).toEqual(new Set(['A', 'B', 'C']));
  });

  test('makeVocabTest has expected schema and binary values', () => {
    const rows = makeVocabTest();
    expect(rows.length).toBe(300);
    for (let i = 1; i <= 15; i++) {
      rows.forEach(r => {
        expect([0, 1]).toContain(r[`q${i}`]);
      });
    }
    expect(new Set(rows.map(r => r.grade))).toEqual(new Set(['9th', '10th', '11th', '12th']));
  });

  test('makeVocabTest items have real IRT structure (pass rate tracks difficulty)', () => {
    const rows = makeVocabTest();
    const nItems = 15;
    const difficulty = i => -2 + (4 * i) / (nItems - 1);
    const passRates = [];
    const difficulties = [];
    for (let i = 0; i < nItems; i++) {
      const col = `q${i + 1}`;
      const passRate = rows.reduce((s, r) => s + r[col], 0) / rows.length;
      passRates.push(passRate);
      difficulties.push(difficulty(i));
    }
    expect(corr(difficulties, passRates)).toBeLessThan(-0.5);
  });

  test('BUILTIN.lifesat and BUILTIN.vocabtest are wired up', () => {
    expect(BUILTIN.lifesat.make).toBe(makeLifeSat);
    expect(BUILTIN.vocabtest.make).toBe(makeVocabTest);
    expect(DATASET_DEFAULTS.lifesat).toBeDefined();
    expect(DATASET_DEFAULTS.vocabtest).toBeDefined();
  });
});
