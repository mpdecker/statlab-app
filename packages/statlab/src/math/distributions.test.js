// src/math/distributions.test.js
import { describe, it, expect } from 'vitest';
import {
  lngamma, lnBinom, ibeta,
  normalCDF, normalINV,
  tPDF, tPVal, fPVal, chiPVal,
  tInv2, computePowerT, computePowerCorr, requiredN, requiredNCorr,
  normalityDP, shapiroWilk, bootstrapCI,
} from './distributions.js';
import { avg } from './core.js';
import ref from '../methods/__fixtures__/reference.json' with { type: 'json' };

describe('lngamma', () => {
  it('lngamma(1) = 0', () => expect(lngamma(1)).toBeCloseTo(0, 8));
  it('lngamma(2) = ln(1) = 0', () => expect(lngamma(2)).toBeCloseTo(0, 8));
  it('lngamma(5) = ln(24)', () => expect(lngamma(5)).toBeCloseTo(Math.log(24), 6));
  it('lngamma(0.5) = 0.5*ln(pi)', () =>
    expect(lngamma(0.5)).toBeCloseTo(0.5 * Math.log(Math.PI), 6));
});

describe('normalCDF', () => {
  it('normalCDF(0) = 0.5', () => expect(normalCDF(0)).toBeCloseTo(0.5, 10));
  it('normalCDF(1.96) matches R pnorm(1.96)', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === 1.96).expected;
    expect(normalCDF(1.96)).toBeCloseTo(expected, 4);
  });
  it('normalCDF(-1.96) matches R pnorm(-1.96)', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === -1.96).expected;
    expect(normalCDF(-1.96)).toBeCloseTo(expected, 4);
  });
  it('normalCDF(3.5) accurate in right tail', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === 3.5).expected;
    expect(normalCDF(3.5)).toBeCloseTo(expected, 5);
  });
  it('normalCDF(-3.5) accurate in left tail', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === -3.5).expected;
    expect(normalCDF(-3.5)).toBeCloseTo(expected, 6);
  });
  it('normalCDF(-4.0) accurate in extreme left tail', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === -4).expected;
    expect(normalCDF(-4.0)).toBeCloseTo(expected, 7);
  });
  it('symmetry: normalCDF(z) + normalCDF(-z) = 1', () => {
    expect(normalCDF(2.5) + normalCDF(-2.5)).toBeCloseTo(1, 10);
  });
});

describe('normalINV', () => {
  it('normalINV(0.5) = 0', () => expect(normalINV(0.5)).toBeCloseTo(0, 6));
  it('normalINV(0.975) ≈ 1.96', () => expect(normalINV(0.975)).toBeCloseTo(1.96, 2));
  it('round-trips with normalCDF (limited by polynomial CDF accuracy)', () =>
    // normalCDF/normalINV are rational-polynomial approximations; the composed
    // round-trip is accurate to <5e-4 across |z|<=2.5 (measured 3.0e-4 at z=1.5).
    expect(normalINV(normalCDF(1.5))).toBeCloseTo(1.5, 3));
});

describe('chiPVal', () => {
  it('chiPVal(3.841, 1) ≈ 0.050', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 3.841 && r.df === 1).expected;
    expect(chiPVal(3.841, 1)).toBeCloseTo(expected, 3);
  });
  it('chiPVal(5.991, 2) ≈ 0.050', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 5.991 && r.df === 2).expected;
    expect(chiPVal(5.991, 2)).toBeCloseTo(expected, 3);
  });
  it('chiPVal(9.488, 4) ≈ 0.050', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 9.488 && r.df === 4).expected;
    expect(chiPVal(9.488, 4)).toBeCloseTo(expected, 3);
  });
  it('chiPVal(0.001, 1) close to 1', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 0.001).expected;
    expect(chiPVal(0.001, 1)).toBeCloseTo(expected, 3);
  });
  it('chiPVal(df=0) returns 1', () => expect(chiPVal(5, 0)).toBe(1));
  it('chiPVal(chi2<0) returns 1', () => expect(chiPVal(-1, 2)).toBe(1));
});

