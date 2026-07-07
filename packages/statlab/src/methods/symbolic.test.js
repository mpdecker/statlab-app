import { describe, it, expect } from 'vitest';
import { intervalMean, intervalVariance, intervalCorrelation, intervalPCA, histogramDistance, histogramPCA, symbolicRegression } from './symbolic.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rs = ref.symbolic;

const d = []; for (let i = 0; i < 10; i++) d.push({ lo: i, hi: i + 2, lo2: i * 0.5, hi2: i * 0.5 + 1 });

describe('intervalMean', () => { it('contract keys', () => expectKeys(intervalMean(d, 'lo', 'hi'), ['test','lo','hi','n','apa'])); it('null <3', () => expect(intervalMean([{lo:1,hi:2}],'lo','hi')).toBeNull()); it('mean between lo and hi bounds', () => { const r = intervalMean(d, 'lo', 'hi'); if (r) { expect(r.lo).toBeGreaterThan(0); expect(r.hi).toBeGreaterThan(0); expect(r.hi).toBeGreaterThanOrEqual(r.lo); } }); it('mean between bounds', () => { const r = intervalMean(d, 'lo', 'hi'); if (r) { expect(r.lo).toBeLessThanOrEqual(r.hi); } }); it('loMean matches oracle', () => { const r = intervalMean(d, 'lo', 'hi'); expect(r.lo).toBeCloseTo(rs.intervalMean_basic.loMean, 4); }); it('hiMean matches oracle', () => { const r = intervalMean(d, 'lo', 'hi'); expect(r.hi).toBeCloseTo(rs.intervalMean_basic.hiMean, 4); }) });
describe('intervalVariance', () => { it('contract keys', () => expectKeys(intervalVariance(d, 'lo', 'hi'), ['test','lo','hi','n','apa'])); it('null <3', () => expect(intervalVariance([{lo:1,hi:2}],'lo','hi')).toBeNull()); it('variance non-negative', () => { const r = intervalVariance(d, 'lo', 'hi'); if (r) { expect(r.lo).toBeGreaterThanOrEqual(0); expect(r.hi).toBeGreaterThanOrEqual(0); } }); it('loVar matches oracle', () => { const r = intervalVariance(d, 'lo', 'hi'); expect(r.lo).toBeCloseTo(rs.intervalVariance_basic.loVar, 4); }); it('hiVar matches oracle', () => { const r = intervalVariance(d, 'lo', 'hi'); expect(r.hi).toBeCloseTo(rs.intervalVariance_basic.hiVar, 4); }) });
describe('intervalCorrelation', () => { it('contract keys', () => expectKeys(intervalCorrelation(d, 'lo', 'hi', 'lo2', 'hi2'), ['test','r','n','apa'])); it('null <5', () => expect(intervalCorrelation(d.slice(0,3),'lo','hi','lo2','hi2')).toBeNull()); it('r between -1 and 1', () => { const r = intervalCorrelation(d, 'lo', 'hi', 'lo2', 'hi2'); if (r) { expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); } }); it('corr between -1-1', () => { const r = intervalCorrelation(d, 'lo', 'hi', 'lo2', 'hi2'); if (r) { expect(Math.abs(r.r)).toBeLessThanOrEqual(1); } }); it('r matches oracle', () => { const r = intervalCorrelation(d, 'lo', 'hi', 'lo2', 'hi2'); expect(r.r).toBeCloseTo(rs.intervalCorrelation_basic.r, 4); }) });
describe('intervalPCA', () => { it('contract keys', () => expectKeys(intervalPCA(d, ['lo','lo2'], ['hi','hi2']), ['test','covDim','n','apa'])); it('covDim positive', () => { const r = intervalPCA(d, ['lo','lo2'], ['hi','hi2']); if (r) expect(r.covDim).toBeDefined(); }); it('eigenvalues positive-ish', () => { const r = intervalPCA(d, ['lo','lo2'], ['hi','hi2']); if (r && r.eigenvalues) { r.eigenvalues.forEach(v => expect(v).toBeGreaterThan(-0.001)); } }) });
describe('histogramDistance', () => { it('contract keys', () => expectKeys(histogramDistance([0.1,0.3,0.5,0.1],[0.2,0.2,0.4,0.2]), ['test','wasserstein','nBins','apa'])); it('null mismatch', () => expect(histogramDistance([1,2],[3])).toBeNull()); it('wasserstein non-negative', () => { const r = histogramDistance([0.1,0.3,0.5,0.1],[0.2,0.2,0.4,0.2]); if (r) expect(r.wasserstein).toBeGreaterThanOrEqual(0); }); it('distance between 0-1', () => { const r = histogramDistance([0.1,0.3,0.5,0.1],[0.2,0.2,0.4,0.2]); if (r) { expect(r.wasserstein).toBeGreaterThanOrEqual(0); expect(r.wasserstein).toBeLessThanOrEqual(1); } }) });

