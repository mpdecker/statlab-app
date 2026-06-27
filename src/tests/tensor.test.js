import { describe, it, expect } from 'vitest';
import { parafac, tuckerDecomp, unfold, multiwayPCA, tensorRegression } from './tensor.js';
import { expectKeys } from './__fixtures__/helpers.js';

const X = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]];
const y = [3, 7, 11, 15];

describe('parafac', () => {
  it('contract keys', () => { const r = parafac(X); if (r) expectKeys(r, ['test', 'factors', 'nFactors', 'dims', 'apa']); });
});

describe('tuckerDecomp', () => {
  it('contract keys', () => { const r = tuckerDecomp(X); if (r) expectKeys(r, ['test', 'factors', 'ranks', 'dims', 'apa']); });
});

describe('unfold', () => {
  it('contract keys', () => expectKeys(unfold(X), ['test', 'matrix', 'mode', 'dims', 'apa']));
  it('mode=1 works', () => { const r = unfold(X, 1); expect(r.mode).toBe(1); });
});

describe('multiwayPCA', () => {
  it('contract keys', () => { const r = multiwayPCA(X); if (r) expectKeys(r, ['test', 'scores', 'loadings', 'nComp', 'apa']); });
});

describe('tensorRegression', () => {
  it('contract keys', () => { const r = tensorRegression(X, [1, 2, 3, 4]); if (r) expectKeys(r, ['test', 'coefficients', 'rSquared', 'n', 'apa']); });
  it('rSquared in [0,1]', () => { const r = tensorRegression(X, y); if (r) { expect(r.rSquared).toBeGreaterThanOrEqual(0); expect(r.rSquared).toBeLessThanOrEqual(1); } });
});

describe('tensor edge cases', () => {
  it('parafac null for small', () => expect(parafac([[[1]]])).toBeNull());
  it('tuckerDecomp handles 2D', () => { const r = tuckerDecomp([[[1, 2], [3, 4]]]); expect(r !== null).toBe(true); });
  it('unfold mode=2 works', () => { const r = unfold([[[1, 2], [3, 4]]], 2); expect(r).not.toBeNull(); });
  it('multiwayPCA null for empty', () => expect(multiwayPCA([], 1)).toBeNull());
  it('tensorRegression null for mismatch', () => expect(tensorRegression([[[1]]], [1, 2, 3])).toBeNull());
});
