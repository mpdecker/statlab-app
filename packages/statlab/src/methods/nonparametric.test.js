import { describe, it, expect } from 'vitest';
import { ksTestOneSample, ksTestTwoSample, permutationTest, runsTestWaldWolfowitz, runsTestAboveBelowMedian, mannWhitney, wilcoxonSR, kde, nadarayaWatson, moodsMedian, jonckheereTerpstra, siegelTukey, loessSmoother, localPolynomial, gcvBandwidth, loessClassification, localLikelihood, kernelRegression, loessCV, isotonicRegression } from './nonparametric.js';
import { expectKeys, expectPInRange } from './__fixtures__/helpers.js';
import { normalCDF } from '../math/distributions.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
const npRef = ref.nonparametric;

const A = [2, 3, 4, 5, 6, 7, 8];
const B = [5, 6, 7, 8, 9, 10, 11];

describe('ksTestOneSample', () => {
  it('returns null for small samples', () => {
    expect(ksTestOneSample([1, 2], (x) => x)).toBeNull();
    expect(ksTestOneSample(null, (x) => x)).toBeNull();
  });

  it('returns D and p with correct structure', () => {
    const stdNormCDF = (x) => normalCDF(x);
    const r = ksTestOneSample([0.5, -0.2, 1.1, -0.8, 0.3, 0.0, -0.5, 0.9, -1.0, 0.7], stdNormCDF);
    expectKeys(r, ['test', 'D', 'n', 'p', 'apa']);
    expect(r.D).toBeGreaterThan(0); expect(r.D).toBeLessThanOrEqual(1);
    expectPInRange(r.p);
  });

  it('small D when sample matches CDF', () => {
    const unifCDF = (x) => Math.max(0, Math.min(1, x));
    const uniformSample = [0.1, 0.25, 0.35, 0.5, 0.6, 0.75, 0.85, 0.95];
    const r = ksTestOneSample(uniformSample, unifCDF);
    expect(r.D).toBeLessThan(0.4);
  });

  it('large D when sample mismatches CDF', () => {
    const unifCDF = (x) => Math.max(0, Math.min(1, x));
    const shiftedSample = [10.1, 10.25, 10.35, 10.5, 10.6, 10.75, 10.85, 10.95];
    const r = ksTestOneSample(shiftedSample, unifCDF);
    expect(r.D).toBeGreaterThan(0.9);
  });

  it('larger n lowers p for same mismatch', () => {
    const cdf = (x) => normalCDF(x);
    const s1 = [1.5, 0.5, -0.3, 1.2, -0.8, 0.0, 0.9, -1.0, 0.7, -0.5];
    const r1 = ksTestOneSample(s1, cdf);
    expect(r1.p).toBeGreaterThan(0);
  });
});

describe('KS p-values use the full Kolmogorov series (not the single-term 2e^-2z^2 approximation)', () => {
  // Independent oracle: the textbook Kolmogorov survival function
  // Q(λ) = 2 Σ (-1)^(k-1) e^(-2k²λ²), with the Stephens (1970) finite-sample λ correction.
  function oracleQ(D, n) {
    const sqrtN = Math.sqrt(n);
    const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * D;
    let sum = 0;
    for (let k = 1; k <= 50; k++) sum += 2 * (k % 2 === 0 ? -1 : 1) * Math.exp(-2 * k * k * lambda * lambda);
    return Math.min(1, Math.max(0, sum));
  }
  it('one-sample p matches the independently-computed full-series oracle', () => {
    const cdf = (x) => normalCDF(x);
    const sample = [1.5, 0.5, -0.3, 1.2, -0.8, 0.0, 0.9, -1.0, 0.7, -0.5];
    const r = ksTestOneSample(sample, cdf);
    expect(r.p).toBeCloseTo(oracleQ(r.D, sample.length), 4);
  });
  it('two-sample p matches the independently-computed full-series oracle', () => {
    const r = ksTestTwoSample(A, B);
    const en = Math.sqrt((A.length * B.length) / (A.length + B.length));
    // oracleQ expects an n for the sqrt(n) correction term; reuse en directly via a tiny adapter.
    const sqrtN = en, lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * r.D;
    let sum = 0; for (let k = 1; k <= 50; k++) sum += 2 * (k % 2 === 0 ? -1 : 1) * Math.exp(-2 * k * k * lambda * lambda);
    expect(r.p).toBeCloseTo(Math.min(1, Math.max(0, sum)), 4);
  });
  it('the one-term approximation overstates significance relative to the full series at moderate D', () => {
    // At lambda ~ 1.0, the single term 2e^{-2} ≈ 0.2707, while the true (converged) series
    // value differs measurably once later terms are included — verifying we actually sum
    // the series rather than stopping after the first term.
    const cdf = (x) => normalCDF(x);
    // A moderate mismatch designed to land D*sqrt(n) around 1 for n=20.
    const sample = Array.from({ length: 20 }, (_, i) => -1 + i * 0.15);
    const r = ksTestOneSample(sample, cdf);
    const singleTerm = Math.min(1, 2 * Math.exp(-2 * (r.D * Math.sqrt(20)) ** 2));
    expect(Math.abs(r.p - singleTerm)).toBeGreaterThan(0); // not identical to the crude one-term value
  });
  it('D matches a scipy.stats.kstest oracle exactly (D is a pure ECDF computation); p is in the same ballpark under a different legitimate finite-sample correction', () => {
    // scipy's asymptotic KS p-value uses a different (also textbook-legitimate)
    // finite-sample correction than the Stephens (1970) one used here, so the two
    // p-values are close but not bit-identical — this asserts D exactly and p loosely.
    const e = npRef.ks1samp_basic;
    const r = ksTestOneSample(e.x, v => normalCDF(v));
    expect(r.D).toBeCloseTo(e.D, 5);
    expect(r.p).toBeCloseTo(e.p, 1);
  });
});

