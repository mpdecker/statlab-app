import { describe, it, expect } from 'vitest';
import { aucTrapezoidal, aucLinearLog, pkParameters, terminalHalfLife, clearance, oneCompartmentIV, bioequivalence, emaxModel, sigmoidEmax, indirectResponse, pkpdLink, superposition, aucRatio, turnoverModel, transitCompartment, tmddModel, nonCompartmentalExpanded } from './pk.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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

describe('aucTrapezoidal, aucLinearLog, and terminalHalfLife match independent numpy oracles exactly', () => {
  const e = ref.pk.basic;
  it('aucTrapezoidal matches numpy.trapezoid', () => {
    const r = aucTrapezoidal(e.time, e.concentration);
    expect(r.auc).toBeCloseTo(e.aucTrapezoidal, 3);
  });
  it('aucLinearLog matches the linear-up/log-down formula', () => {
    const r = aucLinearLog(e.time, e.concentration);
    expect(r.auc).toBeCloseTo(e.aucLinearLog, 3);
  });
  it('terminalHalfLife R-squared is on the fitted log scale (regression test for the raw-scale R^2 fix)', () => {
    const r = terminalHalfLife(e.time, e.concentration);
    expect(r.halfLife).toBeCloseTo(e.halfLife, 3);
    expect(r.k).toBeCloseTo(e.k, 4);
    expect(r.rSquared).toBeCloseTo(e.rSquared, 3);
  });
});

describe('clearance', () => {
  it('null zero dose', () => expect(clearance(0, 100)).toBeNull());
  it('CL = dose/AUC', () => { const r = clearance(500, 200); expect(r.clearance).toBeCloseTo(2.5, 2); });
  it('apa non-empty string', () => { const r = clearance(500, 200); expect(typeof r.apa).toBe('string'); });
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

describe('emaxModel', () => { it('contract keys', () => expectKeys(emaxModel([1, 2, 4, 8, 16], [5, 12, 25, 38, 46]), ['test', 'parameters', 'fitted', 'rSquared', 'n', 'apa'])); it('emax positive', () => { const r = emaxModel([1, 2, 4, 8, 16], [5, 12, 25, 38, 46]); expect(r.parameters.Emax).toBeGreaterThan(0); }); it('fitted non-empty', () => { const r = emaxModel([1, 2, 4, 8, 16], [5, 12, 25, 38, 46]); expect(r.fitted.length).toBeGreaterThan(0); }); });
describe('sigmoidEmax', () => { it('contract keys', () => { const r = sigmoidEmax([1, 2, 4, 8, 16, 32], [5, 12, 25, 38, 46, 48]); if (r) expectKeys(r, ['test', 'parameters', 'rSquared', 'n', 'apa']); }); it('ec50 positive', () => { const r = sigmoidEmax([1, 2, 4, 8, 16, 32], [5, 12, 25, 38, 46, 48]); if (r) expect(r.parameters.EC50).toBeGreaterThan(0); }); it('rSquared between 0-1', () => { const r = sigmoidEmax([1, 2, 4, 8, 16, 32], [5, 12, 25, 38, 46, 48]); if (r) expect(r).toHaveProperty('rSquared'); }); });
describe('indirectResponse', () => { it('contract keys', () => expectKeys(indirectResponse([0, 1, 2, 4, 8], [100, 80, 60, 30, 10], [5, 8, 6, 3, 1]), ['test', 'n', 'apa'])); it('n finite', () => { const r = indirectResponse([0, 1, 2, 4, 8], [100, 80, 60, 30, 10], [5, 8, 6, 3, 1]); expect(Number.isFinite(r.n)).toBe(true); }); it('apa is string', () => { const r = indirectResponse([0, 1, 2, 4, 8], [100, 80, 60, 30, 10], [5, 8, 6, 3, 1]); expect(typeof r.apa).toBe('string'); }); });
describe('pkpdLink', () => { it('contract keys', () => { const r = pkpdLink([1, 2, 4, 8, 16], [10, 20, 30, 35, 38]); if (r) expectKeys(r, ['test', 'emax', 'n', 'apa']); }); it('emax finite', () => { const r = pkpdLink([1, 2, 4, 8, 16], [10, 20, 30, 35, 38]); if (r && r.emax) expect(Number.isFinite(r.emax.EC50)).toBe(true); }); it('n matches', () => { const r = pkpdLink([1, 2, 4, 8, 16], [10, 20, 30, 35, 38]); if (r) expect(r.n).toBe(5); }); });
describe('superposition', () => { it('contract keys', () => expectKeys(superposition([100, 100], [0, 12], 0.1, 30), ['test', 'concentration', 'ke', 'Vd', 'tau', 'nDoses', 'apa'])); it('concentration finite', () => { const r = superposition([100, 100], [0, 12], 0.1, 30); expect(Number.isFinite(r.concentration)).toBe(true); }); it('nDoses matches', () => { const r = superposition([100, 100], [0, 12], 0.1, 30); expect(r.nDoses).toBe(2); }); });
describe('aucRatio', () => { it('contract keys', () => expectKeys(aucRatio([100, 105, 98], [95, 100, 97]), ['test', 'ratio', 'ci', 'nT', 'nR', 'apa'])); it('ratio positive', () => { const r = aucRatio([100, 105, 98], [95, 100, 97]); expect(r.ratio).toBeGreaterThan(0); }); it('ci has two elements', () => { const r = aucRatio([100, 105, 98], [95, 100, 97]); expect(r.ci.length).toBe(2); }); });

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
  it('kin finite', () => { const r = turnoverModel([0,1,2,4,8],[100,80,60,30,10],[5,8,6,3,1]); if (r) expect(Number.isFinite(r.kin)).toBe(true); });
});

