import { describe, it, expect } from 'vitest';
import { theilSenSlope, mmEstimator, madScale, hampelM, mcdCovariance } from './robust.js';
import { expectKeys } from './__fixtures__/helpers.js';

const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 50];

describe('theilSenSlope', () => {
  it('null <10', () => expect(theilSenSlope([1, 2], [3, 4])).toBeNull());
  it('contract keys', () => expectKeys(theilSenSlope(x, y), ['test', 'slope', 'intercept', 'rSquared', 'n', 'apa']));
  it('slope finite', () => { const r = theilSenSlope(x, y); expect(Number.isFinite(r.slope)).toBe(true); });
});

describe('mmEstimator', () => {
  it('null <10', () => expect(mmEstimator([1, 2], [3, 4])).toBeNull());
  it('contract keys', () => expectKeys(mmEstimator(x, y), ['test', 'slope', 'intercept', 'sigma', 'rSquared', 'n', 'apa']));
  it('sigma > 0', () => { const r = mmEstimator(x, y); expect(r.sigma).toBeGreaterThan(0); });
});

describe('madScale', () => {
  it('null <5', () => expect(madScale([1, 2, 3])).toBeNull());
  it('contract keys', () => expectKeys(madScale(x), ['test', 'mad', 'median', 'n', 'apa']));
  it('mad > 0', () => { const r = madScale(x); expect(r.mad).toBeGreaterThan(0); });
});

describe('hampelM', () => {
  it('null <8', () => expect(hampelM([1, 2, 3])).toBeNull());
  it('contract keys', () => expectKeys(hampelM([1, 2, 3, 4, 5, 6, 7, 8]), ['test', 'mu', 'sigma', 'a', 'b', 'c', 'n', 'apa']));
});

describe('mcdCovariance', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i, x2: i * 0.5 });
  it('null <10', () => expect(mcdCovariance(d.slice(0, 5), ['x1'])).toBeNull());
  it('contract keys', () => { const r = mcdCovariance(d, ['x1', 'x2']); if (r) expectKeys(r, ['test', 'covariance', 'h', 'n', 'p', 'apa']); });
});