describe('histogramPCA', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ v1: [i, i+1], v2: [i*0.5, i*0.5+0.5], v3: [i*0.3, i*0.3+0.3] });
  it('contract keys', () => expectKeys(histogramPCA(d, ['v1','v2','v3']), ['test','eigenvalues','propVar','n','p','apa']));
  it('null <2 cols', () => expect(histogramPCA(d, ['v1'])).toBeNull());
  it('eigenvalues array non-empty', () => { const r = histogramPCA(d, ['v1','v2','v3']); if (r) { expect(Array.isArray(r.eigenvalues)).toBe(true); expect(r.eigenvalues.length).toBeGreaterThan(0); } });
  it('propVar between 0 and 1', () => { const r = histogramPCA(d, ['v1','v2','v3']); if (r && r.propVar) { r.propVar.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }); } }); it('eigenvalues positive-ish', () => { const r = histogramPCA(d, ['v1','v2','v3']); if (r && r.eigenvalues) { r.eigenvalues.forEach(v => expect(v).toBeGreaterThan(-0.001)); } });
});
describe('symbolicRegression', () => {
  const d = []; for (let i = 0; i < 15; i++) d.push({ y: i * 3 + Math.random(), x1: i, x2: i * 0.5, x3: i % 3 });
  it('contract keys', () => expectKeys(symbolicRegression(d, 'y', ['x1','x2','x3']), ['test','coefficients','interc','n','p','apa']));
  it('null <5', () => expect(symbolicRegression(d.slice(0,3), 'y', ['x1'])).toBeNull());
  it('coefficients array present', () => { const r = symbolicRegression(d, 'y', ['x1','x2','x3']); if (r) { expect(Array.isArray(r.coefficients)).toBe(true); expect(r.coefficients.length).toBeGreaterThan(0); } });
  it('n matches rows', () => { const r = symbolicRegression(d, 'y', ['x1','x2','x3']); if (r) expect(r.n).toBe(d.length); }); it('coefficients non-empty', () => { const r = symbolicRegression(d, 'y', ['x1','x2','x3']); if (r) { expect(r.coefficients).toBeDefined(); } });
});

describe('symbolicRegression correctness', () => {
  it('recovers true OLS coefficients with correlated predictors', () => {
    // y = 1*x1 + 2*x2 exactly; x1 and x2 are correlated.
    // A diagonal-only normal-equations solve returns ~[2.16, 3.68] — wrong.
    const data = [
      { x1: 1, x2: 1, y: 3 }, { x1: 2, x2: 1, y: 4 }, { x1: 3, x2: 2, y: 7 },
      { x1: 4, x2: 2, y: 8 }, { x1: 5, x2: 3, y: 11 },
    ];
    const r = symbolicRegression(data, 'y', ['x1', 'x2']);
    const bx1 = r.coefficients.find(c => c.name === 'x1').b;
    const bx2 = r.coefficients.find(c => c.name === 'x2').b;
    expect(bx1).toBeCloseTo(1, 4);
    expect(bx2).toBeCloseTo(2, 4);
  });
  it('coefficients match oracle', () => {
    const oracleData = [
      { x1: 1, x2: 1, y: 3 }, { x1: 2, x2: 1, y: 4 }, { x1: 3, x2: 2, y: 7 },
      { x1: 4, x2: 2, y: 8 }, { x1: 5, x2: 3, y: 11 },
    ];
    const r = symbolicRegression(oracleData, 'y', ['x1', 'x2']);
    expect(r.coefficients.find(c => c.name === 'x1').b).toBeCloseTo(rs.symbolicRegression_basic.bx1, 2);
    expect(r.coefficients.find(c => c.name === 'x2').b).toBeCloseTo(rs.symbolicRegression_basic.bx2, 2);
    expect(r.interc).toBeCloseTo(rs.symbolicRegression_basic.b0, 2);
  });
});

