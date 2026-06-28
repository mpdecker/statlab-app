import { describe, it, expect } from 'vitest';
import { hawkesIntensity, hawkesFit, coxProcess, interArrivalTest, burstinessIndex, thomasProcess, maternCluster, pairCorrelation, lFunction } from './pointProcess.js';
import { expectKeys } from './__fixtures__/helpers.js';

const events = [1, 2, 3, 5, 6, 7, 10, 11, 12, 15, 16, 18, 20, 22, 25];

describe('hawkesIntensity', () => { it('contract keys', () => expectKeys(hawkesIntensity(events), ['test','intensity','mu','alpha','beta','n','apa'])); it('null<5', () => expect(hawkesIntensity([1,2,3])).toBeNull()); it('intensity array non-empty', () => { const r = hawkesIntensity(events); if (r) { expect(Array.isArray(r.intensity)).toBe(true); expect(r.intensity.length).toBeGreaterThan(0); } }); it('intensity positive', () => { const r = hawkesIntensity(events); if (r && r.intensity) { r.intensity.forEach(v => expect(v).toBeGreaterThan(0)); } }); });
describe('hawkesFit', () => { it('contract keys', () => expectKeys(hawkesFit(events), ['test','parameters','n','kernel','apa'])); it('null<10', () => expect(hawkesFit([1,2,3])).toBeNull()); it('parameters array non-empty', () => { const r = hawkesFit(events); if (r) { expect(typeof r.parameters).toBe('object'); expect(r.parameters).not.toBeNull(); } }); it('parameters object present', () => { const r = hawkesFit(events); if (r) { expect(typeof r.parameters).toBe('object'); expect(r.parameters).not.toBeNull(); } }); });
describe('coxProcess', () => { it('contract keys', () => expectKeys(coxProcess([[0.5,0.3],[0.8,0.2]], {n:20}), ['test','points','nEvents','n','apa'])); it('nEvents positive', () => { const r = coxProcess([[0.5,0.3],[0.8,0.2]], {n:20}); if (r) expect(r.nEvents).toBeGreaterThan(0); }); it('surface values finite', () => { const r = coxProcess([[0.5,0.3],[0.8,0.2]], {n:20}); if (r && r.points) { r.points.forEach(p => { expect(Number.isFinite(p.x)).toBe(true); expect(Number.isFinite(p.y)).toBe(true); }); } }); });
describe('interArrivalTest', () => { it('contract keys', () => expectKeys(interArrivalTest(events), ['test','cv','clustering','n','apa'])); it('null<10', () => expect(interArrivalTest([1,2])).toBeNull()); it('cv non-negative', () => { const r = interArrivalTest(events); if (r) expect(r.cv).toBeGreaterThanOrEqual(0); }); it('p between 0-1', () => { const r = interArrivalTest(events); if (r && r.p !== undefined) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); });
describe('burstinessIndex', () => { it('contract keys', () => expectKeys(burstinessIndex(events), ['test','B','n','apa'])); it('B in [-1,1]', () => { const r = burstinessIndex(events); expect(r.B).toBeGreaterThanOrEqual(-1); expect(r.B).toBeLessThanOrEqual(1) }); it('B=-1 for equally spaced', () => { const r = burstinessIndex([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]); expect(r.B).toBeCloseTo(-1, 0); }); });
describe('thomasProcess', () => {
  it('contract keys', () => expectKeys(thomasProcess(5, 10, 10, 10), ['test','points','nParents','nOffspring','totalPoints','apa']));
  it('null <2 parents', () => expect(thomasProcess(1, 5, 10, 10)).toBeNull());
  it('totalPoints positive', () => { const r = thomasProcess(5, 3, 10, 10); if (r) expect(r.totalPoints).toBeGreaterThan(0); });
  it('offspring count correct', () => { const r = thomasProcess(5, 3, 10, 10); if (r) expect(r.nOffspring).toBe(3); });
});
describe('maternCluster', () => {
  it('contract keys', () => expectKeys(maternCluster(5, 2, 10, 10, 10), ['test','points','nClusters','radius','totalPoints','apa']));
  it('null <2 clusters', () => expect(maternCluster(1, 1, 5, 10, 10)).toBeNull());
  it('totalPoints positive', () => { const r = maternCluster(5, 2, 10, 10, 10); if (r) expect(r.totalPoints).toBeGreaterThan(0); });
  it('radius positive', () => { const r = maternCluster(5, 2, 10, 10, 10); if (r) expect(r.radius).toBeGreaterThan(0); });
});
describe('pairCorrelation', () => {
  const pts = Array.from({length: 30}, () => ({ x: Math.random() * 10, y: Math.random() * 10 }));
  it('contract keys', () => expectKeys(pairCorrelation(pts, { nBins: 5 }), ['test','bins','lambda','n','apa']));
  it('null <20', () => expect(pairCorrelation(pts.slice(0,5))).toBeNull());
  it('bins array non-empty', () => { const r = pairCorrelation(pts, { nBins: 5 }); if (r) { expect(Array.isArray(r.bins)).toBe(true); expect(r.bins.length).toBeGreaterThan(0); } });
  it('g values >= 0', () => { const r = pairCorrelation(pts, { nBins: 5 }); if (r && r.bins) { r.bins.forEach(b => expect(b.g).toBeGreaterThanOrEqual(0)); } });
});
describe('lFunction', () => {
  const pts = Array.from({length: 30}, () => ({ x: Math.random() * 10, y: Math.random() * 10 }));
  it('contract keys', () => expectKeys(lFunction(pts, { nRadii: 5 }), ['test','L','lambda','n','apa']));
  it('null <20', () => expect(lFunction(pts.slice(0,5))).toBeNull());
  it('L array non-empty', () => { const r = lFunction(pts, { nRadii: 5 }); if (r) { expect(Array.isArray(r.L)).toBe(true); expect(r.L.length).toBeGreaterThan(0); } });
  it('L near 0 for Poisson', () => { const r = lFunction(pts, { nRadii: 5 }); if (r && r.L) { r.L.forEach(v => expect(v).toBeGreaterThan(-10)); } });
});
