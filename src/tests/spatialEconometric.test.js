import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { spatialDurbin, spatialPanel, spatialHausman, directIndirectEffects } from './spatialEconometric.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i + Math.random(), x1: i % 3, x2: i % 2, id: Math.floor(i / 4), time: i % 4 });
const W = Array.from({length: 20}, () => Array(20).fill(0.01));

describe('spatialDurbin', () => {
  it('contract keys', () => expectKeys(spatialDurbin(d, 'y', ['x1','x2'], W), ['test','coefficients','rho','n','apa']));
  it('null <10', () => expect(spatialDurbin(d.slice(0,5), 'y', ['x1'], W)).toBeNull());
  it('rho between -1-1', () => { const r = spatialDurbin(d, 'y', ['x1','x2'], W); if (r) { expect(r.rho).toBeGreaterThanOrEqual(-1); expect(r.rho).toBeLessThanOrEqual(1); } });
});
describe('spatialPanel', () => {
  it('contract keys', () => expectKeys(spatialPanel(d, 'y', ['x1','x2'], W, { idVar: 'id', timeVar: 'time' }), ['test','coefficients','spatialRho','nUnits','nPeriods','apa']));
  it('null <15', () => expect(spatialPanel(d.slice(0,5), 'y', ['x1'], W, { idVar: 'id', timeVar: 'time' })).toBeNull());
  it('spatialRho between -1-1', () => { const r = spatialPanel(d, 'y', ['x1','x2'], W, { idVar: 'id', timeVar: 'time' }); if (r) { expect(r.spatialRho).toBeGreaterThanOrEqual(-1); expect(r.spatialRho).toBeLessThanOrEqual(1); } });
});
describe('spatialHausman', () => {
  it('contract keys', () => expectKeys(spatialHausman([0.5, 0.3], [0.1, 0.1], [0.4, 0.25], [0.08, 0.08]), ['test','H','df','p','apa']));
  it('null mismatched', () => expect(spatialHausman([0.5], [0.1], [0.4, 0.25], [0.08])).toBeNull());
  it('H >= 0', () => { const r = spatialHausman([0.5, 0.3], [0.1, 0.1], [0.4, 0.25], [0.08, 0.08]); if (r) expect(r.H).toBeGreaterThanOrEqual(0); });
});
describe('directIndirectEffects', () => {
  const result = { n: 20, rho: 0.3, coefficients: [{ name: 'x1', b: 0.5 }] };
  it('contract keys', () => expectKeys(directIndirectEffects(result), ['test','effects','rho','apa']));
  it('effects non-empty', () => { const r = directIndirectEffects(result); if (r && r.effects) expect(r.effects.length).toBeGreaterThan(0); });
  it('each effect has total', () => { const r = directIndirectEffects(result); if (r && r.effects) { r.effects.forEach(e => { expect(e).toHaveProperty('total'); }); } });
});

describe('directIndirectEffects Total includes the Durbin (WX) term (regression test for the theta-dropping fix)', () => {
  it('Total = (beta + theta) / (1 - rho), the exact closed form for row-standardized W', () => {
    const e = ref.spatialEconometric.direct_indirect_basic;
    const result = {
      n: 20, rho: e.rho,
      coefficients: [{ name: 'x1', b: e.beta }],
      lagCoefficients: [{ name: 'W_x1', b: e.theta }],
    };
    const r = directIndirectEffects(result);
    expect(r.effects[0].direct).toBeCloseTo(e.direct, 4);
    expect(r.effects[0].total).toBeCloseTo(e.total, 4);
  });
});

describe('spatialDurbin is a real ML estimator', () => {
  // SDM DGP on a row-standardized ring lattice: y = 0.6*Wy + 2x - Wx + e.
  const n = 24;
  const W = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
    (j === (i + 1) % n || j === (i - 1 + n) % n) ? 0.5 : 0));
  let s = 424242;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  const x = Array.from({ length: n }, (_, i) => (i % 7) - 3 + 0.3 * rand());
  const Wx = W.map(row => row.reduce((acc, w, j) => acc + w * x[j], 0));
  const bvec = x.map((xi, i) => 2 * xi - Wx[i] + 0.2 * (rand() - 0.5));
  let y = Array(n).fill(0);
  for (let it = 0; it < 500; it++) {
    const Wy = W.map(row => row.reduce((acc, w, j) => acc + w * y[j], 0));
    y = bvec.map((bi, i) => bi + 0.6 * Wy[i]);
  }
  const data = x.map((xi, i) => ({ x: xi, y: y[i] }));
  it('recovers the spatial autoregressive coefficient (~0.6) and X slope (~2)', () => {
    const r = spatialDurbin(data, 'y', ['x'], W);
    expect(r.rho).toBeGreaterThan(0.4);
    expect(r.rho).toBeLessThan(0.8);
    expect(r.coefficients.find(c => c.name === 'x').b).toBeGreaterThan(1.5);
    expect(r.coefficients.find(c => c.name === 'x').b).toBeLessThan(2.5);
  });
});

describe('spatialPanel is a real FE spatial-lag estimator', () => {
  // FE-SAR panel: y_it = 0.4*(Wy)_it + 1.5*x_it + mu_i + e. N=6 units, T=4 periods.
  const N = 6, T = 4, n = N * T;
  const Wn = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) =>
    (j === (i + 1) % N || j === (i - 1 + N) % N) ? 0.5 : 0));
  const W = Array.from({ length: n }, () => Array(n).fill(0));
  for (let t = 0; t < T; t++) for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) W[t * N + u][t * N + v] = Wn[u][v];
  let s = 9090;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  const mu = [0, 2, 4, 6, 8, 10];
  const x = Array.from({ length: n }, (_, i) => (i % 5) - 2 + 0.3 * rand());
  const bvec = Array.from({ length: n }, (_, i) => mu[i % N] + 1.5 * x[i] + 0.2 * (rand() - 0.5));
  let y = Array(n).fill(0);
  for (let it = 0; it < 500; it++) { const Wy = W.map(row => row.reduce((a, w, j) => a + w * y[j], 0)); y = bvec.map((bi, i) => bi + 0.4 * Wy[i]); }
  const data = Array.from({ length: n }, (_, i) => ({ id: i % N, time: Math.floor(i / N), x: x[i], y: y[i] }));
  it('recovers the spatial rho (~0.4) and slope (~1.5)', () => {
    const r = spatialPanel(data, 'y', ['x'], W, { idVar: 'id', timeVar: 'time' });
    expect(r.spatialRho).toBeGreaterThan(0.3);
    expect(r.spatialRho).toBeLessThan(0.55);
    expect(r.coefficients.find(c => c.name === 'x').b).toBeGreaterThan(1.0);
    expect(r.coefficients.find(c => c.name === 'x').b).toBeLessThan(2.0);
  });
});

describe('spatialHausman uses the chi-square distribution (not exp(-H/2))', () => {
  it('matches the chi-square tail for df=1', () => {
    // H=1, df=1 => chi-square tail = 0.317; the old exp(-H/2) gives 0.607.
    const r = spatialHausman([1], [1.005], [0], [0.1]);
    expect(r.p).toBeLessThan(0.45);
    expect(r.p).toBeGreaterThan(0.2);
  });
});
