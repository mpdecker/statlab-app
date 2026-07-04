import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { shapValues, limeImportance, partialDependence, permutationImportance, alePlot, featureInteraction, globalSurrogate } from './interpretability.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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

// ── Correctness tests: real linear-surrogate explanations ──────────
const Xind = Array.from({ length: 25 }, (_, i) => [i, (i * 7) % 5, (i * 3) % 4]);
const ylin = Xind.map(r => 2 * r[0] + 3 * r[1] - 1.5 * r[2] + 5);

describe('globalSurrogate fits a real linear surrogate', () => {
  it('achieves near-perfect R2 and recovers coefficients on linear data', () => {
    const r = globalSurrogate(Xind, ylin);
    expect(r.r2).toBeGreaterThan(0.99);
    expect(r.coefficients[0]).toBeCloseTo(2, 1);
    expect(r.coefficients[1]).toBeCloseTo(3, 1);
  });
});

describe('partialDependence reflects the real model effect', () => {
  it('PDP slope on feature 0 matches its coefficient (~2)', () => {
    const r = partialDependence(Xind, ylin, 0);
    const k = r.grid.length;
    const slope = (r.pdp[k - 1] - r.pdp[0]) / (r.grid[k - 1] - r.grid[0]);
    expect(slope).toBeCloseTo(2, 1);
  });
});

describe('shapValues are real Shapley values of the linear surrogate', () => {
  it('mean |SHAP| per feature matches |beta_j|*E|x_j - x_bar_j|', () => {
    const r = shapValues(Xind, ylin, { seed: 7, nSamples: 400 });
    const beta = [2, 3, -1.5];
    const colMean = j => Xind.reduce((s, row) => s + row[j], 0) / Xind.length;
    const expected = beta.map((b, j) => Math.abs(b) * Xind.reduce((s, row) => s + Math.abs(row[j] - colMean(j)), 0) / Xind.length);
    for (let j = 0; j < 3; j++) expect(Math.abs(r.shap[j] - expected[j])).toBeLessThan(0.15 * expected[j] + 0.05);
  });
});

describe('limeImportance fits a real local linear surrogate', () => {
  it('recovers the linear model coefficients around the query point', () => {
    const r = limeImportance(Xind, ylin, Xind[10], { seed: 11, nSamples: 120 });
    expect(r.coefficients[0]).toBeCloseTo(2, 1);
    expect(r.coefficients[1]).toBeCloseTo(3, 1);
    expect(r.coefficients[2]).toBeCloseTo(-1.5, 1);
  });
});

describe('alePlot handles the max-value boundary and empty bins correctly (regression test for the exclusive-last-bin and reset-to-zero bugs)', () => {
  it('matches a from-scratch re-implementation of the ALE definition on data with an isolated max-value point', () => {
    const e = ref.interpretability.ale_basic;
    const model = row => row[0] * row[0];
    const r = alePlot(e.X, model, 0, { nIntervals: e.nIntervals });
    e.ale.forEach((v, i) => expect(r.ale[i]).toBeCloseTo(v, 3));
    // Specifically: the isolated max point (10) must contribute to the last bin
    // (nonzero jump from the previous cumulative value), and the two genuinely
    // empty bins in between must carry the running total forward, not reset to 0.
    expect(r.ale[2]).toBeCloseTo(r.ale[1], 6);
    expect(r.ale[3]).toBeCloseTo(r.ale[1], 6);
    expect(r.ale[4]).toBeGreaterThan(r.ale[3]);
  });
});
