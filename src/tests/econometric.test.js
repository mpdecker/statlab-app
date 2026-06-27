import { describe, it, expect } from 'vitest';
import { tobitModel, heckmanSelection, bivariateProbit, psmCaliper, localLinearIV, panelFixedEffects, panelRandomEffects, hausmanTest, arellanoBond, sur, threeSLS, gmm, cointegration, vecm, structuralVAR } from './econometric.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 30; i++) d.push({ y: Math.max(0, i * 2), x1: i, x2: i % 2, sel: i > 10 ? 1 : 0, z1: i % 3, y1: i % 2, y2: (i + 1) % 2, id: Math.floor(i / 5), time: i % 5 });

describe('tobitModel', () => {
  it('contract keys', () => expectKeys(tobitModel(d, 'y', ['x1', 'x2']), ['test', 'coefficients', 'sigma', 'n', 'nCensored', 'apa']));
  it('null <20', () => expect(tobitModel(d.slice(0, 10), 'y', ['x1'])).toBeNull());
  it('n positive', () => { const r = tobitModel(d, 'y', ['x1', 'x2']); if (r) expect(r.n).toBeGreaterThan(0); });
});

describe('heckmanSelection', () => { it('contract keys', () => expectKeys(heckmanSelection(d, 'y', ['x1'], 'sel', ['z1']), ['test', 'imr', 'n', 'nSelected', 'apa'])); it('imr non-empty', () => { const r = heckmanSelection(d, 'y', ['x1'], 'sel', ['z1']); expect(r.imr.length).toBeGreaterThan(0); }); it('nSelected positive', () => { const r = heckmanSelection(d, 'y', ['x1'], 'sel', ['z1']); if (r) expect(r.nSelected).toBeGreaterThan(0); }); });
describe('bivariateProbit', () => { it('contract keys', () => expectKeys(bivariateProbit(d, 'y1', 'y2', ['x1']), ['test', 'rho', 'n', 'nBoth', 'apa'])); it('rho between -1-1', () => { const r = bivariateProbit(d, 'y1', 'y2', ['x1']); expect(r.rho).toBeGreaterThanOrEqual(-1); expect(r.rho).toBeLessThanOrEqual(1); }); it('n positive', () => { const r = bivariateProbit(d, 'y1', 'y2', ['x1']); if (r) expect(r.n).toBeGreaterThan(0); }); });
describe('psmCaliper', () => { it('contract keys', () => { const r = psmCaliper(d, 'sel', 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'att', 'nTreated', 'nControl', 'caliper', 'nMatched', 'apa']); }); it('att finite', () => { const r = psmCaliper(d, 'sel', 'y', ['x1', 'x2']); if (r) expect(Number.isFinite(r.att)).toBe(true); }); it('caliper positive', () => { const r = psmCaliper(d, 'sel', 'y', ['x1', 'x2']); if (r) expect(r.caliper).toBeGreaterThan(0); }); });
describe('localLinearIV', () => { it('contract keys', () => expectKeys(localLinearIV(d, 'x1', 'y', 'z1'), ['test', 'late', 'firstStage', 'reducedForm', 'bandwidth', 'n', 'apa'])); it('late finite', () => { const r = localLinearIV(d, 'x1', 'y', 'z1'); expect(Number.isFinite(r.late)).toBe(true); }); it('n positive', () => { const r = localLinearIV(d, 'x1', 'y', 'z1'); if (r) expect(r.n).toBeGreaterThan(0); }); });

// New functions
describe('panelFixedEffects', () => {
  it('contract keys', () => expectKeys(panelFixedEffects(d, 'y', ['x1'], { idVar: 'id' }), ['test','coefficients','nUnits','nPeriods','nObs','apa']));
  it('null <10', () => expect(panelFixedEffects(d.slice(0, 5), 'y', ['x1'], { idVar: 'id' })).toBeNull());
  it('nUnits matches id count', () => { const r = panelFixedEffects(d, 'y', ['x1'], { idVar: 'id' }); if (r) { const ids = new Set(d.map(o => o.id)); expect(r.nUnits).toBe(ids.size); } });
});

