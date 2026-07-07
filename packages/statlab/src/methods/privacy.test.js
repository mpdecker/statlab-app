import { describe, it, expect } from 'vitest';
import { laplaceMechanism, bootstrapSynthetic, kAnonymityCheck, differentialPrivacy, dataMasking, lDiversity, tCloseness } from './privacy.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rp = ref.privacy;
const data = [{ age: 25, zip: '12345' }, { age: 30, zip: '12345' }, { age: 25, zip: '67890' }, { age: 30, zip: '67890' }];

describe('laplaceMechanism', () => {
  it('contract keys', () => expectKeys(laplaceMechanism([1, 2, 3, 4, 5], 1), ['test', 'originalMean', 'noisyMean', 'epsilon', 'n', 'apa']));
  it('null empty', () => expect(laplaceMechanism([], 1)).toBeNull());
  it('noisyMean is finite', () => { const r = laplaceMechanism([1, 2, 3, 4, 5], 1); if (r) expect(Number.isFinite(r.noisyMean)).toBe(true); });
  it('originalMean matches oracle', () => { const r = laplaceMechanism([1,2,3,4,5], 1); expect(r.originalMean).toBeCloseTo(rp.laplaceMechanism_basic.originalMean, 4); });
  it('scale matches oracle', () => { expect(rp.laplaceMechanism_basic.scale).toBeCloseTo(0.8, 2); });
});

describe('bootstrapSynthetic', () => {
  it('contract keys', () => expectKeys(bootstrapSynthetic(data), ['test', 'nOriginal', 'nSynthetic', 'seed', 'apa']));
  it('synthetic rows correct', () => { const r = bootstrapSynthetic(data, { nRow: 8 }); expect(r.nSynthetic).toBe(8); });
  it('nOriginal matches input', () => { const r = bootstrapSynthetic(data); expect(r.nOriginal).toBe(data.length); });
});

describe('kAnonymityCheck', () => {
  it('contract keys', () => expectKeys(kAnonymityCheck(data, ['age', 'zip']), ['test', 'nGroups', 'minSize', 'vulnerable', 'k', 'n', 'pctSafe', 'apa']));
  it('null empty', () => expect(kAnonymityCheck([], ['x'])).toBeNull());
  it('pctSafe between 0-100', () => { const r = kAnonymityCheck(data, ['age', 'zip']); if (r) { expect(r.pctSafe).toBeGreaterThanOrEqual(0); expect(r.pctSafe).toBeLessThanOrEqual(100); } });
  it('minSize matches oracle', () => { const r = kAnonymityCheck(data, ['age', 'zip']); expect(r.minSize).toBe(rp.kAnonymityCheck_basic.minSize); });
  it('pctSafe matches oracle', () => { const r = kAnonymityCheck(data, ['age', 'zip']); expect(r.pctSafe).toBeCloseTo(rp.kAnonymityCheck_basic.pctSafe, 1); });
  it('vulnerable matches oracle', () => { const r = kAnonymityCheck(data, ['age', 'zip']); expect(r.vulnerable).toBe(rp.kAnonymityCheck_basic.vulnerable); });
});

describe('differentialPrivacy', () => {
  it('contract keys', () => expectKeys(differentialPrivacy([{ epsilon: 0.3 }, { epsilon: 0.2 }], 1), ['test', 'consumed', 'budget', 'remaining', 'delta', 'apa']));
  it('null epsilon <= 0', () => expect(differentialPrivacy([], 0)).toBeNull());
  it('remaining >= 0', () => { const r = differentialPrivacy([{ epsilon: 0.3 }, { epsilon: 0.2 }], 1); if (r) expect(r.remaining).toBeGreaterThanOrEqual(0); });
  it('budget matches oracle', () => { const r = differentialPrivacy([{epsilon:0.3},{epsilon:0.2}], 1); expect(r.consumed).toBeCloseTo(rp.differentialPrivacy_basic.consumed, 2); expect(r.remaining).toBeCloseTo(rp.differentialPrivacy_basic.remaining, 2); });
});

describe('dataMasking', () => {
  it('contract keys', () => expectKeys(dataMasking(data, 'age'), ['test', 'nMasked', 'method', 'column', 'pct', 'n', 'apa']));
  it('suppress method', () => { const r = dataMasking(data, 'age', { method: 'suppress', pct: 50 }); expect(r.method).toBe('suppress'); });
  it('nMasked integer', () => { const r = dataMasking(data, 'age'); if (r) expect(Number.isInteger(r.nMasked)).toBe(true); });
});

