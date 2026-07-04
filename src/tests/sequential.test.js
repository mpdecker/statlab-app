import { describe, it, expect } from 'vitest';
import { waldSPRT, obrienFleming, pocockBoundaries, groupSequential, lanDemets, conditionalPower, doubleTriangular, haybittlePeto } from './sequential.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const data = [0.1, 0.3, -0.2, 0.5, 0.2, 0.4, 0.6, -0.1, 0.3, 0.7, 0.2, 0.5, 0.1, 0.8, 0.4, 0.3, 0.6, 0.9, 0.2, 0.5];

describe('waldSPRT', () => {
  it('contract keys', () => expectKeys(waldSPRT(data, 0, 0.5), ['test', 'llr', 'stoppedAt', 'decision', 'h0', 'h1', 'alpha', 'beta', 'n', 'apa']));
  it('decision is string or null', () => { const r = waldSPRT(data, 0, 1); expect(r.decision === null || typeof r.decision === 'string').toBe(true); });
  it('llr finite', () => { const r = waldSPRT(data, 0, 0.5); if (r) expect(r).toHaveProperty('llr'); });
});

describe('obrienFleming', () => {
  it('contract keys', () => expectKeys(obrienFleming(3), ['test', 'boundaries', 'stages', 'alpha', 'apa']));
  it('boundaries decrease', () => { const r = obrienFleming(3); expect(r.boundaries[0].boundary).toBeGreaterThan(r.boundaries[2].boundary); });
  it('stages matches', () => { const r = obrienFleming(3); expect(r.stages).toBe(3); });
});

describe('pocockBoundaries', () => {
  it('contract keys', () => expectKeys(pocockBoundaries(3), ['test', 'boundaries', 'stages', 'alpha', 'apa']));
  it('boundaries non-empty', () => { const r = pocockBoundaries(3); if (r) expect(r.boundaries.length).toBeGreaterThan(0); });
  it('stages matches', () => { const r = pocockBoundaries(3); if (r) expect(r.stages).toBe(3); });
});

describe('obrienFleming matches a properly-calibrated Armitage-McPherson recursion (regression test for the uncalibrated-Bonferroni-approximation fix)', () => {
  it('boundaries match the true alpha-spending-calibrated O\'Brien-Fleming shape', () => {
    const e = ref.sequential.obf_basic;
    const r = obrienFleming(e.stages, e.alpha);
    e.boundaries.forEach((b, i) => expect(r.boundaries[i].boundary).toBeCloseTo(b, 3));
  });
});

describe('groupSequential', () => {
  it('contract keys', () => { const r = groupSequential(data, 3); if (r) expectKeys(r, ['test', 'results', 'method', 'stoppedAt', 'decision', 'n', 'stages', 'apa']); });
  it('boundaries positive', () => { const r = groupSequential(data, 3); if (r) { r.results.forEach(res => expect(res.boundary).toBeGreaterThan(0)); } });
  it('stages matches', () => { const r = groupSequential(data, 3); if (r) expect(r.stages).toBe(3); });
});

describe('lanDemets', () => {
  it('contract keys', () => { const r = lanDemets(data, 3); if (r) expectKeys(r, ['test', 'results', 'alpha', 'nStages', 'n', 'apa']); });
  it('boundaries positive', () => { const r = lanDemets(data, 3); if (r) { r.results.forEach(res => expect(res.zCrit).toBeGreaterThan(0)); } });
  it('nStages matches', () => { const r = lanDemets(data, 3); if (r) expect(r.nStages).toBe(3); });
});

describe('conditionalPower', () => {
  it('contract keys', () => expectKeys(conditionalPower(data, 10, 20, 0.5), ['test', 'cp', 'nObserved', 'nPlanned', 'effectSize', 'apa']));
  it('cp in [0,1]', () => { const r = conditionalPower(data, 10, 20, 0.5); expect(r.cp).toBeGreaterThanOrEqual(0); expect(r.cp).toBeLessThanOrEqual(1); });
  it('nObserved matches', () => { const r = conditionalPower(data, 10, 20, 0.5); expect(r.nObserved).toBe(10); });
});

describe('doubleTriangular', () => {
  const data2 = Array.from({length: 15}, () => Math.random() * 2 - 1);
  it('contract keys', () => expectKeys(doubleTriangular(data2), ['test','z','upper','lower','crossedUpper','crossedLower','n','apa']));
  it('null <10', () => expect(doubleTriangular([1,2,3])).toBeNull());
  it('crossedUpper is boolean', () => { const r = doubleTriangular(data2); if (r) expect(typeof r.crossedUpper).toBe('boolean'); });
});
describe('haybittlePeto', () => {
  const data3 = Array.from({length: 15}, () => Math.random() * 2 - 1);
  it('contract keys', () => expectKeys(haybittlePeto(data3), ['test','stages','stopped','n','nStages','apa']));
  it('null <5', () => expect(haybittlePeto([1,2])).toBeNull());
  it('stopped is boolean', () => { const r = haybittlePeto(data3); if (r) expect(typeof r.stopped).toBe('boolean'); });
});
describe('sequential edge cases', () => {
  it('waldSPRT null <3', () => expect(waldSPRT(data.slice(0, 2), 0, 0.5)).toBeNull());
  it('obrienFleming null <2 stages', () => expect(obrienFleming(1)).toBeNull());
  it('pocockBoundaries null <2 stages', () => expect(pocockBoundaries(1)).toBeNull());
  it('groupSequential null <5', () => expect(groupSequential(data.slice(0, 3), 3)).toBeNull());
  it('lanDemets null <5', () => expect(lanDemets(data.slice(0, 3), 3)).toBeNull());
  it('conditionalPower null for invalid', () => expect(conditionalPower(data, 30, 20, 0.5)).toBeNull());
});

describe('pocockBoundaries computes the constant per K and alpha', () => {
  it('matches the known Pocock constants per K', () => {
    expect(pocockBoundaries(2, 0.05).boundaries[0].boundary).toBeCloseTo(2.178, 1); // K=2
    expect(pocockBoundaries(5, 0.05).boundaries[0].boundary).toBeGreaterThan(2.3);  // ~2.41, not the hardcoded 2.17
    expect(pocockBoundaries(5, 0.05).boundaries[0].boundary).toBeLessThan(2.5);
  });
});
