import { describe, it, expect } from 'vitest';
import { bootstrapFilter, auxiliaryPF, importanceSampling, effectiveSampleSizeSMC, multinomialResampleExport, particleMCMC, annealedImportance } from './smc.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const y = [1.2, 2.1, 2.9, 3.8, 5.0, 4.8, 5.9, 7.1, 6.8, 8.0];
const init = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5];

describe('bootstrapFilter', () => {
  it('contract keys', () => expectKeys(bootstrapFilter(y, init), ['test', 'filtered', 'n', 'nParticles', 'apa']));
  it('null <3 obs', () => expect(bootstrapFilter([1, 2], init)).toBeNull());
  it('filtered non-empty', () => { const r = bootstrapFilter(y, init); if (r) expect(r.filtered.length).toBeGreaterThan(0); });
});

describe('auxiliaryPF', () => {
  it('contract keys', () => expectKeys(auxiliaryPF(y, init), ['test', 'filtered', 'n', 'nParticles', 'apa']));
  it('filtered non-empty', () => { const r = auxiliaryPF(y, init); if (r) expect(r.filtered.length).toBeGreaterThan(0); });
  it('nParticles matches', () => { const r = auxiliaryPF(y, init); if (r) expect(r.nParticles).toBe(init.length); });
});

describe('importanceSampling', () => {
  it('contract keys', () => expectKeys(importanceSampling(x => Math.exp(-x * x), [-3, 3], 100), ['test', 'estimate', 'nSamples', 'apa']));
  it('null <10 samples', () => expect(importanceSampling(x => 1, [0, 1], 5)).toBeNull());
  it('estimate finite', () => { const r = importanceSampling(x => Math.exp(-x * x), [-3, 3], 100); expect(Number.isFinite(r.estimate)).toBe(true); });
});

describe('effectiveSampleSizeSMC', () => {
  it('contract keys', () => expectKeys(effectiveSampleSizeSMC([0.1, 0.2, 0.3, 0.2, 0.2]), ['test', 'ess', 'n', 'apa']));
  it('null empty', () => expect(effectiveSampleSizeSMC([])).toBeNull());
  it('ess positive', () => { const r = effectiveSampleSizeSMC([0.1, 0.2, 0.3, 0.2, 0.2]); if (r) expect(r.ess).toBeGreaterThan(0); });
});

describe('multinomialResampleExport', () => {
  it('contract keys', () => expectKeys(multinomialResampleExport([1, 2, 3], [0.3, 0.4, 0.3]), ['test', 'resampled', 'n', 'apa']));
  it('null mismatch', () => expect(multinomialResampleExport([1, 2], [1])).toBeNull());
  it('resampled non-empty', () => { const r = multinomialResampleExport([1, 2, 3], [0.3, 0.4, 0.3]); if (r) expect(r.resampled.length).toBeGreaterThan(0); });
});
describe('particleMCMC', () => {
  const prior = () => [Math.random(), Math.random()];
  const likelihood = (x) => -(x[0]*x[0] + x[1]*x[1]);
  it('contract keys', () => expectKeys(particleMCMC(prior, likelihood, { nParticles: 20, nIter: 5 }), ['test','ess','nParticles','nIter','best','apa']));
  it('null <10 particles', () => expect(particleMCMC(prior, likelihood, { nParticles: 5 })).toBeNull());
  it('ess finite', () => { const r = particleMCMC(prior, likelihood, { nParticles: 20, nIter: 5 }); if (r) expect(Number.isFinite(r.ess)).toBe(true); });
});
describe('annealedImportance', () => {
  const target = (x) => -x * x;
  const proposal = () => Math.random() * 2 - 1;
  it('contract keys', () => expectKeys(annealedImportance(target, proposal, { nSamples: 10 }), ['test','logZ','nSamples','nTemps','apa']));
  it('null <5 samples', () => expect(annealedImportance(target, proposal, { nSamples: 3 })).toBeNull());
  it('logZ finite', () => { const r = annealedImportance(target, proposal, { nSamples: 10 }); if (r) expect(Number.isFinite(r.logZ)).toBe(true); });
});

describe('annealedImportance moves the state and estimates logZ (real AIS)', () => {
  it('recovers the log normalizing constant of a Gaussian target', () => {
    let s = 7; const N = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; const u1 = Math.max(s / 2 ** 32, 1e-9); s = (Math.imul(1664525, s) + 1013904223) >>> 0; const u2 = s / 2 ** 32; return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
    const sigma1 = 2;
    const target = x => -0.5 * x * x / (sigma1 * sigma1);              // log unnormalized N(0, sigma1^2)
    const logBase = x => -0.5 * x * x - 0.5 * Math.log(2 * Math.PI);   // log standard normal density
    const proposal = () => N();                                       // ~ N(0,1)
    const r = annealedImportance(target, proposal, { nSamples: 300, nTemps: 25, logBase, stepSize: 1.5, seed: 3 });
    const trueLogZ = Math.log(Math.sqrt(2 * Math.PI) * sigma1);        // log of int exp(target) = log(sqrt(8pi))
    expect(Math.abs(r.logZ - trueLogZ)).toBeLessThan(0.3);
  });
});