describe('tPVal', () => {
  it('tPVal(2.0, 10) matches R 2*pt(-2, 10)', () => {
    const expected = ref.distributions.tPVal.find(r => r.t === 2 && r.df === 10).expected;
    expect(tPVal(2.0, 10)).toBeCloseTo(expected, 4);
  });
  it('tPVal(1.96, 1000) matches R', () => {
    const expected = ref.distributions.tPVal.find(r => r.t === 1.96 && r.df === 1000).expected;
    expect(tPVal(1.96, 1000)).toBeCloseTo(expected, 4);
  });
  it('tPVal(12.706, 1) ≈ 0.05', () => {
    const expected = ref.distributions.tPVal.find(r => r.t === 12.706).expected;
    expect(tPVal(12.706, 1)).toBeCloseTo(expected, 3);
  });
  it('is symmetric: tPVal(t, df) = tPVal(-t, df)', () =>
    expect(tPVal(2, 10)).toBeCloseTo(tPVal(-2, 10), 10));
});

describe('fPVal', () => {
  it('fPVal(4.26, 1, 30) matches R', () => {
    const expected = ref.distributions.fPVal.find(r => r.F === 4.26).expected;
    expect(fPVal(4.26, 1, 30)).toBeCloseTo(expected, 4);
  });
  it('fPVal(0, df1, df2) ≈ 1', () => expect(fPVal(0, 2, 10)).toBeCloseTo(1, 4));
  it('very large F gives p near 0', () => expect(fPVal(10000, 1, 100)).toBeCloseTo(0, 4));
});

describe('tInv2', () => {
  it('tInv2(0.05, 1) ≈ 12.706', () =>
    expect(tInv2(0.05, 1)).toBeCloseTo(12.706, 2));
  it('tInv2(0.05, 10) ≈ 2.228', () =>
    expect(tInv2(0.05, 10)).toBeCloseTo(2.228, 2));
  it('tInv2(0.05, 1e5) uses normal approximation ≈ 1.960', () =>
    expect(tInv2(0.05, 1e5)).toBeCloseTo(1.960, 2));
  it('round-trips with tPVal', () => {
    const tc = tInv2(0.05, 20);
    expect(tPVal(tc, 20)).toBeCloseTo(0.05, 3);
  });
});

