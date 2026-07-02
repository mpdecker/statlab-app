// src/tests/means.test.js
import { describe, it, expect } from 'vitest';
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest, cohensDGroup, equivalenceT, sampleSizeT } from './means.js';
import { expectAPA, expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const r = ref.means;

describe('tWelch', () => {
  it('returns null when either group has < 2 elements', () => {
    expect(tWelch([1], [2, 3])).toBeNull();
    expect(tWelch([1, 2], [3])).toBeNull();
  });
  it('returns null when both groups are constant (se=0)', () =>
    expect(tWelch([5,5,5], [5,5,5])).toBeNull());

  it('t statistic matches R t.test()', () => {
    const res = tWelch(r.tWelch_basic.a, r.tWelch_basic.b);
    expect(res.t).toBeCloseTo(r.tWelch_basic.t, 3);
  });
  it('df matches R t.test()', () => {
    const res = tWelch(r.tWelch_basic.a, r.tWelch_basic.b);
    // implementation stores df as +df.toFixed(1); actual value ~4.96 rounds to 5
    expect(res.df).toBeCloseTo(r.tWelch_basic.df, 0);
  });
  it('p-value matches R t.test()', () => {
    const res = tWelch(r.tWelch_basic.a, r.tWelch_basic.b);
    expect(res.p).toBeCloseTo(r.tWelch_basic.p, 2);
  });
  it('result has required shape', () => {
    const res = tWelch([1,2,3,4,5], [6,7,8,9,10]);
    ['t','df','p','d','g','power','reqN','apa'].forEach(k =>
      expect(res).toHaveProperty(k));
  });
  it('APA output has no leading zero on p-value', () => {
    const res = tWelch([1,2,3,4,5], [4,5,6,7,8]);
    expect(res.apa).not.toMatch(/p = 0\./);
  });
});

describe('tOne', () => {
  it('returns null when n < 2', () => expect(tOne([1])).toBeNull());
  it('t matches R t.test()', () => {
    const res = tOne(r.tOne_basic.x, r.tOne_basic.mu0);
    // x=[3,5,7,9,11], mu0=5: mean=7, sd=√10≈3.162, se≈1.414, t≈1.414
    expect(res.t).toBeCloseTo(1.4142, 3);
  });
  it('p matches R t.test()', () => {
    const res = tOne(r.tOne_basic.x, r.tOne_basic.mu0);
    // actual p ≈ 0.230 for t=1.414, df=4
    expect(res.p).toBeCloseTo(0.2302, 2);
  });
  it('when sample mean equals mu0, t=0', () => {
    const res = tOne([1, 2, 3], 2);
    expect(res.t).toBeCloseTo(0, 8);
  });
});

describe('tPaired', () => {
  it('returns null for unequal-length arrays', () =>
    expect(tPaired([1,2,3],[1,2])).toBeNull());
  it('t matches R t.test(paired=TRUE)', () => {
    const res = tPaired(r.tPaired_basic.a, r.tPaired_basic.b);
    // diffs=[3,2,1,2,2], mean=2, sd≈0.707, se≈0.316, t≈6.325
    expect(res.t).toBeCloseTo(6.3246, 3);
  });
  it('p matches R t.test(paired=TRUE)', () => {
    const res = tPaired(r.tPaired_basic.a, r.tPaired_basic.b);
    expect(res.p).toBeCloseTo(r.tPaired_basic.p, 2);
  });
  it('identical arrays → t is 0 or NaN (sd of zero diffs is 0)', () => {
    const arr = [1, 2, 3, 4, 5];
    const res = tPaired(arr, arr);
    // all diffs = 0, sd = 0, so t = 0/0 = NaN; result may be null or have t=NaN
    expect(res === null || isNaN(res.t) || res.t === 0).toBe(true);
  });
});

describe('yuentTest', () => {
  it('returns null for constant groups after trim (se=0)', () =>
    expect(yuentTest([5,5,5,5], [5,5,5,5])).toBeNull());
  it('returns a result for normal use', () => {
    const res = yuentTest([1,2,3,4,5,6,7,8], [2,4,6,8,10,12,14,16]);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('p');
  });
  it('p-value is between 0 and 1', () => {
    const res = yuentTest([1,3,5,7,9,11], [2,4,6,8,10,12]);
    expect(res.p).toBeGreaterThanOrEqual(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });
  it('matches scipy.stats.ttest_ind(trim=0.2) oracle on an outlier-containing sample', () => {
    const e = ref.means.yuentTest_outlier;
    const r = yuentTest(e.a, e.b, 0.2);
    expect(r.t).toBeCloseTo(e.t, 3);
    expect(r.df).toBeCloseTo(e.df, 1);
    expect(r.p).toBeCloseTo(e.p, 5);
  });
});

describe('zTestKnownSD', () => {
  it('z=0 when xbar=mu0', () => {
    const res = zTestKnownSD(5, 5, 1, 100);
    expect(res.z).toBeCloseTo(0, 8);
    expect(res.p).toBeCloseTo(1, 2);
  });
  it('large z → small p', () => {
    const res = zTestKnownSD(10, 0, 1, 100);
    expect(res.p).toBeLessThan(0.001);
  });
  it('result has d property', () => {
    expect(zTestKnownSD(6, 5, 2, 50)).toHaveProperty('d');
  });
  it('matches a scipy.stats.norm oracle', () => {
    const e = ref.means.zTestKnownSD_basic;
    const r = zTestKnownSD(e.xbar, e.mu0, e.sigma, e.n);
    expect(r.z).toBeCloseTo(e.z, 4); // r.z is toFixed(4)-rounded internally
    expect(r.p).toBeCloseTo(e.p, 6);
  });
});

describe('signTest', () => {
  it('returns null for n < 5 non-ties', () =>
    expect(signTest([1, 2, 3], 2)).toBeNull());
  it('50/50 split → p close to 1', () => {
    const res = signTest([1, 2, 3, 4, -1, -2, -3, -4], 0);
    expect(res.p).toBeGreaterThan(0.5);
  });
  it('all above mu0 → very small p', () => {
    const res = signTest([10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 0);
    expect(res.p).toBeLessThan(0.01);
  });
  it('pos + neg = total', () => {
    const res = signTest([1, -1, 2, -2, 3, 0, 4], 0);
    expect(res.pos + res.neg).toBe(res.total);
  });
  it('matches a scipy.stats.binomtest oracle', () => {
    const e = ref.means.signTest_basic;
    const r = signTest(e.a, e.mu0);
    expect(r.pos).toBe(e.pos);
    expect(r.neg).toBe(e.neg);
    expect(r.p).toBeCloseTo(e.p, 6);
  });
});

describe('means edge cases', () => {
  it('tWelch null for <2 items per group', () => expect(tWelch([1, 2], [3])).toBeNull());
  it('tOne null for single value', () => expect(tOne([1])).toBeNull());
  it('tPaired null for length mismatch', () => expect(tPaired([1, 2, 3], [4, 5])).toBeNull());
  it('zTestKnownSD null for zero SD', () => expect(zTestKnownSD([5, 5, 5], 5, 0)).toBeNull());
  it('yuentTest valid return for equal-size groups', () => { const r = yuentTest([1, 2, 3], [4, 5, 6]); expect(r).not.toBeNull(); });
  it('signTest null for empty data', () => expect(signTest([], 0)).toBeNull());
  it('tWelch d effect size present', () => { const r = tWelch([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]); expect(r).toHaveProperty('d'); });
  it('tOne t-value present', () => { const r = tOne([1, 2, 3, 4]); expect(r).toHaveProperty('t'); });
});

describe('cohensDGroup', () => {
  const g1 = [10,12,14,16,18]; const g2 = [6,7,8,9,10];
  it('contract keys', () => expectKeys(cohensDGroup(g1, g2), ['test','d','se','label','n1','n2','apa']));
  it('null <3', () => expect(cohensDGroup([1,2], [3,4])).toBeNull());
  it('d finite', () => { const r = cohensDGroup(g1, g2); if (r) expect(Number.isFinite(r.d)).toBe(true); });
  it('matches an independently hand-computed pooled-SD Cohen\'s d oracle', () => {
    const e = ref.means.cohensDGroup_basic;
    const r = cohensDGroup(e.a, e.b);
    expect(r.d).toBeCloseTo(e.d, 6);
  });
});
describe('equivalenceT', () => {
  const g1 = [10,12,14,16,18]; const g2 = [11,13,15,17,19];
  it('contract keys', () => expectKeys(equivalenceT(g1, g2, -3, 3), ['test','tLow','tHigh','equivalent','dL','dU','alpha','apa']));
  it('null dL>=dU', () => expect(equivalenceT(g1, g2, 3, -3)).toBeNull());
  it('equivalent is boolean', () => { const r = equivalenceT(g1, g2, -3, 3); if (r) expect(typeof r.equivalent).toBe('boolean'); });
  it('reports one-sided t-distribution p-values and a real df-dependent critical value (not a fixed z=1.96)', () => {
    const r = equivalenceT(g1, g2, -3, 3);
    expectKeys(r, ['tCrit','pLow','pHigh','p','df']);
    expect(r.pLow).toBeGreaterThanOrEqual(0); expect(r.pLow).toBeLessThanOrEqual(1);
    expect(r.tCrit).not.toBeCloseTo(1.96, 1); // small-df TOST critical should differ from the old fixed z
  });
});
describe('equivalenceT correctly classifies equivalent vs non-equivalent group pairs', () => {
  it('declares equivalence for two nearly identical groups within wide bounds', () => {
    const g1 = [10.0, 10.1, 9.9, 10.2, 9.8, 10.0, 10.1];
    const g2 = [10.1, 10.0, 10.0, 9.9, 10.2, 10.1, 9.9];
    const r = equivalenceT(g1, g2, -2, 2);
    expect(r.equivalent).toBe(true);
    expect(r.p).toBeLessThan(0.05);
  });
  it('rejects equivalence for two groups whose difference clearly exceeds the bounds', () => {
    const g1 = [1, 2, 1.5, 2.5, 1, 2, 1.5];
    const g2 = [20, 21, 19.5, 20.5, 20, 21, 19];
    const r = equivalenceT(g1, g2, -2, 2);
    expect(r.equivalent).toBe(false);
  });
});
describe('sampleSizeT', () => {
  it('contract keys', () => expectKeys(sampleSizeT(0.5), ['test','nPerGroup','total','d','power','alpha','type','apa']));
  it('null d<=0', () => expect(sampleSizeT(0)).toBeNull());
  it('nPerGroup positive integer', () => { const r = sampleSizeT(0.5); if (r) { expect(r.nPerGroup).toBeGreaterThan(0); expect(Number.isInteger(r.nPerGroup)).toBe(true); } });
  it('matches the well-known d=0.5, power=0.8 two-sample benchmark (~64/group)', () => {
    const r = sampleSizeT(0.5, 0.8, 0.05, 'two-sample');
    expect(r.nPerGroup).toBeGreaterThan(55);
    expect(r.nPerGroup).toBeLessThan(75);
  });
  it('honors the power argument (previously silently ignored): higher power requires more N', () => {
    const lo = sampleSizeT(0.5, 0.8, 0.05);
    const hi = sampleSizeT(0.5, 0.95, 0.05);
    expect(hi.nPerGroup).toBeGreaterThan(lo.nPerGroup);
  });
  it('honors the alpha argument (previously silently ignored): tighter alpha requires more N', () => {
    const loose = sampleSizeT(0.5, 0.8, 0.05);
    const tight = sampleSizeT(0.5, 0.8, 0.01);
    expect(tight.nPerGroup).toBeGreaterThan(loose.nPerGroup);
  });
});
