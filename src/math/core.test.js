// src/math/core.test.js
import { describe, it, expect } from 'vitest';
import {
  avg, sampleVar, sampleSD, corr,
  median, winsorize, trimmedMean, rank,
  effD, effR, effEta, fmtP, sig, computeStats,
} from './core.js';

describe('avg', () => {
  it('computes mean of integers', () => expect(avg([1, 2, 3])).toBe(2));
  it('returns 0 for empty array', () => expect(avg([])).toBe(0));
  it('handles single element', () => expect(avg([7])).toBe(7));
  it('handles negative values', () => expect(avg([-3, -1, 1, 3])).toBe(0));
  it('handles floats', () => expect(avg([1.5, 2.5])).toBeCloseTo(2.0, 10));
});

describe('sampleVar', () => {
  it('computes variance for known data', () =>
    expect(sampleVar([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.5714, 3));
  it('returns 0 for single element', () => expect(sampleVar([5])).toBe(0));
  it('returns 0 for empty array', () => expect(sampleVar([])).toBe(0));
  it('returns 0 for all-same values', () => expect(sampleVar([3, 3, 3])).toBe(0));
});

describe('sampleSD', () => {
  it('equals sqrt of sampleVar', () => {
    const arr = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(sampleSD(arr)).toBeCloseTo(Math.sqrt(sampleVar(arr)), 10);
  });
  it('returns 0 for constant array', () => expect(sampleSD([4, 4, 4])).toBe(0));
});

describe('corr', () => {
  it('returns 1 for perfect positive correlation', () =>
    expect(corr([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 8));
  it('returns -1 for perfect negative correlation', () =>
    expect(corr([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 8));
  it('returns 0 for zero variance in Y', () =>
    expect(corr([1, 2, 3], [2, 2, 2])).toBe(0));
  it('returns 0 for single-element arrays', () =>
    expect(corr([1], [1])).toBe(0));
  it('known value: [1,2,3,4,5] vs [2,4,5,4,5]', () =>
    expect(corr([1,2,3,4,5],[2,4,5,4,5])).toBeCloseTo(0.7746, 3));
});

describe('median', () => {
  it('odd-length array', () => expect(median([3, 1, 2])).toBe(2));
  it('even-length array (average of middle two)', () =>
    expect(median([1, 2, 3, 4])).toBe(2.5));
  it('single element', () => expect(median([7])).toBe(7));
  it('already sorted', () => expect(median([1, 2, 3, 4, 5])).toBe(3));
});

describe('winsorize', () => {
  it('clamps extremes at 10%', () => {
    const w = winsorize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1);
    expect(w[0]).toBe(w[1]);
    expect(w[9]).toBe(w[8]);
  });
  it('does not change middle values', () => {
    const w = winsorize([1, 2, 3, 4, 5], 0.1);
    expect(w[2]).toBe(3);
  });
});

describe('trimmedMean', () => {
  it('20% trim removes one from each end of 5-element array', () => {
    expect(trimmedMean([5, 1, 3, 2, 4], 0.2)).toBeCloseTo(3, 10);
  });
});

describe('rank', () => {
  it('assigns ranks 1-based', () =>
    expect(rank([10, 20, 30])).toEqual([1, 2, 3]));
  it('averages tied ranks', () =>
    expect(rank([10, 10, 30])).toEqual([1.5, 1.5, 3]));
  it('handles all ties', () =>
    expect(rank([5, 5, 5])).toEqual([2, 2, 2]));
  it('handles unsorted input', () =>
    expect(rank([30, 10, 20])).toEqual([3, 1, 2]));
});

describe('effect size labels', () => {
  it('effD: negligible < .2', () => expect(effD(0.1)).toBe('negligible'));
  it('effD: small .2–.5', () => expect(effD(0.3)).toBe('small'));
  it('effD: medium .5–.8', () => expect(effD(0.6)).toBe('medium'));
  it('effD: large >= .8', () => expect(effD(0.9)).toBe('large'));
  it('effD: uses absolute value', () => expect(effD(-0.9)).toBe('large'));

  it('effR: negligible < .1', () => expect(effR(0.05)).toBe('negligible'));
  it('effR: small .1–.3', () => expect(effR(0.2)).toBe('small'));
  it('effR: medium .3–.5', () => expect(effR(0.4)).toBe('medium'));
  it('effR: large >= .5', () => expect(effR(0.6)).toBe('large'));

  it('effEta: negligible < .01', () => expect(effEta(0.005)).toBe('negligible'));
  it('effEta: small .01–.06', () => expect(effEta(0.03)).toBe('small'));
  it('effEta: medium .06–.14', () => expect(effEta(0.10)).toBe('medium'));
  it('effEta: large >= .14', () => expect(effEta(0.20)).toBe('large'));
});

describe('fmtP', () => {
  it('returns "p < .001" for p = 0.0001', () => expect(fmtP(0.0001)).toBe('p < .001'));
  it('returns "p < .001" for p = 0.0009', () => expect(fmtP(0.0009)).toBe('p < .001'));
  it('formats p = 0.045 without leading zero', () => expect(fmtP(0.045)).toBe('p = .045'));
  it('formats p = 0.450 without leading zero', () => expect(fmtP(0.450)).toBe('p = .450'));
  it('formats p = 0.999', () => expect(fmtP(0.999)).toBe('p = .999'));
});

describe('sig', () => {
  it('returns true when p < alpha', () => expect(sig(0.04)).toBe(true));
  it('returns false when p >= alpha', () => expect(sig(0.05)).toBe(false));
  it('uses custom alpha', () => expect(sig(0.09, 0.1)).toBe(true));
});

describe('computeStats', () => {
  const arr = [2, 4, 4, 4, 5, 5, 7, 9];
  const s = computeStats(arr);

  it('returns null for empty input', () => expect(computeStats([])).toBeNull());
  it('n is correct', () => expect(s.n).toBe(8));
  it('mean is correct', () => expect(s.mean).toBeCloseTo(5.0, 3));
  it('sd is correct', () => expect(s.sd).toBeCloseTo(2.138, 2));
  it('median is correct', () => expect(s.median).toBeCloseTo(4.5, 3));
  it('min and max', () => { expect(s.min).toBe(2); expect(s.max).toBe(9); });
  it('q1 and q3 are defined', () => { expect(s.q1).toBeDefined(); expect(s.q3).toBeDefined(); });
  it('skew and kurt are finite numbers', () => {
    expect(isFinite(s.skew)).toBe(true);
    expect(isFinite(s.kurt)).toBe(true);
  });
});