describe('panelRandomEffects', () => {
  it('contract keys', () => expectKeys(panelRandomEffects(d, 'y', ['x1'], { idVar: 'id' }), ['test','coefficients','theta','nUnits','nPeriods','apa']));
  it('theta between 0-1', () => { const r = panelRandomEffects(d, 'y', ['x1'], { idVar: 'id' }); if (r) { expect(r.theta).toBeGreaterThanOrEqual(0); expect(r.theta).toBeLessThanOrEqual(1); } });
  it('nUnits positive', () => { const r = panelRandomEffects(d, 'y', ['x1'], { idVar: 'id' }); if (r) expect(r.nUnits).toBeGreaterThan(0); });
});

describe('hausmanTest', () => {
  it('contract keys', () => expectKeys(hausmanTest([0.5],[0.1],[0.3],[0.08]), ['test','H','df','p','apa']));
  it('p between 0-1', () => { const r = hausmanTest([0.5],[0.1],[0.3],[0.08]); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
  it('H non-negative', () => { const r = hausmanTest([0.5],[0.1],[0.3],[0.08]); if (r) expect(r.H).toBeGreaterThanOrEqual(0); });
});

describe('arellanoBond', () => {
  it('contract keys', () => expectKeys(arellanoBond(d, 'y', ['x1'], { idVar: 'id' }), ['test','b','se','ar2','nUnits','nPeriods','apa']));
  it('b finite', () => { const r = arellanoBond(d, 'y', ['x1'], { idVar: 'id' }); if (r) expect(Number.isFinite(r.b)).toBe(true); });
  it('nUnits positive', () => { const r = arellanoBond(d, 'y', ['x1'], { idVar: 'id' }); if (r) expect(r.nUnits).toBeGreaterThan(0); });
});

describe('sur', () => {
  it('contract keys', () => expectKeys(sur(d, ['y1','y2'], ['x1']), ['test','equations','nEq','n','apa']));
  it('equations array present', () => { const r = sur(d, ['y1','y2'], ['x1']); if (r) expect(Array.isArray(r.equations)).toBe(true); });
  it('nEq matches', () => { const r = sur(d, ['y1','y2'], ['x1']); if (r) expect(r.nEq).toBe(2); });
});

describe('threeSLS', () => {
  it('contract keys', () => expectKeys(threeSLS(d, ['y1','y2'], ['x1'], ['z1']), ['test','equations','n','nInstruments','apa']));
  it('equations non-empty', () => { const r = threeSLS(d, ['y1','y2'], ['x1'], ['z1']); if (r && r.equations) expect(r.equations.length).toBeGreaterThan(0); });
  it('nInstruments positive', () => { const r = threeSLS(d, ['y1','y2'], ['x1'], ['z1']); if (r) expect(r.nInstruments).toBeGreaterThan(0); });
});

describe('gmm', () => {
  it('contract keys', () => expectKeys(gmm(d, 'y', ['x1'], ['z1']), ['test','jStat','jP','coefficients','n','nInstruments','apa']));
  it('null <20', () => expect(gmm(d.slice(0, 10), 'y', ['x1'], ['z1'])).toBeNull());
  it('jStat positive', () => { const r = gmm(d, 'y', ['x1'], ['z1']); if (r) expect(r.jStat).toBeGreaterThanOrEqual(0); });
});

describe('cointegration', () => {
  it('contract keys', () => expectKeys(cointegration(d, 'y', ['x1']), ['test','tStat','p','rho','apa']));
  it('rho between -1-1', () => { const r = cointegration(d, 'y', ['x1']); if (r) { expect(r.rho).toBeGreaterThanOrEqual(-1); expect(r.rho).toBeLessThanOrEqual(1); } });
  it('p between 0-1', () => { const r = cointegration(d, 'y', ['x1']); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
});

describe('vecm', () => {
  it('contract keys', () => expectKeys(vecm(d, ['y1','y2'], { lags: 1 }), ['test','rank','lags','adjustment','n','nVars','apa']));
  it('rank positive', () => { const r = vecm(d, ['y1','y2'], { lags: 1 }); if (r) expect(r.rank).toBeGreaterThan(0); });
  it('lags matches', () => { const r = vecm(d, ['y1','y2'], { lags: 1 }); if (r) expect(r.lags).toBe(1); });
});

describe('structuralVAR', () => {
  it('contract keys', () => expectKeys(structuralVAR(d, ['y1','y2']), ['test','lags','identification','periods','n','nVars','apa']));
  it('periods non-empty', () => { const r = structuralVAR(d, ['y1','y2']); if (r && r.periods) expect(r.periods.length).toBeGreaterThan(0); });
  it('nVars matches', () => { const r = structuralVAR(d, ['y1','y2']); if (r) expect(r.nVars).toBe(2); });
});
