import { describe, it, expect } from 'vitest';
import { standardize, iqrOutliers, madOutliers, oneHotEncode, equalWidthBinning, winsorize, frequencyEncode } from './preprocessing.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 50];
const dv = [{ cat: 'a', v: 1 }, { cat: 'b', v: 2 }, { cat: 'a', v: 3 }, { cat: 'c', v: 4 }];

describe('standardize', () => {
  it('null for empty', () => expect(standardize(null)).toBeNull());
  it('null for constant data zscore', () => expect(standardize([5, 5, 5], { method: 'zscore' })).toBeNull());
  it('zscore mean approx 0', () => {
    const r = standardize(data);
    const m = r.values.reduce((s, v) => s + v, 0) / r.values.length;
    expect(Math.abs(m)).toBeLessThan(0.01);
  });
  it('minmax in [0,1]', () => { const r = standardize(data, { method: 'minmax' }); expect(Math.min(...r.values)).toBeCloseTo(0, 2); expect(Math.max(...r.values)).toBeCloseTo(1, 2); });
  it('robust returns values', () => { const r = standardize(data, { method: 'robust' }); expect(r.values.length).toBe(10); });
  it('contract keys', () => expectKeys(standardize(data), ['test', 'values', 'method', 'mean', 'sd', 'n', 'apa']));
});

describe('iqrOutliers', () => {
  it('null for <5', () => expect(iqrOutliers(data.slice(0, 4))).toBeNull());
  it('outliers detected', () => { const r = iqrOutliers(data); expect(r.nOutliers).toBeGreaterThanOrEqual(1); });
  it('contract keys', () => expectKeys(iqrOutliers(data), ['test', 'outliers', 'lowerBound', 'upperBound', 'nOutliers', 'pct', 'n', 'apa']));
});

describe('madOutliers', () => {
  it('null for <5', () => expect(madOutliers(data.slice(0, 4))).toBeNull());
  it('outlier z-score present', () => { const r = madOutliers(data); if (r.outliers.length) expect(typeof r.outliers[0].zScore).toBe('number'); });
  it('contract keys', () => expectKeys(madOutliers(data), ['test', 'outliers', 'mad', 'threshold', 'nOutliers', 'n', 'apa']));
});

describe('oneHotEncode', () => {
  it('null for single cat', () => expect(oneHotEncode([{ x: 'a' }, { x: 'a' }], 'x')).toBeNull());
  it('adds binary columns', () => { const r = oneHotEncode(dv, 'cat'); expect(r.encoded[0]).toHaveProperty('cat_a'); expect(r.encoded[0].cat_a).toBe(1); });
  it('contract keys', () => expectKeys(oneHotEncode(dv, 'cat'), ['test', 'encoded', 'categories', 'n', 'apa']));
});

describe('equalWidthBinning', () => {
  it('null for n < bins', () => expect(equalWidthBinning([1, 2], 5)).toBeNull());
  it('bins span range', () => { const r = equalWidthBinning(data, 4); expect(r.binEdges).toHaveLength(5); expect(r.binIndices).toHaveLength(10); });
  it('contract keys', () => expectKeys(equalWidthBinning(data, 4), ['test', 'binIndices', 'binEdges', 'binLabels', 'nBins', 'n', 'apa']));
});

describe('winsorize', () => {
  it('null for <3', () => expect(winsorize([1, 2])).toBeNull());
  it('clips extremes', () => { const r = winsorize(data, { lower: 0.2, upper: 0.2 }); expect(r.values[9]).toBeLessThan(data[9]); });
  it('contract keys', () => expectKeys(winsorize(data, { lower: 0.2, upper: 0.2 }), ['test', 'values', 'lowerQuantile', 'upperQuantile', 'nClipped', 'n', 'apa']));
});

describe('frequencyEncode', () => {
  it('null for single cat', () => expect(frequencyEncode([{ x: 'a' }, { x: 'a' }], 'x')).toBeNull());
  it('adds freq column', () => { const r = frequencyEncode(dv, 'cat'); expect(r.encoded[0]).toHaveProperty('cat_freq'); expect(r.encoded[0].cat_freq).toBe(2); });
  it('contract keys', () => expectKeys(frequencyEncode(dv, 'cat'), ['test', 'encoded', 'mapping', 'n', 'apa']));
});

describe('edge cases', () => {
  it('standardize null for empty', () => expect(standardize(null)).toBeNull());
  it('standardize null for unknown method', () => expect(standardize(data, { method: 'unknown' })).toBeNull());
  it('standardize robust null for zero IQR', () => expect(standardize([3, 3, 3], { method: 'robust' })).toBeNull());
  it('iqrOutliers null for <5', () => expect(iqrOutliers([1, 2, 3, 4])).toBeNull());
  it('madOutliers null for <5', () => expect(madOutliers([1, 2, 3])).toBeNull());
  it('oneHotEncode null for missing column', () => expect(oneHotEncode(dv, 'z')).toBeNull());
  it('equalWidthBinning null for constant data', () => expect(equalWidthBinning([5, 5, 5, 5, 5], 3)).toBeNull());
  it('winsorize null for <3', () => expect(winsorize([1, 2])).toBeNull());
  it('frequencyEncode null for missing column', () => expect(frequencyEncode(dv, 'z')).toBeNull());
});