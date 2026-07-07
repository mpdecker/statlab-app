import { describe, it, expect } from 'vitest';
import { fpca, functionalMean, functionalCovariance, scalarOnFunction, functionalClustering, fpcaExpanded, functionalRegression } from './fda.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rf = ref.fda;

const X = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7], [5, 6, 7, 8]];
const tp = [0, 1, 2, 3];
const y = [10, 15, 20, 25, 30];

describe('fpca', () => {
  it('contract keys', () => expectKeys(fpca(X, tp), ['test', 'fpcScores', 'eigenvalues', 'n', 'nBasis', 'apa']));
  it('null <5', () => expect(fpca([[1, 2]], [0, 1])).toBeNull());
  it('eigenvalues positive', () => { const r = fpca(X, tp); if (r && r.eigenvalues) { r.eigenvalues.forEach(v => expect(v).toBeGreaterThanOrEqual(0)); } });
  it('propVar sum to 1', () => { const r = fpca(X, tp); if (r && r.propVar) { const sum = r.propVar.reduce((s, v) => s + v, 0); expect(sum).toBeCloseTo(1, 1); } });
});

describe('functionalMean', () => {
  it('contract keys', () => expectKeys(functionalMean(X), ['test', 'mean', 'n', 'nPoints', 'apa']));
  it('null empty', () => expect(functionalMean([])).toBeNull());
  it('mean array correct length', () => { const r = functionalMean(X); if (r) expect(r.mean).toHaveLength(X[0].length); });
});

describe('functionalCovariance', () => {
  it('contract keys', () => expectKeys(functionalCovariance(X), ['test', 'cov', 'n', 'nPoints', 'apa']));
  it('null <3', () => expect(functionalCovariance([[1, 2]])).toBeNull());
  it('covariance symmetric', () => { const r = functionalCovariance(X); if (r && r.cov) { for (let i = 0; i < r.cov.length; i++) for (let j = 0; j < r.cov[i].length; j++) expect(r.cov[i][j]).toBeCloseTo(r.cov[j][i], 5); } });
});

describe('scalarOnFunction', () => {
  it('contract keys', () => expectKeys(scalarOnFunction(X, y), ['test', 'intercept', 'slope', 'rSquared', 'n', 'apa']));
  it('null <5', () => expect(scalarOnFunction([[1, 2], [3, 4]], [5, 6])).toBeNull());
  it('beta finite', () => { const r = scalarOnFunction(X, y); if (r) { expect(Number.isFinite(r.intercept)).toBe(true); expect(Number.isFinite(r.slope)).toBe(true); } });
});

describe('functionalClustering', () => {
  it('contract keys', () => expectKeys(functionalClustering(X), ['test', 'labels', 'nClusters', 'n', 'apa']));
  it('null <5', () => expect(functionalClustering([[1]], 2)).toBeNull());
  it('labels correct count', () => { const r = functionalClustering(X); if (r && r.labels) expect(r.labels).toHaveLength(X.length); });
});

describe('fpcaExpanded', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ id: Math.floor(i/3), time: i % 3, v1: i * 0.5, v2: i * 0.3 });
  it('contract keys', () => expectKeys(fpcaExpanded(d, ['v1','v2'], 'time', 'id', { nComponents: 2 }), ['test','eigenvalues','propVar','nBasis','nSubjects','nTimePoints','apa']));
  it('null <2 vars', () => expect(fpcaExpanded(d, ['v1'], 'time', 'id')).toBeNull());
  it('propVar sum approximately 1', () => { const r = fpcaExpanded(d, ['v1','v2'], 'time', 'id', { nComponents: 2 }); if (r && r.propVar) { const sum = r.propVar.reduce((s, v) => s + v, 0); expect(sum).toBeCloseTo(1, 1); } });
});
describe('functionalRegression', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ id: Math.floor(i/3), time: i % 3, x: i * 0.2, y: i * 0.5 });
  it('contract keys', () => expectKeys(functionalRegression(d, 'y', 'x', 'time', 'id'), ['test','beta','nSubjects','apa']));
  it('beta finite', () => { const r = functionalRegression(d, 'y', 'x', 'time', 'id'); if (r) expect(Number.isFinite(r.beta)).toBe(true); });
  it('nSubjects positive', () => { const r = functionalRegression(d, 'y', 'x', 'time', 'id'); if (r) expect(r.nSubjects).toBeGreaterThan(0); });
});

describe('fpca projects onto eigenfunctions (real FPC scores)', () => {
  it('variance of FPC score k equals eigenvalue k', () => {
    const tp = Array.from({ length: 10 }, (_, t) => t);
    const X = Array.from({ length: 18 }, (_, i) =>
      tp.map(t => Math.sin(0.4 * t) * ((i % 6) - 2.5) + Math.cos(0.2 * t) * (((i * 3) % 5) - 2)));
    const r = fpca(X, tp);
    const col0 = r.fpcScores.map(s => s[0]);
    const mean0 = col0.reduce((a, b) => a + b, 0) / col0.length;
    const var0 = col0.reduce((a, b) => a + (b - mean0) ** 2, 0) / col0.length;
    expect(var0).toBeCloseTo(r.eigenvalues[0], 2);
  });
});