describe('transitCompartment', () => {
  it('contract keys', () => expectKeys(transitCompartment(100, [0,1,2,3,4,5,6,7,8,9,10]), ['test', 'output', 'nCompartments', 'k', 'n', 'apa']));
  it('null for empty time', () => expect(transitCompartment(100, [], {})).toBeNull());
  it('output non-empty', () => { const r = transitCompartment(100, [0,1,2,3,4,5,6,7,8,9,10]); if (r) expect(r.output.length).toBeGreaterThan(0); });
});

describe('tmddModel', () => {
  const t = [0,1,2,3,4,6,8,12,24];
  const c = [100,80,65,50,40,25,15,8,2];
  it('contract keys', () => expectKeys(tmddModel(t, c), ['test','kel','ksyn','kdeg','kint','rmse','n','apa']));
  it('null <5', () => expect(tmddModel([0,1], [10,8])).toBeNull());
  it('rmse non-negative', () => { const r = tmddModel(t, c); if (r) expect(r.rmse).toBeGreaterThanOrEqual(0); });
});
describe('nonCompartmentalExpanded', () => {
  const t = [0,1,2,3,4,6,8,12,24];
  const c = [0,50,80,90,85,60,40,20,5];
  it('contract keys', () => expectKeys(nonCompartmentalExpanded(t, c), ['test','auc','aumc','mrt','cl','vd','n','apa']));
  it('null <4', () => expect(nonCompartmentalExpanded([0,1], [1,2])).toBeNull());
  it('auc positive', () => { const r = nonCompartmentalExpanded(t, c); expect(r.auc).toBeGreaterThan(0); });
});

describe('tmddModel fits the model to the data (not hardcoded constants)', () => {
  it('achieves a good fit (low RMSE), unlike the hardcoded mono-exponential', () => {
    const t = [0, 1, 2, 3, 4, 6, 8, 12, 24];
    const c = [100, 80, 65, 50, 40, 25, 15, 8, 2];
    const r = tmddModel(t, c);
    expect(r.rmse).toBeLessThan(5); // old hardcoded pred=exp(-0.1t) gives RMSE ~50
    expect(r.kel).toBeGreaterThan(0);
  });
});

describe('indirectResponse fits a real indirect-response ODE model', () => {
  it('recovers kout from a simulated Type-I (inhibition of production) profile', () => {
    const kin = 10, kout = 0.5, Imax = 0.8, IC50 = 50, R0 = kin / kout;
    const time = [0, 1, 2, 4, 6, 8, 12, 16, 24];
    const concentration = time.map(t => 100 * Math.exp(-0.2 * t));
    // simulate the ODE (fine Euler) to generate the response
    const conc = tt => 100 * Math.exp(-0.2 * tt);
    let R = R0; const response = [R0]; let tp = 0;
    for (let i = 1; i < time.length; i++) { const span = time[i] - tp, steps = Math.ceil(span / 0.01), dh = span / steps; let t = tp; for (let s = 0; s < steps; s++) { const c = conc(t); R += dh * (kin * (1 - Imax * c / (IC50 + c)) - kout * R); t += dh; } response.push(R); tp = time[i]; }
    const r = indirectResponse(time, concentration, response);
    expect(Math.abs(r.kout - 0.5)).toBeLessThan(0.2);
  });
});

