import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { spatialDurbin, spatialPanel, spatialHausman, directIndirectEffects } from './spatialEconometric.js';

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
