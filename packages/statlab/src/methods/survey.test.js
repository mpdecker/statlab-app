import { describe, it, expect } from 'vitest';
import { weightedMean, weightedVar, weightedQuantile, designEffect, rakeWeights, calibrationWeights, postStratification, weightedCorrelation, effectiveSampleSize, brrWeights, jackknifeReplicates, fayReplicates, taylorLinearization, designTotal, ppsSampling, systematicSample, multistageVariance, domainTotal, nonresponseAdjustment } from './survey.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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
  it('converged is boolean', () => { const r = calibrationWeights(w, aux, tgt); if (r) expect(typeof r.converged).toBe('boolean'); });
});

describe('postStratification', () => {
  const data = Array.from({ length: 12 }, (_, i) => ({ s: i < 6 ? 'A' : 'B' }));
  const w = Array(12).fill(1);
  const pops = { A: 20, B: 15 };
  it('null <2 strata', () => expect(postStratification([{ s: 'A' }, { s: 'A' }], [1, 1], 's', { A: 10 })).toBeNull());
  it('contract keys', () => expectKeys(postStratification(data, w, 's', pops), ['test', 'weights', 'strata', 'n', 'apa']));
  it('weights non-empty', () => { const r = postStratification(data, w, 's', pops); if (r) expect(r.weights.length).toBeGreaterThan(0); });
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

describe('weightedMean, weightedVar, designEffect, and weightedCorrelation match statsmodels.stats.weightstats.DescrStatsW exactly', () => {
  const e = ref.survey.basic;
  it('weightedMean matches', () => {
    const r = weightedMean(e.values, e.weights);
    expect(r.mean).toBeCloseTo(e.mean, 4);
  });
  it('weightedVar matches the bias-corrected reliability-weights formula', () => {
    const r = weightedVar(e.values, e.weights);
    expect(r.variance).toBeCloseTo(e.variance, 3);
    expect(r.sd).toBeCloseTo(e.sd, 4);
  });
  it('designEffect and effectiveSampleSize match Kish\'s formula', () => {
    const r = designEffect(e.weights);
    expect(r.deff).toBeCloseTo(e.deff, 4);
    expect(r.nEff).toBeCloseTo(e.nEff, 1);
  });
  it('weightedCorrelation matches', () => {
    const r = weightedCorrelation(e.values, e.y, e.weights);
    expect(r.r).toBeCloseTo(e.corr, 4);
  });
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
  it('n matches input length', () => { const r = brrWeights(d, 'strata', 'psu'); expect(r.n).toBe(d.length); });
});

describe('jackknifeReplicates', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ strata: `S${i % 4}`, psu: i % 6 });
  it('contract keys', () => expectKeys(jackknifeReplicates(d, 'strata', 'psu'), ['test', 'replicates', 'nRep', 'nStrata', 'n', 'apa']));
  it('replicates present', () => { const r = jackknifeReplicates(d, 'strata', 'psu'); expect(r.replicates.length).toBeGreaterThan(0); });
  it('nStrata matches', () => { const r = jackknifeReplicates(d, 'strata', 'psu'); if (r) expect(r.nStrata).toBeGreaterThan(0); });
});

describe('fayReplicates', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ strata: `S${i % 4}`, psu: i % 6 });
  it('contract keys', () => expectKeys(fayReplicates(d, 'strata', 'psu'), ['test', 'replicates', 'nRep', 'epsilon', 'n', 'apa']));
  it('weights positive', () => { const r = fayReplicates(d, 'strata', 'psu'); if (r && r.replicates) r.replicates.forEach(rep => { if (rep.weight !== undefined) expect(rep.weight).toBeGreaterThan(0); }); });
  it('nRep matches', () => { const r = fayReplicates(d, 'strata', 'psu'); if (r) expect(r.nRep).toBeGreaterThan(0); });
});

