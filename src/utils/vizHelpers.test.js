import { describe, test, expect } from 'vitest';
import {
  fitOLS, getChartInsight, resolveQuickViewVars, barGroupsFromResult,
  loadingFromResult, formatInferenceSummary,
} from './vizHelpers.js';

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

  test('resolveQuickViewVars uses inference group vars for ANOVA', () => {
    const r = resolveQuickViewVars('anova', { xVar: 'a', yVar: 'b', groupVar: 'c' }, {
      grpVar: 'sex', tgtVar: 'wage',
    });
    expect(r.usingInference).toBe(true);
    expect(r.groupVar).toBe('sex');
    expect(r.yVar).toBe('wage');
  });

  test('barGroupsFromResult prefers gMeans from ANOVA output', () => {
    const groups = barGroupsFromResult({
      gMeans: [{ name: 'A', mean: 1.2, sd: 0.3, n: 10 }],
    }, 'anova', [], 'g', 'y');
    expect(groups[0].name).toBe('A');
    expect(groups[0].mean).toBe(1.2);
  });

  test('loadingFromResult builds cronbach matrix', () => {
    const load = loadingFromResult({ itc: [0.5, 0.6], aDel: [0.7, 0.65] }, 'cronbach', ['i1', 'i2']);
    expect(load.matrix).toHaveLength(2);
    expect(load.colLabels).toEqual(['i1', 'i2']);
  });

  test('formatInferenceSummary formats t-test', () => {
    expect(formatInferenceSummary({ t: 2.1, p: 0.04 }, 't_welch')).toContain('t = 2.1');
  });
});
