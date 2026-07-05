import { describe, it, expect } from 'vitest';
import { missingnessPattern, littlesMCAR, meanImpute, regressionImpute, emImpute, mice, rubinPool, fmi, completeCases } from './missing.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const completeData = [
  { x: 1, y: 2, z: 3 },
  { x: 4, y: 5, z: 6 },
  { x: 7, y: 8, z: 9 },
  { x: 10, y: 11, z: 12 },
  { x: 13, y: 14, z: 15 },
];
const missingData = [
  { x: 1, y: 2, z: 3 },
  { x: 4, y: null, z: 6 },
  { x: 7, y: 8, z: null },
  { x: null, y: 11, z: 12 },
  { x: 13, y: 14, z: 15 },
];

describe('missingnessPattern', () => {
  it('returns null for empty data', () => {
    expect(missingnessPattern(null)).toBeNull();
    expect(missingnessPattern([])).toBeNull();
  });

  it('returns variable and row missing counts', () => {
    const r = missingnessPattern(missingData);
    expectKeys(r, ['n', 'k', 'varMissing', 'rowMissing', 'patterns']);
    expect(r.n).toBe(5);
    expect(r.k).toBe(3);
    expect(r.varMissing.length).toBe(3);
  });

  it('complete data has zero missing', () => {
    const r = missingnessPattern(completeData);
    for (const v of r.varMissing) expect(v.missing).toBe(0);
    expect(r.rowMissing.max).toBe(0);
  });
});