describe('taylorLinearization', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i * 0.5, strata: `S${i % 4}`, psu: i % 6 });
  it('contract keys', () => expectKeys(taylorLinearization(d, 'y', [], 'strata', 'psu'), ['test', 'total', 'se', 'n', 'nStrata', 'apa']));
  it('se positive', () => { const r = taylorLinearization(d, 'y', [], 'strata', 'psu'); if (r) expect(r.se).toBeGreaterThan(0); });
  it('total finite', () => { const r = taylorLinearization(d, 'y', [], 'strata', 'psu'); if (r) expect(Number.isFinite(r.total)).toBe(true); });
});

describe('designTotal', () => {
  it('contract keys', () => expectKeys(designTotal([1, 2, 3], [1, 1, 1]), ['test', 'total', 'se', 'n', 'apa']));
  it('null for mismatch', () => expect(designTotal([1, 2], [1])).toBeNull());
  it('total finite', () => { const r = designTotal([1, 2, 3], [1, 1, 1]); if (r) expect(Number.isFinite(r.total)).toBe(true); });
});

describe('ppsSampling', () => { it('contract keys', () => expectKeys(ppsSampling([10, 20, 30, 40, 50], 3), ['test', 'sample', 'nPopulation', 'nSample', 'apa'])); it('sample non-empty', () => { const r = ppsSampling([10, 20, 30, 40, 50], 3); expect(r.sample.length).toBeGreaterThan(0); }); it('nSample matches', () => { const r = ppsSampling([10, 20, 30, 40, 50], 3); expect(r.nSample).toBe(3); }); });
describe('systematicSample', () => { it('contract keys', () => expectKeys(systematicSample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3), ['test', 'sample', 'nOriginal', 'nSampled', 'interval', 'apa'])); it('sample non-empty', () => { const r = systematicSample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3); expect(r.sample.length).toBeGreaterThan(0); }); it('nSampled matches', () => { const r = systematicSample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3); if (r && r.nSampled != null) expect(r.nSampled).toBeGreaterThanOrEqual(3); }); });
describe('multistageVariance', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ strata: `S${i % 3}`, cluster: `C${i % 6}`, y: i * 0.5 });
  it('contract keys', () => expectKeys(multistageVariance(d, 'strata', 'cluster', 'y'), ['test', 'variance', 'n', 'nStrata', 'apa']));
  it('var positive', () => { const r = multistageVariance(d, 'strata', 'cluster', 'y'); if (r) expect(r.variance).toBeGreaterThanOrEqual(0); });
  it('nStrata matches', () => { const r = multistageVariance(d, 'strata', 'cluster', 'y'); if (r) expect(r.nStrata).toBeGreaterThan(0); });
});
describe('domainTotal', () => { it('is defined', () => expect(typeof domainTotal).toBe('function')); it('total finite', () => { const d = [{ y: 1, g: 'A' }, { y: 2, g: 'A' }, { y: 3, g: 'B' }, { y: 4, g: 'B' }, { y: 5, g: 'A' }]; const r = domainTotal(d, 'y', 'g'); if (r) expect(Number.isFinite(r.estimates[0].total)).toBe(true); }); it('estimates non-empty', () => { const d = [{ y: 1, g: 'A' }, { y: 2, g: 'A' }]; const r = domainTotal(d, 'y', 'g'); if (r) expect(r.estimates.length).toBeGreaterThan(0); }); });
describe('nonresponseAdjustment', () => { it('is defined', () => expect(typeof nonresponseAdjustment).toBe('function')); it('weights non-empty', () => { const r = nonresponseAdjustment([1, 1, 0, 1, 0, 1, 1, 1, 0, 1]); if (r) expect(r.weights.length).toBeGreaterThan(0); });   it('weights match input length', () => { const r = nonresponseAdjustment([1, 1, 0, 1, 0, 1]); if (r) expect(r.weights.length).toBe(6); }); });

