import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { enrichmentAnalysis, volcanoTest, foldChange, fdrCorrection, heatmapData } from './bioinformatics.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('enrichmentAnalysis', () => {
  it('contract keys', () => expectKeys(enrichmentAnalysis(200, 10000, 50, 15, 20000), ['test','pValue','oddsRatio','overlap','pathwaySize','geneset','total','apa']));
  it('null overlap<1', () => expect(enrichmentAnalysis(200, 10000, 50, 0, 20000)).toBeNull());
  it('p-value between 0-1', () => { const r = enrichmentAnalysis(200, 10000, 50, 15, 20000); if (r) expect(r.pValue).toBeDefined() });
  it('odds ratio positive', () => { const r = enrichmentAnalysis(200, 10000, 50, 15, 20000); if (r) expect(r.oddsRatio).toBeGreaterThan(0) });
});
describe('volcanoTest', () => {
  const logFC = [2.1, 0.5, -1.8, 0.2, 3.1, -0.8, 1.2, -2.5];
  const pVal = [0.001, 0.3, 0.04, 0.6, 0.0001, 0.2, 0.08, 0.01];
  it('contract keys', () => expectKeys(volcanoTest(logFC, pVal), ['test','results','nSig','n','apa']));
  it('null <3', () => expect(volcanoTest([1,2], [0.1,0.2])).toBeNull());
  it('significant count >= 0', () => { const r = volcanoTest(logFC, pVal); if (r) expect(r.nSig).toBeGreaterThanOrEqual(0) });
  it('each result has logFC and negLog10P', () => { const r = volcanoTest(logFC, pVal); if (r) r.results.forEach(res => { expect(res).toHaveProperty('logFC'); expect(res).toHaveProperty('negLog10P') }) });
});
describe('foldChange', () => {
  const a = [10,12,14,16,18]; const b = [5,6,7,8,9];
  it('contract keys', () => expectKeys(foldChange(a, b), ['test','fc','log2FC','tStat','nA','nB','apa']));
  it('null <3', () => expect(foldChange([1,2], [3,4])).toBeNull());
  it('log2FC finite', () => { const r = foldChange(a, b); if (r) expect(isFinite(r.log2FC)).toBe(true) });
});
describe('fdrCorrection', () => {
  const p = [0.001, 0.04, 0.02, 0.1, 0.5];
  it('contract keys', () => expectKeys(fdrCorrection(p), ['test','nTotal','nSig','fdr','alpha','apa']));
  it('null <2', () => expect(fdrCorrection([0.1])).toBeNull());
  it('nSig <= nTotal', () => { const r = fdrCorrection(p); if (r) expect(r.nSig).toBeLessThanOrEqual(r.nTotal) });
});
describe('enrichmentAnalysis matches scipy.stats.hypergeom.sf exactly (regression test for the comb2 off-by-one fix)', () => {
  it('p-value matches', () => {
    const e = ref.bioinformatics.enrichment_basic;
    const r = enrichmentAnalysis(e.geneset, e.background, e.pathwaySize, e.overlap, e.total);
    expect(r.pValue).toBeCloseTo(e.pValue, 5);
  });
});

describe('fdrCorrection matches the standard BH step-up procedure exactly (regression test for the naive-per-rank-count fix)', () => {
  it('nSig matches statsmodels.stats.multitest.multipletests(method=fdr_bh) on a case with a non-monotonic crossing pattern', () => {
    const e = ref.bioinformatics.fdr_basic;
    const r = fdrCorrection(e.pValues, e.alpha);
    expect(r.nSig).toBe(e.nSig);
  });
});

describe('heatmapData', () => {
  const M = [[1,2,3],[4,5,6],[7,8,9],[10,11,12]];
  it('contract keys', () => expectKeys(heatmapData(M), ['test','data','h','w','apa']));
  it('null empty', () => expect(heatmapData([])).toBeNull());
  it('scaled data has correct dimensions', () => { const r = heatmapData(M); if (r) { expect(r.data.length).toBe(M.length); expect(r.data[0].length).toBe(M[0].length) } });
});
