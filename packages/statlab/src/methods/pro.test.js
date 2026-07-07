import { describe, it, expect } from 'vitest';
import { reliableChangeIndex, minimalImportantDifference, responderAnalysis, eq5dIndex, standardizedResponseMean, clinicalTrialsGov, consortChecklist } from './pro.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rp = ref.pro;
const baseline = [10, 12, 15, 11, 14, 16, 13, 12];
const followUp = [8, 14, 18, 9, 16, 15, 11, 14];

describe('reliableChangeIndex', () => {
  it('contract keys', () => expectKeys(reliableChangeIndex(baseline, followUp), ['test', 'rci', 'se', 'n', 'nImproved', 'nDeteriorated', 'apa']));
  it('null <3', () => expect(reliableChangeIndex([1, 2], [3, 4])).toBeNull());
  it('se positive', () => { const r = reliableChangeIndex(baseline, followUp); if (r) expect(r.se).toBeGreaterThan(0); });
  it('se matches oracle', () => { const r = reliableChangeIndex(baseline, followUp); expect(r.se).toBeCloseTo(rp.reliableChangeIndex_basic.se, 4); });
  it('counts match oracle', () => { const r = reliableChangeIndex(baseline, followUp); expect(r.nImproved).toBe(rp.reliableChangeIndex_basic.nImproved); expect(r.nDeteriorated).toBe(rp.reliableChangeIndex_basic.nDeteriorated); });
});

describe('minimalImportantDifference', () => {
  it('contract keys', () => expectKeys(minimalImportantDifference(baseline, [1, 2, 3, 1, 2, 3, 2, 1]), ['test', 'mid', 'n', 'nLow', 'nHigh', 'apa']));
  it('null <5', () => expect(minimalImportantDifference([1, 2], [1, 2])).toBeNull());
  it('mid finite', () => { const r = minimalImportantDifference(baseline, [1, 2, 3, 1, 2, 3, 2, 1]); if (r) expect(Number.isFinite(r.mid)).toBe(true); });
  it('mid matches oracle', () => { const r = minimalImportantDifference(baseline, [1,2,3,1,2,3,2,1]); expect(r.mid).toBeCloseTo(rp.minimalImportantDifference_basic.mid, 4); });
});

describe('responderAnalysis', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ pre: i * 2, post: i * 2 + 5 + (i % 3) });
  it('contract keys', () => expectKeys(responderAnalysis(d, 'pre', 'post', 3), ['test', 'n', 'responders', 'pct', 'threshold', 'apa']));
  it('with groupVar', () => { const r = responderAnalysis(d, 'pre', 'post', 3, { groupVar: 'grp' }); expect(r).toHaveProperty('byGroup'); });
  it('pct between 0-100', () => { const r = responderAnalysis(d, 'pre', 'post', 3); if (r) { expect(r.pct).toBeGreaterThanOrEqual(0); expect(r.pct).toBeLessThanOrEqual(100); } });
  it('counts match oracle', () => {
    const d = []; for (let i = 0; i < 20; i++) d.push({ pre: i * 2, post: i * 2 + 5 + (i % 3) });
    const r = responderAnalysis(d, 'pre', 'post', 3);
    expect(r.responders).toBe(rp.responderAnalysis_basic.responders);
  });
});

describe('eq5dIndex', () => {
  it('contract keys', () => expectKeys(eq5dIndex([1, 2, 1, 3, 2]), ['test', 'index', 'domains', 'country', 'apa']));
  it('null <5', () => expect(eq5dIndex([1, 2, 3])).toBeNull());
  it('index between 0-1', () => { const r = eq5dIndex([1, 2, 1, 3, 2]); if (r) { expect(r.index).toBeGreaterThanOrEqual(0); expect(r.index).toBeLessThanOrEqual(1); } });
  it('index matches oracle', () => { const r = eq5dIndex([1,2,1,3,2]); expect(r.index).toBeCloseTo(rp.eq5dIndex_basic.index, 4); });
});

