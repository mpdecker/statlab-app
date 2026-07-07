import { describe, it, expect } from 'vitest';
import { circularMean, circularVariance, rayleighTest, watsonU2, vonMisesMLE, circularCorrelation, circularLinearRegression } from './circular.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const angles = [0.1, 0.3, 0.5, 0.4, 0.35, 0.2, 0.45, 0.38, 0.32, 0.48, 0.15, 0.42];
const uniformA = [0.1, 1.2, 2.5, 3.8, 4.9, 5.6, 0.8, 2.1, 4.2, 5.9, 1.8, 3.5];

describe('circularMean', () => {
  it('null <5', () => expect(circularMean([1, 2, 3])).toBeNull());
  it('mean in [-PI,PI]', () => { const r = circularMean(angles); expect(r.mean).toBeGreaterThan(-Math.PI); expect(r.mean).toBeLessThanOrEqual(Math.PI); });
  it('contract keys', () => expectKeys(circularMean(angles), ['test', 'mean', 'resultant', 'n', 'apa']));
});

describe('circularVariance', () => {
  it('null <5', () => expect(circularVariance([1, 2, 3])).toBeNull());
  it('variance in [0,1]', () => { const r = circularVariance(angles); expect(r.variance).toBeGreaterThanOrEqual(0); expect(r.variance).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(circularVariance(angles), ['test', 'variance', 'resultant', 'n', 'apa']));
});

describe('rayleighTest', () => {
  it('null <8', () => expect(rayleighTest([1, 2, 3, 4, 5])).toBeNull());
  it('p in [0,1]', () => { const r = rayleighTest(angles); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(rayleighTest(angles), ['test', 'z', 'p', 'n', 'apa']));
});

describe('watsonU2', () => {
  it('null <8', () => expect(watsonU2([1, 2, 3, 4, 5])).toBeNull());
  it('stat >= 0', () => { const r = watsonU2(angles); expect(r.statistic).toBeGreaterThanOrEqual(0); });
  it('contract keys', () => expectKeys(watsonU2(angles), ['test', 'statistic', 'pValue', 'n', 'apa']));
});

describe('vonMisesMLE', () => {
  it('null <8', () => expect(vonMisesMLE([1, 2, 3, 4, 5])).toBeNull());
  it('kappa > 0', () => { const r = vonMisesMLE(angles); expect(r.kappa).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(vonMisesMLE(angles), ['test', 'mu', 'kappa', 'seMu', 'seKappa', 'n', 'apa']));
});

describe('circularCorrelation', () => {
  it('null <10', () => expect(circularCorrelation([1, 2, 3], [4, 5, 6])).toBeNull());
  it('r in [-1,1]', () => { const r = circularCorrelation(angles, angles); expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(circularCorrelation(angles, angles), ['test', 'r', 'z', 'p', 'n', 'apa']));
});

describe('circularLinearRegression', () => {
  it('null <10', () => expect(circularLinearRegression([1, 2, 3], [4, 5, 6])).toBeNull());
  it('contract keys', () => expectKeys(circularLinearRegression(angles, angles.map((_, i) => i)), ['test', 'coefficients', 'rSquared', 'n', 'apa']));
  it('rSquared between 0 and 1', () => { const r = circularLinearRegression(angles, angles.map((_, i) => i)); if (r) { expect(r.rSquared).toBeGreaterThanOrEqual(0); expect(r.rSquared).toBeLessThanOrEqual(1); } });
});

describe('circularMean, circularVariance, and rayleighTest match scipy.stats exactly', () => {
  const e = ref.circular.basic;
  it('circularMean matches scipy.stats.circmean', () => {
    const r = circularMean(e.anglesDeg, { degrees: true });
    expect(r.mean).toBeCloseTo(e.mean, 4);
    expect(r.resultant).toBeCloseTo(e.resultant, 4);
  });
  it('circularVariance matches scipy.stats.circvar', () => {
    const r = circularVariance(e.anglesDeg, { degrees: true });
    expect(r.variance).toBeCloseTo(e.variance, 4);
  });
  it('rayleighTest z and (clamped) p match the independent Zar-formula computation', () => {
    const r = rayleighTest(e.anglesDeg, { degrees: true });
    expect(r.z).toBeCloseTo(e.rayleighZ, 3);
    expect(r.p).toBeCloseTo(e.rayleighP, 3);
  });
});

describe('circularLinearRegression computes a real p-value', () => {
  it('returns a small p-value for a strong circular-linear relationship', () => {
    const x = Array.from({ length: 12 }, (_, i) => i + 1);
    const theta = x.map(xi => 0.12 * xi); // angle increases with x
    const r = circularLinearRegression(theta, x);
    const slope = r.coefficients.find(c => c.name === 'x');
    expect(slope.p).toBeLessThan(0.05);
  });

  it('returns a large p-value when angle is unrelated to x (not hardcoded)', () => {
    const x = Array.from({ length: 12 }, (_, i) => i + 1);
    const theta = x.map((_, i) => (i % 2 === 0 ? 0.3 : 0.5)); // alternating, no trend in x
    const r = circularLinearRegression(theta, x);
    const slope = r.coefficients.find(c => c.name === 'x');
    expect(slope.p).toBeGreaterThan(0.1);
  });
});

describe('hardening — invalid inputs', () => {
  it('circularMean null for null', () => expect(circularMean(null)).toBeNull());
  it('circularMean null for empty', () => expect(circularMean([])).toBeNull());
  it('circularVariance null for null', () => expect(circularVariance(null)).toBeNull());
  it('rayleighTest null for null', () => expect(rayleighTest(null)).toBeNull());
  it('watsonU2 null for null', () => expect(watsonU2(null)).toBeNull());
  it('vonMisesMLE null for null', () => expect(vonMisesMLE(null)).toBeNull());
  it('circularCorrelation null for null', () => expect(circularCorrelation(null, [1, 2, 3])).toBeNull());
  it('circularLinearRegression null for null', () => expect(circularLinearRegression(null, [1, 2, 3])).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('circularMean with identical angles returns that angle', () => {
    const r = circularMean([0.5, 0.5, 0.5, 0.5, 0.5]);
    if (r) expect(r.mean).toBeCloseTo(0.5, 2);
  });
  it('circularVariance with highly concentrated angles returns low variance', () => {
    const r = circularVariance([0.5, 0.51, 0.49, 0.5, 0.52]);
    if (r) expect(r.variance).toBeLessThan(0.1);
  });
  it('rayleighTest with concentrated angles has low p', () => {
    const conc = [0.1, 0.12, 0.11, 0.09, 0.13, 0.1, 0.08, 0.12, 0.11, 0.1];
    const r = rayleighTest(conc);
    if (r) expect(r.p).toBeLessThan(0.05);
  });
  it('vonMisesMLE kappa positive for concentrated data', () => {
    const conc = [0.1, 0.12, 0.11, 0.09, 0.13, 0.1, 0.08, 0.12, 0.11, 0.1];
    const r = vonMisesMLE(conc);
    if (r) expect(r.kappa).toBeGreaterThan(1);
  });
  it('circularCorrelation with same angles r near 1', () => {
    const a = [0.1, 0.3, 0.5, 0.4, 0.35, 0.2, 0.45, 0.38, 0.32, 0.48];
    const r = circularCorrelation(a, a);
    if (r) expect(r.r).toBeCloseTo(1, 1);
  });
  it('circularLinearRegression rSquared between 0 and 1', () => {
    const r = circularLinearRegression(angles, angles.map((_, i) => i));
    if (r) { expect(r.rSquared).toBeGreaterThanOrEqual(0); expect(r.rSquared).toBeLessThanOrEqual(1); }
  });
});
