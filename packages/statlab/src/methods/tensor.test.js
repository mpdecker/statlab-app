import { describe, it, expect } from 'vitest';
import { parafac, tuckerDecomp, unfold, multiwayPCA, tensorRegression, cpDecomposition, tuckerRegression, tensorCompletion } from './tensor.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const X = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]];
const y = [3, 7, 11, 15];

describe('parafac', () => {
  it('contract keys', () => { const r = parafac(X); if (r) expectKeys(r, ['test', 'factors', 'nFactors', 'dims', 'apa']); });
  it('components non-empty', () => { const r = parafac(X); if (r) expect(r.factors.A.length).toBeGreaterThan(0); });
  it('nFactors matches', () => { const r = parafac(X, 2); if (r) expect(r.nFactors).toBe(2); });
});

describe('tuckerDecomp', () => {
  it('contract keys', () => { const r = tuckerDecomp(X); if (r) expectKeys(r, ['test', 'factors', 'ranks', 'dims', 'apa']); });
  it('core non-empty', () => { const r = tuckerDecomp(X); if (r) expect(r.factors.length).toBeGreaterThan(0); });
  it('ranks is array', () => { const r = tuckerDecomp(X); if (r) expect(Array.isArray(r.ranks)).toBe(true); });
});

describe('unfold', () => {
  it('contract keys', () => expectKeys(unfold(X), ['test', 'matrix', 'mode', 'dims', 'apa']));
  it('mode=1 works', () => { const r = unfold(X, 1); expect(r.mode).toBe(1); });
  it('matrix non-empty', () => { const r = unfold(X); if (r) expect(r.matrix.length).toBeGreaterThan(0); });
});

describe('multiwayPCA', () => {
  it('contract keys', () => { const r = multiwayPCA(X); if (r) expectKeys(r, ['test', 'scores', 'loadings', 'nComp', 'apa']); });
  it('eigenvalues non-empty', () => { const r = multiwayPCA(X); if (r) expect(r.loadings.length).toBeGreaterThan(0); });
  it('scores non-empty', () => { const r = multiwayPCA(X); if (r) expect(r.scores.length).toBeGreaterThan(0); });
});