describe('particleMCMC runs a real Metropolis chain (PMMH-style)', () => {
  it('estimates the posterior mean under prior*likelihood', () => {
    let s = 11; const u = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
    const prior = () => [u(), u()];                       // uniform[0,1]^2
    const likelihood = x => -(x[0] * x[0] + x[1] * x[1]); // posterior pulled toward 0
    const r = particleMCMC(prior, likelihood, { nParticles: 40, nIter: 60, seed: 2 });
    // E[x|posterior] = ∫₀¹ x e^{-x²} / ∫₀¹ e^{-x²} ≈ 0.423 per coordinate
    expect(r.posteriorMean[0]).toBeCloseTo(0.423, 1);
    expect(r.posteriorMean[1]).toBeCloseTo(0.423, 1);
  });
});

describe('bootstrapFilter and auxiliaryPF track an independent grid-based (non-Monte-Carlo) Bayes filter (regression test for the auxiliaryPF double-likelihood-weighting fix)', () => {
  const e = ref.smc.grid_filter_basic;
  const N = 3000;
  const wideInit = Array.from({ length: N }, (_, i) => (i / N) * (e.initRangeHigh - e.initRangeLow) + e.initRangeLow);

  it('bootstrapFilter matches the exact grid filter closely at large N', () => {
    const r = bootstrapFilter(e.y, wideInit, { seed: 7, processNoise: 1, obsNoise: 1 });
    e.exactFilteredMeans.forEach((m, i) => expect(Math.abs(r.filtered[i] - m)).toBeLessThan(0.15));
  });

  it('auxiliaryPF matches the exact grid filter closely at large N (previously overshot toward y by up to 0.32 due to reweighting the same predicted particles by their own likelihood twice)', () => {
    const r = auxiliaryPF(e.y, wideInit, { seed: 7, processNoise: 1, obsNoise: 1 });
    e.exactFilteredMeans.forEach((m, i) => expect(Math.abs(r.filtered[i] - m)).toBeLessThan(0.15));
  });
});

describe('hardening — invalid inputs', () => {
  it('bootstrapFilter rejects null/short y', () => {
    expect(bootstrapFilter(null, init)).toBeNull();
    expect(bootstrapFilter([1, 2], init)).toBeNull();
    expect(bootstrapFilter(y, null)).toBeNull();
  });
  it('auxiliaryPF rejects null/short', () => {
    expect(auxiliaryPF(null, init)).toBeNull();
    expect(auxiliaryPF(y, null)).toBeNull();
  });
  it('importanceSampling rejects null target/proposal, too few samples', () => {
    expect(importanceSampling(null, [-3, 3], 100)).toBeNull();
    expect(importanceSampling(x => 1, [-3, 3], 5)).toBeNull();
  });
  it('effectiveSampleSizeSMC rejects null/empty/sum-zero weights', () => {
    expect(effectiveSampleSizeSMC(null)).toBeNull();
    expect(effectiveSampleSizeSMC([])).toBeNull();
    expect(effectiveSampleSizeSMC([0, 0])).toBeNull();
  });
  it('multinomialResampleExport rejects null/mismatch', () => {
    expect(multinomialResampleExport(null, [0.3, 0.4, 0.3])).toBeNull();
    expect(multinomialResampleExport([1, 2], [1])).toBeNull();
    expect(multinomialResampleExport([], [0.5])).toBeNull();
  });
  it('particleMCMC rejects null prior/likelihood, too few particles', () => {
    expect(particleMCMC(null, () => 0)).toBeNull();
    expect(particleMCMC(() => [], null)).toBeNull();
    expect(particleMCMC(() => [], () => 0, { nParticles: 5 })).toBeNull();
  });
  it('annealedImportance rejects null target/proposal, too few samples', () => {
    expect(annealedImportance(null, () => 0)).toBeNull();
    expect(annealedImportance(() => -1, null)).toBeNull();
    expect(annealedImportance(() => -1, () => 0, { nSamples: 3 })).toBeNull();
  });
});

describe('hardening — reproducibility', () => {
  it('bootstrapFilter reproducible with seed', () => {
    const r1 = bootstrapFilter(y, init, { seed: 42 });
    const r2 = bootstrapFilter(y, init, { seed: 42 });
    expect(r1.filtered).toEqual(r2.filtered);
  });
  it('auxiliaryPF reproducible with seed', () => {
    const r1 = auxiliaryPF(y, init, { seed: 42 });
    const r2 = auxiliaryPF(y, init, { seed: 42 });
    expect(r1.filtered).toEqual(r2.filtered);
  });
  it('importanceSampling reproducible with seed', () => {
    const fn = x => Math.exp(-x * x);
    const r1 = importanceSampling(fn, [-3, 3], 100, 42);
    const r2 = importanceSampling(fn, [-3, 3], 100, 42);
    expect(r1.estimate).toBe(r2.estimate);
  });
  it('multinomialResampleExport reproducible with seed', () => {
    const r1 = multinomialResampleExport([1, 2, 3], [0.3, 0.4, 0.3], 42);
    const r2 = multinomialResampleExport([1, 2, 3], [0.3, 0.4, 0.3], 42);
    expect(r1.resampled).toEqual(r2.resampled);
  });
});
