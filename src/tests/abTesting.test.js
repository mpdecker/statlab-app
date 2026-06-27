import { describe, it, expect } from 'vitest';
import { sampleRatioMismatch, sequentialTest, unequalAllocationT, minimumDetectableEffect, requiredSampleSize } from './abTesting.js';
import { expectKeys } from './__fixtures__/helpers.js';

const ctrl = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const trt = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe('sampleRatioMismatch', () => {
  it('contract keys', () => expectKeys(sampleRatioMismatch(ctrl, trt, 0.5), ['test', 'chi2', 'p', 'observed', 'expected', 'nTotal', 'apa']));
  it('null empty', () => expect(sampleRatioMismatch([], trt, 0.5)).toBeNull());
});

describe('sequentialTest', () => {
  it('contract keys', () => expectKeys(sequentialTest(ctrl, trt), ['test', 'zScores', 'n', 'alpha', 'apa']));
  it('null <5', () => expect(sequentialTest([1, 2], [3, 4])).toBeNull());
});

describe('unequalAllocationT', () => {
  it('contract keys', () => expectKeys(unequalAllocationT(ctrl, trt, 0.3), ['test', 't', 'df', 'p', 'ratio', 'nControl', 'nTreatment', 'apa']));
  it('null <5', () => expect(unequalAllocationT([1, 2], [3, 4], 0.5)).toBeNull());
});

describe('minimumDetectableEffect', () => {
  it('contract keys', () => expectKeys(minimumDetectableEffect(100), ['test', 'mde', 'n', 'alpha', 'beta', 'baseline', 'apa']));
  it('MDE > 0', () => { const r = minimumDetectableEffect(100); expect(r.mde).toBeGreaterThan(0); });
});

describe('requiredSampleSize', () => {
  it('contract keys', () => expectKeys(requiredSampleSize(0.5, 0.1), ['test', 'n', 'baseline', 'mde', 'alpha', 'beta', 'apa']));
  it('n > 0', () => { const r = requiredSampleSize(0.5, 0.1); expect(r.n).toBeGreaterThan(0); });
});
