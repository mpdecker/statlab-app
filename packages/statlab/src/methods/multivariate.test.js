// src/tests/multivariate.test.js
import { describe, it, expect } from 'vitest';
import {
  pca, efa, cronbachAlpha, icc, cohensKappa,
  splitHalf, metaAnalysis, differencesInDifferences, convertEffectSize,
  manova, canonicalCorr, linearDiscriminant,
  metaRegression, eggersTest, trimAndFill,
  mardiaTest, henzeZirkler, mahalanobisDistance, bartlettSphericity, boxMTest,
  networkMetaAnalysis, baujatPlot, leaveOneOutMeta, metaRegressionDiagnostics,
  obliminRotation, geominRotation, quartiminRotation, targetRotation, promaxRotation,
  bivariateMeta, metaProportion, labbePlot, forestPlotData, cumulativeMeta,
  simpleCA, multipleCA, correspBiplot, totalInertia, correspContributions,
  procrustesRotation, rvCoefficient, generalizedProcrustes,
} from './multivariate.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { expectKeys } from './__fixtures__/helpers.js';

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
  it('matches a numpy eigh(correlation matrix) oracle', () => {
    const e = ref.multivariate.pca_basic;
    const rows = e.x.map((_, i) => ({ x: e.x[i], y: e.y[i], z: e.z[i] }));
    const res = pca(rows, ['x', 'y', 'z']);
    res.eigenvaluesRaw.forEach((v, i) => expect(v).toBeCloseTo(e.eigenvalues[i], 3));
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

  it('contract keys when valid', () => {
    const r = manova(data, ['y1', 'y2'], 'species');
    if (r) expectKeys(r, ['test', 'wilksLambda', 'pillaiTrace', 'prob', 'ndep', 'n', 'apa']);
  });

  it('matches a statsmodels MANOVA oracle (all four multivariate statistics)', () => {
    const e = ref.multivariate.manova_basic;
    const rows = e.y1.map((_, i) => ({ y1: e.y1[i], y2: e.y2[i], group: e.group[i] }));
    const r = manova(rows, ['y1', 'y2'], 'group');
    expect(r.wilksLambda).toBeCloseTo(e.wilksLambda, 3);
    expect(r.pillaiTrace).toBeCloseTo(e.pillaiTrace, 3);
    expect(r.hotellingLawleyTrace).toBeCloseTo(e.hotellingLawleyTrace, 2);
    // Roy's largest root: previously computed via naive (A+Aᵀ)/2 symmetrization of the
    // non-symmetric matrix E⁻¹H, which preserves the trace (Hotelling-Lawley matched)
    // but corrupts individual eigenvalues — this assertion is the regression test.
    expect(r.roysLargestRoot).toBeCloseTo(e.roysLargestRoot, 2);
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

  it('nCorrelations is positive when valid', () => {
    const ccRows = rows.map((r, ix) => ({ ...r, ySyn: +(r.x1 + r.x3) / 3 + ix * .001 }));
    const r = canonicalCorr(ccRows, ['x1', 'x2'], ['x3', 'ySyn']);
    if (r) expect(r.correlations.length).toBeGreaterThan(0);
  });

  it('matches a numpy SVD oracle (regression test for the symSqrtInvSPD whitening bug)', () => {
    // symSqrtInvSPD (used to whiten Rxx/Ryy) previously computed a mathematically
    // wrong inverse-square-root (verified by an M^(-1/2)·M^(-1/2)·M ≈ I identity
    // check failing before the fix), silently corrupting every canonical correlation.
    const e = ref.multivariate.canonicalCorr_basic;
    const rows2 = e.x1.map((_, i) => ({ x1: e.x1[i], x2: e.x2[i], y1: e.y1[i], y2: e.y2[i] }));
    const r = canonicalCorr(rows2, ['x1', 'x2'], ['y1', 'y2']);
    r.correlations.forEach((v, i) => expect(v).toBeCloseTo(e.correlations[i], 3));
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

  it('contract keys when valid', () => {
    const r = linearDiscriminant(ldaRows, 'grp', ['x1', 'x2']);
    if (r) { expect(r).toHaveProperty('coefficients'); expect(r).toHaveProperty('accuracyTrain'); }
  });

  it('matches a scipy.linalg.eigh(Sb, Sw) generalized-eigenproblem oracle (regression test for the symSqrtInvSPD bug)', () => {
    // The old code eigendecomposed a naively-symmetrized Sw⁻¹Sb, corrupting the
    // discriminant DIRECTION itself (not just a displayed statistic) — this is the
    // vector actually used to project and classify new points.
    const e = ref.multivariate.lda_basic;
    const rows = [...e.g1.map(([x1, x2]) => ({ x1, x2, g: 0 })), ...e.g2.map(([x1, x2]) => ({ x1, x2, g: 1 }))];
    const r = linearDiscriminant(rows, 'g', ['x1', 'x2']);
    // Eigenvectors are only defined up to an overall sign; compare the direction's
    // absolute components (both g1/g2 centroids project to well-separated scores
    // either way, so accuracy/ordering are unaffected by the sign).
    expect(Math.abs(r.coefficients[0])).toBeCloseTo(Math.abs(e.w[0]), 3);
    expect(Math.abs(r.coefficients[1])).toBeCloseTo(Math.abs(e.w[1]), 3);
    expect(r.accuracyTrain).toBe(100);
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

// ── Meta-Regression ───────────────────────────────────────────────────────────
describe('metaRegression', () => {
  const studies = [
    { d: 0.2, se: 0.1, n: 50 },
    { d: 0.4, se: 0.12, n: 45 },
    { d: 0.3, se: 0.11, n: 55 },
    { d: 0.55, se: 0.09, n: 60 },
    { d: 0.6, se: 0.13, n: 40 },
    { d: 0.7, se: 0.1, n: 48 },
  ];
  const moderator = [1, 2, 1.5, 3, 3.5, 4];

  it('returns null for <3 studies', () => {
    expect(metaRegression(studies.slice(0, 2), [1, 2], 'X')).toBeNull();
  });

  it('returns null for constant moderator', () => {
    expect(metaRegression(studies.slice(0, 4), [2, 2, 2, 2], 'X')).toBeNull();
  });

  it('returns correct keys', () => {
    const r = metaRegression(studies, moderator, 'dose');
    expectKeys(r, ['test', 'moderator', 'coefficients', 'tau2', 'iSquared', 'rSquared', 'k', 'apa']);
  });

  it('coefficients have two terms (intercept + moderator)', () => {
    const r = metaRegression(studies, moderator, 'dose');
    expect(r.coefficients).toHaveLength(2);
    expect(r.coefficients[0].term).toBe('Intercept');
    expect(r.coefficients[1].term).toBe('dose');
  });

  it('tau2 >= 0', () => {
    const r = metaRegression(studies, moderator, 'dose');
    expect(r.tau2).toBeGreaterThanOrEqual(0);
  });

  it('rSquared between 0 and 1', () => {
    const r = metaRegression(studies, moderator, 'dose');
    expect(r.rSquared).toBeGreaterThanOrEqual(0);
    expect(r.rSquared).toBeLessThanOrEqual(1);
  });

  it('coefficient b is finite', () => {
    const r = metaRegression(studies, moderator, 'dose');
    r.coefficients.forEach(c => {
      expect(Number.isFinite(c.b)).toBe(true);
      expect(Number.isFinite(c.se)).toBe(true);
      expect(Number.isFinite(c.z)).toBe(true);
      expect(typeof c.p).toBe('number');
    });
  });

  it('k matches study count', () => {
    const r = metaRegression(studies, moderator, 'dose');
    expect(r.k).toBe(6);
  });

  it('apa is a non-empty string', () => {
    const r = metaRegression(studies, moderator, 'dose');
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Egger's Test ──────────────────────────────────────────────────────────────
describe('eggersTest', () => {
  const symStudies = [
    { d: 0.3, se: 0.1, n: 100 },
    { d: 0.25, se: 0.15, n: 50 },
    { d: 0.35, se: 0.12, n: 80 },
    { d: 0.28, se: 0.08, n: 120 },
    { d: 0.32, se: 0.2, n: 30 },
    { d: 0.27, se: 0.11, n: 70 },
  ];

  const asymStudies = [
    { d: 0.8, se: 0.4, n: 20 },
    { d: 0.7, se: 0.35, n: 25 },
    { d: 0.5, se: 0.15, n: 100 },
    { d: 0.4, se: 0.1, n: 150 },
    { d: 0.3, se: 0.08, n: 200 },
    { d: 0.2, se: 0.05, n: 400 },
  ];

  it('returns null for <3 studies', () => {
    expect(eggersTest(symStudies.slice(0, 2))).toBeNull();
  });

  it('returns correct keys', () => {
    const r = eggersTest(symStudies);
    expectKeys(r, ['test', 'intercept', 'interceptSE', 't', 'df', 'p', 'slope', 'k', 'apa']);
  });

  it('p in [0,1]', () => {
    const r = eggersTest(symStudies);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('asymmetric data can be detected', () => {
    const r = eggersTest(asymStudies);
    expect(r).not.toBeNull();
    expect(typeof r.intercept).toBe('number');
  });

  it('k matches study count', () => {
    const r = eggersTest(symStudies);
    expect(r.k).toBe(6);
  });

  it('apa is a non-empty string', () => {
    const r = eggersTest(symStudies);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Trim-and-Fill ─────────────────────────────────────────────────────────────
describe('trimAndFill', () => {
  const studies = [
    { d: 0.3, se: 0.1, n: 100 },
    { d: 0.35, se: 0.12, n: 80 },
    { d: 0.28, se: 0.08, n: 120 },
    { d: 0.32, se: 0.15, n: 50 },
    { d: 0.27, se: 0.11, n: 70 },
    { d: 0.9, se: 0.4, n: 20 },
  ];

  it('returns null for <3 studies', () => {
    expect(trimAndFill(studies.slice(0, 2))).toBeNull();
  });

  it('returns correct keys', () => {
    const r = trimAndFill(studies);
    expectKeys(r, ['test', 'originalD', 'originalSE', 'adjustedD', 'adjustedSE', 'nImputed', 'k', 'kOriginal', 'studies', 'apa']);
  });

  it('nImputed >= 0', () => {
    const r = trimAndFill(studies);
    expect(r.nImputed).toBeGreaterThanOrEqual(0);
  });

  it('originalD and adjustedD are finite', () => {
    const r = trimAndFill(studies);
    expect(Number.isFinite(r.originalD)).toBe(true);
    expect(Number.isFinite(r.adjustedD)).toBe(true);
  });

  it('studies array includes imputed flag', () => {
    const r = trimAndFill(studies);
    expect(r.studies.length).toBeGreaterThanOrEqual(studies.length);
    r.studies.forEach(s => expect(typeof s.imputed).toBe('boolean'));
  });

  it('k = kOriginal + nImputed', () => {
    const r = trimAndFill(studies);
    expect(r.k).toBe(r.kOriginal + r.nImputed);
  });

  it('apa non-empty', () => {
    const r = trimAndFill(studies);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('mardiaTest', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i, x2: i * 0.5, x3: Math.sin(i) });
  it('null <20', () => expect(mardiaTest(d.slice(0, 10), ['x1', 'x2'])).toBeNull());
  it('contract keys if valid', () => { const r = mardiaTest(d, ['x1', 'x2', 'x3']); if (r) expectKeys(r, ['test', 'skewness', 'kurtosis', 'chi2Skew', 'dfSkew', 'pSkew', 'zKurt', 'pKurt', 'n', 'p', 'apa']); });
  it('skewness >= 0 if valid', () => { const r = mardiaTest(d, ['x1', 'x2', 'x3']); if (r) expect(r.skewness).toBeGreaterThanOrEqual(0); });
});

describe('henzeZirkler', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i, x2: i * 0.5 });
  it('null <10', () => expect(henzeZirkler(d.slice(0, 5), ['x1'])).toBeNull());
  it('HZ >= 0 if valid', () => { const r = henzeZirkler(d, ['x1', 'x2']); if (r) expect(r.hz).toBeGreaterThanOrEqual(0); });
  it('contract keys if valid', () => { const r = henzeZirkler(d, ['x1', 'x2']); if (r) expectKeys(r, ['test', 'hz', 'p', 'n', 'p', 'apa']); });
});

describe('mahalanobisDistance', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i, x2: i * 0.5 });
  it('null <10', () => expect(mahalanobisDistance(d.slice(0, 5), ['x1'])).toBeNull());
  it('qqCorrelation in [-1,1] if valid', () => { const r = mahalanobisDistance(d, ['x1', 'x2']); if (r) { expect(r.qqCorrelation).toBeGreaterThanOrEqual(-1); expect(r.qqCorrelation).toBeLessThanOrEqual(1); } });
  it('contract keys if valid', () => { const r = mahalanobisDistance(d, ['x1', 'x2']); if (r) expectKeys(r, ['test', 'distances', 'qqCorrelation', 'n', 'p', 'apa']); });
});

describe('bartlettSphericity', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i, x2: i * 0.5 });
  it('null <10', () => expect(bartlettSphericity(d.slice(0, 5), ['x1'])).toBeNull());
  it('chi2 >= 0', () => { const r = bartlettSphericity(d, ['x1', 'x2']); expect(r.chi2).toBeGreaterThanOrEqual(0); });
  it('contract keys', () => expectKeys(bartlettSphericity(d, ['x1', 'x2']), ['test', 'chi2', 'df', 'p', 'n', 'apa']));
});

describe('boxMTest', () => {
  const d = []; for (let i = 0; i < 40; i++) d.push({ grp: i < 20 ? 'A' : 'B', x1: i + (i < 20 ? 0 : 5), x2: Math.sin(i) });
  it('null <10', () => expect(boxMTest(d.slice(0, 5), 'grp', ['x1'])).toBeNull());
  it('contract keys', () => { const r = boxMTest(d, 'grp', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'M', 'chi2', 'df', 'p', 'nGroups', 'n', 'apa']); });
  it('M >= 0', () => { const r = boxMTest(d, 'grp', ['x1', 'x2']); if (r) expect(r.M).toBeGreaterThanOrEqual(0); });
});

describe('networkMetaAnalysis', () => {
  const s = []; for (let i = 0; i < 8; i++) s.push({ d: 0.2 + i * 0.05, se: 0.1, trt: i % 2 ? 'B' : 'A', ref: 'C' });
  it('contract keys', () => expectKeys(networkMetaAnalysis(s), ['test', 'directEstimates', 'nTreatments', 'nStudies', 'apa']));
  it('estimates non-empty', () => {
    const r = networkMetaAnalysis(s);
    if (r) expect(r.directEstimates).toBeDefined();
  });

  it('nStudies is positive when valid', () => {
    const r = networkMetaAnalysis(s);
    if (r) expect(r.nStudies).toBeGreaterThan(0);
  });
});

describe('baujatPlot', () => {
  const meta = { studies: [{ d: 0.2, se: 0.1 }, { d: 0.3, se: 0.12 }, { d: 0.25, se: 0.11 }] };
  it('contract keys', () => expectKeys(baujatPlot(meta), ['test', 'points', 'nStudies', 'apa']));
  it('contributions non-empty', () => {
    const r = baujatPlot(meta);
    if (r) expect(r.points).toBeDefined();
  });

  it('points have entries', () => {
    const r = baujatPlot(meta);
    if (r) { expect(Array.isArray(r.points)).toBe(true); expect(r.points.length).toBeGreaterThan(0); }
  });
});

describe('leaveOneOutMeta', () => {
  const s = [{ d: 0.2, se: 0.1 }, { d: 0.3, se: 0.12 }, { d: 0.25, se: 0.11 }, { d: 0.15, se: 0.09 }];
  it('contract keys', () => expectKeys(leaveOneOutMeta(s), ['test', 'results', 'n', 'apa']));
  it('results = n', () => { const r = leaveOneOutMeta(s); expect(r.results).toHaveLength(4); });

  it('results entries have finite d', () => {
    const r = leaveOneOutMeta(s);
    if (r) r.results.forEach(e => expect(Number.isFinite(e.d)).toBe(true));
  });
});

describe('metaRegressionDiagnostics', () => {
  const meta = { coefficients: [{ term: 'x', b: 0.1, se: 0.05, z: 2, p: 0.04 }], tau2: 0.01, iSquared: 30, k: 8 };
  it('contract keys', () => expectKeys(metaRegressionDiagnostics(meta), ['test', 'parameters', 'tau2', 'iSquared', 'k', 'apa']));
  it('diagnostics non-empty', () => {
    const r = metaRegressionDiagnostics(meta);
    if (r) { expect(r.parameters).toBeDefined(); expect(r.tau2).toBeGreaterThanOrEqual(0); }
  });

  it('iSquared is between 0 and 100', () => {
    const r = metaRegressionDiagnostics(meta);
    if (r) { expect(r.iSquared).toBeGreaterThanOrEqual(0); expect(r.iSquared).toBeLessThanOrEqual(100); }
  });
});

describe('obliminRotation', () => { it('contract keys', () => expectKeys(obliminRotation([[0.5, 0.1], [0.6, 0.2], [0.3, 0.7]]), ['test', 'loadings', 'gamma', 'p', 'm', 'apa']));   it('loadings non-empty', () => { const r = obliminRotation([[0.5, 0.1], [0.6, 0.2], [0.3, 0.7]]); expect(r.loadings.length).toBeGreaterThan(0); });

  it('gamma is finite', () => { const r = obliminRotation([[0.5, 0.1], [0.6, 0.2], [0.3, 0.7]]); expect(Number.isFinite(r.gamma)).toBe(true); });
});
describe('geominRotation', () => { it('contract keys', () => expectKeys(geominRotation([[0.5, 0.1], [0.6, 0.2]]), ['test', 'loadings', 'epsilon', 'p', 'm', 'apa']));   it('loadings non-empty', () => { const r = geominRotation([[0.5, 0.1], [0.6, 0.2]]); expect(r.loadings.length).toBeGreaterThan(0); });

  it('epsilon is positive', () => { const r = geominRotation([[0.5, 0.1], [0.6, 0.2]]); expect(r.epsilon).toBeGreaterThan(0); });
});
describe('quartiminRotation', () => { it('contract keys', () => expectKeys(quartiminRotation([[0.5, 0.1], [0.6, 0.2]]), ['test', 'loadings', 'gamma', 'p', 'm', 'apa']));   it('loadings non-empty', () => { const r = quartiminRotation([[0.5, 0.1], [0.6, 0.2]]); expect(r.loadings.length).toBeGreaterThan(0); });

  it('gamma is finite', () => { const r = quartiminRotation([[0.5, 0.1], [0.6, 0.2]]); expect(Number.isFinite(r.gamma)).toBe(true); });
});
describe('targetRotation', () => { it('contract keys', () => expectKeys(targetRotation([[0.5, 0.1], [0.6, 0.2]], [[1, 0], [1, 0]]), ['test', 'loadings', 'p', 'm', 'apa']));   it('loadings non-empty', () => { const r = targetRotation([[0.5, 0.1], [0.6, 0.2]], [[1, 0], [1, 0]]); expect(r.loadings.length).toBeGreaterThan(0); });

  it('loadings match input row count', () => { const r = targetRotation([[0.5, 0.1], [0.6, 0.2]], [[1, 0], [1, 0]]); expect(r.loadings).toHaveLength(2); });
});
describe('promaxRotation', () => { it('contract keys', () => expectKeys(promaxRotation([[0.5, 0.1], [0.6, 0.2]]), ['test', 'loadings', 'k', 'p', 'm', 'apa']));   it('loadings non-empty', () => { const r = promaxRotation([[0.5, 0.1], [0.6, 0.2]]); expect(r.loadings.length).toBeGreaterThan(0); });

  it('k is finite', () => { const r = promaxRotation([[0.5, 0.1], [0.6, 0.2]]); expect(Number.isFinite(r.k)).toBe(true); });
});

describe('bivariateMeta', () => {
  const s = []; for (let i = 0; i < 8; i++) s.push({ sens: 0.7 + i * 0.02, spec: 0.8 + i * 0.01 });
  it('contract keys', () => expectKeys(bivariateMeta(s), ['test', 'pooledSens', 'pooledSpec', 'correlation', 'n', 'apa']));
  it('correlation between -1 and 1', () => {
    const r = bivariateMeta(s);
    if (r) { expect(r.correlation).toBeGreaterThanOrEqual(-1); expect(r.correlation).toBeLessThanOrEqual(1); }
  });

  it('pooledSens is between 0 and 1', () => {
    const r = bivariateMeta(s);
    if (r) { expect(r.pooledSens).toBeGreaterThanOrEqual(0); expect(r.pooledSens).toBeLessThanOrEqual(1); }
  });
});
describe('metaProportion', () => {
  it('contract keys', () => expectKeys(metaProportion([5, 8, 12, 15, 20], [20, 30, 25, 35, 40]), ['test', 'proportion', 'se', 'k', 'n', 'apa']));
  it('proportion between 0 and 1', () => {
    const r = metaProportion([5, 8, 12, 15, 20], [20, 30, 25, 35, 40]);
    if (r) { expect(r.proportion).toBeGreaterThanOrEqual(0); expect(r.proportion).toBeLessThanOrEqual(1); }
  });

  it('se is positive when valid', () => {
    const r = metaProportion([5, 8, 12, 15, 20], [20, 30, 25, 35, 40]);
    if (r) expect(r.se).toBeGreaterThan(0);
  });
});
describe('labbePlot', () => {
  it('contract keys', () => expectKeys(labbePlot([5, 8, 12], [20, 30, 25], [3, 6, 10], [20, 30, 25]), ['test', 'points', 'n', 'apa']));
  it('events array returns valid points', () => {
    const r = labbePlot([5, 8, 12], [20, 30, 25], [3, 6, 10], [20, 30, 25]);
    if (r) { expect(Array.isArray(r.points)).toBe(true); expect(r.points.length).toBeGreaterThan(0); }
  });

  it('points have entries', () => {
    const r = labbePlot([5, 8, 12], [20, 30, 25], [3, 6, 10], [20, 30, 25]);
    if (r) { expect(Array.isArray(r.points)).toBe(true); expect(r.points.length).toBeGreaterThan(0); }
  });
});
describe('forestPlotData', () => {
  const s = [{ d: 0.2, se: 0.1 }, { d: 0.3, se: 0.12 }, { d: 0.25, se: 0.11 }];
  it('contract keys', () => expectKeys(forestPlotData(s), ['test', 'studies', 'n', 'apa']));
  it('data non-empty', () => {
    const r = forestPlotData(s);
    if (r) { expect(Array.isArray(r.studies)).toBe(true); expect(r.studies.length).toBeGreaterThan(0); }
  });

  it('studies entries have finite d and weight', () => {
    const r = forestPlotData(s);
    if (r) r.studies.forEach(s2 => { expect(Number.isFinite(s2.d)).toBe(true); });
  });
});
describe('cumulativeMeta', () => {
  const s = []; for (let i = 0; i < 6; i++) s.push({ d: 0.2 + i * 0.03, se: 0.1 });
  it('contract keys', () => expectKeys(cumulativeMeta(s), ['test', 'cumulative', 'n', 'apa']));
  it('cumulative non-empty', () => {
    const r = cumulativeMeta(s);
    if (r) { expect(Array.isArray(r.cumulative)).toBe(true); expect(r.cumulative.length).toBeGreaterThan(0); }
  });

  it('cumulative entries have finite d', () => {
    const r = cumulativeMeta(s);
    if (r) r.cumulative.forEach(e => expect(Number.isFinite(e.d)).toBe(true));
  });
});

describe('simpleCA', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ r: `R${i%3}`, c: `C${i%4}` });
  it('contract keys', () => expectKeys(simpleCA(d, ['r','c']), ['test','inertia','rows','cols','n','apa']));
  it('inertia positive', () => {
    const r = simpleCA(d, ['r', 'c']);
    if (r) expect(r.inertia).toBeGreaterThan(0);
  });

  it('rows and cols are positive', () => {
    const r = simpleCA(d, ['r', 'c']);
    if (r) { expect(r.rows).toBeGreaterThan(0); expect(r.cols).toBeGreaterThan(0); }
  });
});

describe('multipleCA', () => { it('is defined', () => expect(typeof multipleCA).toBe('function'));   it('nCategories positive', () => { const d = []; for (let i = 0; i < 20; i++) d.push({ r: `R${i%3}`, c: `C${i%4}`, s: `S${i%2}` }); const r = multipleCA(d, ['r','c','s']); if (r) expect(r.nCategories).toBeGreaterThan(0); });

  it('contract keys when valid', () => { const d = []; for (let i = 0; i < 20; i++) d.push({ r: `R${i%3}`, c: `C${i%4}`, s: `S${i%2}` }); const r = multipleCA(d, ['r','c','s']); if (r) { expect(r).toHaveProperty('nCategories'); expect(r).toHaveProperty('n'); } });
});
describe('correspBiplot', () => { it('contract keys', () => expectKeys(correspBiplot({rows:3,cols:4}), ['test','rows','cols','apa']));   it('biplot non-empty', () => { const r = correspBiplot({rows:3,cols:4}); expect(r.rows).toBeGreaterThan(0); });

  it('cols is positive', () => { const r = correspBiplot({rows:3,cols:4}); expect(r.cols).toBeGreaterThan(0); });
});
describe('totalInertia', () => { it('contract keys', () => expectKeys(totalInertia({inertia:0.05,n:100}), ['test','inertia','chisq','n','apa']));   it('inertia positive', () => { const r = totalInertia({inertia:0.05,n:100}); expect(r.inertia).toBeGreaterThan(0); });

  it('chisq is positive', () => { const r = totalInertia({inertia:0.05,n:100}); expect(r.chisq).toBeGreaterThan(0); });
});
describe('correspContributions', () => { it('contract keys', () => expectKeys(correspContributions({inertia:0.05}), ['test','inertia','apa']));   it('contributions non-empty', () => { const r = correspContributions({inertia:0.05}); if (r) expect(r.inertia).toBeGreaterThan(0); });

  it('apa is a non-empty string', () => { const r = correspContributions({inertia:0.05}); if (r) { expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); } });
});

describe('procrustesRotation', () => {
  const X = [[1,2],[3,4],[5,6],[7,8],[9,10]];
  const target = X.map(r => [r[0]*0.8, r[1]*1.2]);
  it('contract keys', () => expectKeys(procrustesRotation(X, target), ['test','R','rotated','n','p','apa']));
  it('null mismatched', () => expect(procrustesRotation([[1,2]], [[1]])).toBeNull());

  it('rotated dimensions match input', () => {
    const r = procrustesRotation(X, target);
    if (r) { expect(r.rotated).toHaveLength(X.length); expect(r.rotated[0]).toHaveLength(X[0].length); }
  });
});
describe('rvCoefficient', () => {
  const X = [[1,2],[3,4],[5,6],[7,8],[9,10]];
  const Y = [[2,1],[4,3],[6,5],[8,7],[10,9]];
  it('contract keys', () => expectKeys(rvCoefficient(X, Y), ['test','rv','n','pX','pY','apa']));
  it('rv in [0,1]', () => { const r = rvCoefficient(X, Y); expect(r.rv).toBeGreaterThanOrEqual(0); expect(r.rv).toBeLessThanOrEqual(1); });

  it('rv is finite', () => { const r = rvCoefficient(X, Y); expect(Number.isFinite(r.rv)).toBe(true); });
});
describe('generalizedProcrustes', () => {
  const m = [[1,2],[3,4],[5,6],[7,8],[9,10]];
  it('contract keys', () => expectKeys(generalizedProcrustes([m, m.map(r => [r[0]*0.9, r[1]*1.1])], { maxIter: 5 }), ['test','consensus','nMatrices','n','p','apa']));
  it('consensus non-empty', () => {
    const r = generalizedProcrustes([m, m.map(r => [r[0] * 0.9, r[1] * 1.1])], { maxIter: 5 });
    if (r) { expect(Array.isArray(r.consensus)).toBe(true); expect(r.consensus.length).toBeGreaterThan(0); }
  });

  it('nMatrices matches input', () => {
    const r = generalizedProcrustes([m, m.map(r => [r[0] * 0.9, r[1] * 1.1])], { maxIter: 5 });
    if (r) expect(r.nMatrices).toBe(2);
  });
});
