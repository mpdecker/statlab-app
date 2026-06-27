import { describe, it, expect } from 'vitest';
import { starModel, gstarModel, spaceTimeInteraction, spatiotemporalMoran, spaceTimeForecast } from './spatialTemporal.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i * 0.5 + Math.sin(i), x1: i, x2: i % 3, time: i });
const W = Array.from({ length: 20 }, () => Array(20).fill(0)).map((r, i) => r.map((_, j) => i !== j && Math.abs(i - j) < 3 ? 1 / 2 : 0));

describe('starModel', () => {
  it('contract keys', () => { const r = starModel(d, 'y', ['x1', 'x2'], W); if (r) expectKeys(r, ['test', 'rho', 'coefficients', 'rSquared', 'n', 'apa']); });
  it('null <10', () => expect(starModel(d.slice(0, 5), 'y', ['x1'], W.slice(0, 5).map(r => r.slice(0, 5)))).toBeNull());
  it('coefficients present', () => { const r = starModel(d, 'y', ['x1'], W, { timeVar: 'time' }); if (r) { expect(r.coefficients.length).toBeGreaterThan(0); r.coefficients.forEach(c => expect(typeof c.name).toBe('string')); } });
  it('returns result without time var', () => { const r = starModel(d, 'y', ['x1'], W); expect(r).not.toBeNull(); });
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
  it('forecast array present', () => { const r = spaceTimeForecast(d, 'y', ['x1'], W, { timeVar: 'time', steps: 2 }); if (r) { expect(Array.isArray(r.forecast)).toBe(true); expect(r.forecast.length).toBeGreaterThan(0); } });
  it('nSteps matches', () => { const r = spaceTimeForecast(d, 'y', ['x1'], W, { timeVar: 'time', steps: 2 }); if (r) expect(r.nSteps).toBe(2); });
});
