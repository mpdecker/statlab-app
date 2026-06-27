import { describe, it, expect } from 'vitest';
import { circularMean, circularVariance, rayleighTest, watsonU2, vonMisesMLE, circularCorrelation, circularLinearRegression } from './circular.js';
import { expectKeys } from './__fixtures__/helpers.js';

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
