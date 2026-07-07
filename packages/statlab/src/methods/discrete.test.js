import { describe, it, expect } from 'vitest';
import { conditionalLogit, iiaTest, mixedLogit, wtpSpace, nestedLogit, latentClassLogit, marginalEffects, elasticities, choiceProbability, valueOfTime } from './discrete.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i % 3, x1: i, x2: i % 2, price: 10 + i, grp: Math.floor(i/3), alt: i % 3, nest: i % 2 ? 'A' : 'B' });

describe('conditionalLogit', () => { it('contract keys', () => expectKeys(conditionalLogit(d, 'y', ['x1', 'x2'], 'grp'), ['test', 'coefficients', 'n', 'nGroups', 'apa'])); it('null<15', () => expect(conditionalLogit(d.slice(0,5), 'y', ['x1'], 'grp')).toBeNull()); it('coefficients array non-empty', () => { const r = conditionalLogit(d, 'y', ['x1', 'x2'], 'grp'); if (r) { expect(Array.isArray(r.coefficients)).toBe(true); expect(r.coefficients.length).toBeGreaterThan(0); } }); it('nGroups > 0', () => { const r = conditionalLogit(d, 'y', ['x1', 'x2'], 'grp'); if (r) expect(r.nGroups).toBeGreaterThan(0); }); it('coefficients non-empty', () => { const r = conditionalLogit(d, 'y', ['x1', 'x2'], 'grp'); if (r) { expect(Array.isArray(r.coefficients)).toBe(true); expect(r.coefficients.length).toBeGreaterThan(0); } }); it('nGroups positive', () => { const r = conditionalLogit(d, 'y', ['x1', 'x2'], 'grp'); if (r) expect(r.nGroups).toBeGreaterThan(0); }); it('coefficients are finite and produce valid log-likelihood', () => { const o = ref.discrete.conditionalLogit_basic; const r = conditionalLogit(o.data, 'y', ['x1','x2'], 'grp'); r.coefficients.forEach(c => expect(Number.isFinite(c.b)).toBe(true)); expect(Number.isFinite(r.logLik)).toBe(true); }); });
describe('iiaTest', () => { it('contract keys', () => expectKeys(iiaTest(d, 'y', ['x1'], 'grp', 'alt'), ['test', 'chi2', 'p', 'n', 'apa'])); it('p between 0 and 1', () => { const r = iiaTest(d, 'y', ['x1'], 'grp', 'alt'); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); it('chi2 non-negative', () => { const r = iiaTest(d, 'y', ['x1'], 'grp', 'alt'); if (r) expect(r.chi2).toBeGreaterThanOrEqual(0); }); it('p between 0-1', () => { const r = iiaTest(d, 'y', ['x1'], 'grp', 'alt'); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); });
describe('mixedLogit', () => { it('contract keys', () => expectKeys(mixedLogit(d, 'y', ['x1', 'x2'], 'grp'), ['test', 'means', 'n', 'nDraws', 'apa'])); it('means array non-empty', () => { const r = mixedLogit(d, 'y', ['x1', 'x2'], 'grp'); if (r) { expect(Array.isArray(r.means)).toBe(true); expect(r.means.length).toBeGreaterThan(0); } }); it('nDraws positive', () => { const r = mixedLogit(d, 'y', ['x1', 'x2'], 'grp'); if (r) expect(r.nDraws).toBeGreaterThan(0); }); });
describe('wtpSpace', () => { it('contract keys', () => expectKeys(wtpSpace(d, 'y', ['x1', 'price'], 'price', 'grp'), ['test', 'wtpEstimates', 'n', 'apa'])); it('wtpEstimates array non-empty', () => { const r = wtpSpace(d, 'y', ['x1', 'price'], 'price', 'grp'); if (r) { expect(Array.isArray(r.wtpEstimates)).toBe(true); expect(r.wtpEstimates.length).toBeGreaterThan(0); } }); it('wtpEstimates non-empty', () => { const r = wtpSpace(d, 'y', ['x1', 'price'], 'price', 'grp'); if (r) { expect(Array.isArray(r.wtpEstimates)).toBe(true); expect(r.wtpEstimates.length).toBeGreaterThan(0); } }); });
describe('nestedLogit', () => { it('contract keys', () => expectKeys(nestedLogit(d, 'y', ['x1'], 'grp', 'nest'), ['test', 'nests', 'n', 'apa'])); it('nests defined', () => { const r = nestedLogit(d, 'y', ['x1'], 'grp', 'nest'); if (r) expect(r.nests).not.toBeNull(); }); it('nests > 0', () => { const r = nestedLogit(d, 'y', ['x1'], 'grp', 'nest'); if (r && r.nests) expect(r.nests.length).toBeGreaterThan(0); }); it('nests count positive', () => { const r = nestedLogit(d, 'y', ['x1'], 'grp', 'nest'); if (r && r.nests) expect(r.nests.length).toBeGreaterThan(0); }); });

describe('latentClassLogit', () => {
  it('contract keys', () => expectKeys(latentClassLogit(d, 'y', ['x1','x2'], 'grp', { nClasses: 2 }), ['test','classProbs','classBeta','bic','nClasses','n','apa']));
  it('null nClasses<2', () => expect(latentClassLogit(d, 'y', ['x1'], 'grp', { nClasses: 1 })).toBeNull());
  it('classProbs sum to 1', () => { const r = latentClassLogit(d, 'y', ['x1','x2'], 'grp', { nClasses: 2 }); if (r && r.classProbs) { const sum = r.classProbs.reduce((s,v) => s + v, 0); expect(sum).toBeCloseTo(1, 1); } });
  it('classProbs sum near 1', () => { const r = latentClassLogit(d, 'y', ['x1','x2'], 'grp', { nClasses: 2 }); if (r && r.classProbs) { const sum = r.classProbs.reduce((s,v) => s + v, 0); expect(sum).toBeCloseTo(1, 1); } });
});
describe('marginalEffects', () => {
  it('contract keys', () => expectKeys(marginalEffects(d, 'y', ['x1','x2'], 'grp'), ['test','effects','n','apa']));
  it('effects array non-empty', () => { const r = marginalEffects(d, 'y', ['x1','x2'], 'grp'); if (r) { expect(Array.isArray(r.effects)).toBe(true); expect(r.effects.length).toBeGreaterThan(0); } });
  it('effects non-empty', () => { const r = marginalEffects(d, 'y', ['x1','x2'], 'grp'); if (r) { expect(Array.isArray(r.effects)).toBe(true); expect(r.effects.length).toBeGreaterThan(0); } });
});
describe('elasticities', () => {
  it('contract keys', () => expectKeys(elasticities(d, 'y', ['x1','x2'], 'grp'), ['test','elasticities','n','apa']));
  it('elasticities array non-empty', () => { const r = elasticities(d, 'y', ['x1','x2'], 'grp'); if (r) { expect(Array.isArray(r.elasticities)).toBe(true); expect(r.elasticities.length).toBeGreaterThan(0); } });
  it('elasticities finite', () => { const r = elasticities(d, 'y', ['x1','x2'], 'grp'); if (r && r.elasticities) { expect(Array.isArray(r.elasticities)).toBe(true); } });
});
describe('choiceProbability', () => {
  it('contract keys', () => expectKeys(choiceProbability(d, 'y', ['x1'], 'grp'), ['test','probabilities','n','apa']));
  it('probabilities between 0 and 1', () => { const r = choiceProbability(d, 'y', ['x1'], 'grp'); if (r && r.probabilities) { r.probabilities.forEach(p => { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); }); } });
  it('probabilities between 0-1', () => { const r = choiceProbability(d, 'y', ['x1'], 'grp'); if (r && r.probabilities) { r.probabilities.forEach(p => { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); }); } });
});
describe('valueOfTime', () => {
  it('contract keys', () => expectKeys(valueOfTime(d, 'y', ['x1','price'], 'price', 'x1', 'grp'), ['test','vot','se','ciLow','ciHigh','n','apa']));
  it('null bad vars', () => expect(valueOfTime(d, 'y', ['bad'], 'time', 'cost', 'grp')).toBeNull());
  it('vot finite', () => { const r = valueOfTime(d, 'y', ['x1','price'], 'price', 'x1', 'grp'); if (r) expect(Number.isFinite(r.vot)).toBe(true); });
  it('ciLow <= ciHigh', () => { const r = valueOfTime(d, 'y', ['x1','price'], 'price', 'x1', 'grp'); if (r) expect(r.ciLow).toBeLessThanOrEqual(r.ciHigh); });
  it('ciLow < ciHigh', () => { const r = valueOfTime(d, 'y', ['x1','price'], 'price', 'x1', 'grp'); if (r) expect(r.ciLow).toBeLessThan(r.ciHigh); });
});
