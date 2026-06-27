import { describe, it, expect } from 'vitest';
import { reliableChangeIndex, minimalImportantDifference, responderAnalysis, eq5dIndex, standardizedResponseMean } from './pro.js';
import { expectKeys } from './__fixtures__/helpers.js';

const baseline = [10, 12, 15, 11, 14, 16, 13, 12];
const followUp = [8, 14, 18, 9, 16, 15, 11, 14];

describe('reliableChangeIndex', () => {
  it('contract keys', () => expectKeys(reliableChangeIndex(baseline, followUp), ['test', 'rci', 'se', 'n', 'nImproved', 'nDeteriorated', 'apa']));
  it('null <3', () => expect(reliableChangeIndex([1, 2], [3, 4])).toBeNull());
});

describe('minimalImportantDifference', () => {
  it('contract keys', () => expectKeys(minimalImportantDifference(baseline, [1, 2, 3, 1, 2, 3, 2, 1]), ['test', 'mid', 'n', 'nLow', 'nHigh', 'apa']));
  it('null <5', () => expect(minimalImportantDifference([1, 2], [1, 2])).toBeNull());
});

describe('responderAnalysis', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ pre: i * 2, post: i * 2 + 5 + (i % 3) });
  it('contract keys', () => expectKeys(responderAnalysis(d, 'pre', 'post', 3), ['test', 'n', 'responders', 'pct', 'threshold', 'apa']));
  it('with groupVar', () => { const r = responderAnalysis(d, 'pre', 'post', 3, { groupVar: 'grp' }); expect(r).toHaveProperty('byGroup'); });
});

describe('eq5dIndex', () => {
  it('contract keys', () => expectKeys(eq5dIndex([1, 2, 1, 3, 2]), ['test', 'index', 'domains', 'country', 'apa']));
  it('null <5', () => expect(eq5dIndex([1, 2, 3])).toBeNull());
});

describe('standardizedResponseMean', () => {
  it('contract keys', () => expectKeys(standardizedResponseMean(baseline, followUp), ['test', 'srm', 'n', 'apa']));
  it('null <3', () => expect(standardizedResponseMean([1, 2], [3, 4])).toBeNull());
});

describe('pro edge cases', () => {
  it('reliableChangeIndex null mismatch', () => expect(reliableChangeIndex([1, 2, 3], [4, 5])).toBeNull());
  it('minimalImportantDifference null mismatch', () => expect(minimalImportantDifference([1, 2, 3], [1, 2])).toBeNull());
  it('responderAnalysis null for empty', () => expect(responderAnalysis([], 'a', 'b', 1)).toBeNull());
  it('eq5dIndex null <5', () => expect(eq5dIndex([1, 2, 3])).toBeNull());
  it('standardizedResponseMean null <3', () => expect(standardizedResponseMean([1], [2])).toBeNull());
});
