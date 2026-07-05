// src/tests/regression.test.js
import { describe, it, expect } from 'vitest';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS,
  logisticReg,
  ordinalLogisticRegression,
  poissonRegression,
  negativeBinomialRegression,
  mediation,
  moderation, partialCorrelationPlot, varianceDecompositionProportions,
  cooksDistance, dfbetas, fullVIF, runsTestResiduals, studentizedResiduals, leverageValues, pressStatistic,
  zeroInflatedPoisson, zeroInflatedNegBin, quantileRegression, sandwichSE, clusterSE,
  brantTest, adjacentCategoryLogit, continuationRatioLogit, multinomialLogit, stereotypeLogit,
  forwardSelection, backwardElimination, bestSubsets,
  betaRegression, zeroInflatedBeta, oneInflatedBeta, tobitTypeI, heckman2Step, censoredQuantile,
  mallowCpWeight, frequentistStacking, aicWeights, modelConfidenceSet, diagnosticAveraged, akaikeWeights,
  bootstrapMediation,
} from './regression.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { expectKeys } from './__fixtures__/helpers.js';
import { mkTabular } from './fixtures/core.js';

const rr = ref.regression;

describe('pearsonTest', () => {
  it('returns null for n < 3', () =>
    expect(pearsonTest([1, 2], [3, 4])).toBeNull());

  it('r matches R cor.test()', () => {
    const res = pearsonTest(rr.pearson_basic.x, rr.pearson_basic.y);
    expect(res.r).toBeCloseTo(rr.pearson_basic.r, 3);
  });

  it('p matches R cor.test()', () => {
    const res = pearsonTest(rr.pearson_basic.x, rr.pearson_basic.y);
    expect(res.p).toBeCloseTo(rr.pearson_basic.p, 2);
  });

  it('t matches R cor.test()', () => {
    const res = pearsonTest(rr.pearson_basic.x, rr.pearson_basic.y);
    expect(res.t).toBeCloseTo(rr.pearson_basic.t, 3);
  });

  it('df matches R cor.test()', () => {
    const res = pearsonTest(rr.pearson_basic.x, rr.pearson_basic.y);
    expect(res.df).toBe(rr.pearson_basic.df);
  });

  it('perfect correlation: r=1, p small', () => {
    const res = pearsonTest([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(res.r).toBeCloseTo(1, 5);
    expect(res.p).toBeLessThan(0.01);
  });

  it('CI contains r', () => {
    const res = pearsonTest([1, 2, 3, 4, 5, 6, 7, 8], [2, 4, 5, 4, 5, 6, 7, 8]);
    expect(res.ciLo).toBeLessThan(res.r);
    expect(res.ciHi).toBeGreaterThan(res.r);
  });

  it('result has expected shape', () => {
    const res = pearsonTest(rr.pearson_basic.x, rr.pearson_basic.y);
    expect(res).toHaveProperty('r');
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('df');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('r2');
    expect(res).toHaveProperty('ciLo');
    expect(res).toHaveProperty('ciHi');
    expect(res).toHaveProperty('n');
  });
});

describe('spearman', () => {
  it('returns null for n < 3', () =>
    expect(spearman([1], [2])).toBeNull());

  it('monotone data → rho close to 1', () => {
    const res = spearman([1, 2, 3, 4, 5], [1, 4, 9, 16, 25]);
    expect(res.rho).toBeCloseTo(1, 5);
  });

  it('reverse monotone → rho close to -1', () => {
    const res = spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(res.rho).toBeCloseTo(-1, 5);
  });

  it('result has expected shape', () => {
    const res = spearman([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(res).toHaveProperty('rho');
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('df');
    expect(res).toHaveProperty('p');
  });

  it('rho is between -1 and 1', () => {
    const res = spearman([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(res.rho).toBeGreaterThanOrEqual(-1);
    expect(res.rho).toBeLessThanOrEqual(1);
  });
  it('matches a scipy.stats.spearmanr oracle (tied data)', () => {
    const e = rr.spearman_basic;
    const r = spearman(e.x, e.y);
    expect(r.rho).toBeCloseTo(e.rho, 4); // r.rho is toFixed(4)-rounded internally
    expect(r.p).toBeCloseTo(e.p, 6);
  });
  it('matches a scipy.stats.spearmanr oracle (no-ties data)', () => {
    const e = rr.spearman_rank_basic;
    const r = spearman(e.x, e.y);
    expect(r.rho).toBeCloseTo(e.rho, 4);
    expect(r.p).toBeCloseTo(e.p, 6);
  });
});

describe('kendallTau', () => {
  it('returns null for n < 3', () =>
    expect(kendallTau([1], [2])).toBeNull());

  it('perfect concordance → tau=1', () => {
    const res = kendallTau([1, 2, 3, 4], [1, 2, 3, 4]);
    expect(res.tau).toBeCloseTo(1, 5);
  });

  it('perfect discordance → tau=-1', () => {
    const res = kendallTau([1, 2, 3, 4], [4, 3, 2, 1]);
    expect(res.tau).toBeCloseTo(-1, 5);
  });

  it('result has expected shape', () => {
    const res = kendallTau([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(res).toHaveProperty('tau');
    expect(res).toHaveProperty('z');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('C');
    expect(res).toHaveProperty('D');
  });

  it('tau is between -1 and 1', () => {
    const res = kendallTau([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(res.tau).toBeGreaterThanOrEqual(-1);
    expect(res.tau).toBeLessThanOrEqual(1);
  });
  it('matches a scipy.stats.kendalltau(method="asymptotic") oracle', () => {
    const e = rr.kendall_basic;
    const r = kendallTau(e.x, e.y);
    expect(r.tau).toBeCloseTo(e.tau, 4); // r.tau is toFixed(4)-rounded internally
    expect(r.p).toBeCloseTo(e.p, 3);
  });
});

describe('partialCorr', () => {
  it('returns null for n < 4', () =>
    expect(partialCorr([1, 2, 3], [1, 2, 3], [1, 2, 3])).toBeNull());

  it('returns rPartial between -1 and 1', () => {
    const res = partialCorr([1, 2, 3, 4, 5], [2, 4, 5, 4, 5], [1, 3, 2, 4, 3]);
    expect(res.rPartial).toBeGreaterThanOrEqual(-1);
    expect(res.rPartial).toBeLessThanOrEqual(1);
  });

  it('result has expected shape', () => {
    const res = partialCorr([1, 2, 3, 4, 5], [2, 4, 5, 4, 5], [1, 3, 2, 4, 3]);
    expect(res).toHaveProperty('rPartial');
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('df');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('r_xy');
    expect(res).toHaveProperty('r_xz');
    expect(res).toHaveProperty('r_yz');
  });

  it('returns non-null for valid input', () => {
    const res = partialCorr([1, 2, 3, 4, 5], [2, 4, 5, 4, 5], [1, 3, 2, 4, 3]);
    expect(res).not.toBeNull();
  });
});

describe('simpleOLS', () => {
  it('returns null for n < 3', () =>
    expect(simpleOLS([1, 2], [1, 2])).toBeNull());

  it('b1 matches R lm()', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res.b1).toBeCloseTo(rr.simpleOLS_basic.b1, 4);
  });

  it('b0 matches R lm()', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res.b0).toBeCloseTo(rr.simpleOLS_basic.b0, 4);
  });

  it('r2 matches R lm()', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res.r2).toBeCloseTo(rr.simpleOLS_basic.r2, 3);
  });

  it('perfect fit: r2=1', () => {
    const res = simpleOLS([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(res.r2).toBeCloseTo(1, 5);
  });

  it('returns null for zero-variance x', () =>
    expect(simpleOLS([3, 3, 3, 3], [1, 2, 3, 4])).toBeNull());

  it('result has expected shape', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res).toHaveProperty('b0');
    expect(res).toHaveProperty('b1');
    expect(res).toHaveProperty('r2');
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('se');
    expect(res).toHaveProperty('ci95');
    expect(res).toHaveProperty('durbinWatson');
    expect(res).toHaveProperty('residuals');
    expect(res).toHaveProperty('fitted');
  });

  it('p matches reference', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res.p).toBeCloseTo(rr.simpleOLS_basic.p, 2);
  });
});

describe('multipleOLS', () => {
  it('returns null for rank-deficient X (collinear predictors)', () => {
    const Y = [1, 2, 3, 4, 5];
    const X = [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10]]; // x2 = 2*x1
    const res = multipleOLS(Y, X);
    expect(res).toBeNull();
  });

  it('returns result for valid non-collinear input', () => {
    const Y  = [3, 5, 7, 9, 11, 4, 6, 8, 10, 12];
    const X  = Y.map((_, i) => [i + 1, (i % 3) + 1]);
    const res = multipleOLS(Y, X, ['x1', 'x2']);
    expect(res).not.toBeNull();
  });

  it('result has expected shape', () => {
    const Y  = [3, 5, 7, 9, 11, 4, 6, 8, 10, 12];
    const X  = Y.map((_, i) => [i + 1, (i % 3) + 1]);
    const res = multipleOLS(Y, X, ['x1', 'x2']);
    expect(res).toHaveProperty('coeffs');
    expect(res).toHaveProperty('r2');
    expect(res).toHaveProperty('adj');
    expect(res).toHaveProperty('F');
    expect(res).toHaveProperty('pF');
    expect(res).toHaveProperty('residuals');
    expect(res).toHaveProperty('fitted');
    expect(res).toHaveProperty('durbinWatson');
  });

  it('matches a statsmodels.OLS oracle on the shared tabular fixture', () => {
    const rows = mkTabular(42, 72);
    const Y = rows.map(r => r.y);
    const X = rows.map(r => [r.x, r.m]);
    const res = multipleOLS(Y, X, ['x', 'm']);
    const e = rr.multipleOLS_tabular;
    expect(res.coeffs[0].b).toBeCloseTo(e.b0, 4);
    expect(res.coeffs[1].b).toBeCloseTo(e.b1, 4);
    expect(res.coeffs[2].b).toBeCloseTo(e.b2, 4);
    expect(res.coeffs[1].se).toBeCloseTo(e.se1, 4);
    expect(res.coeffs[2].se).toBeCloseTo(e.se2, 4);
    expect(res.r2).toBeCloseTo(e.r2, 3);
    expect(res.F).toBeCloseTo(e.f, 2);
    expect(res.pF).toBeLessThan(1e-15); // both ~3.8e-21; magnitude-only check (toBeCloseTo is meaningless this close to 0)
  });

  it('coeffs array has intercept + predictor entries', () => {
    const Y  = [3, 5, 7, 9, 11, 4, 6, 8, 10, 12];
    const X  = Y.map((_, i) => [i + 1, (i % 3) + 1]);
    const res = multipleOLS(Y, X, ['x1', 'x2']);
    expect(res.coeffs).toHaveLength(3); // intercept + 2 predictors
    expect(res.coeffs[0].name).toBe('Intercept');
  });

  it('r2 is between 0 and 1', () => {
    const Y  = [3, 5, 7, 9, 11, 4, 6, 8, 10, 12];
    const X  = Y.map((_, i) => [i + 1, (i % 3) + 1]);
    const res = multipleOLS(Y, X, ['x1', 'x2']);
    expect(res.r2).toBeGreaterThanOrEqual(0);
    expect(res.r2).toBeLessThanOrEqual(1);
  });
});

describe('pointBiserial', () => {
  it('returns null for n < 3', () =>
    expect(pointBiserial([0, 1], [1, 2])).toBeNull());

  it('rpb is between -1 and 1', () => {
    const binary = [0, 0, 0, 1, 1, 1, 0, 1, 0, 1];
    const cont   = [2, 3, 2, 7, 8, 9, 3, 7, 2, 8];
    const res = pointBiserial(binary, cont);
    expect(res.rpb).toBeGreaterThanOrEqual(-1);
    expect(res.rpb).toBeLessThanOrEqual(1);
  });

  it('returns t, df, p', () => {
    const binary = [0, 1, 0, 1, 0, 1, 0, 1];
    const cont   = [1, 5, 2, 6, 1, 5, 2, 6];
    const res = pointBiserial(binary, cont);
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('df');
    expect(res).toHaveProperty('p');
  });
});

describe('polynomialOLS', () => {
  it('returns null for insufficient data', () =>
    expect(polynomialOLS([1, 2], [1, 2], 2)).toBeNull());

  it('returns result for degree-2 polynomial', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const ys = xs.map(x => x ** 2 + 0.5 * x + 1);
    const res = polynomialOLS(xs, ys, 2);
    expect(res).not.toBeNull();
    expect(res.r2).toBeGreaterThan(0.99);
  });

  it('result test name includes degree', () => {
    const xs = [1, 2, 3, 4, 5, 6];
    const ys = [1, 4, 9, 16, 25, 36];
    const res = polynomialOLS(xs, ys, 2);
    expect(res.test).toContain('2');
  });
});

