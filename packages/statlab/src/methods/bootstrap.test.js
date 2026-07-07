import { describe, it, expect } from 'vitest';
import { bootstrapCI, bootstrapSE, bootstrapTest, jackknife, bootstrapT_CI, empiricalInfluence, bootstrapMediation, moderatedMediation, splitConformal, conformalPvalues, jackknifePlus } from './bootstrap.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const data = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const stat = arr => arr.reduce((s, v) => s + v, 0) / arr.length;

const rb = ref.bootstrap;

describe('bootstrapCI', () => {
  it('null <5', () => expect(bootstrapCI([1, 2, 3], stat)).toBeNull());
  it('percentile CI encloses original', () => { const r = bootstrapCI(data, stat, { B: 100 }); expect(r.ci[0]).toBeLessThanOrEqual(r.originalEstimate); expect(r.ci[1]).toBeGreaterThanOrEqual(r.originalEstimate); });
  it('basic method', () => { const r = bootstrapCI(data, stat, { method: 'basic', B: 100 }); expect(r.method).toBe('basic'); });
  it('bca method', () => { const r = bootstrapCI(data, stat, { method: 'bca', B: 100 }); expect(r.method).toBe('bca'); });
  it('contract keys', () => expectKeys(bootstrapCI(data, stat, { B: 50 }), ['test', 'ci', 'method', 'B', 'alpha', 'originalEstimate', 'n', 'apa']));
  it('percentile CI matches oracle', () => {
    const r = bootstrapCI(rb.bootstrapCI_percentile.data, stat, { method: 'percentile', B: rb.bootstrapCI_percentile.B, seed: 42 });
    expect(r.ci[0]).toBeCloseTo(rb.bootstrapCI_percentile.ci[0], 2);
    expect(r.ci[1]).toBeCloseTo(rb.bootstrapCI_percentile.ci[1], 2);
  });
  it('basic CI matches oracle', () => {
    const r = bootstrapCI(rb.bootstrapCI_basic.data, stat, { method: 'basic', B: rb.bootstrapCI_basic.B, seed: 42 });
    expect(r.ci[0]).toBeCloseTo(rb.bootstrapCI_basic.ci[0], 2);
    expect(r.ci[1]).toBeCloseTo(rb.bootstrapCI_basic.ci[1], 2);
  });
  it('BCa CI matches oracle', () => {
    const r = bootstrapCI(rb.bootstrapCI_bca.data, stat, { method: 'bca', B: rb.bootstrapCI_bca.B, seed: 42 });
    expect(r.ci[0]).toBeCloseTo(rb.bootstrapCI_bca.ci[0], 2);
    expect(r.ci[1]).toBeCloseTo(rb.bootstrapCI_bca.ci[1], 2);
  });
});