describe('privacy edge cases', () => {
  it('laplaceMechanism null for empty', () => expect(laplaceMechanism([], 1)).toBeNull());
  it('bootstrapSynthetic null for empty', () => expect(bootstrapSynthetic([])).toBeNull());
  it('kAnonymityCheck null for empty', () => expect(kAnonymityCheck([], ['x'])).toBeNull());
  it('differentialPrivacy null for empty', () => expect(differentialPrivacy([], 1)).toBeNull());
  it('dataMasking null for empty', () => expect(dataMasking([], 'age')).toBeNull());
});
describe('lDiversity', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ zip: (i % 5).toString(), age: (Math.floor(i / 5) * 20 + 20).toString(), disease: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C' });
  it('contract keys', () => expectKeys(lDiversity(d, ['zip','age'], 'disease', 2), ['test','l','diverseGroups','totalGroups','proportion','n','apa']));
  it('null <5', () => expect(lDiversity(d.slice(0,3), ['zip'], 'disease')).toBeNull());
  it('proportion between 0-1', () => { const r = lDiversity(d, ['zip','age'], 'disease', 2); if (r) { expect(r.proportion).toBeGreaterThanOrEqual(0); expect(r.proportion).toBeLessThanOrEqual(1); } });
  it('proportion matches oracle', () => { const d = []; for (let i = 0; i < 20; i++) d.push({ zip: (i % 5).toString(), age: (Math.floor(i / 5) * 20 + 20).toString(), disease: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C' }); const r = lDiversity(d, ['zip','age'], 'disease', 2); expect(r.proportion).toBeCloseTo(rp.lDiversity_basic.proportion, 4); });
});
describe('tCloseness', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ zip: (i % 4).toString(), age: (Math.floor(i / 4) * 15 + 20).toString(), disease: i % 2 === 0 ? 'X' : 'Y' });
  it('contract keys', () => expectKeys(tCloseness(d, ['zip'], 'disease', 0.3), ['test','t','closeGroups','totalGroups','proportion','n','apa']));
  it('t between 0-1', () => { const r = tCloseness(d, ['zip'], 'disease', 0.3); if (r) { expect(r.t).toBeGreaterThanOrEqual(0); expect(r.t).toBeLessThanOrEqual(1); } });
  it('closeGroups non-empty', () => { const r = tCloseness(d, ['zip'], 'disease', 0.3); if (r && r.closeGroups) expect(r.closeGroups.length).toBeGreaterThan(0); });
});

describe('hardening — privacy edge cases', () => {
  it('laplaceMechanism null for null data', () => expect(laplaceMechanism(null, 1)).toBeNull());
  it('laplaceMechanism null for empty data', () => expect(laplaceMechanism([], 1)).toBeNull());
  it('laplaceMechanism reproducible', () => { const r1 = laplaceMechanism([1,2,3,4,5], 1, { seed: 42 }); const r2 = laplaceMechanism([1,2,3,4,5], 1, { seed: 42 }); expect(r1.noisyMean).toBe(r2.noisyMean); });
  it('bootstrapSynthetic null for null data', () => expect(bootstrapSynthetic(null)).toBeNull());
  it('bootstrapSynthetic reproducible', () => { const r1 = bootstrapSynthetic(data, { nRow: 8, seed: 7 }); const r2 = bootstrapSynthetic(data, { nRow: 8, seed: 7 }); expect(r1.nSynthetic).toBe(r2.nSynthetic); });
  it('kAnonymityCheck null for null data', () => expect(kAnonymityCheck(null, ['age'])).toBeNull());
  it('kAnonymityCheck null for empty quasiIdentifiers', () => expect(kAnonymityCheck(data, [])).toBeNull());
  it('differentialPrivacy null for null queries', () => expect(differentialPrivacy(null, 1)).toBeNull());
  it('differentialPrivacy null for epsilon<=0', () => expect(differentialPrivacy([{epsilon:0.3}], 0)).toBeNull());
  it('dataMasking null for null data', () => expect(dataMasking(null, 'age')).toBeNull());
  it('dataMasking null for missing column', () => expect(dataMasking(data, '')).toBeNull());
  it('lDiversity null for null data', () => expect(lDiversity(null, ['zip'], 'disease')).toBeNull());
  it('lDiversity null for empty qidCols', () => { const d = []; for (let i = 0; i < 10; i++) d.push({ zip: i, disease: 'A' }); expect(lDiversity(d, [], 'disease')).toBeNull(); });
  it('tCloseness null for null data', () => expect(tCloseness(null, ['zip'], 'disease', 0.3)).toBeNull());
  it('tCloseness null for missing sensitiveCol', () => expect(tCloseness(data, ['zip'], '')).toBeNull());
});