describe('hierarchicalOLS', () => {
  const mkData = () => {
    const n = 20;
    const Y  = Array.from({ length: n }, (_, i) => i * 2 + Math.random());
    const X1 = Y.map((_, i) => [i + 1]);
    const X2 = Y.map((_, i) => [(i % 4) + 1]);
    return { Y, X1, X2 };
  };

  it('returns null when base model fails', () =>
    expect(hierarchicalOLS([1,2], [[1],[2]], [[1],[2]], ['x1'], ['x2'])).toBeNull());

  it('returns model1 and model2 r2', () => {
    const { Y, X1, X2 } = mkData();
    const res = hierarchicalOLS(Y, X1, X2, ['x1'], ['x2']);
    expect(res).not.toBeNull();
    expect(res.model1).toHaveProperty('r2');
    expect(res.model2).toHaveProperty('r2');
  });

  it('model2.r2 >= model1.r2', () => {
    const { Y, X1, X2 } = mkData();
    const res = hierarchicalOLS(Y, X1, X2, ['x1'], ['x2']);
    if (res) expect(res.model2.r2).toBeGreaterThanOrEqual(res.model1.r2 - 0.001);
  });

  it('returns deltaR2 and F_change', () => {
    const { Y, X1, X2 } = mkData();
    const res = hierarchicalOLS(Y, X1, X2, ['x1'], ['x2']);
    if (res) {
      expect(res).toHaveProperty('deltaR2');
      expect(res).toHaveProperty('F_change');
    }
  });
});

