import { describe, it, expect } from 'vitest';
import { fourPL, ec50, hillSlope, volcanoPlot, log2FoldChange, moderatedTStatistic } from './doseResponse.js';
import { expectKeys } from './__fixtures__/helpers.js';

const dose = [0.01, 0.03, 0.1, 0.3, 1, 3, 10];
const resp = [5, 8, 15, 35, 60, 82, 95];

describe('fourPL', () => {
  it('null <6', () => expect(fourPL(dose.slice(0, 4), resp.slice(0, 4))).toBeNull());
  it('contract keys', () => expectKeys(fourPL(dose, resp), ['test', 'parameters', 'fitted', 'sse', 'n', 'apa']));
  it('fitted length = n', () => { const r = fourPL(dose, resp); expect(r.fitted).toHaveLength(dose.length); });
  it('parameters finite', () => { const r = fourPL(dose, resp); expect(Number.isFinite(r.parameters.logEC50)).toBe(true); });
});

describe('ec50', () => {
  it('null for invalid model', () => expect(ec50(null)).toBeNull());
  it('EC50 > 0', () => { const r = fourPL(dose, resp); if (r) { const e = ec50(r); expect(e.ec50).toBeGreaterThan(0); } });
  it('contract keys', () => { const r = fourPL(dose, resp); if (r) expectKeys(ec50(r), ['test', 'ec50', 'ci', 'alpha', 'apa']); });
});

describe('hillSlope', () => {
  it('null invalid', () => expect(hillSlope(null)).toBeNull());
  it('hill finite', () => { const r = fourPL(dose, resp); if (r) { const h = hillSlope(r); expect(Number.isFinite(h.hill)).toBe(true); } });
  it('contract keys', () => { const r = fourPL(dose, resp); if (r) expectKeys(hillSlope(r), ['test', 'hill', 'interpretation', 'apa']); });
});

describe('volcanoPlot', () => {
  const fc = [1.5, -0.8, 2.3, -1.2, 0.3, -2.5];
  const pv = [0.001, 0.08, 0.02, 0.04, 0.5, 0.005];
  it('null <3', () => expect(volcanoPlot([1, 2], [0.1, 0.2])).toBeNull());
  it('contract keys', () => expectKeys(volcanoPlot(fc, pv), ['test', 'points', 'n', 'apa']));
  it('points with significance', () => { const r = volcanoPlot(fc, pv); expect(r.points.some(p => p.significant)).toBe(true); });
});

describe('log2FoldChange', () => {
  it('null <2', () => expect(log2FoldChange([1], [2])).toBeNull());
  it('log2FC finite', () => { const r = log2FoldChange([2, 3, 4], [1, 1.5, 2]); expect(Number.isFinite(r.log2FC)).toBe(true); });
  it('contract keys', () => expectKeys(log2FoldChange([2, 3, 4], [1, 1.5, 2]), ['test', 'log2FC', 'treatmentMean', 'controlMean', 'nT', 'nC', 'apa']));
});

describe('moderatedTStatistic', () => {
  const vals = [2, 3, 2.5, 3.5, 7, 8, 7.5, 8.5];
  const grps = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'];
  it('null <2 groups', () => expect(moderatedTStatistic([1, 2, 3], ['A', 'A', 'A'])).toBeNull());
  it('contract keys', () => expectKeys(moderatedTStatistic(vals, grps), ['test', 'statistics', 'n', 'apa']));
  it('t-values finite', () => { const r = moderatedTStatistic(vals, grps); r.statistics.forEach(s => expect(Number.isFinite(s.t)).toBe(true)); });
  it('p in [0,1]', () => { const r = moderatedTStatistic(vals, grps); r.statistics.forEach(s => { expect(s.p).toBeGreaterThanOrEqual(0); expect(s.p).toBeLessThanOrEqual(1); }); });
});

describe('edge cases', () => {
  it('fourPL null for constant response', () => expect(fourPL(dose, [50, 50, 50, 50, 50, 50, 50])).toBeNull());
  it('fourPL null for mismatch', () => expect(fourPL(dose, [1, 2, 3])).toBeNull());
  it('ec50 null for null params', () => expect(ec50({ parameters: null })).toBeNull());
  it('hillSlope interpret non-cooperative', () => { const r = fourPL(dose, resp); if (r) { r.parameters.hill = 0.9; expect(hillSlope(r).interpretation).toBeDefined(); } });
  it('volcanoPlot null for length mismatch', () => expect(volcanoPlot([1, 2, 3], [0.1, 0.2])).toBeNull());
  it('log2FoldChange null for zero control mean', () => expect(log2FoldChange([1, 2], [0, 0])).toBeNull());
  it('moderatedTStatistic null for <3 per group', () => expect(moderatedTStatistic([1, 2, 3, 4], ['A', 'A', 'B', 'B'])).toBeNull());
});