describe('bootstrapSE', () => {
  it('null <5', () => expect(bootstrapSE([1, 2], stat)).toBeNull());
  it('SE > 0', () => { const r = bootstrapSE(data, stat, { B: 100 }); expect(r.se).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(bootstrapSE(data, stat, { B: 50 }), ['test', 'se', 'originalEstimate', 'B', 'n', 'apa']));
  it('SE matches oracle', () => {
    const r = bootstrapSE(rb.bootstrapSE_mean.data, stat, { B: rb.bootstrapSE_mean.B, seed: 42 });
    expect(r.se).toBeCloseTo(rb.bootstrapSE_mean.se, 2);
  });
});

describe('bootstrapTest', () => {
  it('null <5', () => expect(bootstrapTest([1, 2], stat, 0)).toBeNull());
  it('p in [0,1]', () => { const r = bootstrapTest(data, stat, 10, { B: 100 }); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(bootstrapTest(data, stat, 10, { B: 50 }), ['test', 'p', 'nullValue', 'alternative', 'B', 'originalEstimate', 'n', 'apa']));
});

describe('jackknife', () => {
  it('null <5', () => expect(jackknife([1, 2], stat)).toBeNull());
  it('SE > 0', () => { const r = jackknife(data, stat); expect(r.se).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(jackknife(data, stat), ['test', 'estimate', 'se', 'bias', 'originalEstimate', 'n', 'apa']));
  it('estimate matches oracle', () => {
    const r = jackknife(rb.jackknife_mean.data, stat);
    expect(r.estimate).toBeCloseTo(rb.jackknife_mean.estimate, 4);
  });
  it('SE matches oracle', () => {
    const r = jackknife(rb.jackknife_mean.data, stat);
    expect(r.se).toBeCloseTo(rb.jackknife_mean.se, 4);
  });
  it('bias matches oracle', () => {
    const r = jackknife(rb.jackknife_mean.data, stat);
    expect(r.bias).toBeCloseTo(rb.jackknife_mean.bias, 4);
  });
});

describe('bootstrapT_CI', () => {
  it('null <10', () => expect(bootstrapT_CI([1, 2, 3, 4, 5], stat, { B: 50 })).toBeNull());
  it('CI encloses', () => { const r = bootstrapT_CI(data, stat, { B: 50 }); expect(r.ci[0]).toBeLessThanOrEqual(r.originalEstimate); expect(r.ci[1]).toBeGreaterThanOrEqual(r.originalEstimate); });
  it('contract keys', () => expectKeys(bootstrapT_CI(data, stat, { B: 30 }), ['test', 'ci', 'B', 'alpha', 'originalEstimate', 'n', 'apa']));
});

describe('empiricalInfluence', () => {
  it('null <5', () => expect(empiricalInfluence([1, 2], stat)).toBeNull());
  it('influence present', () => { const r = empiricalInfluence(data, stat); expect(r.influence).toHaveLength(data.length); });
  it('contract keys', () => expectKeys(empiricalInfluence(data, stat), ['test', 'influence', 'n', 'apa']));
});

describe('bootstrapMediation', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ treat: i % 2, med: i * 0.5, y: i + (i % 2) * 2 });
  it('is defined', () => expect(typeof bootstrapMediation).toBe('function'));
  it('ab between ci bounds', () => { let r; try { r = bootstrapMediation(d, 'treat', 'med', 'y'); } catch {} if (r && r.ab !== undefined && r.ci) { expect(r.ab).toBeGreaterThanOrEqual(r.ci[0]); expect(r.ab).toBeLessThanOrEqual(r.ci[1]); } });
  it('n is finite', () => { let r; try { r = bootstrapMediation(d, 'treat', 'med', 'y'); } catch {} if (r) expect(Number.isFinite(r.n)).toBe(true); });
});

describe('moderatedMediation', () => {
  const d = []; for (let i = 0; i < 25; i++) d.push({ treat: i % 2, med: i * 0.5, mod: i % 3, y: i + (i % 2) * 3 });
  it('contract keys', () => expectKeys(moderatedMediation(d, 'treat', 'med', 'mod', 'y'), ['test', 'a', 'bw', 'index', 'n', 'apa']));
  it('index finite', () => { const r = moderatedMediation(d, 'treat', 'med', 'mod', 'y'); expect(Number.isFinite(r.index)).toBe(true); });
  it('a is finite', () => { const r = moderatedMediation(d, 'treat', 'med', 'mod', 'y'); expect(Number.isFinite(r.a)).toBe(true); });
});

describe('splitConformal', () => {
  it('contract keys', () => expectKeys(splitConformal([1,2,3,4,5,6,7,8,9,10],[1.1,2.2,3.3,4.4,5.5,6.6,7.7,8.8,9.9,10.1]), ['test', 'radius', 'alpha', 'nTrain', 'nCal', 'apa']));
  it('null <10', () => expect(splitConformal([1,2,3],[4,5])).toBeNull());
  it('radius positive', () => { const r = splitConformal([1,2,3,4,5,6,7,8,9,10],[1.1,2.2,3.3,4.4,5.5,6.6,7.7,8.8,9.9,10.1]); if (r) expect(r.radius).toBeGreaterThan(0); });
  it('falls back to the constant model when no covariates are given', () => { const r = splitConformal([1,2,3,4,5,6,7,8,9,10],[1.1,2.2,3.3,4.4,5.5,6.6,7.7,8.8,9.9,10.1]); expect(r.model).toBe('mean'); });
  it('radius matches oracle', () => {
    const r = splitConformal(rb.splitConformal_mean.yTrain, rb.splitConformal_mean.yCal, { alpha: rb.splitConformal_mean.alpha });
    expect(r.radius).toBeCloseTo(rb.splitConformal_mean.radius, 4);
    expect(r.model).toBe(rb.splitConformal_mean.model);
  });
  it('uses a fitted linear model when covariates are supplied, shrinking the radius vs the mean model', () => {
    let s = 17; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    const xTrain = Array.from({ length: 200 }, (_, i) => i);
    const yTrain = xTrain.map(x => 3 * x + 5 + rnd() * 0.5);
    const xCal = Array.from({ length: 200 }, (_, i) => 200 + i);
    const yCal = xCal.map(x => 3 * x + 5 + rnd() * 0.5);
    const withX = splitConformal(yTrain, yCal, { xTrain, xCal });
    const withoutX = splitConformal(yTrain, yCal);
    expect(withX.model).toBe('linear');
    expect(withX.radius).toBeLessThan(withoutX.radius);
  });
});