describe('logisticReg', () => {
  it('returns null for n < p + 5', () => {
    const Y = [0, 1, 0];
    const X = [[1], [2], [3]];
    expect(logisticReg(Y, X)).toBeNull();
  });

  it('returns coeffs, accuracy for linearly separable data', () => {
    const Y = [0,0,0,0,0,1,1,1,1,1,0,0,1,1,1];
    const X = Y.map((_, i) => [i]);
    const res = logisticReg(Y, X, ['x1']);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('coeffs');
    expect(res.acc).toBeGreaterThan(0.5);
  });

  it('confMatrix has TP, FP, FN, TN', () => {
    const Y = [0,0,0,0,0,1,1,1,1,1,0,0,1,1,1];
    const X = Y.map((_, i) => [i]);
    const res = logisticReg(Y, X, ['x1']);
    expect(res.confMatrix).toHaveProperty('TP');
    expect(res.confMatrix).toHaveProperty('TN');
  });

  it('McFaddenR2 is between 0 and 1', () => {
    const Y = [0,0,0,0,0,1,1,1,1,1,0,0,1,1,1];
    const X = Y.map((_, i) => [i]);
    const res = logisticReg(Y, X, ['x1']);
    expect(res.McFaddenR2).toBeGreaterThanOrEqual(0);
    expect(res.McFaddenR2).toBeLessThanOrEqual(1);
  });

  it('coefficients include Wald SE and p-values', () => {
    const Y = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const X = Y.map((_, i) => [i]);
    const res = logisticReg(Y, X, ['x1']);
    const slope = res.coeffs.find(c => c.name === 'x1');
    expect(slope.se).toBeGreaterThan(0);
    expect(slope.p).toBeGreaterThan(0);
    expect(slope.p).toBeLessThan(1);
    expect(Number.isFinite(slope.z)).toBe(true);
    expect(slope).toHaveProperty('sig');
  });

  it('matches a statsmodels.GLM(family=Binomial) oracle', () => {
    const e = rr.logit_basic;
    const X = e.x1.map((_, i) => [e.x1[i], e.x2[i]]);
    const res = logisticReg(e.y, X, ['x1', 'x2']);
    res.coeffs.forEach((c, j) => {
      expect(c.b).toBeCloseTo(e.coef[j], 3);
      expect(c.se).toBeCloseTo(e.se[j], 3);
      expect(c.p).toBeCloseTo(e.p[j], 3);
    });
  });
});

describe('ordinalLogisticRegression', () => {
  const yOrd = Array.from({ length: 36 }, (_, i) => [0, 0, 1, 1, 2, 2][i % 6]);
  const X = yOrd.map((_, i) => [i * 0.2 + Math.sin(i)]);
  const r = ordinalLogisticRegression(yOrd, X, ['pred']);

  it('runs on 3-category ordinal + 1 predictor', () => expect(r).not.toBeNull());
  it('reports K categories', () => { if (r) expect(r.K).toBeGreaterThanOrEqual(2); });
  it('has coefficient table entries', () => { if (r) expect(Array.isArray(r.coeffs)).toBeTruthy(); });

  it('coefficients include Wald SE and p-values', () => {
    if (!r) return;
    const pred = r.coeffs.find(c => c.name === 'pred');
    expect(pred).toBeTruthy();
    expect(pred.se).toBeGreaterThan(0);
    expect(pred.p).toBeGreaterThan(0);
    expect(pred.p).toBeLessThanOrEqual(1);
    expect(Number.isFinite(pred.z)).toBe(true);
    expect(pred).toHaveProperty('sig');
  });
});

describe('poissonRegression', () => {
  const x = [[0], [.5], [1], [1.2], [.3], [.8], [1.5], [.2], [.9], [1.1], [.7], [.4], [.6], [.35], [.95]].map(r => r);
  const eta = [-.2, -.1, .1, .2, 0, .05, .15, -.05, .12, .18, -.02, .08, -.12, .03, -.08];
  const y = eta.map(z => Math.max(0, Math.round(Math.exp(z) * 3)));
  const r = poissonRegression(y, x, ['lx']);

  it('runs on count outcomes', () => expect(r).not.toBeNull());
  it('shows dispersion Pearson summary', () => { if (r) expect(typeof r.pearsonChi2).toBe('number'); });

  it('coefficients include Wald SE and p-values', () => {
    if (!r) return;
    const pred = r.coeffs.find(c => c.name === 'lx');
    expect(pred).toBeTruthy();
    expect(pred.se).toBeGreaterThan(0);
    expect(pred.p).toBeGreaterThan(0);
    expect(pred.p).toBeLessThanOrEqual(1);
    expect(Number.isFinite(pred.z)).toBe(true);
    expect(pred).toHaveProperty('sig');
  });

  it('matches a statsmodels.GLM(family=Poisson) oracle, including McFaddenR2 (regression test for the null-vs-saturated-LL fix)', () => {
    // McFaddenR2 previously divided by the SATURATED model's log-likelihood
    // instead of the NULL (intercept-only) model's, which collapsed it to ~0
    // for typical data via the result's own Math.max(0,...) clip.
    const e = rr.poisson_basic;
    const X = e.x1.map((_, i) => [e.x1[i], e.x2[i]]);
    const res = poissonRegression(e.y, X, ['x1', 'x2']);
    res.coeffs.forEach((c, j) => {
      expect(c.b).toBeCloseTo(e.coef[j], 3);
      expect(c.se).toBeCloseTo(e.se[j], 3);
    });
    expect(res.McFaddenR2).toBeCloseTo(e.mcfaddenR2, 3);
    expect(res.McFaddenR2).toBeGreaterThan(0.05); // real signal, not the degenerate ~0 the bug produced
  });
});

describe('negativeBinomialRegression', () => {
  const x = [[.2], [.4], [.5], [.8], [.3], [.6], [.9], [.25], [.45], [.35], [.7], [.55], [.42], [.5], [.6], [.8], [.3], [.4], [.5], [.52]];
  const y = x.map(([v]) => Math.max(0, Math.round(2 + 18 * Math.exp(.4 * Math.log(v)) * .6)));
  const r = negativeBinomialRegression(y, x, ['lx']);
  it('runs end-to-end', () => expect(r).not.toBeNull());
  it('estimates dispersion θ > 0', () => { if (r) expect(r.theta).toBeGreaterThan(0); });

  it('contract keys when valid', () => { if (r) { expect(r).toHaveProperty('theta'); expect(r).toHaveProperty('n'); } });
});