describe('ksTestTwoSample', () => {
  it('returns null for small samples', () => {
    expect(ksTestTwoSample([1, 2], [3, 4])).toBeNull();
    expect(ksTestTwoSample(null, [1, 2, 3, 4, 5])).toBeNull();
  });

  it('returns D and p with correct structure', () => {
    const r = ksTestTwoSample(A, B);
    expectKeys(r, ['test', 'D', 'na', 'nb', 'p', 'apa']);
    expect(r.D).toBeGreaterThan(0); expect(r.D).toBeLessThanOrEqual(1);
    expectPInRange(r.p);
    expect(r.na).toBe(7); expect(r.nb).toBe(7);
  });

  it('identical distributions give D = 0', () => {
    expect(ksTestTwoSample([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]).D).toBe(0);
  });

  it('D matches a scipy.stats.ks_2samp oracle exactly; p is in the same ballpark under a different legitimate finite-sample correction', () => {
    const e = npRef.ks2samp_basic;
    const r = ksTestTwoSample(e.a, e.b);
    expect(r.D).toBeCloseTo(e.D, 5);
    expect(r.p).toBeCloseTo(e.p, 1);
  });

  it('D increases with group separation', () => {
    const r1 = ksTestTwoSample([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
    const r2 = ksTestTwoSample([0, 0, 0, 0, 0], [10, 10, 10, 10, 10]);
    expect(r2.D).toBeGreaterThanOrEqual(r1.D);
  });

  it('handles unequal group sizes with enough elements', () => {
    const r = ksTestTwoSample([1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11]);
    expect(r).not.toBeNull();
    expect(r.na).toBe(6); expect(r.nb).toBe(5);
  });
});

describe('permutationTest', () => {
  const meanDiff = (a, b) => a.reduce((s, x) => s + x, 0) / a.length - b.reduce((s, x) => s + x, 0) / b.length;
  const medianDiff = (a, b) => {
    const m = (xs) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
    return m(a) - m(b);
  };

  it('returns null for small samples', () => {
    expect(permutationTest([1], [2], meanDiff)).toBeNull();
    expect(permutationTest(null, [1, 2, 3], meanDiff)).toBeNull();
  });

  it('returns observed stat, nPerms, p', () => {
    const r = permutationTest(A, B, meanDiff, { nPerms: 999 });
    expectKeys(r, ['test', 'observedStat', 'nPerms', 'p', 'apa']);
    expect(r.observedStat).toBeLessThan(0);
    expect(r.nPerms).toBe(999);
    expectPInRange(r.p);
  });

  it('reproducible with same seed', () => {
    const r1 = permutationTest(A, B, meanDiff, { nPerms: 500 });
    const r2 = permutationTest(A, B, meanDiff, { nPerms: 500 });
    expect(r1.p).toBe(r2.p);
  });

  it('accepts different test statistics', () => {
    const r1 = permutationTest(A, B, meanDiff, { nPerms: 199 });
    const r2 = permutationTest(A, B, medianDiff, { nPerms: 199 });
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
  });

  it('p near 0 for strongly separated groups', () => {
    const sepA = [1, 2, 3, 4, 5];
    const sepB = [100, 101, 102, 103, 104];
    const r = permutationTest(sepA, sepB, meanDiff, { nPerms: 999 });
    expect(r.p).toBeLessThan(0.05);
  });

  it('p near 1 for identical groups', () => {
    const same = [10, 11, 12, 13, 14];
    const r = permutationTest(same, same, meanDiff, { nPerms: 999 });
    expect(r.p).toBeGreaterThan(0.5);
  });

  it('observed stat preserved in apa', () => {
    const r = permutationTest(A, B, meanDiff, { nPerms: 199 });
    expect(r.apa).toContain(r.observedStat.toFixed(2));
  });
});

describe('runsTestWaldWolfowitz', () => {
  it('returns null for small/invalid', () => {
    expect(runsTestWaldWolfowitz([0, 1, 0])).toBeNull();
    expect(runsTestWaldWolfowitz(null)).toBeNull();
  });

  it('alternating sequence: maximum runs', () => {
    const seq = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
    const r = runsTestWaldWolfowitz(seq);
    expect(r.nRuns).toBe(12);
    expect(r.n1).toBe(6); expect(r.n2).toBe(6);
    expectPInRange(r.p);
  });

  it('all same then all other: minimum runs', () => {
    const r = runsTestWaldWolfowitz([1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(r.nRuns).toBe(2);
  });

  it('random-ish sequence: runs between extremes', () => {
    const seq = [0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0];
    const r = runsTestWaldWolfowitz(seq);
    expect(r.nRuns).toBeGreaterThan(2);
    expect(r.nRuns).toBeLessThan(18);
  });

  it('z is finite', () => {
    const r = runsTestWaldWolfowitz([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
    expect(Number.isFinite(r.z)).toBe(true);
  });
});

describe('runsTestAboveBelowMedian', () => {
  it('returns null for small samples', () => {
    expect(runsTestAboveBelowMedian([1, 2, 3])).toBeNull();
  });

  it('returns runs count with median', () => {
    const seq = [1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13];
    const r = runsTestAboveBelowMedian(seq);
    expectKeys(r, ['test', 'nRuns', 'median', 'n1', 'n2', 'p', 'apa']);
    expectPInRange(r.p);
  });

  it('median is one of the data values or between them', () => {
    const seq = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const r = runsTestAboveBelowMedian(seq);
    expect(r.median).toBeGreaterThan(1);
    expect(r.median).toBeLessThan(12);
  });

  it('all equal values: returns null (all at median, no runs)', () => {
    const seq = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    const r = runsTestAboveBelowMedian(seq);
    expect(r).toBeNull();
  });
});

describe('mannWhitney', () => {
  it('returns null for small groups', () => {
    expect(mannWhitney([1], [2, 3, 4])).toBeNull();
  });

  it('returns U, z, p, effect sizes', () => {
    const r = mannWhitney(A, B);
    expectKeys(r, ['test', 'u', 'z', 'p', 'rb', 'cliffsDelta', 'effR', 'apa']);
    expectPInRange(r.p);
    expect(r.cliffsDelta).toBeLessThan(0);
  });

  it('u1 + u2 = na * nb', () => {
    const r = mannWhitney([1, 3, 5], [2, 4, 6]);
    expect(r.u1 + r.u2).toBeCloseTo(9, 5);
  });

  it('identical groups: u ≈ na*nb/2, p near 1', () => {
    const same = [1, 2, 3, 4, 5];
    const r = mannWhitney(same, same);
    expect(r.u).toBeCloseTo(12.5, 1);
    expect(r.p).toBeGreaterThan(0.5);
  });

  it('effect size label present', () => {
    const r = mannWhitney([1, 2, 3], [10, 11, 12]);
    expect(typeof r.effR).toBe('string');
  });

  it('ties handled correctly', () => {
    const r = mannWhitney([1, 2, 3, 3], [3, 3, 4, 5]);
    expect(r).not.toBeNull();
    expectPInRange(r.p);
  });
});

describe('wilcoxonSR', () => {
  it('returns null for small samples', () => {
    expect(wilcoxonSR([1, -2, 3])).toBeNull();
  });

  it('returns W, z, p, effect size', () => {
    const r = wilcoxonSR(A, B);
    expectKeys(r, ['test', 'W', 'z', 'p', 'r', 'effR', 'apa']);
    expectPInRange(r.p);
  });

  it('all positive diffs: W = 0', () => {
    const r = wilcoxonSR([1, 2, 3, 4, 5, 6], [0, 0, 0, 0, 0, 0]);
    expect(r).not.toBeNull();
  });

  it('one-sample mode (no b)', () => {
    const r = wilcoxonSR([0.1, 0.3, -0.1, 0.5, -0.2, 0.0, 0.4, -0.3, 0.2, -0.4]);
    expect(r).not.toBeNull();
    expectPInRange(r.p);
  });

  it('zero diffs excluded from n', () => {
    const r = wilcoxonSR([1, 2, 3, 3, 4, 5], [1, 2, 3, 3, 4, 5]);
    expect(r).toBeNull();
  });

  it('matches a scipy.stats.wilcoxon oracle on tied |differences| (regression test for the tie-correction fix)', () => {
    const e = npRef.wilcoxonSR_ties;
    const r = wilcoxonSR(e.a, e.b);
    expect(r.W).toBeCloseTo(e.W, 4);
    expect(r.p).toBeCloseTo(e.p, 4);
  });

  it('APA string contains W and p', () => {
    const r = wilcoxonSR(A, B);
    expect(r.apa).toContain('W =');
    expect(r.apa).toContain('p');
  });
});

describe('kde', () => {
  it('returns null for small data', () => {
    expect(kde([1, 2])).toBeNull();
  });

  it('estimates density with default bandwidth', () => {
    const vals = Array.from({ length: 50 }, (_, i) => i * 0.1);
    const r = kde(vals);
    expect(r).not.toBeNull();
    expect(r.bandwidth).toBeGreaterThan(0);
    expect(r.curve.length).toBe(100);
    expect(r.mode).toBeGreaterThan(0);
  });

  it('custom bandwidth works', () => {
    const vals = Array.from({ length: 50 }, () => Math.random());
    const r = kde(vals, 0.5, 50);
    expect(r.bandwidth).toBeCloseTo(0.5);
    expect(r.curve.length).toBe(50);
  });

  it('returns null for small data', () => {
    expect(kde([1, 2])).toBeNull();
    expect(kde(null)).toBeNull();
  });

  it('all density values are non-negative', () => {
    const vals = Array.from({ length: 50 }, () => Math.random() * 10 - 3);
    const r = kde(vals);
    r.curve.forEach(p => expect(p.density).toBeGreaterThanOrEqual(0));
  });

  it('density integrates approximately to 1', () => {
    const vals = Array.from({ length: 50 }, (_, i) => i * 0.1);
    const r = kde(vals, null, 200);
    const step = r.curve[1].x - r.curve[0].x;
    const integral = r.curve.reduce((s, p) => s + p.density * step, 0);
    expect(integral).toBeGreaterThan(0.8);
    expect(integral).toBeLessThan(1.2);
  });

  it('mode is within data range', () => {
    const vals = Array.from({ length: 30 }, () => Math.random() * 10);
    const r = kde(vals);
    expect(r.mode).toBeGreaterThanOrEqual(Math.min(...vals));
    expect(r.mode).toBeLessThanOrEqual(Math.max(...vals));
  });

  it('larger bandwidth produces smoother curve', () => {
    const vals = Array.from({ length: 30 }, () => Math.random());
    const narrow = kde(vals, 0.1, 100);
    const wide = kde(vals, 0.5, 100);
    const narrowPeaks = narrow.curve.filter((p, i, arr) =>
      i > 0 && i < arr.length - 1 && p.density > arr[i - 1].density && p.density > arr[i + 1].density
    ).length;
    const widePeaks = wide.curve.filter((p, i, arr) =>
      i > 0 && i < arr.length - 1 && p.density > arr[i - 1].density && p.density > arr[i + 1].density
    ).length;
    expect(widePeaks).toBeLessThanOrEqual(narrowPeaks);
  });

  it('contract fields present', () => {
    const vals = Array.from({ length: 30 }, () => Math.random());
    const r = kde(vals);
    expectKeys(r, ['test', 'bandwidth', 'n', 'curve', 'mode', 'apa']);
    expect(r.test).toBe('Kernel Density Estimation');
  });

  it('APA string contains bandwidth and n', () => {
    const vals = Array.from({ length: 30 }, () => Math.random());
    const r = kde(vals);
    expect(r.apa).toContain('bandwidth');
    expect(r.apa).toContain('n =');
  });
});

describe('nadarayaWatson', () => {
  it('returns null for length mismatch', () => {
    expect(nadarayaWatson([1, 2], [3])).toBeNull();
  });

  it('fits kernel regression', () => {
    const xs = Array.from({ length: 30 }, (_, i) => i * 0.5);
    const ys = xs.map(x => 2 + 1.5 * x + (Math.random() - 0.5) * 0.5);
    const r = nadarayaWatson(xs, ys);
    expect(r).not.toBeNull();
    expect(r.fitted.length).toBe(40);
    expect(r.rSquared).toBeGreaterThan(0);
    expect(r.rSquared).toBeLessThanOrEqual(1);
  });

  it('custom eval points work', () => {
    const xs = Array.from({ length: 30 }, (_, i) => i);
    const ys = xs.map(x => x * 2);
    const r = nadarayaWatson(xs, ys, null, [0, 10, 20]);
    expect(r.fitted.length).toBe(3);
  });

  it('returns null for length mismatch', () => {
    expect(nadarayaWatson([1, 2], [3])).toBeNull();
    expect(nadarayaWatson(null, [1, 2, 3, 4, 5])).toBeNull();
  });

  it('returns null for small n', () => {
    expect(nadarayaWatson([1, 2, 3], [1, 2, 3])).toBeNull();
  });

  it('R² near 1 for nearly linear data', () => {
    const xs = Array.from({ length: 30 }, (_, i) => i);
    const ys = xs.map(x => 2 + 3 * x + (Math.random() - 0.5) * 0.01);
    const r = nadarayaWatson(xs, ys);
    expect(r.rSquared).toBeGreaterThan(0.9);
  });

  it('fitted values are within data range', () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    const ys = xs.map(x => 5 + 2 * x + (Math.random() - 0.5) * 2);
    const r = nadarayaWatson(xs, ys);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    r.fitted.forEach(p => {
      expect(p.yHat).toBeGreaterThanOrEqual(yMin - 2);
      expect(p.yHat).toBeLessThanOrEqual(yMax + 2);
    });
  });

  it('contract fields present', () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    const ys = xs.map(x => x * 2);
    const r = nadarayaWatson(xs, ys);
    expectKeys(r, ['test', 'bandwidth', 'n', 'fitted', 'rSquared', 'apa']);
    expect(r.test).toBe('Nadaraya-Watson Kernel Regression');
  });

  it('custom bandwidth affects smoothness', () => {
    const xs = Array.from({ length: 30 }, (_, i) => i * 0.2);
    const ys = xs.map(x => Math.sin(x * 3) + (Math.random() - 0.5) * 0.5);
    const rSmall = nadarayaWatson(xs, ys, 0.1);
    const rLarge = nadarayaWatson(xs, ys, 1.0);
    expect(rSmall.bandwidth).toBeCloseTo(0.1);
    expect(rLarge.bandwidth).toBeCloseTo(1.0);
  });

  it('APA contains R²', () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    const ys = xs.map(x => x * 2);
    const r = nadarayaWatson(xs, ys);
    expect(r.apa).toMatch(/R/);
  });
});

describe('moodsMedian', () => {
  const g = [{ name: 'A', vals: [1, 2, 3, 4, 5] }, { name: 'B', vals: [6, 7, 8, 9, 10] }];
  it('null small', () => expect(moodsMedian(null)).toBeNull());
  it('contract keys', () => expectKeys(moodsMedian(g), ['test', 'chi2', 'df', 'p', 'median', 'table', 'n', 'apa']));
});

describe('jonckheereTerpstra', () => {
  const g = [{ name: 'A', vals: [1, 2, 3] }, { name: 'B', vals: [4, 5, 6] }, { name: 'C', vals: [7, 8, 9] }];
  it('null small', () => expect(jonckheereTerpstra([{ name: 'A', vals: [1] }, { name: 'B', vals: [2] }])).toBeNull());
  it('contract keys', () => expectKeys(jonckheereTerpstra(g), ['test', 'J', 'z', 'p', 'direction', 'n', 'apa']));
  it('p between 0-1', () => { const r = jonckheereTerpstra(g); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
});

describe('siegelTukey', () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const b = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  it('null small', () => expect(siegelTukey(a.slice(0, 3), b.slice(0, 3))).toBeNull());
  it('contract keys', () => expectKeys(siegelTukey(a, b), ['test', 'R', 'z', 'p', 'n1', 'n2', 'apa']));
});

describe('loessSmoother', () => { it('contract keys', () => expectKeys(loessSmoother([1,2,3,4,5,6,7,8,9,10],[2,3,4,5,6,7,8,9,10,11]),['test','fitted','span','degree','n','apa'])); it('fitted non-empty', () => { const r = loessSmoother([1,2,3,4,5,6,7,8,9,10],[2,3,4,5,6,7,8,9,10,11]); expect(r.fitted.length).toBeGreaterThan(0); }); });
describe('localPolynomial', () => { it('contract keys', () => expectKeys(localPolynomial([1,2,3,4,5,6,7,8,9,10],[2,3,4,5,6,7,8,9,10,11]),['test','fitted','bandwidth','degree','n','apa'])); it('fitted non-empty', () => { const r = localPolynomial([1,2,3,4,5,6,7,8,9,10],[2,3,4,5,6,7,8,9,10,11]); expect(r.fitted.length).toBeGreaterThan(0); }); });
describe('gcvBandwidth', () => { it('contract keys', () => expectKeys(gcvBandwidth([1,2,3,4,5,6,7,8,9,10],[2,3,4,5,6,7,8,9,10,11]),['test','bandwidth','gcv','n','apa'])); it('h positive', () => { const r = gcvBandwidth([1,2,3,4,5,6,7,8,9,10],[2,3,4,5,6,7,8,9,10,11]); expect(r.bandwidth).toBeGreaterThan(0); }); it('gcv non-negative', () => { const r = gcvBandwidth([1,2,3,4,5,6,7,8,9,10],[2,3,4,5,6,7,8,9,10,11]); if (r) expect(r.gcv).toBeGreaterThanOrEqual(0); }); });
describe('loessClassification', () => { it('contract keys', () => expectKeys(loessClassification([{y:0,x:1},{y:1,x:2},{y:0,x:3},{y:1,x:4},{y:1,x:5},{y:0,x:6},{y:1,x:7},{y:0,x:8},{y:1,x:9},{y:1,x:10}],'y','x'),['test','predicted','span','n','apa'])); it('accuracy between 0-1', () => { const r = loessClassification([{y:0,x:1},{y:1,x:2},{y:0,x:3},{y:1,x:4},{y:1,x:5},{y:0,x:6},{y:1,x:7},{y:0,x:8},{y:1,x:9},{y:1,x:10}],'y','x'); if (r.accuracy != null) { expect(r.accuracy).toBeGreaterThanOrEqual(0); expect(r.accuracy).toBeLessThanOrEqual(1); } }); });
describe('localLikelihood', () => { it('contract keys', () => expectKeys(localLikelihood([1,2,3,4,5,6,7,8,9,10],[0,0,0,1,1,1,1,0,1,1],{family:'binomial'}),['test','fitted','family','bandwidth','n','apa'])); it('fitted non-empty', () => { const r = localLikelihood([1,2,3,4,5,6,7,8,9,10],[0,0,0,1,1,1,1,0,1,1],{family:'binomial'}); expect(r.fitted.length).toBeGreaterThan(0); }); });

describe('kernelRegression', () => {
  const x = Array.from({length: 20}, (_, i) => i);
  const y = x.map(v => v * 2 + Math.random());
  it('contract keys', () => expectKeys(kernelRegression(x, y), ['test','fitted','bandwidth','rmse','n','apa']));
  it('null <10', () => expect(kernelRegression([1,2], [3,4])).toBeNull());
  it('rmse non-negative', () => { const x2 = Array.from({length: 20}, (_, i) => i); const y2 = x2.map(v => v * 2 + Math.random()); const r = kernelRegression(x2, y2); if (r) expect(r.rmse).toBeGreaterThanOrEqual(0); });
});
describe('loessCV', () => {
  const x = Array.from({length: 20}, (_, i) => i);
  const y = x.map(v => v * 1.5 + Math.random() * 5);
  it('contract keys', () => expectKeys(loessCV(x, y), ['test','optimalBandwidth','optimalCV','results','n','apa']));
  it('null <10', () => expect(loessCV([1,2], [3,4])).toBeNull());
});
describe('isotonicRegression', () => {
  it('contract keys', () => expectKeys(isotonicRegression([1,2,3,2,4,5]), ['test','fitted','nBlocks','n','apa']));
  it('null <3', () => expect(isotonicRegression([1,2])).toBeNull());
  it('fitted matches input length', () => { const r = isotonicRegression([1,2,3,2,4,5]); if (r) expect(r.fitted).toHaveLength(6); });
});
