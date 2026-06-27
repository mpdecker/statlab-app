import { describe, it, expect } from 'vitest';
import { sampleRatioMismatch, sequentialTest, unequalAllocationT, minimumDetectableEffect, requiredSampleSize, bayesianABTest, multiArmBandit } from './abTesting.js';
import { expectKeys } from './__fixtures__/helpers.js';

const ctrl = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const trt = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe('sampleRatioMismatch', () => {
  it('contract keys', () => expectKeys(sampleRatioMismatch(ctrl, trt, 0.5), ['test', 'chi2', 'p', 'observed', 'expected', 'nTotal', 'apa']));
  it('null empty', () => expect(sampleRatioMismatch([], trt, 0.5)).toBeNull());
  it('chi2 positive', () => { const r = sampleRatioMismatch(ctrl, trt, 0.5); if (r) expect(r.chi2).toBeGreaterThanOrEqual(0); });
});

describe('sequentialTest', () => {
  it('contract keys', () => expectKeys(sequentialTest(ctrl, trt), ['test', 'zScores', 'n', 'alpha', 'apa']));
  it('null <5', () => expect(sequentialTest([1, 2], [3, 4])).toBeNull());
  it('p between 0-1', () => { const r = sequentialTest(ctrl, trt); if (r && r.p !== undefined) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
});

describe('unequalAllocationT', () => {
  it('contract keys', () => expectKeys(unequalAllocationT(ctrl, trt, 0.3), ['test', 't', 'df', 'p', 'ratio', 'nControl', 'nTreatment', 'apa']));
  it('null <5', () => expect(unequalAllocationT([1, 2], [3, 4], 0.5)).toBeNull());
  it('df positive', () => { const r = unequalAllocationT(ctrl, trt, 0.3); if (r) expect(r.df).toBeGreaterThan(0); });
});

describe('minimumDetectableEffect', () => {
  it('contract keys', () => expectKeys(minimumDetectableEffect(100), ['test', 'mde', 'n', 'alpha', 'beta', 'baseline', 'apa']));
  it('MDE > 0', () => { const r = minimumDetectableEffect(100); expect(r.mde).toBeGreaterThan(0); });
  it('returns finite value', () => { const r = minimumDetectableEffect(100); expect(Number.isFinite(r.mde)).toBe(true); });
});

describe('requiredSampleSize', () => {
  it('contract keys', () => expectKeys(requiredSampleSize(0.5, 0.1), ['test', 'n', 'baseline', 'mde', 'alpha', 'beta', 'apa']));
  it('n > 0', () => { const r = requiredSampleSize(0.5, 0.1); expect(r.n).toBeGreaterThan(0); });
  it('returns integer n', () => { const r = requiredSampleSize(0.5, 0.1); expect(Number.isInteger(r.n)).toBe(true); });
});

describe('bayesianABTest', () => {
  const a = [10,12,14,16,18]; const b = [11,13,15,17,19];
  it('contract keys', () => expectKeys(bayesianABTest(a, b, { nSim: 50 }), ['test','probB','nA','nB','nSim','apa']));
  it('null <3', () => expect(bayesianABTest([1,2], [3,4])).toBeNull());
  it('probB between 0-1', () => { const r = bayesianABTest(a, b, { nSim: 50 }); if (r) { expect(r.probB).toBeGreaterThanOrEqual(0); expect(r.probB).toBeLessThanOrEqual(1); } });
});
describe('multiArmBandit', () => {
  it('contract keys', () => expectKeys(multiArmBandit([0.3,0.5,0.2,0.4], { iterations: 50 }), ['test','values','totalReward','iterations','k','apa']));
  it('null <3 arms', () => expect(multiArmBandit([0.3,0.5], { iterations: 10 })).toBeNull());
  it('values length equals arms', () => { const r = multiArmBandit([0.3,0.5,0.2,0.4], { iterations: 50 }); if (r) expect(r.values).toHaveLength(4); });
});