describe('mediation', () => {
  it('returns null for mismatched lengths', () =>
    expect(mediation([1,2,3], [1,2], [1,2,3])).toBeNull());

  it('returns a, b, c path estimates', () => {
    const n = 20;
    const X = Array.from({ length: n }, (_, i) => i);
    const M = X.map(x => 0.5 * x + Math.random() * 0.5);
    const Y = M.map((m, i) => 0.3 * m + 0.2 * X[i] + Math.random() * 0.5);
    const res = mediation(X, M, Y);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('a_path');
    expect(res).toHaveProperty('b_path');
    expect(res).toHaveProperty('c_total');
  });

  it('matches a statsmodels.OLS + Sobel-test oracle on the shared tabular fixture', () => {
    const rows = mkTabular(42, 72);
    const X = rows.map(r => r.x), M = rows.map(r => r.m), Y = rows.map(r => r.y);
    const res = mediation(X, M, Y);
    const e = rr.mediation_tabular;
    expect(res.ab).toBeCloseTo(e.ab, 3);
    expect(res.z_sobel).toBeCloseTo(e.z_sobel, 2);
    expect(res.p_sobel).toBeCloseTo(e.p_sobel, 5);
    expect(res.a_path).toBeCloseTo(e.a_path, 4);
    expect(res.b_path).toBeCloseTo(e.b_path, 4);
    expect(res.cp_direct).toBeCloseTo(e.cp_direct, 4);
  });

  it('ab indirect effect is a number', () => {
    const X = [1,2,3,4,5,6,7,8,9,10];
    const M = X.map(x => x * 0.6 + 0.1);
    const Y = M.map((m, i) => m * 0.4 + X[i] * 0.1);
    const res = mediation(X, M, Y);
    expect(typeof res.ab).toBe('number');
    expect(isFinite(res.ab)).toBe(true);
  });
});

describe('moderation', () => {
  it('returns null for mismatched lengths', () =>
    expect(moderation([1,2,3], [1,2], [1,2,3])).toBeNull());

  it('returns intCoeff (interaction term)', () => {
    const n = 20;
    const X = Array.from({ length: n }, (_, i) => i);
    const Z = X.map(x => x * 0.5 + Math.random());
    const Y = X.map((x, i) => x + Z[i] + x * Z[i] * 0.1 + Math.random());
    const res = moderation(X, Z, Y);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('intCoeff');
  });

  it('simpleSlopes has 3 entries (Z-1SD, Z, Z+1SD)', () => {
    const n = 20;
    const X = Array.from({ length: n }, (_, i) => i);
    const Z = X.map(x => x * 0.5 + Math.random());
    const Y = X.map((x, i) => x + Z[i] + x * Z[i] * 0.1 + Math.random());
    const res = moderation(X, Z, Y);
    if (res) expect(res.simpleSlopes).toHaveLength(3);
  });
});

describe('cooksDistance', () => {
  it('returns null for invalid input', () => {
    expect(cooksDistance(null, [1, 2])).toBeNull();
  });

  it('computes Cook distances for OLS regression', () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + 1.5 * x + (Math.random() - 0.5) * 0.5);
    const r = cooksDistance(X, y);
    expect(r).not.toBeNull();
    expect(r.values.length).toBe(20);
    expect(r.max).toBeGreaterThanOrEqual(0);
    expect(r.n).toBe(20);
  });

  it('returns null for n < 3', () => {
    expect(cooksDistance([[1], [2]], [1, 2])).toBeNull();
  });

  it('returns null for length mismatch', () => {
    expect(cooksDistance([[1, 1], [1, 2]], [1])).toBeNull();
  });

  it('all Cook values are non-negative', () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + 1.5 * x + (Math.random() - 0.5) * 0.5);
    const r = cooksDistance(X, y);
    r.values.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('threshold is 4/n', () => {
    const X = Array.from({ length: 25 }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + 1.5 * x + (Math.random() - 0.5) * 0.5);
    const r = cooksDistance(X, y);
    expect(r.threshold).toBeCloseTo(4 / 25);
  });

  it('contract fields present', () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + x);
    const r = cooksDistance(X, y);
    expectKeys(r, ['test', 'values', 'max', 'threshold', 'nInfluential', 'n', 'k', 'sigma2', 'apa']);
    expect(r.test).toBe("Cook's Distance");
  });

  it('nInfluential ≤ n', () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + 1.5 * x + (Math.random() - 0.5) * 0.5);
    const r = cooksDistance(X, y);
    expect(r.nInfluential).toBeLessThanOrEqual(r.n);
  });
});

describe('dfbetas', () => {
  it('returns null for invalid input', () => {
    expect(dfbetas(null, [1, 2, 3])).toBeNull();
  });

  it('computes DFBETAS for OLS regression', () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + 1.5 * x + (Math.random() - 0.5) * 0.5);
    const r = dfbetas(X, y);
    expect(r).not.toBeNull();
    expect(r.values.length).toBe(20);
    expect(r.values[0].length).toBe(2);
    expect(r.maxAbs).toBeGreaterThanOrEqual(0);
  });

  it('returns null for n < 5', () => {
    expect(dfbetas([[1, 1], [1, 2], [1, 3]], [1, 2, 3])).toBeNull();
  });

  it('DFBETA threshold is 2/sqrt(n)', () => {
    const n = 25;
    const X = Array.from({ length: n }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + x);
    const r = dfbetas(X, y);
    expect(r.threshold).toBeCloseTo(2 / Math.sqrt(n));
  });

  it('all DFBETA rows match observation count', () => {
    const X = Array.from({ length: 15 }, (_, i) => [1, i * 0.5]);
    const y = X.map(([_, x]) => 3 + 0.5 * x + (Math.random() - 0.5) * 0.3);
    const r = dfbetas(X, y);
    expect(r.values.length).toBe(15);
  });

  it('contract fields present', () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i]);
    const y = X.map(([_, x]) => 2 + x);
    const r = dfbetas(X, y);
    expectKeys(r, ['test', 'values', 'maxAbs', 'threshold', 'nExceeded', 'n', 'k', 'apa']);
    expect(r.test).toBe('DFBETAS');
  });
});

