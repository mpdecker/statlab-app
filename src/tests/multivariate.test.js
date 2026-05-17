// src/tests/multivariate.test.js
import { describe, it, expect } from 'vitest';
import { pca, efa, cronbachAlpha, icc, cohensKappa } from './multivariate.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const mkData = () => Array.from({ length: 20 }, (_, i) => ({
  x1: i + 1,
  x2: i * 0.5 + Math.sin(i),
  x3: 20 - i + Math.cos(i),
}));

describe('pca', () => {
  const data = mkData();
  const vars = ['x1', 'x2', 'x3'];

  it('returns null for insufficient rows', () =>
    expect(pca([{ x1: 1, x2: 2, x3: 3 }], vars)).toBeNull());
  it('returns eigenvalues array of length k', () => {
    const res = pca(data, vars);
    expect(res.eigenvalues).toHaveLength(3);
  });
  it('eigenvalues are non-negative', () => {
    const res = pca(data, vars);
    res.eigenvalues.forEach(e => expect(e).toBeGreaterThanOrEqual(-0.001));
  });
  it('cumulative variance ends at 100%', () => {
    const res = pca(data, vars);
    expect(res.cumP[res.cumP.length - 1]).toBeCloseTo(100, 1);
  });
  it('eigenvectors are exposed (Task 9 fix)', () => {
    const res = pca(data, vars);
    expect(res.eigenvectors).toBeDefined();
    expect(res.eigenvectors).toHaveLength(3);
  });
  it('eigenvaluesRaw are exposed (Task 9 fix)', () => {
    const res = pca(data, vars);
    expect(res.eigenvaluesRaw).toBeDefined();
  });
  it('nSig is in range [0, k]', () => {
    const res = pca(data, vars);
    expect(res.nSig).toBeGreaterThanOrEqual(0);
    expect(res.nSig).toBeLessThanOrEqual(3);
  });
  it('loadings array has k rows', () => {
    const res = pca(data, vars);
    expect(res.loadings).toHaveLength(3);
  });
});

describe('efa', () => {
  it('returns null for insufficient data', () =>
    expect(efa([{ x1: 1 }], ['x1'], 1)).toBeNull());
  it('returns result with loadings for valid data', () => {
    const data = mkData();
    const res = efa(data, ['x1', 'x2', 'x3'], 2);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('loadings');
  });
  it('does not crash (regression: previously used undefined evecs)', () => {
    const data = mkData();
    expect(() => efa(data, ['x1', 'x2', 'x3'], 1)).not.toThrow();
  });
});

describe('cronbachAlpha', () => {
  it('returns null for matrix with < 2 items', () =>
    expect(cronbachAlpha([[1],[2],[3]])).toBeNull());

  it('alpha=1 for perfectly collinear items', () => {
    const matrix = [
      [1,2,3,4],
      [2,3,4,5],
      [3,4,5,6],
      [4,5,6,7],
    ];
    const res = cronbachAlpha(matrix);
    expect(res.alpha).toBeCloseTo(ref.multivariate.cronbach_basic.alpha, 2);
  });
  it('alpha is between 0 and 1 for positively correlated items', () => {
    const matrix = Array.from({ length: 10 }, (_, i) => [i+1, i+1.2, i+0.8, i+1.5]);
    const res = cronbachAlpha(matrix);
    expect(res).not.toBeNull();
    expect(res.alpha).toBeGreaterThan(0.8);
    expect(res.alpha).toBeLessThanOrEqual(1);
  });
  it('returns itc (item-total correlations) array of length k', () => {
    const matrix = Array.from({ length: 8 }, (_, i) => [i, i+1, i+2]);
    const res = cronbachAlpha(matrix);
    expect(res.itc).toHaveLength(3);
  });
  it('returns label string', () => {
    const matrix = Array.from({ length: 10 }, (_, i) => [i+1, i+1.2, i+0.8]);
    const res = cronbachAlpha(matrix);
    expect(typeof res.label).toBe('string');
  });
});

describe('icc', () => {
  it('returns null for matrix with < 2 raters', () =>
    expect(icc([[1],[2],[3]])).toBeNull());
  it('ICC(2,1) is between -1 and 1', () => {
    const matrix = Array.from({ length: 10 }, (_, i) => [i+1, i+1.1, i+0.9]);
    const res = icc(matrix);
    expect(res).not.toBeNull();
    expect(res.icc21).toBeGreaterThanOrEqual(-1);
    expect(res.icc21).toBeLessThanOrEqual(1);
  });
  it('perfect agreement → ICC close to 1', () => {
    const matrix = Array.from({ length: 8 }, (_, i) => [i, i, i]);
    const res = icc(matrix);
    expect(res.icc21).toBeGreaterThan(0.95);
  });
  it('returns icc11 as well', () => {
    const matrix = Array.from({ length: 8 }, (_, i) => [i+1, i+1.2, i+0.8]);
    expect(icc(matrix)).toHaveProperty('icc11');
  });
});

describe('cohensKappa', () => {
  it('perfect agreement → kappa=1', () => {
    const r1 = [0, 1, 0, 1, 0, 1];
    const r2 = [0, 1, 0, 1, 0, 1];
    const res = cohensKappa(r1, r2);
    expect(res.kappa).toBeCloseTo(1, 4);
  });
  it('kappa is between -1 and 1', () => {
    const r1 = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
    const r2 = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0];
    const res = cohensKappa(r1, r2);
    expect(res.kappa).toBeGreaterThanOrEqual(-1);
    expect(res.kappa).toBeLessThanOrEqual(1);
  });
  it('returns null for unequal-length arrays', () =>
    expect(cohensKappa([0, 1], [0, 1, 0])).toBeNull());
  it('result has Po and Pe fields', () => {
    const res = cohensKappa([0,1,0,1], [0,1,1,0]);
    expect(res).toHaveProperty('Po');
    expect(res).toHaveProperty('Pe');
  });
});
