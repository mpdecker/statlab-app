import { describe, it, expect } from 'vitest';
import { fpca, functionalMean, functionalCovariance, scalarOnFunction, functionalClustering } from './fda.js';
import { expectKeys } from './__fixtures__/helpers.js';

const X = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7], [5, 6, 7, 8]];
const tp = [0, 1, 2, 3];
const y = [10, 15, 20, 25, 30];

describe('fpca', () => {
  it('contract keys', () => expectKeys(fpca(X, tp), ['test', 'fpcScores', 'eigenvalues', 'n', 'nBasis', 'apa']));
  it('null <5', () => expect(fpca([[1, 2]], [0, 1])).toBeNull());
});

describe('functionalMean', () => {
  it('contract keys', () => expectKeys(functionalMean(X), ['test', 'mean', 'n', 'nPoints', 'apa']));
  it('null empty', () => expect(functionalMean([])).toBeNull());
});

describe('functionalCovariance', () => {
  it('contract keys', () => expectKeys(functionalCovariance(X), ['test', 'cov', 'n', 'nPoints', 'apa']));
  it('null <3', () => expect(functionalCovariance([[1, 2]])).toBeNull());
});

describe('scalarOnFunction', () => {
  it('contract keys', () => expectKeys(scalarOnFunction(X, y), ['test', 'intercept', 'slope', 'rSquared', 'n', 'apa']));
  it('null <5', () => expect(scalarOnFunction([[1, 2], [3, 4]], [5, 6])).toBeNull());
});

describe('functionalClustering', () => {
  it('contract keys', () => expectKeys(functionalClustering(X), ['test', 'labels', 'nClusters', 'n', 'apa']));
  it('null <5', () => expect(functionalClustering([[1]], 2)).toBeNull());
});