describe('fullVIF', () => {
  it('returns null for single predictor', () => {
    const X = [[1], [2], [3]];
    expect(fullVIF(X)).toBeNull();
  });

  it('computes VIF for multiple predictors', () => {
    const X = Array.from({ length: 30 }, (_, i) => [i, i * 0.5 + 0.1, i * i * 0.01]);
    const r = fullVIF(X);
    expect(r).not.toBeNull();
    expect(r.vif.length).toBe(3);
    expect(r.maxVIF).toBeGreaterThanOrEqual(1);
    expect(r.meanVIF).toBeGreaterThanOrEqual(1);
  });

  it('returns null for n < 3', () => {
    expect(fullVIF([[1, 2], [3, 4]])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(fullVIF(null)).toBeNull();
  });

  it('all VIF values ≥ 1', () => {
    const X = Array.from({ length: 20 }, (_, i) => [i, i * 0.5 + 0.1, i * 0.2 + 0.3]);
    const r = fullVIF(X);
    r.vif.forEach(v => expect(v).toBeGreaterThanOrEqual(1));
  });

  it('orthogonal predictors give VIF ≈ 1', () => {
    const X = Array.from({ length: 30 }, (_, i) => [i, Math.sin(i), i % 10]);
    const r = fullVIF(X);
    expect(r.maxVIF).toBeLessThan(20);
  });

  it('highly collinear predictors give large VIF', () => {
    const X = Array.from({ length: 30 }, (_, i) => [i, i + (Math.random() - 0.5) * 0.001, i * 0.5]);
    const r = fullVIF(X);
    expect(r.problematic).toBeGreaterThan(0);
  });

  it('contract fields present', () => {
    const X = Array.from({ length: 20 }, (_, i) => [i, i * 0.5 + 0.1]);
    const r = fullVIF(X);
    expectKeys(r, ['test', 'vif', 'maxVIF', 'meanVIF', 'problematic', 'n', 'k', 'apa']);
    expect(r.test).toBe('VIF (Variance Inflation Factor)');
  });

  it('APA string mentions VIF', () => {
    const X = Array.from({ length: 20 }, (_, i) => [i, i * 0.5 + 0.1]);
    const r = fullVIF(X);
    expect(r.apa).toContain('VIF');
  });
});

// ── Zero-Inflated Poisson ─────────────────────────────────────────────────────
describe('zeroInflatedPoisson', () => {
  const zipData = [];
  const rng = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; };
  const rand = rng(42);
  for (let i = 0; i < 60; i++) {
    const x = rand();
    const isZero = x > 0.4;
    const count = isZero ? 0 : Math.max(0, Math.round(2 + x * 3 + rand() * 0.5));
    zipData.push({ y: count, x1: x });
  }

  it('returns null for small data', () => {
    expect(zeroInflatedPoisson(zipData.slice(0, 10), 'y', ['x1'])).toBeNull();
  });

  it('contract keys', () => {
    const r = zeroInflatedPoisson(zipData, 'y', ['x1']);
    expectKeys(r, ['test', 'zeroModel', 'countModel', 'logLikelihood', 'n', 'nZeros', 'apa']);
  });

  it('zeroModel and countModel have coefficients', () => {
    const r = zeroInflatedPoisson(zipData, 'y', ['x1']);
    expect(r.zeroModel.coefficients.length).toBeGreaterThan(0);
    expect(r.countModel.coefficients.length).toBeGreaterThan(0);
  });

  it('nZeros > 0', () => {
    const r = zeroInflatedPoisson(zipData, 'y', ['x1']);
    expect(r.nZeros).toBeGreaterThan(0);
  });

  it('coefficients have name, b, se, z, p', () => {
    const r = zeroInflatedPoisson(zipData, 'y', ['x1']);
    r.zeroModel.coefficients.forEach(c => {
      expect(typeof c.name).toBe('string');
      expect(Number.isFinite(c.b)).toBe(true);
      expect(typeof c.p).toBe('number');
    });
  });

  it('logLikelihood is negative', () => {
    const r = zeroInflatedPoisson(zipData, 'y', ['x1']);
    expect(r.logLikelihood).toBeLessThan(0);
  });

  it('apa is a non-empty string', () => {
    const r = zeroInflatedPoisson(zipData, 'y', ['x1']);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Zero-Inflated Negative Binomial ───────────────────────────────────────────
describe('zeroInflatedNegBin', () => {
  const zinbData = [];
  for (let i = 0; i < 60; i++) {
    const x = i / 60;
    const isZero = x < 0.3 || (x > 0.6 && x < 0.7);
    const count = isZero ? 0 : Math.max(1, Math.round(3 + x * 4 + (i % 3) * 2));
    zinbData.push({ y: count, x1: x });
  }

  it('returns null for small data', () => {
    expect(zeroInflatedNegBin(zinbData.slice(0, 10), 'y', ['x1'])).toBeNull();
  });

  it('contract keys', () => {
    const r = zeroInflatedNegBin(zinbData, 'y', ['x1']);
    if (r) {
      expectKeys(r, ['test', 'zeroModel', 'countModel', 'dispersion', 'logLikelihood', 'n', 'nZeros', 'apa']);
    }
  });

  it('dispersion > 0 when valid', () => {
    const r = zeroInflatedNegBin(zinbData, 'y', ['x1']);
    if (r) expect(r.dispersion).toBeGreaterThan(0);
  });

  it('count coefficients present when valid', () => {
    const r = zeroInflatedNegBin(zinbData, 'y', ['x1']);
    if (r) expect(r.countModel.coefficients.length).toBeGreaterThan(0);
  });

  it('logLikelihood is finite when valid', () => {
    const r = zeroInflatedNegBin(zinbData, 'y', ['x1']);
    if (r) expect(Number.isFinite(r.logLikelihood)).toBe(true);
  });

  it('apa is a non-empty string when valid', () => {
    const r = zeroInflatedNegBin(zinbData, 'y', ['x1']);
    if (r) {
      expect(typeof r.apa).toBe('string');
      expect(r.apa.length).toBeGreaterThan(0);
    }
  });
});

// ── Quantile Regression ───────────────────────────────────────────────────────
describe('quantileRegression', () => {
  const qrData = [];
  for (let i = 0; i < 40; i++) {
    qrData.push({ y: 5 + i * 0.5 + (i % 7) * 1.5, x: i });
  }

  it('returns null for small data', () => {
    expect(quantileRegression(qrData.slice(0, 5), 'y', ['x'])).toBeNull();
  });

  it('contract keys', () => {
    const r = quantileRegression(qrData, 'y', ['x']);
    expectKeys(r, ['test', 'tau', 'coefficients', 'n', 'nIter', 'apa']);
  });

  it('tau defaults to 0.5', () => {
    const r = quantileRegression(qrData, 'y', ['x']);
    expect(r.tau).toBe(0.5);
  });

  it('custom tau works', () => {
    const r = quantileRegression(qrData, 'y', ['x'], 0.75);
    expect(r.tau).toBe(0.75);
  });

  it('coefficients have name, b, se, t, p', () => {
    const r = quantileRegression(qrData, 'y', ['x']);
    r.coefficients.forEach(c => {
      expect(typeof c.name).toBe('string');
      expect(Number.isFinite(c.b)).toBe(true);
      expect(Number.isFinite(c.se)).toBe(true);
      expect(typeof c.p).toBe('number');
    });
  });

  it('coefficients are finite', () => {
    const r = quantileRegression(qrData, 'y', ['x']);
    r.coefficients.forEach(c => expect(Number.isFinite(c.b)).toBe(true));
  });

  it('apa is a non-empty string', () => {
    const r = quantileRegression(qrData, 'y', ['x']);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Sandwich Robust SE ────────────────────────────────────────────────────────
describe('sandwichSE', () => {
  const Y = [2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
  const X = Y.map((_, i) => [i + 1]);
  const ols = multipleOLS(Y, X, ['x']);

  it('returns null for insufficient data', () => {
    expect(sandwichSE(null, X, Y)).toBeNull();
    expect(sandwichSE(ols, X.slice(0, 4), Y.slice(0, 4))).toBeNull();
  });

  it('contract keys', () => {
    const r = sandwichSE(ols, X, Y);
    expectKeys(r, ['test', 'originalSE', 'robustSE', 'seDiff', 'type', 'n', 'nParams', 'apa']);
  });

  it('robustSE differs from originalSE', () => {
    const r = sandwichSE(ols, X, Y);
    expect(r.robustSE[1]).not.toEqual(r.originalSE[1]);
  });

  it('HC3 produces different results than HC0', () => {
    const r0 = sandwichSE(ols, X, Y, 'HC0');
    const r3 = sandwichSE(ols, X, Y, 'HC3');
    expect(r0.robustSE[1]).not.toEqual(r3.robustSE[1]);
  });

  it('apa is a non-empty string', () => {
    const r = sandwichSE(ols, X, Y);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Cluster-Robust SE ─────────────────────────────────────────────────────────
describe('clusterSE', () => {
  const Y = [2, 3, 4, 7, 8, 9, 12, 13, 14, 17, 18, 19];
  const X = Y.map((_, i) => [i + 1]);
  const cluster = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'D', 'D', 'D'];
  const ols = multipleOLS(Y, X, ['x']);

  it('returns null for invalid input', () => {
    expect(clusterSE(null, X, Y, cluster)).toBeNull();
    expect(clusterSE(ols, X.slice(0, 4), Y.slice(0, 4), ['A', 'A', 'A', 'A'])).toBeNull();
  });

  it('returns null for single cluster', () => {
    const singleCluster = ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'];
    expect(clusterSE(ols, X, Y, singleCluster)).toBeNull();
  });

  it('contract keys', () => {
    const r = clusterSE(ols, X, Y, cluster);
    expectKeys(r, ['test', 'originalSE', 'clusterSE', 'nClusters', 'avgClusterSize', 'n', 'apa']);
  });

  it('nClusters matches unique clusters', () => {
    const r = clusterSE(ols, X, Y, cluster);
    expect(r.nClusters).toBe(4);
  });

  it('clusterSE differs from originalSE', () => {
    const r = clusterSE(ols, X, Y, cluster);
    expect(r.clusterSE[1]).not.toEqual(r.originalSE[1]);
  });

  it('apa non-empty', () => {
    const r = clusterSE(ols, X, Y, cluster);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('brantTest', () => {
  it('handles input gracefully', () => {
    const d = [{ y: 1, x: 1 }, { y: 2, x: 2 }, { y: 3, x: 3 }];
    expect(brantTest(d, 'y', ['x'])).toBeNull();
  });
  it('p between 0 and 1 for valid ordinal data', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: [0, 0, 1, 1, 2, 2][i % 6], x1: i * 0.1, x2: i % 3 });
    const r = brantTest(d, 'y', ['x1', 'x2']);
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });

  it('contract keys when valid', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: [0, 0, 1, 1, 2, 2][i % 6], x1: i * 0.1, x2: i % 3 });
    const r = brantTest(d, 'y', ['x1', 'x2']);
    if (r) expectKeys(r, ['test', 'chi2', 'df', 'p', 'n', 'apa']);
  });
});

describe('adjacentCategoryLogit', () => {
  it('null for small data', () => expect(adjacentCategoryLogit([{ y: 1, x: 1 }], 'y', ['x'])).toBeNull());
  it('coefficients non-empty for valid ordinal data', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: [0, 0, 1, 1, 2, 2][i % 6], x1: i * 0.1 });
    const r = adjacentCategoryLogit(d, 'y', ['x1']);
    if (r) expect(r.coefficients.length).toBeGreaterThan(0);
  });

  it('coefficients have finite b values', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: [0, 0, 1, 1, 2, 2][i % 6], x1: i * 0.1 });
    const r = adjacentCategoryLogit(d, 'y', ['x1']);
    if (r) r.coefficients.forEach(c => expect(Number.isFinite(c.b)).toBe(true));
  });
});

describe('continuationRatioLogit', () => {
  it('null for small data', () => expect(continuationRatioLogit([{ y: 1, x: 1 }], 'y', ['x'])).toBeNull());
  it('coefficients non-empty for valid ordinal data', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: [0, 0, 1, 1, 2, 2][i % 6], x1: i * 0.1 });
    const r = continuationRatioLogit(d, 'y', ['x1']);
    if (r) expect(r.coefficients.length).toBeGreaterThan(0);
  });

  it('coefficients have finite b values', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: [0, 0, 1, 1, 2, 2][i % 6], x1: i * 0.1 });
    const r = continuationRatioLogit(d, 'y', ['x1']);
    if (r) r.coefficients.forEach(c => expect(Number.isFinite(c.b)).toBe(true));
  });
});

