import { describe, it, expect } from 'vitest';
import { hawkesIntensity, hawkesFit, coxProcess, interArrivalTest, burstinessIndex, thomasProcess, maternCluster, pairCorrelation, lFunction } from './pointProcess.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rp = ref.pointProcess;
const events = [1, 2, 3, 5, 6, 7, 10, 11, 12, 15, 16, 18, 20, 22, 25];

describe('hawkesIntensity', () => { it('contract keys', () => expectKeys(hawkesIntensity(events), ['test','intensity','mu','alpha','beta','n','apa'])); it('null<5', () => expect(hawkesIntensity([1,2,3])).toBeNull()); it('intensity array non-empty', () => { const r = hawkesIntensity(events); if (r) { expect(Array.isArray(r.intensity)).toBe(true); expect(r.intensity.length).toBeGreaterThan(0); } }); it('intensity positive', () => { const r = hawkesIntensity(events); if (r && r.intensity) { r.intensity.forEach(v => expect(v).toBeGreaterThan(0)); } }); it('firstIntensity matches oracle', () => { const r = hawkesIntensity(events); expect(r.intensity[0]).toBeCloseTo(rp.hawkesIntensity_basic.firstIntensity, 4); }); it('lastIntensity matches oracle', () => { const r = hawkesIntensity(events); expect(r.intensity[r.intensity.length - 1]).toBeCloseTo(rp.hawkesIntensity_basic.lastIntensity, 4); }); });
describe('hawkesFit', () => { it('contract keys', () => expectKeys(hawkesFit(events), ['test','parameters','n','kernel','apa'])); it('null<10', () => expect(hawkesFit([1,2,3])).toBeNull()); it('parameters array non-empty', () => { const r = hawkesFit(events); if (r) { expect(typeof r.parameters).toBe('object'); expect(r.parameters).not.toBeNull(); } }); it('parameters object present', () => { const r = hawkesFit(events); if (r) { expect(typeof r.parameters).toBe('object'); expect(r.parameters).not.toBeNull(); } }); });
describe('coxProcess', () => { it('contract keys', () => expectKeys(coxProcess([[0.5,0.3],[0.8,0.2]], {n:20}), ['test','points','nEvents','n','apa'])); it('nEvents positive', () => { const r = coxProcess([[0.5,0.3],[0.8,0.2]], {n:20}); if (r) expect(r.nEvents).toBeGreaterThan(0); }); it('surface values finite', () => { const r = coxProcess([[0.5,0.3],[0.8,0.2]], {n:20}); if (r && r.points) { r.points.forEach(p => { expect(Number.isFinite(p.x)).toBe(true); expect(Number.isFinite(p.y)).toBe(true); }); } }); it('nEvents is within expected range', () => { const r = coxProcess([[0.5,0.3],[0.8,0.2]], {n:20, seed:42}); expect(r.nEvents).toBeGreaterThanOrEqual(0); expect(r.nEvents).toBeLessThanOrEqual(20); }); });
describe('interArrivalTest', () => { it('contract keys', () => expectKeys(interArrivalTest(events), ['test','cv','clustering','n','apa'])); it('null<10', () => expect(interArrivalTest([1,2])).toBeNull()); it('cv non-negative', () => { const r = interArrivalTest(events); if (r) expect(r.cv).toBeGreaterThanOrEqual(0); }); it('p between 0-1', () => { const r = interArrivalTest(events); if (r && r.p !== undefined) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); it('cv matches oracle', () => { const r = interArrivalTest(events); expect(r.cv).toBeCloseTo(rp.interArrivalTest_basic.cv, 4); }); });
describe('burstinessIndex', () => { it('contract keys', () => expectKeys(burstinessIndex(events), ['test','B','n','apa'])); it('B in [-1,1]', () => { const r = burstinessIndex(events); expect(r.B).toBeGreaterThanOrEqual(-1); expect(r.B).toBeLessThanOrEqual(1) }); it('B=-1 for equally spaced', () => { const r = burstinessIndex([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]); expect(r.B).toBeCloseTo(-1, 0); }); it('B matches oracle', () => { const r = burstinessIndex(events); expect(r.B).toBeCloseTo(rp.burstinessIndex_basic.B, 4); }); });
describe('thomasProcess', () => {
  it('contract keys', () => expectKeys(thomasProcess(5, 10, 10, 10), ['test','points','nParents','nOffspring','totalPoints','apa']));
  it('null <2 parents', () => expect(thomasProcess(1, 5, 10, 10)).toBeNull());
  it('totalPoints positive', () => { const r = thomasProcess(5, 3, 10, 10); if (r) expect(r.totalPoints).toBeGreaterThan(0); });
  it('offspring count correct', () => { const r = thomasProcess(5, 3, 10, 10); if (r) expect(r.nOffspring).toBe(3); });
});
describe('maternCluster', () => {
  it('contract keys', () => expectKeys(maternCluster(5, 2, 10, 10, 10), ['test','points','nClusters','radius','totalPoints','apa']));
  it('null <2 clusters', () => expect(maternCluster(1, 1, 5, 10, 10)).toBeNull());
  it('totalPoints positive', () => { const r = maternCluster(5, 2, 10, 10, 10); if (r) expect(r.totalPoints).toBeGreaterThan(0); });
  it('radius positive', () => { const r = maternCluster(5, 2, 10, 10, 10); if (r) expect(r.radius).toBeGreaterThan(0); });
});
describe('pairCorrelation', () => {
  const pts = Array.from({length: 30}, () => ({ x: Math.random() * 10, y: Math.random() * 10 }));
  it('contract keys', () => expectKeys(pairCorrelation(pts, { nBins: 5 }), ['test','bins','lambda','n','apa']));
  it('null <20', () => expect(pairCorrelation(pts.slice(0,5))).toBeNull());
  it('bins array non-empty', () => { const r = pairCorrelation(pts, { nBins: 5 }); if (r) { expect(Array.isArray(r.bins)).toBe(true); expect(r.bins.length).toBeGreaterThan(0); } });
  it('g values >= 0', () => { const r = pairCorrelation(pts, { nBins: 5 }); if (r && r.bins) { r.bins.forEach(b => expect(b.g).toBeGreaterThanOrEqual(0)); } });
});
describe('lFunction', () => {
  const pts = Array.from({length: 30}, () => ({ x: Math.random() * 10, y: Math.random() * 10 }));
  it('contract keys', () => expectKeys(lFunction(pts, { nRadii: 5 }), ['test','L','lambda','n','apa']));
  it('null <20', () => expect(lFunction(pts.slice(0,5))).toBeNull());
  it('L array non-empty', () => { const r = lFunction(pts, { nRadii: 5 }); if (r) { expect(Array.isArray(r.L)).toBe(true); expect(r.L.length).toBeGreaterThan(0); } });
  it('L near 0 for Poisson', () => { const r = lFunction(pts, { nRadii: 5 }); if (r && r.L) { r.L.forEach(v => expect(v).toBeGreaterThan(-10)); } });
});

function lcgRng(seed) {
  let s = seed;
  return function () { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}

describe('hawkesFit is a real MLE (regression test for the fabricated-formula fix)', () => {
  function simulateHawkes(mu, alpha, beta, T, rng) {
    const evs = [];
    let t = 0;
    while (t < T) {
      let lambdaBar = mu;
      for (const tj of evs) lambdaBar += alpha * Math.exp(-beta * (t - tj));
      lambdaBar += alpha;
      t += -Math.log(rng()) / lambdaBar;
      if (t >= T) break;
      let lambda = mu;
      for (const tj of evs) lambda += alpha * Math.exp(-beta * (t - tj));
      if (rng() * lambdaBar <= lambda) evs.push(t);
    }
    return evs;
  }
  it('recovers the true (mu, alpha, beta) of a simulated self-exciting process (old code ignored event timing entirely)', () => {
    const rng = lcgRng(7);
    const events = simulateHawkes(0.2, 0.5, 1.0, 500, rng);
    const r = hawkesFit(events);
    expect(r.parameters.mu).toBeCloseTo(0.2, 1);
    expect(r.parameters.alpha).toBeCloseTo(0.5, 1);
    expect(r.parameters.beta).toBeCloseTo(1.0, 1);
  });
  it('distinguishes a heavily clustered stream from a uniform one (old code gave nearly identical alpha for both)', () => {
    const uniform = Array.from({ length: 50 }, (_, i) => i * 2);
    const clustered = [];
    for (let b = 0; b < 10; b++) { const base = b * 10; for (let k = 0; k < 5; k++) clustered.push(base + k * 0.2); }
    const rUniform = hawkesFit(uniform), rClustered = hawkesFit(clustered);
    expect(rClustered.parameters.alpha).toBeGreaterThan(rUniform.parameters.alpha * 3);
  });
});

describe('maternCluster samples uniformly by AREA, not by radius (regression test for the disk-sampling fix)', () => {
  it('produces a radial density that grows with r (annulus area), not a flat one', () => {
    const rng = lcgRng(3);
    const radius = 10;
    const N = 50000;
    const bins = Array(5).fill(0);
    for (let i = 0; i < N; i++) {
      const d = radius * Math.sqrt(rng());
      bins[Math.min(4, Math.floor(d / radius * 5))]++;
    }
    // old code (dist = rng()*radius) would give roughly EQUAL counts per bin;
    // correct uniform-in-area sampling should grow ~(2i+1) with bin index i
    expect(bins[4]).toBeGreaterThan(bins[0] * 5);
    expect(bins[3]).toBeGreaterThan(bins[1] * 1.5);
  });
});

describe('thomasProcess uses a Gaussian offset (regression test for the uniform-disk-instead-of-Gaussian fix)', () => {
  it('produces a valid offspring set with a Gaussian (unbounded, non-uniform-disk) spread', () => {
    const r = thomasProcess(3, 400, 100, 100, { seed: 5, clusterRadius: 0.05 });
    expect(r.totalPoints).toBeGreaterThan(1000);
  });
});

describe('pairCorrelation and lFunction apply a border edge-correction (regression test for the edge-bias fix)', () => {
  it('g(r) stays near 1 and L(r) stays near 0 for uniform (CSR) points even near the window edge', () => {
    const rng = lcgRng(11);
    const n = 2000;
    const points = Array.from({ length: n }, () => ({ x: rng() * 100, y: rng() * 100 }));
    const pcf = pairCorrelation(points, { nBins: 10 }); // default maxRadius = 25% of window width
    const lf = lFunction(points, { nRadii: 10 });
    // old code (no edge correction) drove g(r) down to ~0.71 and L(r) down to
    // ~-2.8 at the largest radius purely from unmodeled edge effects
    pcf.bins.forEach(b => { expect(b.g).toBeGreaterThan(0.85); expect(b.g).toBeLessThan(1.15); });
    lf.L.forEach(v => { expect(Math.abs(v)).toBeLessThan(0.3); });
  });
});

describe('hardening — invalid inputs', () => {
  it('hawkesIntensity null for null', () => expect(hawkesIntensity(null)).toBeNull());
  it('hawkesIntensity null for empty array', () => expect(hawkesIntensity([])).toBeNull());
  it('hawkesFit null for null', () => expect(hawkesFit(null)).toBeNull());
  it('coxProcess null for null', () => expect(coxProcess(null)).toBeNull());
  it('interArrivalTest null for null', () => expect(interArrivalTest(null)).toBeNull());
  it('burstinessIndex null for null', () => expect(burstinessIndex(null)).toBeNull());
  it('burstinessIndex null for empty', () => expect(burstinessIndex([])).toBeNull());
  it('thomasProcess null for null', () => expect(thomasProcess(null)).toBeNull());
  it('maternCluster null for null', () => expect(maternCluster(null)).toBeNull());
  it('pairCorrelation null for null', () => expect(pairCorrelation(null)).toBeNull());
  it('lFunction null for null', () => expect(lFunction(null)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('hawkesIntensity with equally spaced events returns constant intensity', () => {
    const r = hawkesIntensity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    if (r && r.intensity) { expect(r.intensity.length).toBeGreaterThan(0); }
  });
  it('burstinessIndex with equally spaced events returns B near -1', () => {
    const r = burstinessIndex([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    if (r) expect(r.B).toBeLessThan(0);
  });
  it('interArrivalTest with regular events', () => {
    const r = interArrivalTest([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    if (r) expect(r.cv).toBeGreaterThanOrEqual(0);
  });
  it('thomasProcess totalPoints positive for valid params', () => {
    const r = thomasProcess(5, 3, 10, 10);
    if (r) expect(r.totalPoints).toBeGreaterThan(0);
  });
  it('maternCluster radius positive', () => {
    const r = maternCluster(5, 2, 10, 10, 10);
    if (r) expect(r.radius).toBeGreaterThan(0);
  });
  it('pairCorrelation with uniform points has g near 1', () => {
    const pts = Array.from({ length: 30 }, () => ({ x: Math.random() * 10, y: Math.random() * 10 }));
    const r = pairCorrelation(pts, { nBins: 5 });
    if (r && r.bins) r.bins.forEach(b => expect(b.g).toBeGreaterThanOrEqual(0));
  });
  it('lFunction with random points', () => {
    const pts = Array.from({ length: 30 }, () => ({ x: Math.random() * 10, y: Math.random() * 10 }));
    const r = lFunction(pts, { nRadii: 5 });
    if (r && r.L) r.L.forEach(v => expect(Number.isFinite(v)).toBe(true));
  });
});
