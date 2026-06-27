import { describe, it, expect } from 'vitest';
import { aucTrapezoidal, aucLinearLog, pkParameters, terminalHalfLife, clearance, oneCompartmentIV, bioequivalence, emaxModel, sigmoidEmax, indirectResponse, pkpdLink, superposition, aucRatio, turnoverModel, transitCompartment } from './pk.js';
import { expectKeys } from './__fixtures__/helpers.js';

const t = [0, 1, 2, 4, 8, 12, 24];
const c = [100, 80, 65, 45, 20, 8, 2];

describe('aucTrapezoidal', () => {
  it('null <3', () => expect(aucTrapezoidal([0, 1], [10, 8])).toBeNull());
  it('auc positive', () => { const r = aucTrapezoidal(t, c); expect(r.auc).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(aucTrapezoidal(t, c), ['test', 'auc', 'segments', 'n', 'apa']));
});

describe('aucLinearLog', () => {
  it('null <3', () => expect(aucLinearLog([0, 1], [10, 8])).toBeNull());
  it('auc positive', () => { const r = aucLinearLog(t, c); expect(r.auc).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(aucLinearLog(t, c), ['test', 'auc', 'n', 'apa']));
});

describe('pkParameters', () => {
  it('null <4', () => expect(pkParameters(t.slice(0, 2), c.slice(0, 2))).toBeNull());
  it('cmax = max(conc)', () => { const r = pkParameters(t, c); expect(r.cmax).toBe(Math.max(...c)); });
  it('halfLife positive', () => { const r = pkParameters(t, c); expect(r.halfLife).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(pkParameters(t, c), ['test', 'cmax', 'tmax', 'auc', 'halfLife', 'clearance', 'vd', 'n', 'apa']));
});

describe('terminalHalfLife', () => {
  it('null <4', () => expect(terminalHalfLife(t.slice(0, 2), c.slice(0, 2))).toBeNull());
  it('halfLife positive', () => { const r = terminalHalfLife(t, c); expect(r.halfLife).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(terminalHalfLife(t, c), ['test', 'halfLife', 'k', 'rSquared', 'nPoints', 'n', 'apa']));
});

describe('clearance', () => {
  it('null zero dose', () => expect(clearance(0, 100)).toBeNull());
  it('CL = dose/AUC', () => { const r = clearance(500, 200); expect(r.clearance).toBeCloseTo(2.5, 2); });
});

describe('oneCompartmentIV', () => {
  it('null <4', () => expect(oneCompartmentIV(t.slice(0, 2), c.slice(0, 2))).toBeNull());
  it('c0 positive', () => { const r = oneCompartmentIV(t, c); expect(r.c0).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(oneCompartmentIV(t, c), ['test', 'c0', 'k', 'halfLife', 'rSquared', 'n', 'apa']));
});

describe('bioequivalence', () => {
  it('null <3', () => expect(bioequivalence([100, 95], [98, 102])).toBeNull());
  it('ratio > 0', () => { const r = bioequivalence([100, 105, 98, 102, 99], [95, 100, 97, 101, 96]); expect(r.ratio).toBeGreaterThan(0); });
  it('contract keys', () => { const d = [100, 105, 98, 102, 99]; expectKeys(bioequivalence(d, [95, 100, 97, 101, 96]), ['test', 'ratio', 'ci', 'bioequivalent', 'nTest', 'nRef', 'alpha', 'apa']); });
});

describe('edge cases', () => {
  it('aucTrapezoidal null for unsorted times', () => expect(aucTrapezoidal([1, 0, 2], [10, 8, 6])).toBeNull());
  it('aucLinearLog handles zero concentrations', () => { const r = aucLinearLog([0, 1, 2, 4], [0, 5, 3, 1]); expect(Number.isFinite(r.auc)).toBe(true); });
  it('pkParameters with dose computes clearance', () => { const r = pkParameters(t, c, { dose: 500 }); expect(r.clearance).toBeGreaterThan(0); });
  it('terminalHalfLife with nPoints=2 still works', () => { const r = terminalHalfLife(t, c, { nPoints: 2 }); expect(r.halfLife).toBeGreaterThan(0); });
  it('clearance null for zero AUC', () => expect(clearance(100, 0)).toBeNull());
  it('oneCompartmentIV rSquared >= 0', () => { const r = oneCompartmentIV(t, c); expect(r.rSquared).toBeGreaterThanOrEqual(0); });
  it('bioequivalence null for empty arrays', () => expect(bioequivalence([], [100, 105])).toBeNull());
});

describe('emaxModel', () => { it('contract keys', () => expectKeys(emaxModel([1, 2, 4, 8, 16], [5, 12, 25, 38, 46]), ['test', 'parameters', 'fitted', 'rSquared', 'n', 'apa'])); });
describe('sigmoidEmax', () => { it('contract keys', () => { const r = sigmoidEmax([1, 2, 4, 8, 16, 32], [5, 12, 25, 38, 46, 48]); if (r) expectKeys(r, ['test', 'parameters', 'rSquared', 'n', 'apa']); }); });
describe('indirectResponse', () => { it('contract keys', () => expectKeys(indirectResponse([0, 1, 2, 4, 8], [100, 80, 60, 30, 10], [5, 8, 6, 3, 1]), ['test', 'n', 'apa'])); });
describe('pkpdLink', () => { it('contract keys', () => { const r = pkpdLink([1, 2, 4, 8, 16], [10, 20, 30, 35, 38]); if (r) expectKeys(r, ['test', 'emax', 'n', 'apa']); }); });
describe('superposition', () => { it('contract keys', () => expectKeys(superposition([100, 100], [0, 12], 0.1, 30), ['test', 'concentration', 'ke', 'Vd', 'tau', 'nDoses', 'apa'])); });
describe('aucRatio', () => { it('contract keys', () => expectKeys(aucRatio([100, 105, 98], [95, 100, 97]), ['test', 'ratio', 'ci', 'nT', 'nR', 'apa'])); });

describe('pk edge cases', () => {
  it('emaxModel null <5', () => expect(emaxModel([1, 2], [3, 4])).toBeNull());
  it('sigmoidEmax null <6', () => expect(sigmoidEmax([1, 2, 3], [4, 5, 6])).toBeNull());
  it('indirectResponse null <5', () => expect(indirectResponse([1, 2], [3, 4], [5, 6])).toBeNull());
  it('superposition null mismatch', () => expect(superposition([100], [0, 12], 0.1, 30)).toBeNull());
  it('aucRatio null <3', () => expect(aucRatio([100], [95])).toBeNull());
});

describe('turnoverModel', () => {
  it('contract keys', () => expectKeys(turnoverModel([0,1,2,4,8],[100,80,60,30,10],[5,8,6,3,1]), ['test', 'turnover', 'kin', 'kout', 'Rss', 'n', 'apa']));
  it('null <5', () => expect(turnoverModel([0,1],[10,5],[2,2])).toBeNull());
});

describe('transitCompartment', () => {
  it('contract keys', () => expectKeys(transitCompartment(100, [0,1,2,3,4,5,6,7,8,9,10]), ['test', 'output', 'nCompartments', 'k', 'n', 'apa']));
  it('null for empty time', () => expect(transitCompartment(100, [], {})).toBeNull());
});