describe('histogramPCA eigen-decomposes the real covariance', () => {
  it('puts ~all variance on PC1 for rank-1 (collinear) data', () => {
    const d = []; for (let i = 0; i < 12; i++) d.push({ v1: [i, i + 1], v2: [i * 0.5, i * 0.5 + 0.5], v3: [i * 0.3, i * 0.3 + 0.3] });
    const r = histogramPCA(d, ['v1', 'v2', 'v3']);
    expect(r.propVar[0]).toBeGreaterThan(0.99);
    expect(r.eigenvalues[2]).toBeLessThan(0.01);
  });
});

describe('intervalPCA returns a real eigen-decomposition', () => {
  it('reports eigenvalues whose sum equals the total center variance', () => {
    const d = []; for (let i = 0; i < 12; i++) d.push({ lo: i, hi: i + 2, lo2: -i, hi2: -i + 1 });
    const r = intervalPCA(d, ['lo', 'lo2'], ['hi', 'hi2']);
    const trace = r.eigenvalues.reduce((s, v) => s + v, 0);
    // centers: dim0 = i+1, dim1 = -i+0.5 → both perfectly collinear → rank 1
    expect(r.eigenvalues[1]).toBeLessThan(1e-6);
    expect(trace).toBeGreaterThan(1);
  });
});

describe('hardening — symbolic data edge cases', () => {
  it('intervalMean null for null data', () => expect(intervalMean(null, 'lo', 'hi')).toBeNull());
  it('intervalMean null for <3 rows', () => expect(intervalMean([{lo:1,hi:2}], 'lo', 'hi')).toBeNull());
  it('intervalVariance null for null data', () => expect(intervalVariance(null, 'lo', 'hi')).toBeNull());
  it('intervalVariance null for missing vars', () => expect(intervalVariance(d, '', 'hi')).toBeNull());
  it('intervalCorrelation null for null data', () => expect(intervalCorrelation(null, 'lo', 'hi', 'lo2', 'hi2')).toBeNull());
  it('intervalCorrelation r in [-1,1] for extreme data', () => { const data = []; for (let i = 0; i < 10; i++) data.push({ lo: i, hi: i+2, lo2: -i, hi2: -i+1 }); const r = intervalCorrelation(data, 'lo', 'hi', 'lo2', 'hi2'); expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); });
  it('intervalPCA null for null data', () => expect(intervalPCA(null, ['lo'], ['hi'])).toBeNull());
  it('intervalPCA null for empty loVars', () => expect(intervalPCA(d, [], ['hi'])).toBeNull());
  it('histogramDistance null for null hist', () => expect(histogramDistance(null, [0.1,0.3])).toBeNull());
  it('histogramDistance null for mismatched lengths', () => expect(histogramDistance([0.1,0.3],[0.2])).toBeNull());
  it('histogramPCA null for null data', () => expect(histogramPCA(null, ['v1','v2'])).toBeNull());
  it('histogramPCA null for single col', () => { const data = [{v1:[1,2]}]; expect(histogramPCA(data, ['v1'])).toBeNull(); });
  it('symbolicRegression null for null data', () => expect(symbolicRegression(null, 'y', ['x1'])).toBeNull());
  it('symbolicRegression null for empty xVars', () => { const data = [{y:1,x1:2}]; expect(symbolicRegression(data, 'y', [])).toBeNull(); });
});
