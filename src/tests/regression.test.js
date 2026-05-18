// src/tests/regression.test.js
import { describe, it, expect } from 'vitest';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS,
  logisticReg, mediation, moderation,
} from './regression.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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