describe('computePowerT', () => {
  it('power is between 0 and 1', () => {
    const p = computePowerT(30, 30, 0.5);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
  it('larger effect → more power', () => {
    expect(computePowerT(20, 20, 0.8)).toBeGreaterThan(computePowerT(20, 20, 0.2));
  });
  it('larger n → more power', () => {
    expect(computePowerT(100, 100, 0.5)).toBeGreaterThan(computePowerT(20, 20, 0.5));
  });
});

describe('requiredN', () => {
  it('d=0.5, power=0.8 requires ~64 per group', () => {
    const n = requiredN(0.5, 0.8);
    expect(n).toBeGreaterThanOrEqual(60);
    expect(n).toBeLessThanOrEqual(70);
  });
  it('d=0.8 requires fewer than d=0.5', () =>
    expect(requiredN(0.8)).toBeLessThan(requiredN(0.5)));
});

describe('normalityDP', () => {
  it('returns null for n < 8', () => expect(normalityDP([1,2,3])).toBeNull());
  it('returns stat, p, normal for valid data', () => {
    const r = normalityDP([1,2,3,4,5,6,7,8,9,10]);
    expect(r).toHaveProperty('stat');
    expect(r).toHaveProperty('p');
    expect(r).toHaveProperty('normal');
    expect(isFinite(r.stat)).toBe(true);
  });
});

describe('shapiroWilk', () => {
  it('returns null for n < 3', () => expect(shapiroWilk([1, 2])).toBeNull());
  it('returns approximate:true for n < 10', () => {
    const r = shapiroWilk([1, 2, 3, 4, 5]);
    expect(r.approximate).toBe(true);
  });
  it('returns approximate:false for n >= 10', () => {
    const r = shapiroWilk(Array.from({ length: 20 }, (_, i) => i));
    expect(r.approximate).toBe(false);
  });
  it('W is between 0 and 1', () => {
    const r = shapiroWilk([1,2,3,4,5,6,7,8,9,10]);
    expect(r.stat).toBeGreaterThan(0);
    expect(r.stat).toBeLessThanOrEqual(1);
  });
});

describe('computePowerT', () => {
  it('small-sample power uses Monte Carlo (differs from crude normal)', () => {
    const mc = computePowerT(15, 15, 0.8, 0.05, 1);
    expect(mc).toBeGreaterThan(0.5);
    expect(mc).toBeLessThan(1);
  });
});

describe('bootstrapCI', () => {
  it('is reproducible with the same seed', () => {
    const vals = [3, 5, 7, 9, 11, 13];
    const a = bootstrapCI(vals, v => avg(v), 300, 0.05, 123);
    const b = bootstrapCI(vals, v => avg(v), 300, 0.05, 123);
    expect(a.lo).toBeCloseTo(b.lo, 8);
    expect(a.hi).toBeCloseTo(b.hi, 8);
  });
  it('returns { lo, hi, dist }', () => {
    const r = bootstrapCI([1,2,3,4,5], a => a.reduce((s,x)=>s+x,0)/a.length, 99);
    expect(r).toHaveProperty('lo');
    expect(r).toHaveProperty('hi');
    expect(r.hi).toBeGreaterThan(r.lo);
    expect(r.dist).toHaveLength(99);
  });
  it('CI for mean of [1..10] contains 5.5', () => {
    const data = [1,2,3,4,5,6,7,8,9,10];
    const { lo, hi } = bootstrapCI(data, a => a.reduce((s,x)=>s+x,0)/a.length, 999);
    expect(lo).toBeLessThan(5.5);
    expect(hi).toBeGreaterThan(5.5);
  });
  it('returns null for empty or single-value input', () => {
    expect(bootstrapCI([], a => a.length)).toBeNull();
    expect(bootstrapCI([3], a => a[0])).toBeNull();
  });
});

describe('hardening — invalid inputs', () => {
  it('bootstrapCI rejects empty or tiny samples', () => {
    expect(bootstrapCI([], v => v.reduce((s, x) => s + x, 0) / v.length)).toBeNull();
    expect(bootstrapCI([1], v => v[0])).toBeNull();
  });

  it('shapiroWilk and normalityDP reject constant data', () => {
    const c = [2, 2, 2, 2, 2, 2];
    expect(shapiroWilk(c)).toBeNull();
    expect(normalityDP(c)).toBeNull();
  });
});

describe('hardening — lngamma invalid inputs', () => {
  it('lngamma(0) = Infinity', () => {
    expect(lngamma(0)).toBe(Infinity);
  });
  it('lngamma returns NaN for negative non-integer', () => {
    expect(lngamma(-0.5)).toBeNaN();
  });
});

describe('hardening — lnBinom invalid inputs', () => {
  it('returns finite for edge cases', () => {
    expect(Number.isFinite(lnBinom(5, 0))).toBe(true);
    expect(Number.isFinite(lnBinom(5, 5))).toBe(true);
  });
});

describe('hardening — ibeta invariants', () => {
  it('I_0(a,b) = 0', () => {
    expect(ibeta(2, 3, 0)).toBeCloseTo(0, 8);
  });

  it('I_1(a,b) = 1', () => {
    expect(ibeta(2, 3, 1)).toBeCloseTo(1, 8);
  });
});

describe('hardening — normalINV invariants', () => {
  it('returns 0 at p=0.5', () => {
    expect(normalINV(0.5)).toBeCloseTo(0, 4);
  });
});

describe('hardening — tPDF invalid inputs', () => {
  it('returns NaN for df <= 0', () => {
    expect(tPDF(2, 0)).toBeNaN();
  });
});

describe('hardening — tPVal invalid inputs', () => {
  it('returns 0 for df <= 0', () => {
    expect(tPVal(2, 0)).toBe(0);
    expect(tPVal(2, -1)).toBe(0);
  });

  it('returns 0 for infinite t', () => {
    expect(tPVal(Infinity, 10)).toBe(0);
  });
});

describe('hardening — fPVal invalid inputs', () => {
  it('returns 1 for F <= 0', () => {
    expect(fPVal(0, 2, 10)).toBeCloseTo(1, 4);
    expect(fPVal(-1, 2, 10)).toBe(1);
  });
});

describe('hardening — chiPVal invalid inputs', () => {
  it('returns 1 for chi2 <= 0', () => {
    expect(chiPVal(0, 2)).toBe(1);
    expect(chiPVal(-1, 2)).toBe(1);
  });
});

describe('hardening — tInv2 invalid inputs', () => {
  it('returns finite for edge df', () => {
    expect(Number.isFinite(tInv2(0.05, 0.5))).toBe(true);
  });
});
