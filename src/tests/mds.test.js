import { describe, it, expect } from 'vitest';
import { classicalMDS, sammonMapping, nonMetricMDS, sammonMappingDM, landmarkMDS } from './mds.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = []; for (let i = 0; i < 12; i++) data.push({ x1: i, x2: i * 0.5, x3: Math.sin(i), x4: i % 3 });

describe('classicalMDS', () => {
  it('null <5', () => expect(classicalMDS(data.slice(0, 3), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(classicalMDS(data, ['x1', 'x2', 'x3', 'x4']), ['test', 'points', 'nDimensions', 'stress', 'n', 'apa']));
  it('points correct count', () => { const r = classicalMDS(data, ['x1', 'x2']); expect(r.points).toHaveLength(data.length); });
  it('stress >= 0', () => { const r = classicalMDS(data, ['x1', 'x2']); expect(r.stress).toBeGreaterThanOrEqual(0); });
  it('points have correct dimensions', () => { const r = classicalMDS(data, ['x1', 'x2']); if (r && r.points && r.points[0]) expect(r.points[0]).toHaveLength(2); });
});

describe('sammonMapping', () => {
  it('null <5', () => expect(sammonMapping(data.slice(0, 3), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(sammonMapping(data, ['x1', 'x2']), ['test', 'points', 'nDimensions', 'n', 'apa']));
  it('points correct count', () => { const r = sammonMapping(data, ['x1', 'x2']); expect(r.points).toHaveLength(data.length); });
  it('stress >= 0', () => { const r = sammonMapping(data, ['x1', 'x2']); if (r && r.stress !== undefined) expect(r.stress).toBeGreaterThanOrEqual(0); });
});

describe('nonMetricMDS', () => {
  it('null <6', () => expect(nonMetricMDS(data.slice(0, 4), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(nonMetricMDS(data, ['x1', 'x2']), ['test', 'points', 'nDimensions', 'stress', 'n', 'apa']));
  it('stress >= 0', () => { const r = nonMetricMDS(data, ['x1', 'x2']); expect(r.stress).toBeGreaterThanOrEqual(0); });
  it('points array present', () => { const r = nonMetricMDS(data, ['x1', 'x2']); if (r) expect(Array.isArray(r.points)).toBe(true); });
});

describe('sammonMapping', () => {
  const D = [[0,3,4],[3,0,5],[4,5,0]];
  it('contract keys', () => expectKeys(sammonMappingDM(D, { maxIter: 10 }), ['test','points','stress','n','apa']));
  it('null <3', () => expect(sammonMappingDM([[0,1],[1,0]])).toBeNull());
  it('stress >= 0', () => { const r = sammonMappingDM(D, { maxIter: 10 }); if (r) expect(r.stress).toBeGreaterThanOrEqual(0); });
});
describe('landmarkMDS', () => {
  const D = [[0,3,4,2,5],[3,0,5,4,1],[4,5,0,3,2],[2,4,3,0,4],[5,1,2,4,0]];
  it('contract keys', () => expectKeys(landmarkMDS(D, { nLandmarks: 3 }), ['test','points','nLandmarks','n','apa']));
  it('null too small', () => expect(landmarkMDS([[0,1],[1,0]])).toBeNull());
  it('n points equals input', () => { const D2 = [[0,3,4,2,5],[3,0,5,4,1],[4,5,0,3,2],[2,4,3,0,4],[5,1,2,4,0]]; const r = landmarkMDS(D2, { nLandmarks: 3 }); if (r && r.points && r.n) expect(r.points.length).toBe(r.n); });
});

describe('sammonMappingDM', () => {
  const D = [[0,3,4],[3,0,5],[4,5,0]];
  it('contract keys', () => { const r = sammonMappingDM(D, { maxIter: 5 }); if (r) expectKeys(r, ['test','points','stress','n','apa']); });
  it('stress non-negative', () => { const r = sammonMappingDM(D, { maxIter: 5 }); if (r) expect(r.stress).toBeGreaterThanOrEqual(0); });
  it('points has n rows', () => { const r = sammonMappingDM(D, { maxIter: 5 }); if (r) expect(r.points.length).toBe(D.length); });
  it('null for small D', () => expect(sammonMappingDM([[0,1],[1,0]], { maxIter: 5 })).toBeNull());
});
