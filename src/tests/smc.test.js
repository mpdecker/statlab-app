import { describe, it, expect } from 'vitest';
import { bootstrapFilter, auxiliaryPF, importanceSampling, effectiveSampleSizeSMC, multinomialResampleExport, particleMCMC, annealedImportance } from './smc.js';
import { expectKeys } from './__fixtures__/helpers.js';

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
