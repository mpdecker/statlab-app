import { describe, it, expect } from 'vitest';
import { starModel, gstarModel, spaceTimeInteraction, spatiotemporalMoran, spaceTimeForecast } from './spatialTemporal.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i * 0.5 + Math.sin(i), x1: i, x2: i % 3, time: i });
const W = Array.from({ length: 20 }, () => Array(20).fill(0)).map((r, i) => r.map((_, j) => i !== j && Math.abs(i - j) < 3 ? 1 / 2 : 0));

describe('starModel', () => {
  it('contract keys', () => { const r = starModel(d, 'y', ['x1', 'x2'], W); if (r) expectKeys(r, ['test', 'rho', 'coefficients', 'rSquared', 'n', 'apa']); });
  it('null <10', () => expect(starModel(d.slice(0, 5), 'y', ['x1'], W.slice(0, 5).map(r => r.slice(0, 5)))).toBeNull());
  it('coefficients present', () => { const r = starModel(d, 'y', ['x1'], W, { timeVar: 'time' }); if (r) { expect(r.coefficients.length).toBeGreaterThan(0); r.coefficients.forEach(c => expect(typeof c.name).toBe('string')); } });
  it('returns result without time var', () => { const r = starModel(d, 'y', ['x1'], W); expect(r).not.toBeNull(); });
  it('rho and coefficients match numpy OLS oracle', () => {
    const o = ref.spatialTemporal.starModel_basic;
    const r = starModel(o.data, 'y', ['x1', 'x2'], o.W);
    expect(r.rho).toBeCloseTo(o.rho, 4);
    expect(r.rSquared).toBeCloseTo(o.rSquared, 4);
    const cx1 = r.coefficients.find(c => c.name === 'x1');
    const cx2 = r.coefficients.find(c => c.name === 'x2');
    expect(cx1.b).toBeCloseTo(o.bX1, 4);
    expect(cx2.b).toBeCloseTo(o.bX2, 4);
  });
});

describe('gstarModel', () => {
  it('contract keys', () => { const r = gstarModel(d, 'y', ['x1'], W); if (r) expectKeys(r, ['test', 'rho', 'coefficients', 'n', 'apa']); });
  it('returns result without time var', () => { const r = gstarModel(d, 'y', ['x1'], W); expect(r).not.toBeNull(); });
  it('coefficients non-empty', () => { const r = gstarModel(d, 'y', ['x1'], W); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
});
describe('spaceTimeInteraction', () => {
  it('contract keys', () => expectKeys(spaceTimeInteraction(d, 'y', ['x1'], 'time'), ['test', 'interaction', 'n', 'apa']));
  it('returns finite p', () => { const r = spaceTimeInteraction(d, 'y', ['x1'], 'time'); if (r && r.interaction !== undefined) expect(Number.isFinite(r.interaction)).toBe(true); });
  it('n matches data length', () => { const r = spaceTimeInteraction(d, 'y', ['x1'], 'time'); if (r) expect(r.n).toBe(d.length); });
});
describe('spatiotemporalMoran', () => {
  it('contract keys', () => expectKeys(spatiotemporalMoran(d, 'y', 'time'), ['test', 'I', 'n', 'apa']));
  it('I between -1 and 1', () => { const r = spatiotemporalMoran(d, 'y', ['x1'], W, { timeVar: 'time' }); if (r) { expect(r.I).toBeGreaterThanOrEqual(-1); expect(r.I).toBeLessThanOrEqual(1); } });
  it('n finite', () => { const r = spatiotemporalMoran(d, 'y', ['x1'], W, { timeVar: 'time' }); if (r) expect(Number.isFinite(r.n)).toBe(true); });
});
describe('spaceTimeForecast', () => {
  it('contract keys', () => expectKeys(spaceTimeForecast({ rho: 0.5 }), ['test', 'forecasts', 'nSteps', 'apa']));
  it('forecast array present', () => { const r = spaceTimeForecast(starModel(d, 'y', ['x1'], W), 2); if (r) { expect(Array.isArray(r.forecasts)).toBe(true); expect(r.forecasts.length).toBeGreaterThan(0); } });
  it('nSteps matches', () => { const r = spaceTimeForecast(starModel(d, 'y', ['x1'], W), 2); if (r) expect(r.nSteps).toBe(2); });
});

// Controlled spatial-lag DGP on a ring lattice: y = (I-ρW)^-1 (Xβ + ε).
import { matInv as _matInv } from '../math/matrix.js';
function ringSpatialData(n, rho, beta) {
  const W = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (j === (i + 1) % n || j === (i - 1 + n) % n) ? 0.5 : 0));
  let s = 17; const z = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
  const x = Array.from({ length: n }, () => z());
  const rhs = x.map(xi => beta * xi + z() * 0.3);
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0) - rho * W[i][j]));
  const Ainv = _matInv(I);
  const y = Ainv.map(row => row.reduce((a, v, j) => a + v * rhs[j], 0));
  const data = y.map((yi, i) => ({ y: yi, x1: x[i] }));
  return { data, W };
}