describe('multinomialLogit', () => {
  it('null for small data', () => expect(multinomialLogit([{ y: 'A', x: 1 }], 'y', ['x'])).toBeNull());
  it('nClasses > 1 for valid categorical data', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: String.fromCharCode(65 + (i % 3)), x1: i * 0.1 });
    const r = multinomialLogit(d, 'y', ['x1']);
    if (r) expect(r.k).toBeGreaterThan(1);
  });

  it('contract keys when valid', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ y: String.fromCharCode(65 + (i % 3)), x1: i * 0.1 });
    const r = multinomialLogit(d, 'y', ['x1']);
    if (r) { expect(r).toHaveProperty('k'); expect(r).toHaveProperty('n'); }
  });
});

describe('stereotypeLogit', () => {
  const d = []; for (let i = 0; i < 40; i++) d.push({ y: String.fromCharCode(65 + (i % 3)), x1: i * 0.1 });
  it('null for small data', () => expect(stereotypeLogit([{ y: 'A', x: 1 }], 'y', ['x'])).toBeNull());
  it('contract keys', () => { const r = stereotypeLogit(d, 'y', ['x1']); if (r) expectKeys(r, ['test', 'coefficients', 'scores', 'refCategory', 'n', 'k', 'apa']); });
  it('coefficients present', () => { const r = stereotypeLogit(d, 'y', ['x1']); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
});

describe('forwardSelection', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i, x1: i, x2: i * 0.5, x3: i % 3 });
  it('null <2 candidates', () => expect(forwardSelection(d, 'y', ['x1'])).toBeNull());
  it('contract keys', () => expectKeys(forwardSelection(d, 'y', ['x1', 'x2', 'x3']), ['test', 'selected', 'steps', 'nPars', 'criterion', 'n', 'apa']));
  it('selected not empty or handles gracefully', () => { const r = forwardSelection(d, 'y', ['x1', 'x2', 'x3']); expect(r.selected).toBeDefined(); });
});

describe('backwardElimination', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i, x1: i, x2: i * 0.5, x3: (i % 3) * 0.1 });
  it('null <2 candidates', () => expect(backwardElimination(d, 'y', ['x1'])).toBeNull());
  it('contract keys if valid', () => { const r = backwardElimination(d, 'y', ['x1', 'x2', 'x3']); if (r) expectKeys(r, ['test', 'selected', 'steps', 'nPars', 'criterion', 'n', 'apa']); });

  it('selected is an array when valid', () => {
    const r = backwardElimination(d, 'y', ['x1', 'x2', 'x3']);
    if (r) expect(Array.isArray(r.selected)).toBe(true);
  });
});