describe('standardizedResponseMean', () => {
  it('contract keys', () => expectKeys(standardizedResponseMean(baseline, followUp), ['test', 'srm', 'n', 'apa']));
  it('null <3', () => expect(standardizedResponseMean([1, 2], [3, 4])).toBeNull());
  it('srm finite', () => { const r = standardizedResponseMean(baseline, followUp); if (r) expect(Number.isFinite(r.srm)).toBe(true); });
});

describe('pro edge cases', () => {
  it('reliableChangeIndex null mismatch', () => expect(reliableChangeIndex([1, 2, 3], [4, 5])).toBeNull());
  it('minimalImportantDifference null mismatch', () => expect(minimalImportantDifference([1, 2, 3], [1, 2])).toBeNull());
  it('responderAnalysis null for empty', () => expect(responderAnalysis([], 'a', 'b', 1)).toBeNull());
  it('eq5dIndex null <5', () => expect(eq5dIndex([1, 2, 3])).toBeNull());
  it('standardizedResponseMean null <3', () => expect(standardizedResponseMean([1], [2])).toBeNull());
});

describe('clinicalTrialsGov', () => {
  const d = [{phase:'Phase 1',status:'Completed'},{phase:'Phase 1',status:'Completed'},{phase:'Phase 2',status:'Recruiting'},{phase:'Phase 2',status:'Completed'},{phase:'Phase 3',status:'Completed'},{phase:'Phase 3',status:'Completed'},{phase:'Phase 3',status:'Active'}];
  it('contract keys', () => expectKeys(clinicalTrialsGov(d, 'phase', 'status'), ['test','counts','n','nPhases','apa']));
  it('null <5', () => expect(clinicalTrialsGov(d.slice(0,3), 'phase', 'status')).toBeNull());
  it('counts non-empty', () => { const r = clinicalTrialsGov(d, 'phase', 'status'); expect(r.counts.length).toBeGreaterThan(0); });
});
describe('consortChecklist', () => {
  const items = ['title present','abstract here','methods described','results reported'];
  it('contract keys', () => expectKeys(consortChecklist(items), ['test','completed','missing','score','total','apa']));
  it('null empty', () => expect(consortChecklist([])).toBeNull());
  it('score between 0 and total', () => { const r = consortChecklist(items); expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(r.total); });
});

describe('hardening — PRO edge cases', () => {
  it('reliableChangeIndex null for null baseline', () => expect(reliableChangeIndex(null, followUp)).toBeNull());
  it('reliableChangeIndex null for mismatched lengths', () => expect(reliableChangeIndex([1,2,3],[4,5])).toBeNull());
  it('minimalImportantDifference null for null scores', () => expect(minimalImportantDifference(null, [1,2,3])).toBeNull());
  it('minimalImportantDifference null for mismatched lengths', () => expect(minimalImportantDifference([1,2,3],[1,2])).toBeNull());
  it('responderAnalysis null for null data', () => expect(responderAnalysis(null, 'pre', 'post', 3)).toBeNull());
  it('responderAnalysis null for missing vars', () => expect(responderAnalysis([{pre:1,post:2}], '', 'post', 1)).toBeNull());
  it('eq5dIndex null for null domainScores', () => expect(eq5dIndex(null)).toBeNull());
  it('eq5dIndex handles max domains', () => { const r = eq5dIndex([5,5,5,5,5]); expect(r.index).toBeCloseTo(0, 0); });
  it('standardizedResponseMean null for null baseline', () => expect(standardizedResponseMean(null, followUp)).toBeNull());
  it('standardizedResponseMean null for mismatched lengths', () => expect(standardizedResponseMean([1,2],[3])).toBeNull());
  it('clinicalTrialsGov null for null data', () => expect(clinicalTrialsGov(null, 'phase', 'status')).toBeNull());
  it('clinicalTrialsGov null for <5 rows', () => { const d = [{phase:'Phase1',status:'Comp'}]; expect(clinicalTrialsGov(d, 'phase', 'status')).toBeNull(); });
  it('consortChecklist null for null items', () => expect(consortChecklist(null)).toBeNull());
});
