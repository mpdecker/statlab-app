import { describe, it, expect } from 'vitest';
import { standardize, iqrOutliers, madOutliers, oneHotEncode, equalWidthBinning, winsorize, frequencyEncode, smote, adasyn, randomUnderSample } from './preprocessing.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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

describe('smote', () => {
  const X = [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]];
  const y = [1,1,1,0,0,0,0,0];
  it('contract keys', () => expectKeys(smote(X, y), ['test','nOriginal','nSynthetic','nNew','p','k','apa']));
  it('null <5', () => expect(smote([[1]], [1])).toBeNull());
  it('nNew > nOriginal', () => { const r = smote(X, y); if (r) expect(r.nNew).toBeGreaterThan(r.nOriginal); });
});
describe('adasyn', () => {
  const X = [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]];
  const y = [1,1,1,0,0,0,0,0];
  it('contract keys', () => expectKeys(adasyn(X, y), ['test','nOriginal','nSynthetic','nNew','k','apa']));
  it('null <5', () => expect(adasyn([[1]], [0])).toBeNull());
  it('nSynthetic positive', () => { const r = adasyn(X, y); if (r) expect(r.nSynthetic).toBeGreaterThan(0); });
});
describe('randomUnderSample', () => {
  const X = [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]];
  const y = [1,1,0,0,0,0];
  it('contract keys', () => expectKeys(randomUnderSample(X, y), ['test','nOriginal','nNew','nMajorityRemoved','apa']));
  it('null <3', () => expect(randomUnderSample([[1]], [1])).toBeNull());
  it('nMajorityRemoved positive', () => { const r = randomUnderSample(X, y); if (r) expect(r.nMajorityRemoved).toBeGreaterThan(0); });
});

describe('standardize matches independent oracles (scipy.stats.zscore / numpy percentile)', () => {
  const e = ref.preprocessing.basic;
  it('zscore matches scipy.stats.zscore(ddof=1) exactly', () => {
    const r = standardize(e.data, { method: 'zscore' });
    e.zscore.forEach((v, i) => expect(r.values[i]).toBeCloseTo(v, 5));
  });
  it('minmax matches (x-min)/(max-min) exactly', () => {
    const r = standardize(e.data, { method: 'minmax' });
    e.minmax.forEach((v, i) => expect(r.values[i]).toBeCloseTo(v, 5));
  });
  it('robust matches (x-median)/IQR via numpy percentile exactly', () => {
    const r = standardize(e.data, { method: 'robust' });
    expect(r.median).toBeCloseTo(e.median, 4);
    expect(r.iqr).toBeCloseTo(e.iqr, 4);
    e.robust.forEach((v, i) => expect(r.values[i]).toBeCloseTo(v, 5));
  });
});

describe('winsorize matches numpy percentile clipping exactly', () => {
  it('quantile bounds and clipped values match', () => {
    const e = ref.preprocessing.basic;
    const r = winsorize(e.data, { lower: 0.1, upper: 0.1 });
    expect(r.lowerQuantile).toBeCloseTo(e.winsorLo, 4);
    expect(r.upperQuantile).toBeCloseTo(e.winsorHi, 4);
    e.winsorized.forEach((v, i) => expect(r.values[i]).toBeCloseTo(v, 5));
  });
});

describe('iqrOutliers matches numpy-percentile Tukey fences exactly', () => {
  it('bounds and flagged indices match', () => {
    const e = ref.preprocessing.basic;
    const r = iqrOutliers(e.data);
    expect(r.lowerBound).toBeCloseTo(e.iqrLower, 4);
    expect(r.upperBound).toBeCloseTo(e.iqrUpper, 4);
    expect(r.outliers.map(o => o.index)).toEqual(e.iqrOutlierIdx);
  });
});

describe('madOutliers matches the standard modified z-score formula exactly', () => {
  it('MAD and flagged indices match', () => {
    const e = ref.preprocessing.basic;
    const r = madOutliers(e.data);
    expect(r.mad).toBeCloseTo(e.mad, 4);
    expect(r.outliers.map(o => o.index)).toEqual(e.madOutlierIdx);
  });
});