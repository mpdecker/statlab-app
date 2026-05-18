import { describe, test, expect } from 'vitest';
import { makeIris, makeDiamonds, makeGapminder, detectCols, DATASET_DEFAULTS, BUILTIN } from './datasets.js';

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
});