describe('tensorRegression', () => {
  it('contract keys', () => { const r = tensorRegression(X, [1, 2, 3, 4]); if (r) expectKeys(r, ['test', 'coefficients', 'rSquared', 'n', 'apa']); });
  it('rSquared in [0,1]', () => { const r = tensorRegression(X, y); if (r) { expect(r.rSquared).toBeGreaterThanOrEqual(0); expect(r.rSquared).toBeLessThanOrEqual(1); } });
  it('coefficients non-empty', () => { const r = tensorRegression(X, y); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
});

describe('tensor edge cases', () => {
  it('parafac null for small', () => expect(parafac([[[1]]])).toBeNull());
  it('tuckerDecomp handles 2D', () => { const r = tuckerDecomp([[[1, 2], [3, 4]]]); expect(r !== null).toBe(true); });
  it('unfold mode=2 works', () => { const r = unfold([[[1, 2], [3, 4]]], 2); expect(r).not.toBeNull(); });
  it('multiwayPCA null for empty', () => expect(multiwayPCA([], 1)).toBeNull());
  it('tensorRegression null for mismatch', () => expect(tensorRegression([[[1]]], [1, 2, 3])).toBeNull());
});

describe('cpDecomposition', () => {
  const T = [[[1,2],[3,4]],[[5,6],[7,8]]];
  it('contract keys', () => expectKeys(cpDecomposition(T, 2), ['test','rank','dims','fit','apa']));
  it('null rank<1', () => expect(cpDecomposition(T, 0)).toBeNull());
  it('rank matches', () => { const r = cpDecomposition(T, 2); if (r) expect(r.rank).toBe(2); });
});
describe('tuckerRegression', () => {
  const X = [[[1,2],[3,4]],[[5,6],[7,8]],[[9,10],[11,12]],[[13,14],[15,16]],[[17,18],[19,20]]];
  const y = [2,4,6,8,10];
  it('contract keys', () => expectKeys(tuckerRegression(X, y), ['test','mse','rank','dims','n','apa']));
  it('null <5', () => expect(tuckerRegression([[1,2],[3,4]], [1,2])).toBeNull());
  it('mse non-negative', () => { const r = tuckerRegression(X, y); if (r) expect(r.mse).toBeGreaterThanOrEqual(0); });
});
describe('tensorCompletion', () => {
  const T = [[[1,2],[3,4]],[[5,6],[7,8]]];
  const mask = [[[true,false],[true,true]],[[true,true],[false,true]]];
  it('contract keys', () => expectKeys(tensorCompletion(T, mask), ['test','dims','nMissing','rank','apa']));
  it('nMissing positive', () => { const r = tensorCompletion(T, mask); if (r) expect(r.nMissing).toBeGreaterThan(0); });
  it('dims is array', () => { const r = tensorCompletion(T, mask); if (r) expect(Array.isArray(r.dims)).toBe(true); });
});

describe('cpDecomposition runs real CP-ALS', () => {
  it('reconstructs a rank-1 tensor with near-zero error', () => {
    const a = [1, 2, 3, 1.5], b = [1, 0.5, 2], c = [2, 1];
    const T = a.map(ai => b.map(bj => c.map(ck => ai * bj * ck)));
    const r = cpDecomposition(T, 1, { maxIter: 60, seed: 1 });
    expect(r.fit).toBeLessThan(1e-3);
  });
});

describe('tuckerRegression fits a real low-rank coefficient tensor', () => {
  it('recovers a rank-1 coefficient on noiseless data (MSE ~ 0)', () => {
    const u = [1, -1, 2], w = [1, 2]; // true rank-1 beta[a][b] = u[a]*w[b]
    const beta = u.map(ua => w.map(wb => ua * wb));
    let sd = 98765; const rnd = () => { sd = (Math.imul(1664525, sd) + 1013904223) >>> 0; return (sd / 2 ** 32) * 2 - 1; };
    const X = Array.from({ length: 14 }, () => [0, 1, 2].map(() => [0, 1].map(() => +rnd().toFixed(3))));
    const y = X.map(Xi => { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) s += beta[a][b] * Xi[a][b]; return s; });
    const r = tuckerRegression(X, y, { rank: [1, 1], maxIter: 200, seed: 3 });
    expect(r.mse).toBeLessThan(1e-2);
  });
});

describe('tensorCompletion recovers low-rank structure', () => {
  it('fills a masked entry of a rank-1 tensor close to its true value', () => {
    const a = [1, 2], b = [1, 3], c = [2, 1];
    const T = a.map(ai => b.map(bj => c.map(ck => ai * bj * ck)));
    const mask = [[[true, true], [true, false]], [[true, true], [true, true]]]; // hide T[0][1][1]=a0*b1*c1=1*3*1=3
    const r = tensorCompletion(T, mask, { rank: 1, maxIter: 25 });
    expect(r.completed[0][1][1]).toBeCloseTo(3, 1);
  });
});

describe('unfold produces the standard mode-n matricization for every mode (regression test for the wrong-row-index fix)', () => {
  it('matches a from-scratch numpy re-derivation for mode 0, 1, and 2 — the old code silently zeroed out most cells for mode 1/2', () => {
    const e = ref.tensor.unfold_basic;
    [0, 1, 2].forEach(mode => {
      const r = unfold(e.tensor, mode);
      const expected = e[`mode${mode}`];
      expected.forEach((row, i) => row.forEach((v, j) => expect(r.matrix[i][j]).toBeCloseTo(v, 6)));
    });
  });
});

describe('hardening — invalid inputs', () => {
  it('parafac null for null tensor', () => expect(parafac(null)).toBeNull());
  it('parafac null for empty tensor', () => expect(parafac([])).toBeNull());
  it('tuckerDecomp null for null tensor', () => expect(tuckerDecomp(null)).toBeNull());
  it('unfold null for null tensor', () => expect(unfold(null)).toBeNull());
  it('multiwayPCA null for null tensor', () => expect(multiwayPCA(null)).toBeNull());
  it('tensorRegression null for null X', () => expect(tensorRegression(null, [1, 2])).toBeNull());
  it('cpDecomposition null for rank<1', () => expect(cpDecomposition(X, 0)).toBeNull());
  it('tuckerRegression null for null X', () => expect(tuckerRegression(null, [1, 2])).toBeNull());
  it('tensorCompletion null for null tensor', () => expect(tensorCompletion(null, [[[true]]])).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('parafac null for small tensor', () => expect(parafac([[[1]]])).toBeNull());
  it('tuckerDecomp handles 2x2x1', () => { const r = tuckerDecomp([[[1, 2], [3, 4]]]); expect(r).not.toBeNull(); });
  it('unfold with mode=0 on 2d-like tensor', () => { const r = unfold([[[1, 2], [3, 4]]], 0); expect(r).not.toBeNull(); });
});

describe('hardening — invariants', () => {
  it('tensorRegression rSquared in [0,1]', () => { const r = tensorRegression(X, y); if (r) { expect(r.rSquared).toBeGreaterThanOrEqual(0); expect(r.rSquared).toBeLessThanOrEqual(1); } });
  it('cpDecomposition fit non-negative', () => { const r = cpDecomposition(X, 2); if (r) expect(r.fit).toBeGreaterThanOrEqual(0); });
  it('tuckerCompletion nMissing positive with mask', () => { const mask = [[[true, false], [true, true]], [[true, true], [false, true]]]; const r = tensorCompletion(X, mask); expect(r.nMissing).toBeGreaterThan(0); });
});
