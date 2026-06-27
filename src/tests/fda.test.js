import { describe, it, expect } from 'vitest';
import { fpca, functionalMean, functionalCovariance, scalarOnFunction, functionalClustering, fpcaExpanded, functionalRegression } from './fda.js';
import { expectKeys } from './__fixtures__/helpers.js';

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
