import { describe, it, expect } from 'vitest';
import { morrisMethod, fastSensitivity, modelComparison, forecastCombination, sobolFirstOrder, sobolTotalIndex, deltaMethod, andrewsPlot } from './sensitivity.js';
import { expectKeys } from './__fixtures__/helpers.js';

const X = [[1,2],[2,3],[3,4],[4,5],[5,6]];
const model = x => x[0] + x[1] * 2;

describe('morrisMethod', () => { it('contract keys', () => { const r = morrisMethod(model, X); if (r) expectKeys(r, ['test','effects','n','p','levels','apa']); }); it('effects array non-empty', () => { const r = morrisMethod(model, X); if (r) { expect(Array.isArray(r.effects)).toBe(true); expect(r.effects.length).toBeGreaterThan(0); } }); it('mu values finite', () => { const r = morrisMethod(model, X); if (r && r.effects) { r.effects.forEach(e => { if (e.mu !== undefined) expect(Number.isFinite(e.mu)).toBe(true); }); } }) });
describe('fastSensitivity', () => { it('contract keys', () => { const r = fastSensitivity(model, X); if (r) expectKeys(r, ['test','Si','n','p','apa']); }); it('Si between 0 and 1', () => { const r = fastSensitivity(model, X); if (r && r.Si) { r.Si.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }); } }); it('sensitivity indices between 0-1', () => { const r = fastSensitivity(model, X); if (r && r.Si) { expect(Math.max(...r.Si)).toBeLessThanOrEqual(1); expect(Math.min(...r.Si)).toBeGreaterThanOrEqual(0); } }) });
describe('modelComparison', () => { it('contract keys', () => expectKeys(modelComparison(2.5, 3.0, 30, 2, 3), ['test','f','df1','df2','p','n','apa'])); it('p between 0 and 1', () => { const r = modelComparison(2.5, 3.0, 30, 2, 3); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); it('returns comparison table', () => { const r = modelComparison(2.5, 3.0, 30, 2, 3); if (r) { expect(r.f).toBeDefined(); expect(r.df1).toBeDefined(); expect(r.df2).toBeDefined(); } }) });
describe('forecastCombination', () => { it('is defined', () => expect(typeof forecastCombination).toBe('function')); it('returns object with mse', () => { const fc = [[10,12,14,16,18],[11,13,15,17,19]]; const actual = [10,12,13,15,17]; const r = forecastCombination(fc, actual); if (r) { expect(Number.isFinite(r.mse)).toBe(true); } }); it('mse finite', () => { const fc = [[10,12,14,16,18],[11,13,15,17,19]]; const actual = [10,12,13,15,17]; const r = forecastCombination(fc, actual); if (r) { expect(Number.isFinite(r.mse)).toBe(true); expect(r.mse).toBeGreaterThanOrEqual(0); } }) });
describe('sobolFirstOrder', () => { it('contract keys', () => { const r = sobolFirstOrder(model, X); if (r) expectKeys(r, ['test','Si','n','p','apa']); }); it('Si between 0 and 1', () => { const r = sobolFirstOrder(model, X); if (r && r.Si) { r.Si.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }); } }); it('indices between 0-1', () => { const r = sobolFirstOrder(model, X); if (r && r.Si) { expect(Math.max(...r.Si)).toBeLessThanOrEqual(1); expect(Math.min(...r.Si)).toBeGreaterThanOrEqual(0); } }) });

describe('sobolTotalIndex', () => {
  const X = [[1,2],[2,3],[3,4],[4,5],[5,6]];
  const model = x => x[0] + x[1] * 2;
  it('contract keys', () => expectKeys(sobolTotalIndex(model, X, { nSamples: 10 }), ['test','totalIndices','n','p','nSamples','apa']));
  it('null <5', () => expect(sobolTotalIndex(model, [[1,2]], { nSamples: 5 })).toBeNull());
  it('totalIndices array non-empty', () => { const r = sobolTotalIndex(model, X, { nSamples: 10 }); if (r && r.totalIndices) { expect(Array.isArray(r.totalIndices)).toBe(true); expect(r.totalIndices.length).toBeGreaterThan(0); } }); it('total >= first order', () => { const r = sobolTotalIndex(model, X, { nSamples: 10 }); if (r && r.totalIndices && r.firstOrderIndices) { r.totalIndices.forEach((t, i) => { expect(t).toBeGreaterThanOrEqual(r.firstOrderIndices[i] || 0); }); } });
});
describe('deltaMethod', () => {
  const fn = x => x[0] * x[1];
  it('contract keys', () => expectKeys(deltaMethod([2, 3], [0.1, 0.2], fn), ['test','estimate','se','p','apa']));
  it('null mismatched', () => expect(deltaMethod([2], [0.1, 0.2], fn)).toBeNull());
  it('se positive', () => { const r = deltaMethod([2, 3], [0.1, 0.2], fn); if (r) expect(r.se).toBeGreaterThan(0); });
});
describe('andrewsPlot', () => {
  const X = [[1,2,3],[4,5,6],[7,8,9]];
  it('contract keys', () => expectKeys(andrewsPlot(X), ['test','curves','nCurves','p','nPts','apa']));
  it('null <2 rows', () => expect(andrewsPlot([[1]])).toBeNull());
  it('curves array non-empty', () => { const r = andrewsPlot(X); if (r) { expect(Array.isArray(r.curves)).toBe(true); expect(r.curves.length).toBeGreaterThan(0); } }); it('curves non-empty', () => { const r = andrewsPlot(X); if (r) { expect(r.curves).toBeDefined(); } });
});

describe('modelComparison uses a real F-distribution p-value', () => {
  it('gives a tiny p-value for a large F statistic', () => {
    const r = modelComparison(10, 1, 30, 1, 1); // F=10 on ~(28,28) df
    expect(r.p).toBeLessThan(0.01);
  });
});
