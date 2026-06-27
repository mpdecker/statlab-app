import { describe, it, expect } from 'vitest';
import { starModel, gstarModel, spaceTimeInteraction, spatiotemporalMoran, spaceTimeForecast } from './spatialTemporal.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i * 0.5 + Math.sin(i), x1: i, x2: i % 3, time: i });
const W = Array.from({ length: 20 }, () => Array(20).fill(0)).map((r, i) => r.map((_, j) => i !== j && Math.abs(i - j) < 3 ? 1 / 2 : 0));

describe('starModel', () => {
  it('contract keys', () => { const r = starModel(d, 'y', ['x1', 'x2'], W); if (r) expectKeys(r, ['test', 'rho', 'coefficients', 'rSquared', 'n', 'apa']); });
  it('null <10', () => expect(starModel(d.slice(0, 5), 'y', ['x1'], W.slice(0, 5).map(r => r.slice(0, 5)))).toBeNull());
});

describe('gstarModel', () => { it('contract keys', () => { const r = gstarModel(d, 'y', ['x1'], W); if (r) expectKeys(r, ['test', 'rho', 'coefficients', 'n', 'apa']); }); });
describe('spaceTimeInteraction', () => { it('contract keys', () => expectKeys(spaceTimeInteraction(d, 'y', ['x1'], 'time'), ['test', 'interaction', 'n', 'apa'])); });
describe('spatiotemporalMoran', () => { it('contract keys', () => expectKeys(spatiotemporalMoran(d, 'y', 'time'), ['test', 'I', 'n', 'apa'])); });
describe('spaceTimeForecast', () => { it('contract keys', () => expectKeys(spaceTimeForecast({ rho: 0.5 }), ['test', 'forecasts', 'nSteps', 'apa'])); });
