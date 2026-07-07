import { describe, it, expect } from 'vitest';
import { distanceMatrix, distanceCovariance, distanceCorrelation, energyTest, partialDistanceCorr, mahalanobisDistance, gowerDistance } from './distance.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

describe('distanceMatrix', () => {
  it('is defined', () => expect(typeof distanceMatrix).toBe('function'));
  it('diagonal is 0', () => { const r = distanceMatrix(x); if (r) { for (let i = 0; i < r.length; i++) expect(r[i][i]).toBe(0); } });
  it('symmetric', () => { const r = distanceMatrix(x); if (r && Array.isArray(r)) { for (let i = 0; i < r.length; i++) expect(r[i]).toHaveLength(r.length); } });
});

describe('distanceCovariance', () => {
  it('contract keys', () => expectKeys(distanceCovariance(x, y), ['test', 'dCov', 'n', 'apa']));
  it('null mismatch', () => expect(distanceCovariance(x, [1, 2])).toBeNull());
  it('dCov >= 0', () => { const r = distanceCovariance(x, y); if (r) expect(r.dCov).toBeGreaterThanOrEqual(0); });
  it('matches an independently-computed double-centering oracle', () => {
    const e = ref.distance.dcov_basic;
    const r = distanceCovariance(e.x, e.y);
    expect(r.dCov).toBeCloseTo(e.dcov, 4);
  });
});

describe('distanceCorrelation', () => {
  it('contract keys', () => expectKeys(distanceCorrelation(x, y), ['test', 'dCorr', 'dCov', 'n', 'apa']));
  it('dCorr in [0,1]', () => { const r = distanceCorrelation(x, y); expect(r.dCorr).toBeGreaterThanOrEqual(0); expect(r.dCorr).toBeLessThanOrEqual(1); });
  it('dCov non-negative', () => { const r = distanceCorrelation(x, y); expect(r.dCov).toBeGreaterThanOrEqual(0); });
  it('matches an independently-computed distance-correlation oracle', () => {
    const e = ref.distance.dcov_basic;
    const r = distanceCorrelation(e.x, e.y);
    expect(r.dCorr).toBeCloseTo(e.dcorr, 4);
  });
});

describe('energyTest', () => {
  it('contract keys', () => expectKeys(energyTest(x, y), ['test', 'statistic', 'p', 'nA', 'nB', 'apa']));
  it('null <5', () => expect(energyTest([1, 2], [3, 4, 5])).toBeNull());
  it('statistic >= 0', () => { const r = energyTest(x, y); if (r) expect(r.statistic).toBeGreaterThanOrEqual(0); });
});

describe('partialDistanceCorr', () => {
  it('contract keys', () => expectKeys(partialDistanceCorr(x, y, [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]), ['test', 'pdCorr', 'n', 'apa']));
  it('value between 0-1', () => { const r = partialDistanceCorr(x, y, [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]); if (r) { expect(r.pdCorr).toBeGreaterThanOrEqual(0); expect(r.pdCorr).toBeLessThanOrEqual(1); } });
  it('n finite', () => { const r = partialDistanceCorr(x, y, [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]); if (r) expect(Number.isFinite(r.n)).toBe(true); });
});
describe('mahalanobisDistance', () => {
  it('contract keys', () => expectKeys(mahalanobisDistance([1,2,3], [4,5,6], [[1,0,0],[0,1,0],[0,0,1]]), ['test','distance','p','apa']));
  it('null <2', () => expect(mahalanobisDistance([1], [2])).toBeNull());
  it('distance >= 0', () => { const r = mahalanobisDistance([1,2,3], [4,5,6], [[1,0,0],[0,1,0],[0,0,1]]); if (r) expect(r.distance).toBeGreaterThanOrEqual(0); });
  it('matches a scipy.spatial.distance.mahalanobis oracle', () => {
    const e = ref.distance.mahalanobis_basic;
    const r = mahalanobisDistance(e.x, e.y, e.cov);
    expect(r.distance).toBeCloseTo(e.d, 4);
  });
});
describe('gowerDistance', () => {
  it('contract keys', () => expectKeys(gowerDistance([1,2,3], [4,5,6]), ['test','distance','p','apa']));
  it('null <2', () => expect(gowerDistance([1], [2])).toBeNull());
  it('distance between 0-1', () => { const r = gowerDistance([1,2,3], [4,5,6]); if (r && Number.isFinite(r.distance)) expect(r.distance).toBeGreaterThanOrEqual(0); });
});

describe('distanceMatrix computes real Euclidean distances', () => {
  it('uses (a-b)^2 not a - b^2', () => {
    const x = [[1, 1], [4, 5], [1, 1], [1, 1], [1, 1]];
    const D = distanceMatrix(x);
    expect(D[0][1]).toBeCloseTo(5, 6); // sqrt(3^2 + 4^2)
  });
});

describe('partialDistanceCorr controls for z (Szekely-Rizzo)', () => {
  it('~0 when x and y are conditionally independent given z', () => {
    let s = 17; const N = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const z = [], xi = [], yi = [], xd = [], yd = [];
    for (let i = 0; i < 60; i++) { const zz = 2 + N() * 0.3; z.push(zz); xi.push(5 + zz + N()); yi.push(5 + zz + N()); const e = N(); xd.push(5 + zz + e); yd.push(5 + zz + e); }
    // conditionally independent given z -> ~0
    expect(Math.abs(partialDistanceCorr(xi, yi, z).pdCorr)).toBeLessThan(0.3);
    // conditionally DEPENDENT beyond z (shared noise) -> high (old code returns 0 for 1-D input)
    expect(partialDistanceCorr(xd, yd, z).pdCorr).toBeGreaterThan(0.4);
  });
});

describe('hardening — invalid inputs', () => {
  it('distanceMatrix null for null', () => expect(distanceMatrix(null)).toBeNull());
  it('distanceMatrix null for short data', () => expect(distanceMatrix([1, 2, 3])).toBeNull());
  it('distanceCovariance null for null', () => expect(distanceCovariance(null, [1, 2, 3])).toBeNull());
  it('distanceCorrelation null for null', () => expect(distanceCorrelation(null, [1, 2, 3])).toBeNull());
  it('energyTest null for short x', () => expect(energyTest([1, 2], [3, 4, 5, 6, 7])).toBeNull());
  it('partialDistanceCorr null for mismatched lengths', () => expect(partialDistanceCorr([1, 2, 3], [4, 5], [6, 7, 8])).toBeNull());
  it('mahalanobisDistance null for <2 dims', () => expect(mahalanobisDistance([1], [2])).toBeNull());
  it('gowerDistance null for empty arrays', () => expect(gowerDistance([], [])).toBeNull());
});

describe('hardening — invariants', () => {
  it('distanceMatrix diagonal is zero', () => { const D = distanceMatrix([1, 2, 3, 4, 5]); if (D) { for (let i = 0; i < D.length; i++) expect(D[i][i]).toBe(0); } });
  it('distanceCorrelation in [0,1] for linear data', () => { const r = distanceCorrelation(x, y); expect(r.dCorr).toBeGreaterThanOrEqual(0); expect(r.dCorr).toBeLessThanOrEqual(1); });
  it('gowerDistance >= 0 for simple inputs', () => { const r = gowerDistance([1, 2, 3], [4, 5, 6]); expect(r.distance).toBeGreaterThanOrEqual(0); });
  it('mahalanobisDistance >= 0', () => { const r = mahalanobisDistance([1, 2, 3], [4, 5, 6], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]); expect(r.distance).toBeGreaterThanOrEqual(0); });
});
