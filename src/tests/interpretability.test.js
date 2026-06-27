import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { shapValues, limeImportance, partialDependence, permutationImportance, alePlot, featureInteraction, globalSurrogate } from './interpretability.js';

const X = Array.from({length: 10}, (_, i) => [i, i * 0.5, i % 3]);
const y = X.map(r => r[0] * 2 + r[1] * 3 + Math.random());

describe('shapValues', () => {
  it('contract keys', () => expectKeys(shapValues(X, y, { nSamples: 20 }), ['test','shap','normalized','n','p','nSamples','apa']));
  it('null <5', () => expect(shapValues([[1]], [1])).toBeNull());
  it('normalized sum to 1', () => { const r = shapValues(X, y, { nSamples: 20 }); if (r) { const sum = r.normalized.reduce((s, v) => s + v, 0); expect(sum).toBeCloseTo(1) } });
});
describe('limeImportance', () => {
  it('contract keys', () => expectKeys(limeImportance(X, y, X[0], { nSamples: 20 }), ['test','importance','normalized','p','nSamples','apa']));
  it('null <5', () => expect(limeImportance([[1]], [1], [1])).toBeNull());
  it('normalized sum to 1', () => { const r = limeImportance(X, y, X[0], { nSamples: 20 }); if (r) { const sum = r.normalized.reduce((s, v) => s + v, 0); expect(sum).toBeCloseTo(1) } });
});
describe('partialDependence', () => {
  it('contract keys', () => expectKeys(partialDependence(X, y, 0), ['test','grid','pdp','featureIndex','n','apa']));
  it('null invalid feature', () => expect(partialDependence(X, y, 99)).toBeNull());
  it('pdp same length as grid', () => { const r = partialDependence(X, y, 0); if (r) expect(r.pdp.length).toBe(r.grid.length) });
});
describe('permutationImportance', () => {
  it('contract keys', () => expectKeys(permutationImportance(X, y, 0.8, { nRepeats: 5 }), ['test','importance','normalized','p','nRepeats','apa']));
  it('null invalid score', () => expect(permutationImportance(X, y, NaN)).toBeNull());
  it('normalized values between 0-1', () => { const r = permutationImportance(X, y, 0.8, { nRepeats: 5 }); if (r) r.normalized.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1) }) });
});

describe('alePlot', () => {
  const X = [[1,2],[3,4],[5,6],[7,8],[9,10]];
  const model = x => x[0] + x[1] * 2;
  it('contract keys', () => expectKeys(alePlot(X, model, 0), ['test','intervals','ale','featureIndex','n','apa']));
  it('null <5', () => expect(alePlot([[1]], model, 0)).toBeNull());
  it('ale length matches nIntervals', () => { const r = alePlot(X, model, 0); if (r) expect(r.ale.length).toBe(r.intervals.length - 1) });
});
describe('featureInteraction', () => {
  const X = [[1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15]];
  const model = x => x[0] + x[1] * 2;
  it('contract keys', () => expectKeys(featureInteraction(X, model, 0, 1), ['test','H','i','j','n','apa']));
  it('H finite', () => { const r = featureInteraction(X, model, 0, 1); if (r) expect(isFinite(r.H)).toBe(true) });
  it('i and j match inputs', () => { const r = featureInteraction(X, model, 0, 1); if (r) { expect(r.i).toBe(0); expect(r.j).toBe(1); } });
});
describe('globalSurrogate', () => {
  const X = [[1],[2],[3],[4],[5]]; const y = [2.1,4.2,6.0,8.1,10.3];
  it('contract keys', () => expectKeys(globalSurrogate(X, y), ['test','r2','rmse','n','apa']));
  it('null <5', () => expect(globalSurrogate([[1]], [2])).toBeNull());
  it('r2 between 0-1', () => { const r = globalSurrogate(X, y); if (r) { expect(r.r2).toBeGreaterThanOrEqual(0); expect(r.r2).toBeLessThanOrEqual(1) } });
});
