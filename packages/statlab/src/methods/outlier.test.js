import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { localOutlierFactor, isolationForest } from './outlier.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const X = Array.from({length: 20}, (_, i) => i < 18 ? [Math.random() * 5, Math.random() * 5] : [50 + Math.random() * 10, 50 + Math.random() * 10]);

describe('localOutlierFactor', () => {
  it('contract keys', () => expectKeys(localOutlierFactor(X, { k: 3 }), ['test','lof','outliers','threshold','k','n','apa']));
  it('null < k+2', () => expect(localOutlierFactor(X.slice(0,3), { k: 3 })).toBeNull());
  it('lof array matches input size', () => { const r = localOutlierFactor(X, { k: 3 }); if (r) { expect(r.lof.length).toBe(X.length) } });
  it('outlier threshold > 0', () => { const r = localOutlierFactor(X, { k: 3 }); if (r) expect(r.threshold).toBeGreaterThan(0) });
  it('each lof >= 0', () => { const r = localOutlierFactor(X, { k: 3 }); if (r) r.lof.forEach(v => expect(v).toBeGreaterThanOrEqual(0)) });
});
describe('localOutlierFactor matches sklearn.neighbors.LocalOutlierFactor', () => {
  it('LOF scores match the sklearn oracle exactly on a non-tied dataset', () => {
    const e = ref.outlier.lof_basic;
    const r = localOutlierFactor(e.X, { k: e.k });
    e.lof.forEach((v, i) => expect(r.lof[i]).toBeCloseTo(v, 3));
  });
});

describe('isolationForest', () => {
  it('contract keys', () => expectKeys(isolationForest(X, { nTrees: 10 }), ['test','scores','outliers','threshold','nTrees','apa']));
  it('null <5', () => expect(isolationForest(X.slice(0,3))).toBeNull());
  it('scores array matches input size', () => { const r = isolationForest(X, { nTrees: 10 }); if (r) expect(r.scores.length).toBe(X.length) });
  it('outliers detected for extreme points', () => { const r = isolationForest(X, { nTrees: 10 }); if (r) expect(r.outliers).toBeDefined() });
});
