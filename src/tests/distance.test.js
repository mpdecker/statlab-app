import { describe, it, expect } from 'vitest';
import { distanceMatrix, distanceCovariance, distanceCorrelation, energyTest, partialDistanceCorr } from './distance.js';
import { expectKeys } from './__fixtures__/helpers.js';

const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

describe('distanceMatrix', () => {
  it('is defined', () => expect(typeof distanceMatrix).toBe('function'));
});

describe('distanceCovariance', () => {
  it('contract keys', () => expectKeys(distanceCovariance(x, y), ['test', 'dCov', 'n', 'apa']));
  it('null mismatch', () => expect(distanceCovariance(x, [1, 2])).toBeNull());
});

describe('distanceCorrelation', () => {
  it('contract keys', () => expectKeys(distanceCorrelation(x, y), ['test', 'dCorr', 'dCov', 'n', 'apa']));
  it('dCorr in [0,1]', () => { const r = distanceCorrelation(x, y); expect(r.dCorr).toBeGreaterThanOrEqual(0); expect(r.dCorr).toBeLessThanOrEqual(1); });
});

describe('energyTest', () => {
  it('contract keys', () => expectKeys(energyTest(x, y), ['test', 'statistic', 'p', 'nA', 'nB', 'apa']));
  it('null <5', () => expect(energyTest([1, 2], [3, 4, 5])).toBeNull());
});

describe('partialDistanceCorr', () => {
  it('contract keys', () => expectKeys(partialDistanceCorr(x, y, [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]), ['test', 'pdCorr', 'n', 'apa']));
});