describe('littlesMCAR', () => {
  it('returns null for small data', () => {
    expect(littlesMCAR([{ x: 1 }])).toBeNull();
  });

  it('returns chi2 and p for data with missingness', () => {
    const mc = [];
    for (let i = 0; i < 50; i++) {
      mc.push({ x: Math.random() * 10, y: Math.random() * 5 + Math.random() * 2, z: Math.random() * 3 });
      if (i % 5 === 0) mc[mc.length - 1].y = null;
    }
    const r = littlesMCAR(mc);
    expectKeys(r, ['test', 'chi2', 'df', 'p', 'apa']);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('complete data produces valid result', () => {
    const mc = [];
    for (let i = 0; i < 30; i++) mc.push({ x: i, y: i * 2, z: i * 3 });
    const r = littlesMCAR(mc);
    expect(r).not.toBeNull();
    expect(r.p).toBeGreaterThanOrEqual(0);
  });

  it('computes chi2 from structured missingness', () => {
    const data = [];
    for (let i = 0; i < 30; i++) {
      data.push({ x: i, y: i * 2, z: i * 0.5 });
    }
    for (let i = 0; i < 30; i++) {
      if (data[i].x > 20) data[i].y = null;
    }
    const r = littlesMCAR(data);
    expect(r.p).toBeLessThanOrEqual(1);
  });
});

describe('meanImpute', () => {
  it('returns null for invalid input', () => {
    expect(meanImpute(null, ['x'])).toBeNull();
    expect(meanImpute([], ['x'])).toBeNull();
  });

  it('replaces missing values with column means', () => {
    const r = meanImpute(missingData, ['x', 'y', 'z']);
    expect(r.length).toBe(5);
    expect(r[1].y).toBeCloseTo((2 + 8 + 11 + 14) / 4, 2);
    expect(r[3].x).toBeCloseTo((1 + 4 + 7 + 13) / 4, 2);
  });

  it('complete data unchanged', () => {
    const r = meanImpute(completeData, ['x', 'y', 'z']);
    for (let i = 0; i < completeData.length; i++) {
      expect(r[i].x).toBe(completeData[i].x);
      expect(r[i].y).toBe(completeData[i].y);
    }
  });
});

describe('regressionImpute', () => {
  it('returns null for small data', () => {
    expect(regressionImpute([{ x: 1 }], ['x', 'y'])).toBeNull();
  });

  it('predicts missing from observed columns', () => {
    const r = regressionImpute(missingData, ['x', 'y', 'z']);
    expect(r).not.toBeNull();
    expect(typeof r[3].x).toBe('number');
  });

  it('imputes values within valid range', () => {
    const data = [
      { x: 1, y: 2, z: 3 }, { x: 4, y: null, z: 6 },
      { x: 7, y: 8, z: null }, { x: null, y: 11, z: 12 },
      { x: 13, y: 14, z: 15 }, { x: 16, y: 17, z: 18 },
      { x: 19, y: null, z: 21 }, { x: 22, y: 23, z: 24 },
    ];
    const r = regressionImpute(data, ['x', 'y', 'z']);
    expect(r[1].y).not.toBeNull();
    expect(Number.isFinite(r[1].y)).toBe(true);
    expect(r[3].x).not.toBeNull();
  });

  it('returns same-length array', () => {
    const r = regressionImpute(missingData, ['x', 'y', 'z']);
    expect(r.length).toBe(5);
  });

  it('predicts via real multiple OLS matching sklearn.linear_model.LinearRegression exactly (regression test for the broken intercept/simple-regression fix)', () => {
    const e = ref.missing.regression_impute_basic;
    const rows = e.x2.map((x2, i) => ({ x1: e.x1[i], x2, y: e.y[i] }));
    rows.push({ x1: null, x2: e.queryX2, y: e.queryY });
    const r = regressionImpute(rows, ['x1', 'x2', 'y']);
    expect(r[rows.length - 1].x1).toBeCloseTo(e.predictedX1, 4);
  });
});

describe('emImpute', () => {
  it('returns null for small data', () => {
    expect(emImpute([{ x: 1 }], ['x'])).toBeNull();
  });

  it('returns imputed data and parameter estimates', () => {
    const r = emImpute(missingData, ['x', 'y', 'z']);
    expectKeys(r, ['method', 'imputed', 'mu', 'Sigma', 'n', 'k', 'apa']);
    expect(r.imputed.length).toBe(5);
    expect(r.k).toBe(3);
  });

  it('converges on clean complete data', () => {
    const r = emImpute(completeData, ['x', 'y', 'z']);
    expect(r).not.toBeNull();
    expect(r.Sigma.length).toBe(3);
  });

  it('handles partially missing rows with E-step', () => {
    const data = [];
    for (let i = 0; i < 30; i++) {
      const row = { x: i, y: i * 0.5 + 2, z: i * 0.3 + 1 };
      if (i % 4 === 0) row.y = null;
      if (i % 7 === 0) row.z = null;
      if (i === 15) { row.x = null; row.y = null; }
      data.push(row);
    }
    const r = emImpute(data, ['x', 'y', 'z'], { maxIter: 30, tolerance: 1e-4 });
    expect(r.imputed.length).toBe(30);
    expect(r.Sigma.length).toBe(3);
    expect(r.mu.length).toBe(3);
  });

  it('fills all-missing rows with global means', () => {
    const data = [
      { x: null, y: null },
      { x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 },
      { x: 7, y: 8 }, { x: 9, y: 10 },
    ];
    const r = emImpute(data, ['x', 'y']);
    expect(r.imputed[0].x).toBeGreaterThan(1);
    expect(r.imputed[0].x).toBeLessThan(10);
    expect(r.imputed[0].y).toBeGreaterThan(1);
    expect(r.imputed[0].y).toBeLessThan(10);
  });
});

// ── MICE ─────────────────────────────────────────────────────────────────────
describe('mice', () => {
  const miceData = [
    { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: null }, { x: 4, y: 8 },
    { x: 5, y: 10 }, { x: 6, y: null }, { x: 7, y: 14 }, { x: 8, y: 16 },
    { x: 9, y: 18 }, { x: 10, y: 20 }, { x: 11, y: null }, { x: 12, y: 24 },
  ];

  it('returns null for small data', () => {
    expect(mice(null, ['x', 'y'])).toBeNull();
    expect(mice(miceData.slice(0, 5), ['x', 'y'])).toBeNull();
  });

  it('returns m imputed datasets', () => {
    const r = mice(miceData, ['x', 'y'], { m: 3, maxIter: 5 });
    expect(r.imputedDatasets).toHaveLength(3);
  });

  it('no missing values in imputed data', () => {
    const r = mice(miceData, ['x', 'y'], { m: 3, maxIter: 5 });
    r.imputedDatasets.forEach(ds => {
      ds.forEach(row => {
        expect(row.x).not.toBeNull();
        expect(row.y).not.toBeNull();
      });
    });
  });

  it('contract keys', () => {
    const r = mice(miceData, ['x', 'y'], { m: 3, maxIter: 5 });
    expectKeys(r, ['test', 'imputedDatasets', 'method', 'm', 'vars', 'nRow', 'nMissing', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = mice(miceData, ['x', 'y'], { m: 2, maxIter: 3 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Rubin's Pooling ─────────────────────────────────────────────────────────
describe('rubinPool', () => {
  it('returns null for <2 datasets', () => {
    expect(rubinPool(null, () => ({ estimates: [{ name: 'b', estimate: 1, se: 0.1 }] }))).toBeNull();
    expect(rubinPool([{ x: 1 }], () => ({}))).toBeNull();
  });

  it('pools estimates correctly', () => {
    const ds = [{ x: 1, y: 2 }, { x: 2, y: 4 }];
    const fn = (data) => {
      const est = data.reduce((s, r) => s + r.y, 0) / data.length;
      return { estimates: [{ name: 'mean', estimate: est, se: 0.5 }] };
    };
    const r = rubinPool([ds, ds.map(d => ({ ...d, y: d.y + 0.5 })), ds.map(d => ({ ...d, y: d.y - 0.2 }))], fn);
    expect(r.estimates).toHaveLength(1);
    expect(r.estimates[0].se).toBeGreaterThan(0);
    expect(r.estimates[0].p).toBeGreaterThanOrEqual(0);
    expect(r.estimates[0].p).toBeLessThanOrEqual(1);
  });

  it('contract keys', () => {
    const fn = (data) => ({ estimates: [{ name: 'm', estimate: 1, se: 0.1 }] });
    const r = rubinPool([{ x: 1 }, { x: 1 }, { x: 1 }], fn);
    expectKeys(r, ['test', 'estimates', 'm', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const fn = (data) => ({ estimates: [{ name: 'm', estimate: 1, se: 0.1 }] });
    const r = rubinPool([{ x: 1 }, { x: 1 }, { x: 1 }], fn);
    expect(typeof r.apa).toBe('string');
  });
});

// ── FMI ──────────────────────────────────────────────────────────────────────
describe('fmi', () => {
  it('returns null for invalid', () => {
    expect(fmi(null)).toBeNull();
    expect(fmi({})).toBeNull();
  });

  it('returns fmi per parameter', () => {
    const pooled = { estimates: [{ name: 'b', fmi: 0.2 }, { name: 'a', fmi: 0.15 }] };
    const r = fmi(pooled);
    expect(r.fmiPerParam).toHaveLength(2);
    expect(r.avgFmi).toBeGreaterThan(0);
  });

  it('contract keys', () => {
    const pooled = { estimates: [{ name: 'b', fmi: 0.3 }] };
    expectKeys(fmi(pooled), ['test', 'fmiPerParam', 'avgFmi', 'apa']);
  });
});

// ── Complete Cases ───────────────────────────────────────────────────────────
describe('completeCases', () => {
  it('returns null for invalid', () => {
    expect(completeCases(null, ['x'])).toBeNull();
    expect(completeCases([], ['x'])).toBeNull();
  });

  it('filters out missing', () => {
    const data = [{ x: 1 }, { x: null }, { x: 3 }, { x: null }, { x: 5 }];
    const r = completeCases(data, ['x']);
    expect(r.filtered).toHaveLength(3);
    expect(r.nOriginal).toBe(5);
    expect(r.nComplete).toBe(3);
    expect(r.nDropped).toBe(2);
  });

  it('contract keys', () => {
    expectKeys(completeCases([{ x: 1 }, { x: 2 }], ['x']), ['filtered', 'nOriginal', 'nComplete', 'nDropped', 'pctDropped', 'apa']);
  });
});