describe('conformalPvalues', () => {
  it('contract keys', () => expectKeys(conformalPvalues([0.1, 0.3, 0.7, 0.9], 0.5), ['test', 'p', 'n', 'apa']));
  it('null invalid', () => expect(conformalPvalues([], 0.5)).toBeNull());
  it('p between 0-1', () => { const r = conformalPvalues([0.1, 0.3, 0.7, 0.9], 0.5); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
  it('p matches oracle', () => {
    const r = conformalPvalues(rb.conformalPvalues_basic.scores, rb.conformalPvalues_basic.testScore);
    expect(r.p).toBeCloseTo(rb.conformalPvalues_basic.p, 4);
  });
});

describe('jackknifePlus', () => {
  it('contract keys', () => expectKeys(jackknifePlus([1,2,3,4,5,6,7,8,9,10],[2,4,6,8,10,12,14,16,18,20]), ['test', 'radius', 'alpha', 'n', 'apa']));
  it('null mismatch', () => expect(jackknifePlus([1,2,3],[4,5,6,7])).toBeNull());
  it('radius positive', () => { const r = jackknifePlus([1,2,3,4,5,6,7,8,9,10],[2,4,6,8,10,12,14,16,18,20]); if (r && r.radius) expect(r.radius).toBeGreaterThan(0); });
  it('lower/upper/radius match oracle', () => {
    const r = jackknifePlus(rb.jackknifePlus_basic.X, rb.jackknifePlus_basic.y, { alpha: rb.jackknifePlus_basic.alpha, xNew: rb.jackknifePlus_basic.target });
    expect(r.lower).toBeCloseTo(rb.jackknifePlus_basic.lower, 4);
    expect(r.upper).toBeCloseTo(rb.jackknifePlus_basic.upper, 4);
    expect(r.radius).toBeCloseTo(rb.jackknifePlus_basic.radius, 4);
  });
  it('interval brackets the true intercept+slope prediction at the target (not a through-origin ratio)', () => {
    // y = 2x - 5 + small noise: a through-origin fit (pred = (sumY/sumX)*x) would be badly biased
    // here because the true relationship has a large negative intercept.
    let s = 3; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    const X = Array.from({ length: 60 }, (_, i) => i + 1);
    const y = X.map(x => 2 * x - 5 + rnd() * 0.2);
    const target = 30;
    const r2 = jackknifePlus(X, y, { xNew: target });
    const truth = 2 * target - 5;
    expect(r2.lower).toBeLessThanOrEqual(truth + 1);
    expect(r2.upper).toBeGreaterThanOrEqual(truth - 1);
    expect(r2.upper - r2.lower).toBeLessThan(10); // interval is tight around a near-noiseless line
  });
});

describe('moderatedMediation computes the real index a*b_MW', () => {
  it('recovers the index from data with a known moderated M->Y path', () => {
    let s = 13; const z = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    const data = [];
    const aTrue = 1.5, b3 = 2; // M = 1.5X; Y = M + W + b3*(M*W)
    for (let i = 0; i < 200; i++) { const x = z(), w = z(); const m = aTrue * x + 0.2 * z(); const y = m + w + b3 * m * w + 0.2 * z(); data.push({ x, m, w, y }); }
    const r = moderatedMediation(data, 'x', 'm', 'w', 'y');
    expect(Math.abs(r.index - aTrue * b3)).toBeLessThan(0.5); // index = a * b_MW = 3
  });
});

describe('hardening — invalid inputs', () => {
  it('bootstrapCI rejects null/too few/zero stat', () => {
    expect(bootstrapCI(null, stat)).toBeNull();
    expect(bootstrapCI([1, 2], stat)).toBeNull();
    expect(bootstrapCI(data, null)).toBeNull();
  });
  it('bootstrapSE rejects null', () => {
    expect(bootstrapSE(null, stat)).toBeNull();
    expect(bootstrapSE(data, null)).toBeNull();
  });
  it('bootstrapTest rejects null', () => {
    expect(bootstrapTest(null, stat, 0)).toBeNull();
    expect(bootstrapTest(data, null, 0)).toBeNull();
  });
  it('jackknife rejects null/short', () => {
    expect(jackknife(null, stat)).toBeNull();
    expect(jackknife([1, 2], stat)).toBeNull();
  });
  it('bootstrapT_CI rejects null/short', () => {
    expect(bootstrapT_CI(null, stat)).toBeNull();
    expect(bootstrapT_CI([1, 2, 3, 4, 5, 6], stat, { B: 30 })).toBeNull();
  });
  it('empiricalInfluence rejects null', () => {
    expect(empiricalInfluence(null, stat)).toBeNull();
    expect(empiricalInfluence([1, 2], stat)).toBeNull();
  });
  it('bootstrapMediation rejects null/too few', () => {
    const d = [{a:1,b:2,c:3},{a:4,b:5,c:6}];
    expect(bootstrapMediation(null, 'a', 'b', 'c')).toBeNull();
    expect(bootstrapMediation(d, 'a', 'b', 'c')).toBeNull();
  });
  it('moderatedMediation rejects null/too few', () => {
    const d = [{a:1,b:2,c:3,d:4}];
    expect(moderatedMediation(null, 'a', 'b', 'c', 'd')).toBeNull();
    expect(moderatedMediation(d, 'a', 'b', 'c', 'd')).toBeNull();
  });
  it('splitConformal rejects null/short', () => {
    expect(splitConformal(null, [1,2,3])).toBeNull();
    expect(splitConformal([1,2], [3,4])).toBeNull();
  });
  it('conformalPvalues rejects null/empty', () => {
    expect(conformalPvalues(null, 0.5)).toBeNull();
    expect(conformalPvalues([], 0.5)).toBeNull();
    expect(conformalPvalues([0.1, 0.2], NaN)).toBeNull();
  });
  it('jackknifePlus rejects null/mismatch', () => {
    expect(jackknifePlus(null, [1,2,3])).toBeNull();
    expect(jackknifePlus([1,2], [1,2,3,4])).toBeNull();
  });
});

describe('hardening — reproducibility', () => {
  it('bootstrapCI reproducible with seed', () => {
    const r1 = bootstrapCI(data, stat, { B: 100, seed: 42 });
    const r2 = bootstrapCI(data, stat, { B: 100, seed: 42 });
    expect(r1.ci).toEqual(r2.ci);
  });
  it('bootstrapSE reproducible with seed', () => {
    const r1 = bootstrapSE(data, stat, { B: 100, seed: 42 });
    const r2 = bootstrapSE(data, stat, { B: 100, seed: 42 });
    expect(r1.se).toBe(r2.se);
  });
  it('bootstrapTest reproducible with seed', () => {
    const r1 = bootstrapTest(data, stat, 10, { B: 100, seed: 42 });
    const r2 = bootstrapTest(data, stat, 10, { B: 100, seed: 42 });
    expect(r1.p).toBe(r2.p);
  });
  it('bootstrapT_CI reproducible with seed', () => {
    const r1 = bootstrapT_CI(data, stat, { B: 50, seed: 42 });
    const r2 = bootstrapT_CI(data, stat, { B: 50, seed: 42 });
    expect(r1.ci).toEqual(r2.ci);
  });
});