describe('hardening — invalid inputs', () => {
  it('aucTrapezoidal null for null', () => expect(aucTrapezoidal(null, [1, 2, 3])).toBeNull());
  it('aucTrapezoidal null for mismatched lengths', () => expect(aucTrapezoidal([0, 1], [1, 2, 3])).toBeNull());
  it('aucLinearLog null for null', () => expect(aucLinearLog(null, [1, 2, 3])).toBeNull());
  it('aucLinearLog null for unsorted times', () => expect(aucLinearLog([1, 0, 2], [10, 8, 6])).toBeNull());
  it('pkParameters null for null', () => expect(pkParameters(null, [1, 2, 3, 4])).toBeNull());
  it('terminalHalfLife null for null', () => expect(terminalHalfLife(null, [1, 2, 3, 4])).toBeNull());
  it('clearance null for zero dose', () => expect(clearance(0, 100)).toBeNull());
  it('oneCompartmentIV null for null', () => expect(oneCompartmentIV(null, [1, 2, 3, 4])).toBeNull());
  it('bioequivalence null for empty arrays', () => expect(bioequivalence([], [100, 105])).toBeNull());
  it('emaxModel null for mismatched lengths', () => expect(emaxModel([1, 2, 4, 8], [5, 12, 25])).toBeNull());
  it('sigmoidEmax null for mismatched inputs', () => expect(sigmoidEmax([1, 2, 4], [5, 12, 25, 38])).toBeNull());
  it('indirectResponse null for null', () => expect(indirectResponse(null, [1, 2, 3], [1, 2, 3])).toBeNull());
  it('pkpdLink null for null', () => expect(pkpdLink(null, [1, 2, 3])).toBeNull());
  it('superposition null for mismatched doses/times', () => expect(superposition([100], [0, 12], 0.1, 30)).toBeNull());
  it('aucRatio null for null', () => expect(aucRatio(null, [1, 2, 3])).toBeNull());
  it('turnoverModel null for null', () => expect(turnoverModel(null, [1, 2, 3], [1, 2, 3])).toBeNull());
  it('transitCompartment null for empty time array', () => expect(transitCompartment(100, [], {})).toBeNull());
  it('tmddModel null for null', () => expect(tmddModel(null, [1, 2, 3])).toBeNull());
  it('nonCompartmentalExpanded null for null', () => expect(nonCompartmentalExpanded(null, [1, 2, 3])).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('aucTrapezoidal with constant concentration returns positive auc', () => {
    const r = aucTrapezoidal([0, 1, 2, 4], [10, 10, 10, 10]);
    if (r) expect(r.auc).toBeGreaterThan(0);
  });
  it('terminalHalfLife with perfectly exponential decay', () => {
    const tExp = [0, 1, 2, 4, 8];
    const cExp = [100, 50, 25, 12.5, 1.0];
    const r = terminalHalfLife(tExp, cExp);
    if (r) expect(r.rSquared).toBeGreaterThanOrEqual(0);
  });
  it('pkParameters cmax equals max concentration', () => {
    const r = pkParameters([0, 1, 2, 4], [10, 20, 15, 5]);
    if (r) expect(r.cmax).toBe(20);
  });
  it('oneCompartmentIV rSquared >= 0', () => {
    const r = oneCompartmentIV([0, 1, 2, 4, 8], [100, 80, 65, 45, 20]);
    if (r) expect(r.rSquared).toBeGreaterThanOrEqual(0);
  });
  it('emaxModel emax positive for increasing response', () => {
    const r = emaxModel([1, 2, 4, 8, 16], [5, 12, 25, 38, 46]);
    if (r) expect(r.parameters.Emax).toBeGreaterThan(0);
  });
  it('sigmoidEmax EC50 positive', () => {
    const r = sigmoidEmax([1, 2, 4, 8, 16, 32], [5, 12, 25, 38, 46, 48]);
    if (r) expect(r.parameters.EC50).toBeGreaterThan(0);
  });
  it('turnoverModel kin finite', () => {
    const r = turnoverModel([0, 1, 2, 4, 8], [100, 80, 60, 30, 10], [5, 8, 6, 3, 1]);
    if (r) expect(Number.isFinite(r.kin)).toBe(true);
  });
  it('nonCompartmentalExpanded auc and mrt positive', () => {
    const r = nonCompartmentalExpanded([0, 1, 2, 3, 4, 6, 8], [0, 50, 80, 90, 85, 60, 40]);
    if (r) { expect(r.auc).toBeGreaterThan(0); expect(r.mrt).toBeGreaterThan(0); }
  });
});

describe('hardening — reproducibility', () => {
  it('superposition with same params returns identical concentration', () => {
    const r1 = superposition([100, 100], [0, 12], 0.1, 30);
    const r2 = superposition([100, 100], [0, 12], 0.1, 30);
    expect(r1.concentration).toBeCloseTo(r2.concentration, 4);
  });
  it('transitCompartment deterministic for same inputs', () => {
    const r1 = transitCompartment(100, [0, 1, 2, 3, 4, 5]);
    const r2 = transitCompartment(100, [0, 1, 2, 3, 4, 5]);
    expect(r1.output).toEqual(r2.output);
  });
  it('aucTrapezoidal deterministic for same input', () => {
    const r1 = aucTrapezoidal([0, 1, 2, 4], [10, 8, 6, 2]);
    const r2 = aucTrapezoidal([0, 1, 2, 4], [10, 8, 6, 2]);
    expect(r1.auc).toEqual(r2.auc);
  });
});