describe('functionalRegression fits a real functional linear model', () => {
  it('recovers the coefficient function beta(t)', () => {
    const trueBeta = [2, -1, 0.5];
    const d = [];
    let s = 555;
    const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let id = 0; id < 40; id++) {
      const xs = [rnd(), rnd(), rnd()];
      const y = trueBeta[0] * xs[0] + trueBeta[1] * xs[1] + trueBeta[2] * xs[2];
      for (let t = 0; t < 3; t++) d.push({ id, time: t, x: xs[t], y });
    }
    const r = functionalRegression(d, 'y', 'x', 'time', 'id', { ridge: 0 });
    expect(r.betaCurve[0]).toBeCloseTo(2, 1);
    expect(r.betaCurve[1]).toBeCloseTo(-1, 1);
    expect(r.betaCurve[2]).toBeCloseTo(0.5, 1);
  });
});

describe('fpcaExpanded does a real longitudinal FPCA', () => {
  it('variance of FPC score k equals eigenvalue k (not hardcoded 3/(i+1))', () => {
    const d = [];
    for (let id = 0; id < 24; id++) for (let t = 0; t < 4; t++) {
      const score = (id % 6) - 2.5;
      d.push({ id, time: t, v1: 5 + score * Math.cos(t) + ((id * 7) % 5 - 2) * 0.1, v2: t });
    }
    const r = fpcaExpanded(d, ['v1', 'v2'], 'time', 'id', { nComponents: 2 });
    expect(r.scores.length).toBeGreaterThan(0);
    const col0 = r.scores.map(s => s[0]);
    const mean0 = col0.reduce((a, b) => a + b, 0) / col0.length;
    const var0 = col0.reduce((a, b) => a + (b - mean0) ** 2, 0) / (col0.length - 1);
    expect(var0).toBeCloseTo(r.eigenvalues[0], 1);
  });
});

describe('functionalMean oracle', () => {
  it('mean curve matches oracle', () => {
    const r = functionalMean(rf.functionalMean_basic.data);
    expect(r.mean).toEqual(rf.functionalMean_basic.mean);
  });
});

describe('fpca oracle', () => {
  it('eigenvalues match oracle', () => {
    const r = fpca(rf.fpca_basic.data, rf.fpca_basic.tp);
    expect(r.eigenvalues).toEqual(rf.fpca_basic.eigenvalues);
  });
  it('propVar matches oracle', () => {
    const r = fpca(rf.fpca_basic.data, rf.fpca_basic.tp);
    expect(r.propVar).toEqual(rf.fpca_basic.propVar);
  });
});

describe('scalarOnFunction oracle', () => {
  it('intercept/slope/rSquared match oracle', () => {
    const r = scalarOnFunction(rf.scalarOnFunction_basic.data, rf.scalarOnFunction_basic.y);
    expect(r.intercept).toBeCloseTo(rf.scalarOnFunction_basic.intercept, 4);
    expect(r.slope).toBeCloseTo(rf.scalarOnFunction_basic.slope, 4);
    expect(r.rSquared).toBeCloseTo(rf.scalarOnFunction_basic.rSquared, 4);
  });
});

describe('functionalClustering oracle', () => {
  it('labels match oracle', () => {
    const r = functionalClustering(rf.functionalClustering_basic.data);
    expect(r.labels).toEqual(rf.functionalClustering_basic.labels);
  });
});

describe('hardening — FDA edge cases', () => {
  it('fpca null for mismatched dimensions', () => expect(fpca([[1,2,3]], [0,1])).toBeNull());
  it('fpca null for empty data', () => expect(fpca(null, tp)).toBeNull());
  it('fpca reproducible with same data', () => { const r1 = fpca(X, tp); const r2 = fpca(X, tp); expect(r1.eigenvalues).toEqual(r2.eigenvalues); });
  it('functionalMean null for null input', () => expect(functionalMean(null)).toBeNull());
  it('functionalMean handles single row', () => { const r = functionalMean([[5,5,5]]); expect(r).not.toBeNull(); });
  it('functionalCovariance null for null input', () => expect(functionalCovariance(null)).toBeNull());
  it('functionalCovariance null for mismatched rows', () => expect(functionalCovariance([[1,2],[3]])).toBeNull());
  it('scalarOnFunction null for mismatched lengths', () => expect(scalarOnFunction(X, [1,2,3])).toBeNull());
  it('functionalClustering null for null input', () => expect(functionalClustering(null)).toBeNull());
  it('functionalClustering handles single cluster', () => { const r = functionalClustering(X, 1); if (r) expect(r.nClusters).toBe(1); });
  it('fpcaExpanded null for <2 vars', () => expect(fpcaExpanded([{id:1,time:0,v1:1}], ['v1'], 'time', 'id')).toBeNull());
  it('fpcaExpanded reproducible', () => { const d = []; for (let i = 0; i < 30; i++) d.push({ id: Math.floor(i/3), time: i % 3, v1: i * 0.5, v2: i * 0.3 }); const r1 = fpcaExpanded(d, ['v1','v2'], 'time', 'id'); const r2 = fpcaExpanded(d, ['v1','v2'], 'time', 'id'); expect(r1.eigenvalues).toEqual(r2.eigenvalues); });
  it('functionalRegression null for null data', () => expect(functionalRegression(null, 'y', 'x', 'time', 'id')).toBeNull());
  it('functionalRegression null for <10 rows', () => { const d = []; for (let i = 0; i < 5; i++) d.push({ id: i, time: 0, x: i, y: i }); expect(functionalRegression(d, 'y', 'x', 'time', 'id')).toBeNull(); });
});
