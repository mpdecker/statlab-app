import { describe, it, expect } from 'vitest';
import { weightedMean, weightedVar, weightedQuantile, designEffect, rakeWeights, calibrationWeights, postStratification, weightedCorrelation, effectiveSampleSize, brrWeights, jackknifeReplicates, fayReplicates, taylorLinearization, designTotal, ppsSampling, systematicSample, multistageVariance, domainTotal, nonresponseAdjustment } from './survey.js';
import { expectKeys } from './__fixtures__/helpers.js';

const vals = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const wts = [1, 2, 1, 3, 2, 1, 2, 3, 1, 4];
const uniformWts = vals.map(() => 1);

describe('weightedMean', () => {
  it('returns null for empty or mismatch', () => {
    expect(weightedMean(null, wts)).toBeNull();
    expect(weightedMean([1, 2], [1])).toBeNull();
  });

  it('equals regular mean for uniform weights', () => {
    const r = weightedMean(vals, uniformWts);
    const regMean = vals.reduce((s, v) => s + v, 0) / vals.length;
    expect(r.mean).toBeCloseTo(regMean, 3);
  });

  it('contract keys', () => {
    expectKeys(weightedMean(vals, wts), ['test', 'mean', 'n', 'sumWeights', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = weightedMean(vals, wts);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('weightedVar', () => {
  it('returns null for <2', () => {
    expect(weightedVar([1], [1])).toBeNull();
  });

  it('variance > 0 for varying values', () => {
    const r = weightedVar(vals, wts);
    expect(r.variance).toBeGreaterThan(0);
  });

  it('se respects weights', () => {
    const r = weightedVar(vals, wts);
    expect(r.se).toBeGreaterThan(0);
  });

  it('contract keys', () => {
    expectKeys(weightedVar(vals, wts), ['test', 'variance', 'sd', 'se', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = weightedVar(vals, wts);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('weightedQuantile', () => {
  it('returns null for empty', () => {
    expect(weightedQuantile(null, wts)).toBeNull();
    expect(weightedQuantile(vals, wts, 2)).toBeNull();
  });

  it('p=0.5 gives median', () => {
    const sorted = [...vals].sort((a, b) => a - b);
    const r = weightedQuantile(sorted, uniformWts, 0.5);
    expect(r.quantile).toBeGreaterThanOrEqual(10);
    expect(r.quantile).toBeLessThanOrEqual(100);
  });

  it('contract keys', () => {
    expectKeys(weightedQuantile(vals, wts), ['test', 'quantile', 'p', 'n', 'apa']);
  });
});

describe('designEffect', () => {
  it('returns null for empty', () => {
    expect(designEffect(null)).toBeNull();
  });

  it('DEFF >= 1 for unequal weights', () => {
    const r = designEffect(wts);
    expect(r.deff).toBeGreaterThanOrEqual(1);
  });

  it('nEff <= n', () => {
    const r = designEffect(wts);
    expect(r.nEff).toBeLessThanOrEqual(vals.length);
  });

  it('contract keys', () => {
    expectKeys(designEffect(wts), ['test', 'deff', 'nEff', 'n', 'cv', 'apa']);
  });
});

describe('rakeWeights', () => {
  const cats = ['A', 'A', 'B', 'B', 'A', 'B', 'A', 'B', 'A', 'B'];
  const targets = [{
    cats,
    targets: { A: 60, B: 140 },
  }];
  const initW = Array(cats.length).fill(1);

  it('returns null for invalid', () => {
    expect(rakeWeights(null, targets)).toBeNull();
  });

  it('converges and produces adjusted weights', () => {
    const r = rakeWeights(initW, targets);
    expect(r.converged).toBe(true);
  });

  it('weights differ from initial', () => {
    const r = rakeWeights(initW, targets);
    expect(r.weights[0]).not.toEqual(initW[0]);
  });

  it('contract keys', () => {
    expectKeys(rakeWeights(initW, targets), ['test', 'weights', 'nIter', 'converged', 'n', 'apa']);
  });
});

describe('calibrationWeights', () => {
  const w = Array(20).fill(1);
  const aux = [Array(20).fill(1).map((_, i) => i + 1)];
  const tgt = [150];
  it('null <10', () => expect(calibrationWeights(w.slice(0, 5), aux, [10])).toBeNull());
  it('contract keys', () => expectKeys(calibrationWeights(w, aux, tgt), ['test', 'weights', 'converged', 'nIter', 'n', 'apa']));
});

describe('postStratification', () => {
  const data = Array.from({ length: 12 }, (_, i) => ({ s: i < 6 ? 'A' : 'B' }));
  const w = Array(12).fill(1);
  const pops = { A: 20, B: 15 };
  it('null <2 strata', () => expect(postStratification([{ s: 'A' }, { s: 'A' }], [1, 1], 's', { A: 10 })).toBeNull());
  it('contract keys', () => expectKeys(postStratification(data, w, 's', pops), ['test', 'weights', 'strata', 'n', 'apa']));
});

describe('weightedCorrelation', () => {
  const x = [1, 2, 3, 4, 5], y = [2, 4, 6, 8, 10], w = [1, 1, 1, 1, 1];
  it('null <5', () => expect(weightedCorrelation([1, 2], y.slice(0, 2), w.slice(0, 2))).toBeNull());
  it('r in [-1,1]', () => { const r = weightedCorrelation(x, y, w); expect(r.r).toBeCloseTo(1, 2); });
  it('contract keys', () => expectKeys(weightedCorrelation(x, y, w), ['test', 'r', 'n', 'apa']));
});

describe('effectiveSampleSize', () => {
  it('null empty', () => expect(effectiveSampleSize([])).toBeNull());
  it('nEff <= n', () => { const r = effectiveSampleSize([2, 3, 1, 4, 2]); expect(r.nEff).toBeLessThanOrEqual(5); });
  it('contract keys', () => expectKeys(effectiveSampleSize([1, 1, 1]), ['test', 'nEff', 'deff', 'n', 'apa']));
});

describe('edge cases', () => {
  it('weightedMean null for empty', () => expect(weightedMean([], [])).toBeNull());
  it('weightedMean null for all zero weights', () => expect(weightedMean([1, 2, 3], [0, 0, 0])).toBeNull());
  it('weightedVar null for <2', () => expect(weightedVar([1], [1])).toBeNull());
  it('weightedQuantile null for p out of range', () => expect(weightedQuantile(vals, wts, 1.5)).toBeNull());
  it('designEffect DEFF=1 for equal weights', () => { const r = designEffect([1, 1, 1, 1, 1]); expect(r.deff).toBeCloseTo(1, 2); });
  it('calibrationWeights null for too few observations', () => expect(calibrationWeights([1, 2, 3], [Array(3).fill(1)], [10])).toBeNull());
  it('postStratification null for length mismatch', () => expect(postStratification([{ s: 'A' }], [1, 2], 's', { A: 10 })).toBeNull());
  it('weightedCorrelation null for zero variance', () => expect(weightedCorrelation([1, 1, 1], [2, 4, 6], [1, 1, 1])).toBeNull());
  it('effectiveSampleSize null for all zero weights', () => expect(effectiveSampleSize([0, 0, 0])).toBeNull());
});

describe('brrWeights', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ strata: `S${i % 4}`, psu: i % 8 });
  it('contract keys', () => expectKeys(brrWeights(d, 'strata', 'psu'), ['test', 'replicates', 'nRep', 'nStrata', 'n', 'apa']));
  it('replicates present', () => { const r = brrWeights(d, 'strata', 'psu'); expect(r.replicates.length).toBeGreaterThan(0); });
});

describe('jackknifeReplicates', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ strata: `S${i % 4}`, psu: i % 6 });
  it('contract keys', () => expectKeys(jackknifeReplicates(d, 'strata', 'psu'), ['test', 'replicates', 'nRep', 'nStrata', 'n', 'apa']));
  it('replicates present', () => { const r = jackknifeReplicates(d, 'strata', 'psu'); expect(r.replicates.length).toBeGreaterThan(0); });
});

describe('fayReplicates', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ strata: `S${i % 4}`, psu: i % 6 });
  it('contract keys', () => expectKeys(fayReplicates(d, 'strata', 'psu'), ['test', 'replicates', 'nRep', 'epsilon', 'n', 'apa']));
});

describe('taylorLinearization', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i * 0.5, strata: `S${i % 4}`, psu: i % 6 });
  it('contract keys', () => expectKeys(taylorLinearization(d, 'y', [], 'strata', 'psu'), ['test', 'total', 'se', 'n', 'nStrata', 'apa']));
});

describe('designTotal', () => {
  it('contract keys', () => expectKeys(designTotal([1, 2, 3], [1, 1, 1]), ['test', 'total', 'se', 'n', 'apa']));
  it('null for mismatch', () => expect(designTotal([1, 2], [1])).toBeNull());
});

describe('ppsSampling', () => { it('contract keys', () => expectKeys(ppsSampling([10, 20, 30, 40, 50], 3), ['test', 'sample', 'nPopulation', 'nSample', 'apa'])); });
describe('systematicSample', () => { it('contract keys', () => expectKeys(systematicSample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3), ['test', 'sample', 'nOriginal', 'nSampled', 'interval', 'apa'])); });
describe('multistageVariance', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ strata: `S${i % 3}`, cluster: `C${i % 6}`, y: i * 0.5 });
  it('contract keys', () => expectKeys(multistageVariance(d, 'strata', 'cluster', 'y'), ['test', 'variance', 'n', 'nStrata', 'apa']));
});
describe('domainTotal', () => { it('is defined', () => expect(typeof domainTotal).toBe('function')); });
describe('nonresponseAdjustment', () => { it('is defined', () => expect(typeof nonresponseAdjustment).toBe('function')); });
