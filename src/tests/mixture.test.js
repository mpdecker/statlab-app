import { describe, it, expect } from 'vitest';
import { mixtureOfRegressions, switchingRegression, latentProfileAnalysis, mixtureOfExperts } from './mixture.js';
import { expectKeys } from './__fixtures__/helpers.js';

const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68];

describe('mixtureOfRegressions', () => {
  it('null <15', () => expect(mixtureOfRegressions(x.slice(0, 10), y.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(mixtureOfRegressions(x, y), ['test', 'components', 'nComponents', 'n', 'apa']));
  it('nComponents correct', () => { const r = mixtureOfRegressions(x, y); expect(r.nComponents).toBe(2); });
});

describe('switchingRegression', () => {
  it('null <10', () => expect(switchingRegression(x.slice(0, 5), y.slice(0, 5), 10)).toBeNull());
  it('contract keys', () => expectKeys(switchingRegression(x, y, 10), ['test', 'threshold', 'regime1', 'regime2', 'n', 'apa']));
  it('both regimes present', () => { const r = switchingRegression(x, y, 10); expect(r.regime1.n).toBeGreaterThan(0); expect(r.regime2.n).toBeGreaterThan(0); });
});

describe('latentProfileAnalysis', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i * 0.3, x2: Math.sin(i) });
  it('null <20', () => expect(latentProfileAnalysis(d.slice(0, 10), ['x1'])).toBeNull());
  it('contract keys', () => expectKeys(latentProfileAnalysis(d, ['x1', 'x2']), ['test', 'profiles', 'nProfiles', 'n', 'apa']));
});

describe('mixtureOfExperts', () => {
  it('null <15', () => expect(mixtureOfExperts(x.slice(0, 10), y.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(mixtureOfExperts(x, y), ['test', 'experts', 'nExperts', 'n', 'apa']));
});
