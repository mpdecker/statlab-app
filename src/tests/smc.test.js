import { describe, it, expect } from 'vitest';
import { bootstrapFilter, auxiliaryPF, importanceSampling, effectiveSampleSizeSMC, multinomialResampleExport } from './smc.js';
import { expectKeys } from './__fixtures__/helpers.js';

const y = [1.2, 2.1, 2.9, 3.8, 5.0, 4.8, 5.9, 7.1, 6.8, 8.0];
const init = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5];

describe('bootstrapFilter', () => {
  it('contract keys', () => expectKeys(bootstrapFilter(y, init), ['test', 'filtered', 'n', 'nParticles', 'apa']));
  it('null <3 obs', () => expect(bootstrapFilter([1, 2], init)).toBeNull());
});

describe('auxiliaryPF', () => {
  it('contract keys', () => expectKeys(auxiliaryPF(y, init), ['test', 'filtered', 'n', 'nParticles', 'apa']));
});

describe('importanceSampling', () => {
  it('contract keys', () => expectKeys(importanceSampling(x => Math.exp(-x * x), [-3, 3], 100), ['test', 'estimate', 'nSamples', 'apa']));
  it('null <10 samples', () => expect(importanceSampling(x => 1, [0, 1], 5)).toBeNull());
});

describe('effectiveSampleSizeSMC', () => {
  it('contract keys', () => expectKeys(effectiveSampleSizeSMC([0.1, 0.2, 0.3, 0.2, 0.2]), ['test', 'ess', 'n', 'apa']));
  it('null empty', () => expect(effectiveSampleSizeSMC([])).toBeNull());
});

describe('multinomialResampleExport', () => {
  it('contract keys', () => expectKeys(multinomialResampleExport([1, 2, 3], [0.3, 0.4, 0.3]), ['test', 'resampled', 'n', 'apa']));
  it('null mismatch', () => expect(multinomialResampleExport([1, 2], [1])).toBeNull());
});