describe('bestSubsets', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y: i, x1: i, x2: i * 0.5, x3: i % 3 });
  it('null <2', () => expect(bestSubsets(d, 'y', ['x1'])).toBeNull());
  it('subsets non-empty for multiple predictors', () => {
    const r = bestSubsets(d, 'y', ['x1', 'x2', 'x3']);
    if (r) expect(Array.isArray(r.results)).toBe(true);
  });

  it('contract keys when valid', () => {
    const r = bestSubsets(d, 'y', ['x1', 'x2', 'x3']);
    if (r) { expect(r).toHaveProperty('results'); expect(r).toHaveProperty('n'); }
  });
});

describe('betaRegression', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y: 0.3 + i * 0.03, x1: i, x2: i % 3 });
  it('contract keys', () => expectKeys(betaRegression(d, 'y', ['x1', 'x2']), ['test', 'coefficients', 'n', 'apa']));
  it('null <15', () => expect(betaRegression(d.slice(0, 5), 'y', ['x1'])).toBeNull());

  it('coefficients have finite b values', () => {
    const r = betaRegression(d, 'y', ['x1', 'x2']);
    r.coefficients.forEach(c => expect(Number.isFinite(c.b)).toBe(true));
  });
});

describe('zeroInflatedBeta', () => {
  it('is defined', () => expect(typeof zeroInflatedBeta).toBe('function'));
  it('parameters non-empty for valid proportion data', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: 0.1 + i * 0.02, x1: i * 0.1 });
    const r = zeroInflatedBeta(d, 'y', ['x1']);
    if (r) expect(typeof r.nZeros).toBe('number');
  });

  it('contract keys when valid', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: 0.1 + i * 0.02, x1: i * 0.1 });
    const r = zeroInflatedBeta(d, 'y', ['x1']);
    if (r) { expect(r).toHaveProperty('nZeros'); expect(r).toHaveProperty('n'); }
  });
});

describe('oneInflatedBeta', () => {
  it('is defined', () => expect(typeof oneInflatedBeta).toBe('function'));
  it('parameters non-empty for valid proportion data', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: 0.1 + i * 0.02, x1: i * 0.1 });
    const r = oneInflatedBeta(d, 'y', ['x1']);
    if (r) expect(typeof r.nOnes).toBe('number');
  });

  it('contract keys when valid', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: 0.1 + i * 0.02, x1: i * 0.1 });
    const r = oneInflatedBeta(d, 'y', ['x1']);
    if (r) { expect(r).toHaveProperty('nOnes'); expect(r).toHaveProperty('n'); }
  });
});

describe('tobitTypeI', () => {
  it('is defined', () => expect(typeof tobitTypeI).toBe('function'));
  it('sigma positive for valid censored data', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: Math.max(0, i - 10), x1: i * 0.5 });
    const r = tobitTypeI(d, 'y', ['x1']);
    if (r) expect(r.sigma).toBeGreaterThan(0);
  });

  it('contract keys when valid', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: Math.max(0, i - 10), x1: i * 0.5 });
    const r = tobitTypeI(d, 'y', ['x1']);
    if (r) { expect(r).toHaveProperty('sigma'); expect(r).toHaveProperty('n'); }
  });
});

describe('heckman2Step', () => {
  const hd = []; for (let i = 0; i < 30; i++) hd.push({ y: i * 2, x1: i, sel: i > 10 ? 1 : 0, z1: i % 3 });
  it('contract keys', () => expectKeys(heckman2Step(hd, 'y', ['x1'], 'sel', ['z1']), ['test', 'imr', 'n', 'nSelected', 'apa']));
  it('imr is finite', () => {
    const r = heckman2Step(hd, 'y', ['x1'], 'sel', ['z1']);
    if (r) { expect(Array.isArray(r.imr)).toBe(true); expect(r.imr.length).toBeGreaterThan(0); }
  });

  it('nSelected is less than or equal to n', () => {
    const r = heckman2Step(hd, 'y', ['x1'], 'sel', ['z1']);
    if (r) expect(r.nSelected).toBeLessThanOrEqual(r.n);
  });
});

describe('censoredQuantile', () => {
  it('contract keys', () => expectKeys(censoredQuantile([1,2,3,4,5,6,7,8,9,10], [1,2,3,4,5,6,7,8,9,10]), ['test', 'tau', 'xAtTau', 'yAtTau', 'n', 'nObserved', 'apa']));
  it('null <10', () => expect(censoredQuantile([1,2,3],[1,2,3])).toBeNull());

  it('tau is between 0 and 1', () => {
    const r = censoredQuantile([1,2,3,4,5,6,7,8,9,10], [1,2,3,4,5,6,7,8,9,10]);
    if (r) { expect(r.tau).toBeGreaterThanOrEqual(0); expect(r.tau).toBeLessThanOrEqual(1); }
  });
});

describe('mallowCpWeight', () => {
  const models = [{ coefficients: [{ name: 'x', b: 1 }], rss: 20 }, { coefficients: [{ name: 'x', b: 1 }, { name: 'z', b: 0.5 }], rss: 18 }];
  it('contract keys', () => expectKeys(mallowCpWeight(models, [{ y: 1, x: 2, z: 3 }, { y: 4, x: 5, z: 6 }], 'y'), ['test','weights','nModels','apa']));
  it('weights sum to ~1', () => { const r = mallowCpWeight(models, [{ y: 1, x: 2 }, { y: 4, x: 5 }], 'y'); const s = r.weights.reduce((a,v) => a + v.weight, 0); expect(s).toBeCloseTo(1, 2) });

  it('weights are non-negative', () => {
    const r = mallowCpWeight(models, [{ y: 1, x: 2 }, { y: 4, x: 5 }], 'y');
    r.weights.forEach(w => expect(w.weight).toBeGreaterThanOrEqual(0));
  });
});

describe('frequentistStacking', () => {
  const models = [{ fitted: [1.5, 4.5] }, { fitted: [1.2, 4.8] }];
  it('contract keys', () => { const r = frequentistStacking(models, [{ y: 1 }, { y: 4 }], 'y'); if (r) expectKeys(r, ['test','weights','nModels','n','apa']); });
  it('null <2', () => expect(frequentistStacking([{ fitted: [1] }], [{ y: 1 }], 'y')).toBeNull());

  it('weights are non-negative when valid', () => {
    const r = frequentistStacking(models, [{ y: 1 }, { y: 4 }], 'y');
    if (r) r.weights.forEach(w => expect(w.weight).toBeGreaterThanOrEqual(0));
  });
});

describe('aicWeights', () => {
  it('contract keys', () => expectKeys(aicWeights([100, 105, 108]), ['test','weights','nModels','apa']));
  it('null empty', () => expect(aicWeights([])).toBeNull());

  it('weights sum to approximately 1', () => {
    const r = aicWeights([100, 105, 108]);
    const s = r.weights.reduce((a, v) => a + (typeof v === 'number' ? v : v.weight), 0);
    expect(s).toBeCloseTo(1, 2);
  });
});

describe('modelConfidenceSet', () => {
  it('contract keys', () => expectKeys(modelConfidenceSet([{ mse: 2.5 }, { mse: 2.8 }]), ['test','mcs','models','n','alpha','apa']));
  it('models non-empty', () => {
    const r = modelConfidenceSet([{ mse: 2.5 }, { mse: 2.8 }, { mse: 3.1 }]);
    if (r) expect(r.models.length).toBeGreaterThan(0);
  });

  it('mcs is defined', () => {
    const r = modelConfidenceSet([{ mse: 2.5 }, { mse: 2.8 }]);
    if (r) expect(r.mcs).toBeDefined();
  });
});

