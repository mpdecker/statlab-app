import { describe, test, expect } from 'vitest';
import { fitOLS, getChartInsight } from './vizHelpers.js';

describe('vizHelpers', () => {
  test('fitOLS returns regression line', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 5, 4, 5];
    const fit = fitOLS(xs, ys);
    expect(fit).toBeTruthy();
    expect(fit.line).toHaveLength(2);
    expect(Math.abs(fit.r)).toBeGreaterThan(0);
  });

  test('getChartInsight returns text for correlogram', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ a: i, b: i * 2 }));
    const msg = getChartInsight('Correlogram', { data, numVars: ['a', 'b'] });
    expect(msg).toContain('Pearson');
  });
});
