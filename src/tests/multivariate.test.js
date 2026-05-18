// src/tests/multivariate.test.js
import { describe, it, expect } from 'vitest';
import {
  pca, efa, cronbachAlpha, icc, cohensKappa,
  splitHalf, metaAnalysis, differencesInDifferences, convertEffectSize,
  manova, canonicalCorr, linearDiscriminant,
} from './multivariate.js';
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

describe('manova', () => {
  const data = [];
  for (let i = 0; i < 36; i++) {
    const g = i < 18 ? 'A' : 'B';
    const off = i < 18 ? 0 : 15;
    data.push({ species: g, y1: (i % 9) + off + Math.random() * .1, y2: (i % 9) * 2 + off + Math.random() * .1 });
  }

  it('returns null when only one factor level on data rows', () => {
    const oneGrp = data.filter(r => r.species === 'A');
    expect(manova(oneGrp, ['y1', 'y2'], 'species')).toBeNull();
  });

  it('reports Wilks Λ and p for small design', () => {
    const m = manova(data, ['y1', 'y2'], 'species');
    expect(m).not.toBeNull();
    expect(m.wilksLambda).toBeGreaterThan(0);
    expect(m.wilksLambda).toBeLessThanOrEqual(1);
    expect(m.prob).toBeGreaterThanOrEqual(0);
    expect(m.prob).toBeLessThanOrEqual(1);
    expect(m.pillaiTrace).not.toBeNaN();
    expect(m.ndep).toBe(2);
  });
});

describe('canonicalCorr', () => {
  const rows = mkData();

  it('returns null when X or Y block is empty', () => {
    expect(canonicalCorr(rows, [], ['x1', 'x2'])).toBeNull();
    expect(canonicalCorr(rows, ['x1', 'x2'], [])).toBeNull();
  });

  it('extracts correlations for two-blocks', () => {
    const ccRows = rows.map((r, ix) => ({ ...r, ySyn: +(r.x1 + r.x3) / 3 + ix * .001 }));
    const cc = canonicalCorr(ccRows, ['x1', 'x2'], ['x3', 'ySyn']);
    expect(cc).not.toBeNull();
    expect(cc.correlations.length).toBeGreaterThan(0);
    expect(cc.correlations[0]).toBeGreaterThan(0);
    expect(cc.pCanon).not.toBeNaN();
  });
});

describe('linearDiscriminant', () => {
  const ldaRows = Array.from({ length: 40 }, (_, i) => ({
    x1: (i % 12) / 11 + (i >= 22 ? .9 : 0),
    x2: (i % 7) / 7 + Math.sin(i) * .07 + (i >= 22 ? .35 : 0),
    grp: i < 20 ? 'Low' : 'High',
  }));

  it('returns null when groupVar column is absent', () => {
    expect(linearDiscriminant(ldaRows, 'missing_col', ['x1', 'x2'])).toBeNull();
  });

  it('returns coefficients and training-set accuracy %', () => {
    const L = linearDiscriminant(ldaRows, 'grp', ['x1', 'x2']);
    expect(L).not.toBeNull();
    expect(L.coefficients?.length).toBe(2);
    expect(L.accuracyTrain).toBeGreaterThanOrEqual(0);
    expect(L.accuracyTrain).toBeLessThanOrEqual(100);
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

describe('splitHalf', () => {
  it('returns null for k < 2 items', () =>
    expect(splitHalf([[1], [2], [3]])).toBeNull());

  it('returns rHalf and rSB for valid matrix', () => {
    const matrix = Array.from({ length: 10 }, (_, i) => [i+1, i+1.1, i+0.9, i+1.2]);
    const res = splitHalf(matrix);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('rHalf');
    expect(res).toHaveProperty('rSB');
  });

  it('rSB >= rHalf for positive rHalf', () => {
    const matrix = Array.from({ length: 10 }, (_, i) => [i+1, i+2, i+3, i+4]);
    const res = splitHalf(matrix);
    if (res.rHalf > 0) expect(res.rSB).toBeGreaterThanOrEqual(res.rHalf);
  });
});

describe('metaAnalysis', () => {
  it('returns null for < 2 studies', () =>
    expect(metaAnalysis([{ label: 'A', d: 0.5, se: 0.2 }])).toBeNull());

  it('returns dRE, I2, Q for valid studies', () => {
    const studies = [
      { label: 'A', d: 0.5, se: 0.1 },
      { label: 'B', d: 0.6, se: 0.15 },
      { label: 'C', d: 0.4, se: 0.12 },
    ];
    const res = metaAnalysis(studies);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('dRE');
    expect(res).toHaveProperty('I2');
    expect(res).toHaveProperty('Q');
  });

  it('I2 is between 0 and 100', () => {
    const studies = [
      { label: 'A', d: 0.5, se: 0.1 },
      { label: 'B', d: 0.8, se: 0.2 },
      { label: 'C', d: 0.3, se: 0.15 },
    ];
    const res = metaAnalysis(studies);
    expect(res.I2).toBeGreaterThanOrEqual(0);
    expect(res.I2).toBeLessThanOrEqual(100);
  });

  it('ci is array of length 2', () => {
    const studies = [
      { label: 'A', d: 0.5, se: 0.1 },
      { label: 'B', d: 0.6, se: 0.15 },
    ];
    const res = metaAnalysis(studies);
    expect(Array.isArray(res.ci)).toBe(true);
    expect(res.ci).toHaveLength(2);
  });
});

describe('differencesInDifferences', () => {
  it('returns null when any group has < 2 observations', () =>
    expect(differencesInDifferences([1], [2,3], [4,5], [6,7])).toBeNull());

  it('computes DiD correctly for parallel trends', () => {
    const preCtrl  = [10, 11, 10, 9, 10];
    const postCtrl = [11, 12, 11, 10, 11];
    const preTreat = [10, 9, 11, 10, 10];
    const postTreat= [15, 14, 16, 15, 15];
    const res = differencesInDifferences(preCtrl, postCtrl, preTreat, postTreat);
    expect(res).not.toBeNull();
    expect(res.did).toBeCloseTo(4, 0);
  });

  it('returns t, df, p fields', () => {
    const g = n => Array.from({ length: n }, (_, i) => i + 1);
    const res = differencesInDifferences(g(5), g(5), g(5), g(5).map(v => v + 3));
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('df');
    expect(res).toHaveProperty('p');
  });
});

describe('convertEffectSize', () => {
  it('returns null for non-numeric input', () =>
    expect(convertEffectSize('d', 'abc')).toBeNull());

  it('converts d correctly: r and eta2 in expected range', () => {
    const res = convertEffectSize('d', 0.5);
    expect(res).not.toBeNull();
    expect(res.r).toBeGreaterThan(0);
    expect(res.r).toBeLessThan(1);
    expect(res.eta2).toBeGreaterThan(0);
    expect(res.eta2).toBeLessThan(1);
  });

  it('converts r to d and back', () => {
    const res = convertEffectSize('r', 0.3);
    expect(res).toHaveProperty('d');
    expect(res).toHaveProperty('OR');
    expect(res).toHaveProperty('f');
  });

  it('converts OR to d', () => {
    const res = convertEffectSize('OR', 2.0);
    expect(res).not.toBeNull();
    expect(res.d).toBeGreaterThan(0);
  });

  it('converts eta2 to all effect sizes', () => {
    const res = convertEffectSize('eta2', 0.09);
    expect(res.r).toBeCloseTo(0.3, 2);
    expect(res.d).toBeCloseTo(0.6, 1);
  });
});