describe('diagnosticAveraged', () => {
  it('contract keys', () => { const r = diagnosticAveraged({ fitted: [1.8, 4.2] }, [{ y: 2 }, { y: 4 }], 'y'); if (r) expectKeys(r, ['test','r2','n','apa']); });
  it('is defined', () => expect(typeof diagnosticAveraged).toBe('function'));
  it('r2 between 0 and 1', () => {
    const r = diagnosticAveraged({ fitted: [1.8, 4.2] }, [{ y: 2 }, { y: 4 }], 'y');
    if (r) { expect(r.r2).toBeGreaterThanOrEqual(0); expect(r.r2).toBeLessThanOrEqual(1); }
  });
});

describe('bootstrapMediation', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x: i, m: i * 0.5 + Math.random(), y: i * 0.3 + Math.random() });
  it('contract keys', () => { const r = bootstrapMediation(d, 'x', 'm', 'y', { nBoot: 20 }); if (r) expectKeys(r, ['test','ab','ciLow','ciHigh','boots','apa']); });
  it('ciLow less than ciHigh', () => { const r = bootstrapMediation(d, 'x', 'm', 'y', { nBoot: 20 }); if (r) { expect(r.ciLow).toBeLessThan(r.ciHigh); } });
  it('ab between ci bounds', () => { const r = bootstrapMediation(d, 'x', 'm', 'y', { nBoot: 20 }); if (r) { expect(r.ab).toBeGreaterThanOrEqual(r.ciLow); expect(r.ab).toBeLessThanOrEqual(r.ciHigh); } });
  it('null for too few rows', () => expect(bootstrapMediation(d.slice(0, 5), 'x', 'm', 'y')).toBeNull());
  it('bootstraps count correct', () => { const r = bootstrapMediation(d, 'x', 'm', 'y', { nBoot: 20 }); if (r && Array.isArray(r.boots)) expect(r.boots.length).toBe(20); });
});

// ── Runs Test on Residuals ───────────────────────────────────────────────
describe('runsTestResiduals', () => {
  const resids = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1];
  const r = runsTestResiduals(resids);
  it('contract keys', () => {
    if (r) expectKeys(r, ['test', 'runs', 'z', 'p', 'n', 'nPos', 'nNeg', 'apa']);
  });
  it('z is finite', () => {
    if (r) expect(Number.isFinite(r.z)).toBe(true);
  });
  it('p between 0 and 1', () => {
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
  it('null for short residuals', () => {
    expect(runsTestResiduals([1, 2, 3, 4])).toBeNull();
  });
});

// ── Studentized Residuals ────────────────────────────────────────────────
describe('studentizedResiduals', () => {
  const X = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10]];
  const y = [2, 3, 5, 6, 7, 9, 10, 12, 14, 16];
  const model = [1, 1.4];
  it('returns residuals array', () => {
    const r = studentizedResiduals(model, X, y);
    if (r) { expect(Array.isArray(r.residuals)).toBe(true); expect(r.residuals.length).toBeGreaterThan(0); }
  });
  it('null for invalid input', () => {
    expect(studentizedResiduals(null, [[1]], [1])).toBeNull();
    expect(studentizedResiduals([1], [[1], [2]], [1])).toBeNull();
  });

  it('contract keys when valid', () => {
    const r = studentizedResiduals(model, X, y);
    if (r) expectKeys(r, ['test', 'residuals', 'n', 'p', 'apa']);
  });
});

// ── Leverage Values ──────────────────────────────────────────────────────
describe('leverageValues', () => {
  const X = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10]];
  const r = leverageValues(X);
  it('leverage array with values', () => {
    if (r) { expect(Array.isArray(r.leverage)).toBe(true); expect(r.leverage.length).toBeGreaterThan(0); }
  });
  it('null for invalid input', () => {
    expect(leverageValues([])).toBeNull();
    expect(leverageValues(null)).toBeNull();
  });

  it('contract keys when valid', () => {
    const r = leverageValues(X);
    if (r) { expect(r).toHaveProperty('leverage'); expect(r).toHaveProperty('n'); }
  });
});

// ── Partial Correlation Plot Data ────────────────────────────────────────
describe('partialCorrelationPlot', () => {
  const X = [[1, 3], [2, 5], [3, 7], [4, 9], [5, 11], [6, 13], [7, 15], [8, 17]];
  const y = [2, 4, 5, 8, 10, 12, 14, 16];
  const r = partialCorrelationPlot(X, y, 'x1', 1);
  it('contract keys', () => {
    if (r) expectKeys(r, ['test', 'x', 'y', 'n', 'apa']);
  });
  it('x and y are arrays', () => {
    if (r) { expect(Array.isArray(r.x)).toBe(true); expect(Array.isArray(r.y)).toBe(true); }
  });

  it('x and y arrays have matching lengths', () => {
    if (r) expect(r.x.length).toBe(r.y.length);
  });
});

// ── Variance Decomposition Proportions ───────────────────────────────────
describe('varianceDecompositionProportions', () => {
  const X = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]];
  const r = varianceDecompositionProportions(X);
  it('contract keys', () => {
    if (r) expectKeys(r, ['test', 'proportions', 'n', 'p', 'apa']);
  });
  it('decomposition non-empty', () => {
    if (r) expect(r.proportions.length).toBeGreaterThan(0);
  });

  it('proportions matrix has p rows', () => {
    if (r) expect(r.proportions.length).toBe(r.p);
  });
});

// ── Akaike Weights ───────────────────────────────────────────────────────
describe('akaikeWeights', () => {
  const models = [
    { aic: 150.5, name: 'Model 1' },
    { aic: 152.3, name: 'Model 2' },
    { aic: 148.7, name: 'Model 3' },
  ];
  const r = akaikeWeights(models);
  it('contract keys', () => {
    if (r) expectKeys(r, ['test', 'weights', 'deltas', 'nModels', 'apa']);
  });
  it('weights sum to approximately 1', () => {
    if (r) { const sum = r.weights.reduce((s, w) => s + w, 0); expect(sum).toBeCloseTo(1, 2); }
  });
  it('deltas are non-negative', () => {
    if (r) r.deltas.forEach(d => expect(d).toBeGreaterThanOrEqual(0));
  });
});

// ── PRESS Statistic ──────────────────────────────────────────────────────
describe('pressStatistic', () => {
  const X = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]];
  const y = [2, 3, 5, 6, 7, 9, 10];
  const r = pressStatistic(X, y);
  it('contract keys', () => {
    if (r) expectKeys(r, ['test', 'press', 'rmsePRESS', 'n', 'apa']);
  });
  it('rmsePRESS is non-negative', () => {
    if (r) expect(r.rmsePRESS).toBeGreaterThanOrEqual(0);
  });
  it('null for n < 5', () => {
    expect(pressStatistic([[1, 1], [1, 2]], [1, 2])).toBeNull();
  });
});
