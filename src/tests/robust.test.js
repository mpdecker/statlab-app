import { describe, it, expect } from 'vitest';
import { theilSenSlope, mmEstimator, madScale, hampelM, mcdCovariance, sEstimator, ltsRegression, qqConfidence } from './robust.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 50];

describe('theilSenSlope', () => {
  it('null <10', () => expect(theilSenSlope([1, 2], [3, 4])).toBeNull());
  it('contract keys', () => expectKeys(theilSenSlope(x, y), ['test', 'slope', 'intercept', 'rSquared', 'n', 'apa']));
  it('slope finite', () => { const r = theilSenSlope(x, y); expect(Number.isFinite(r.slope)).toBe(true); });

  it('matches a scipy.stats.theilslopes oracle, including the intercept (regression test for the non-robust mean-based intercept bug)', () => {
    // The intercept previously used mean(y) - slope*mean(x), which is NOT
    // robust to the outlier in this fixture (x=50 paired with y=25 breaking
    // the linear trend) — it gave -6.818 instead of the correct, outlier-
    // resistant median(y_i - slope*x_i) = 0.
    const e = ref.robust.theilsen_outlier;
    const r = theilSenSlope(e.x, e.y);
    expect(r.slope).toBeCloseTo(e.slope, 4);
    expect(r.intercept).toBeCloseTo(e.intercept, 4);
  });
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
  it('mu finite', () => { const r = hampelM([1, 2, 3, 4, 5, 6, 7, 8]); if (r) expect(Number.isFinite(r.mu)).toBe(true); });
});

describe('mcdCovariance', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i, x2: i * 0.5 });
  it('null <10', () => expect(mcdCovariance(d.slice(0, 5), ['x1'])).toBeNull());
  it('contract keys', () => { const r = mcdCovariance(d, ['x1', 'x2']); if (r) expectKeys(r, ['test', 'covariance', 'h', 'n', 'p', 'apa']); });
  it('p matches input', () => { const r = mcdCovariance(d, ['x1', 'x2']); if (r) expect(r.p).toBe(2); });
});

describe('sEstimator', () => {
  const x = [1,2,3,4,5,6,7,8,9,10]; const y = x.map(v => v * 2 + Math.random());
  it('contract keys', () => expectKeys(sEstimator(x, y), ['test','coefficients','n','apa']));
  it('null <5', () => expect(sEstimator([1,2], [3,4])).toBeNull());
  it('coefficients non-empty', () => { const r = sEstimator(x, y); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
});
describe('ltsRegression', () => {
  const x = [1,2,3,4,5,6,7,8,9,10]; const y = x.map(v => v * 1.5 + Math.random());
  it('contract keys', () => expectKeys(ltsRegression(x, y), ['test','coefficients','h','n','apa']));
  it('null <5', () => expect(ltsRegression([1,2], [3,4])).toBeNull());
  it('coefficients non-empty', () => { const r = ltsRegression(x, y); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
});
describe('qqConfidence', () => {
  const data = [1.2, 2.3, 3.1, 4.5, 5.0, 5.5, 6.2, 7.1, 8.0, 9.3];
  it('contract keys', () => expectKeys(qqConfidence(data), ['test','theoretical','upper','lower','n','apa']));
  it('null <5', () => expect(qqConfidence([1,2])).toBeNull());
  it('theoretical non-empty', () => { const r = qqConfidence(data); if (r) expect(r.theoretical.length).toBeGreaterThan(0); });
});