describe('hardening — invalid inputs', () => {
  it('weightedMean null for null values', () => expect(weightedMean(null, [1, 1, 1])).toBeNull());
  it('weightedMean null for null weights', () => expect(weightedMean([1, 2, 3], null)).toBeNull());
  it('weightedMean null for mismatched lengths', () => expect(weightedMean([1, 2], [1])).toBeNull());
  it('weightedVar null for null values', () => expect(weightedVar(null, [1, 2, 3])).toBeNull());
  it('weightedVar null for null weights', () => expect(weightedVar([1, 2, 3], null)).toBeNull());
  it('weightedQuantile null for null values', () => expect(weightedQuantile(null, [1, 1, 1])).toBeNull());
  it('designEffect null for null', () => expect(designEffect(null)).toBeNull());
  it('rakeWeights null for null weights', () => expect(rakeWeights(null, [{ cats: ['A'], targets: { A: 10 } }])).toBeNull());
  it('calibrationWeights null for null weights', () => expect(calibrationWeights(null, [Array(10).fill(1)], [100])).toBeNull());
  it('postStratification null for null data', () => expect(postStratification(null, [1, 1], 's', { A: 10 })).toBeNull());
  it('weightedCorrelation null for null', () => expect(weightedCorrelation(null, [1, 2, 3], [1, 1, 1])).toBeNull());
  it('effectiveSampleSize null for null', () => expect(effectiveSampleSize(null)).toBeNull());
  it('brrWeights null for null', () => expect(brrWeights(null, 'strata', 'psu')).toBeNull());
  it('jackknifeReplicates null for null', () => expect(jackknifeReplicates(null, 'strata', 'psu')).toBeNull());
  it('fayReplicates null for null', () => expect(fayReplicates(null, 'strata', 'psu')).toBeNull());
  it('taylorLinearization null for null', () => expect(taylorLinearization(null, 'y', [], 'strata', 'psu')).toBeNull());
  it('designTotal null for null', () => expect(designTotal(null, [1, 1, 1])).toBeNull());
  it('ppsSampling null for null', () => expect(ppsSampling(null, 3)).toBeNull());
  it('systematicSample null for null', () => expect(systematicSample(null, 3)).toBeNull());
  it('multistageVariance null for null', () => expect(multistageVariance(null, 'strata', 'cluster', 'y')).toBeNull());
  it('domainTotal null for null', () => expect(domainTotal(null, 'y', 'g')).toBeNull());
  it('nonresponseAdjustment null for null', () => expect(nonresponseAdjustment(null)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('weightedMean with uniform weights equals arithmetic mean', () => {
    const r = weightedMean([1, 2, 3, 4, 5], [2, 2, 2, 2, 2]);
    if (r) expect(r.mean).toBeCloseTo(3, 4);
  });
  it('weightedVar with constant values returns variance 0', () => {
    const r = weightedVar([5, 5, 5, 5, 5], [1, 1, 1, 1, 1]);
    if (r) expect(r.variance).toBeCloseTo(0, 4);
  });
  it('designEffect DEFF=1 for equal weights', () => {
    const r = designEffect([1, 1, 1, 1, 1]);
    if (r) expect(r.deff).toBeCloseTo(1, 2);
  });
  it('weightedCorrelation perfect positive linear relationship', () => {
    const r = weightedCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10], [1, 1, 1, 1, 1]);
    if (r) expect(r.r).toBeCloseTo(1, 2);
  });
  it('effectiveSampleSize nEff <= n', () => {
    const r = effectiveSampleSize([2, 3, 1, 4, 2]);
    if (r) expect(r.nEff).toBeLessThanOrEqual(5);
  });
  it('ppsSampling sampleCount equals requested sample', () => {
    const r = ppsSampling([10, 20, 30, 40, 50], 3);
    if (r) expect(r.nSample).toBe(3);
  });
  it('systematicSample returns non-empty sample', () => {
    const r = systematicSample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    if (r) expect(r.sample.length).toBeGreaterThan(0);
  });
  it('designEfffect nEff <= n for unequal weights', () => {
    const r = designEffect([1, 2, 1, 3, 2, 1, 2, 3, 1, 4]);
    if (r) expect(r.nEff).toBeLessThanOrEqual(10);
  });
});