describe('starModel uses consistent spatial-lag estimation (2SLS)', () => {
  it('recovers the true spatial autoregressive parameter rho', () => {
    const { data, W } = ringSpatialData(40, 0.6, 2);
    const r = starModel(data, 'y', ['x1'], W);
    expect(Math.abs(r.rho - 0.6)).toBeLessThan(0.15);
  });
});

describe('spaceTimeForecast propagates the fitted spatial-lag dynamics forward', () => {
  it('one-step forecast matches ρ·W·y + Xβ computed directly from the fitted model', () => {
    const { data, W } = ringSpatialData(30, 0.4, 1.5);
    const r = starModel(data, 'y', ['x1'], W);
    const f = spaceTimeForecast(r, 1);
    const y0 = data.map(row => row.y);
    const x1 = data.map(row => row.x1);
    const betaX = r.coefficients[0].b;
    const Wy = W.map(row => row.reduce((s, wi, j) => s + wi * y0[j], 0));
    const expected = Wy.map((wy, i) => r.rho * wy + betaX * x1[i]);
    const expectedMean = expected.reduce((a, b) => a + b, 0) / expected.length;
    expect(f.forecasts[0]).toBeCloseTo(expectedMean, 2);
  });
  it('forecast converges to the analytic fixed point (I-ρW)⁻¹Xβ as steps grow', () => {
    const { data, W } = ringSpatialData(30, 0.4, 1.5);
    const r = starModel(data, 'y', ['x1'], W);
    const f = spaceTimeForecast(r, 60);
    expect(f.equilibrium).not.toBeNull();
    expect(Math.abs(f.forecasts[59] - f.equilibrium)).toBeLessThan(0.01);
  });
  it('falls back to geometric ρ^h decay when no spatial state is supplied', () => {
    const f = spaceTimeForecast({ rho: 0.5 }, 3);
    expect(f.forecasts).toHaveLength(3);
    expect(f.forecasts[0]).toBeCloseTo(0.5, 4);
    expect(f.forecasts[2]).toBeCloseTo(0.125, 4);
  });
});

describe('spatiotemporalMoran computes the standard normalized Moran I', () => {
  it('matches the (n/S0)·Σwᵢⱼzᵢzⱼ/Σzᵢ² formula with temporal contiguity', () => {
    let s = 5; const z = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const data = []; let v = 0;
    for (let t = 0; t < 30; t++) { v = 0.7 * v + z() * 0.3; data.push({ y: v, time: t }); }
    const n = data.length, y = data.map(d => d.y), mu = y.reduce((a, b) => a + b, 0) / n, zz = y.map(p => p - mu);
    let S0 = 0, num = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const w = Math.abs(i - j) === 1 ? 1 : 0; S0 += w; num += w * zz[i] * zz[j]; }
    const expectedI = (n / S0) * num / zz.reduce((a, b) => a + b * b, 0);
    expect(spatiotemporalMoran(data, 'y', 'time').I).toBeCloseTo(expectedI, 3);
    expect(spatiotemporalMoran(data, 'y', 'time').I).toBeGreaterThan(0.2);
  });
});

describe('hardening — invalid inputs', () => {
  it('starModel null for null data', () => expect(starModel(null, 'y', ['x1'], W)).toBeNull());
  it('starModel null for null yVar', () => expect(starModel(d, null, ['x1'], W)).toBeNull());
  it('starModel null for null xVars', () => expect(starModel(d, 'y', null, W)).toBeNull());
  it('gstarModel null for null data', () => expect(gstarModel(null, 'y', ['x1'], W)).toBeNull());
  it('spaceTimeInteraction null for null', () => expect(spaceTimeInteraction(null, 'y', ['x1'], 'time')).toBeNull());
  it('spatiotemporalMoran null for null', () => expect(spatiotemporalMoran(null, 'y', ['x1'], W)).toBeNull());
  it('spaceTimeForecast null for null', () => expect(spaceTimeForecast(null, 2)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('starModel coefficients non-empty', () => {
    const r = starModel(d, 'y', ['x1'], W);
    if (r) { expect(r.coefficients.length).toBeGreaterThan(0); }
  });
  it('gstarModel rho between -1 and 1', () => {
    const r = gstarModel(d, 'y', ['x1'], W);
    if (r && r.rho !== undefined) { expect(r.rho).toBeGreaterThanOrEqual(-1); expect(r.rho).toBeLessThanOrEqual(1); }
  });
  it('spatiotemporalMoran I in [-1, 1]', () => {
    const r = spatiotemporalMoran(d, 'y', ['x1'], W, { timeVar: 'time' });
    if (r) { expect(r.I).toBeGreaterThanOrEqual(-1); expect(r.I).toBeLessThanOrEqual(1); }
  });
  it('spaceTimeForecast with reference model returns forecasts', () => {
    const r = spaceTimeForecast({ rho: 0.5 }, 2);
    if (r) { expect(r.forecasts.length).toBeGreaterThan(0); expect(r.nSteps).toBe(2); }
  });
  it('spaceTimeInteraction returns finite interaction value', () => {
    const r = spaceTimeInteraction(d, 'y', ['x1'], 'time');
    if (r && r.interaction !== undefined) expect(Number.isFinite(r.interaction)).toBe(true);
  });
});
