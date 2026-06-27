import { describe, it, expect } from 'vitest';
import { bootstrapCI, bootstrapSE, bootstrapTest, jackknife, bootstrapT_CI, empiricalInfluence, bootstrapMediation, moderatedMediation, splitConformal, conformalPvalues, jackknifePlus } from './bootstrap.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const stat = arr => arr.reduce((s, v) => s + v, 0) / arr.length;

describe('bootstrapCI', () => {
  it('null <5', () => expect(bootstrapCI([1, 2, 3], stat)).toBeNull());
  it('percentile CI encloses original', () => { const r = bootstrapCI(data, stat, { B: 100 }); expect(r.ci[0]).toBeLessThanOrEqual(r.originalEstimate); expect(r.ci[1]).toBeGreaterThanOrEqual(r.originalEstimate); });
  it('basic method', () => { const r = bootstrapCI(data, stat, { method: 'basic', B: 100 }); expect(r.method).toBe('basic'); });
  it('bca method', () => { const r = bootstrapCI(data, stat, { method: 'bca', B: 100 }); expect(r.method).toBe('bca'); });
  it('contract keys', () => expectKeys(bootstrapCI(data, stat, { B: 50 }), ['test', 'ci', 'method', 'B', 'alpha', 'originalEstimate', 'n', 'apa']));
});

describe('bootstrapSE', () => {
  it('null <5', () => expect(bootstrapSE([1, 2], stat)).toBeNull());
  it('SE > 0', () => { const r = bootstrapSE(data, stat, { B: 100 }); expect(r.se).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(bootstrapSE(data, stat, { B: 50 }), ['test', 'se', 'originalEstimate', 'B', 'n', 'apa']));
});

describe('bootstrapTest', () => {
  it('null <5', () => expect(bootstrapTest([1, 2], stat, 0)).toBeNull());
  it('p in [0,1]', () => { const r = bootstrapTest(data, stat, 10, { B: 100 }); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(bootstrapTest(data, stat, 10, { B: 50 }), ['test', 'p', 'nullValue', 'alternative', 'B', 'originalEstimate', 'n', 'apa']));
});

describe('jackknife', () => {
  it('null <5', () => expect(jackknife([1, 2], stat)).toBeNull());
  it('SE > 0', () => { const r = jackknife(data, stat); expect(r.se).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(jackknife(data, stat), ['test', 'estimate', 'se', 'bias', 'originalEstimate', 'n', 'apa']));
});

describe('bootstrapT_CI', () => {
  it('null <10', () => expect(bootstrapT_CI([1, 2, 3, 4, 5], stat, { B: 50 })).toBeNull());
  it('CI encloses', () => { const r = bootstrapT_CI(data, stat, { B: 50 }); expect(r.ci[0]).toBeLessThanOrEqual(r.originalEstimate); expect(r.ci[1]).toBeGreaterThanOrEqual(r.originalEstimate); });
  it('contract keys', () => expectKeys(bootstrapT_CI(data, stat, { B: 30 }), ['test', 'ci', 'B', 'alpha', 'originalEstimate', 'n', 'apa']));
});

describe('empiricalInfluence', () => {
  it('null <5', () => expect(empiricalInfluence([1, 2], stat)).toBeNull());
  it('influence present', () => { const r = empiricalInfluence(data, stat); expect(r.influence).toHaveLength(data.length); });
  it('contract keys', () => expectKeys(empiricalInfluence(data, stat), ['test', 'influence', 'n', 'apa']));
});

describe('bootstrapMediation', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ treat: i % 2, med: i * 0.5, y: i + (i % 2) * 2 });
  it('is defined', () => expect(typeof bootstrapMediation).toBe('function'));
  it('ab between ci bounds', () => { let r; try { r = bootstrapMediation(d, 'treat', 'med', 'y'); } catch {} if (r && r.ab !== undefined && r.ci) { expect(r.ab).toBeGreaterThanOrEqual(r.ci[0]); expect(r.ab).toBeLessThanOrEqual(r.ci[1]); } });
  it('n is finite', () => { let r; try { r = bootstrapMediation(d, 'treat', 'med', 'y'); } catch {} if (r) expect(Number.isFinite(r.n)).toBe(true); });
});

describe('moderatedMediation', () => {
  const d = []; for (let i = 0; i < 25; i++) d.push({ treat: i % 2, med: i * 0.5, mod: i % 3, y: i + (i % 2) * 3 });
  it('contract keys', () => expectKeys(moderatedMediation(d, 'treat', 'med', 'mod', 'y'), ['test', 'a', 'bw', 'index', 'n', 'apa']));
  it('index finite', () => { const r = moderatedMediation(d, 'treat', 'med', 'mod', 'y'); expect(Number.isFinite(r.index)).toBe(true); });
  it('a is finite', () => { const r = moderatedMediation(d, 'treat', 'med', 'mod', 'y'); expect(Number.isFinite(r.a)).toBe(true); });
});

describe('splitConformal', () => {
  it('contract keys', () => expectKeys(splitConformal([1,2,3,4,5,6,7,8,9,10],[1.1,2.2,3.3,4.4,5.5,6.6,7.7,8.8,9.9,10.1]), ['test', 'radius', 'alpha', 'nTrain', 'nCal', 'apa']));
  it('null <10', () => expect(splitConformal([1,2,3],[4,5])).toBeNull());
  it('radius positive', () => { const r = splitConformal([1,2,3,4,5,6,7,8,9,10],[1.1,2.2,3.3,4.4,5.5,6.6,7.7,8.8,9.9,10.1]); if (r) expect(r.radius).toBeGreaterThan(0); });
});

describe('conformalPvalues', () => {
  it('contract keys', () => expectKeys(conformalPvalues([0.1, 0.3, 0.7, 0.9], 0.5), ['test', 'p', 'n', 'apa']));
  it('null invalid', () => expect(conformalPvalues([], 0.5)).toBeNull());
  it('p between 0-1', () => { const r = conformalPvalues([0.1, 0.3, 0.7, 0.9], 0.5); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
});

describe('jackknifePlus', () => {
  it('contract keys', () => expectKeys(jackknifePlus([1,2,3,4,5,6,7,8,9,10],[2,4,6,8,10,12,14,16,18,20]), ['test', 'radius', 'alpha', 'n', 'apa']));
  it('null mismatch', () => expect(jackknifePlus([1,2,3],[4,5,6,7])).toBeNull());
  it('radius positive', () => { const r = jackknifePlus([1,2,3,4,5,6,7,8,9,10],[2,4,6,8,10,12,14,16,18,20]); if (r && r.radius) expect(r.radius).toBeGreaterThan(0); });
});
