import { describe, it, expect } from 'vitest';
import { randomizedBlocks, simons2Stage, sampleSizeReestimation, stratifiedPermutedBlocks, fisherExactDesign } from './trials.js';
import { expectKeys } from './__fixtures__/helpers.js';

describe('randomizedBlocks', () => {
  it('contract keys', () => expectKeys(randomizedBlocks(Array(12).fill('A'), ['T', 'C']), ['test', 'assignment', 'counts', 'blockSize', 'n', 'nTreatments', 'apa']));
  it('assignment length correct', () => { const r = randomizedBlocks(Array(10).fill('A'), ['T', 'C']); expect(r.assignment).toHaveLength(10); });
});

describe('simons2Stage', () => {
  it('null p0>=p1', () => expect(simons2Stage(0.5, 0.3)).toBeNull());
  it('contract keys', () => expectKeys(simons2Stage(0.2, 0.4), ['test', 'n1', 'n2', 'r1', 'r', 'p0', 'p1', 'alpha', 'beta', 'apa']));
});

describe('sampleSizeReestimation', () => {
  it('contract keys', () => expectKeys(sampleSizeReestimation([1, 2, 3, 4, 5], 0), ['test', 'nObserved', 'nNeeded', 'ratio', 'stage', 'apa']));
});

describe('stratifiedPermutedBlocks', () => {
  it('contract keys', () => expectKeys(stratifiedPermutedBlocks(['A', 'A', 'B', 'B', 'A']), ['test', 'assignment', 'nStrata', 'n', 'apa']));
});

describe('fisherExactDesign', () => {
  it('contract keys', () => expectKeys(fisherExactDesign(5, 10, 3, 20), ['test', 'or', 'rr', 'rd', 'n', 'apa']));
  it('null negative', () => expect(fisherExactDesign(-1, 10, 3, 20)).toBeNull());
});

describe('trials edge cases', () => {
  it('randomizedBlocks null for empty', () => expect(randomizedBlocks([], ['T', 'C'])).toBeNull());
  it('simons2Stage returns n1 < n2', () => { const r = simons2Stage(0.2, 0.4); expect(r.n1).toBeLessThan(r.n2); });
  it('sampleSizeReestimation null <5', () => expect(sampleSizeReestimation([1, 2], 0)).toBeNull());
  it('stratifiedPermutedBlocks null for empty', () => expect(stratifiedPermutedBlocks([])).toBeNull());
  it('fisherExactDesign null for all zero', () => expect(fisherExactDesign(0, 0, 0, 0)).toBeNull());
});
