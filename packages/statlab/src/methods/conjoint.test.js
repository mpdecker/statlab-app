import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { partWorthUtilities, attributeImportance, choiceSimulation, orthogonalDesign, marketSimulator } from './conjoint.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const profiles = []; for (let i = 0; i < 12; i++) profiles.push({ brand: (i % 3) + 1, price: (i % 2) + 1, feature: (Math.floor(i / 4) % 3) + 1 });
const ratings = profiles.map(() => Math.random() * 10);

describe('partWorthUtilities', () => {
  it('contract keys', () => expectKeys(partWorthUtilities(ratings, profiles, ['brand','price','feature']), ['test','utilities','n','apa']));
  it('null <2 attrs', () => expect(partWorthUtilities(ratings, profiles, ['brand'])).toBeNull());
  it('utilities array non-empty', () => { const r = partWorthUtilities(ratings, profiles, ['brand','price','feature']); if (r) expect(r.utilities.length).toBeGreaterThan(0) });
});
describe('partWorthUtilities matches statsmodels OLS with effects coding exactly (regression test for the constant-column/no-intercept fix)', () => {
  it('recovers the true noise-free generating utilities', () => {
    const e = ref.conjoint.partworth_basic;
    const r = partWorthUtilities(e.ratings, e.profiles, ['price', 'brand']);
    const price = r.utilities.find(u => u.attribute === 'price').utilities;
    const brand = r.utilities.find(u => u.attribute === 'brand').utilities;
    expect(price[0].utility).toBeCloseTo(e.priceUtil[0], 3);
    expect(price[1].utility).toBeCloseTo(e.priceUtil[1], 3);
    expect(brand[0].utility).toBeCloseTo(e.brandUtil[0], 3);
    expect(brand[1].utility).toBeCloseTo(e.brandUtil[1], 3);
  });
});

describe('attributeImportance', () => {
  const pw = partWorthUtilities(ratings, profiles, ['brand','price','feature']);
  it('contract keys', () => { if (pw) expectKeys(attributeImportance(pw), ['test','importance','apa']); });
  it('importance sums to 100%', () => { if (pw) { const r = attributeImportance(pw); if (r) { const sum = r.importance.reduce((s, v) => s + v.importance, 0); expect(Math.abs(sum - 100) < 2).toBe(true) } } });
  it('importance non-empty', () => { if (pw) { const r = attributeImportance(pw); if (r) expect(r.importance.length).toBeGreaterThan(0); } });
});
describe('choiceSimulation', () => {
  it('contract keys', () => expectKeys(choiceSimulation(profiles, ['brand','price']), ['test','marketShares','nRespondents','nProfiles','apa']));
  it('null <3 profiles', () => expect(choiceSimulation(profiles.slice(0,2), ['brand'])).toBeNull());
  it('shares sum to 100%', () => { const r = choiceSimulation(profiles, ['brand','price']); if (r && r.marketShares) { const sum = r.marketShares.reduce((s, v) => s + v.share, 0); expect(Math.abs(sum - 100) < 2).toBe(true) } });
});
describe('orthogonalDesign', () => {
  it('contract keys', () => expectKeys(orthogonalDesign(['A','B','C'], [2,2,2]), ['test','runs','nRuns','nAttrs','apa']));
  it('null <2 attrs', () => expect(orthogonalDesign(['A'], [2])).toBeNull());
  it('each run has all attributes', () => { const r = orthogonalDesign(['A','B','C'], [2,2,2]); if (r) r.runs.forEach(run => { expect(run).toHaveProperty('A'); expect(run).toHaveProperty('B'); expect(run).toHaveProperty('C') }) });
});
describe('marketSimulator', () => {
  const pw = partWorthUtilities(ratings, profiles, ['brand','price','feature']);
  const scenario = [{brand:1,price:1,feature:2},{brand:2,price:2,feature:1}];
  it('contract keys', () => { if (pw) expectKeys(marketSimulator(pw, scenario), ['test','shares','nProfiles','apa']); });
  it('null <2 profiles', () => { if (pw) expect(marketSimulator(pw, [scenario[0]])).toBeNull(); });
  it('shares have correct profile count', () => { if (pw) { const r = marketSimulator(pw, scenario); if (r) expect(r.shares.length).toBe(scenario.length) } });
});

describe('choiceSimulation derives shares from utilities (not random)', () => {
  it('higher-utility profiles get larger market share', () => {
    const profs = []; for (let i = 0; i < 12; i++) profs.push({ brand: (i % 3) + 1, price: (i % 2) + 1 });
    const partWorths = { brand: { 1: 0, 2: 1, 3: 5 }, price: { 1: 0, 2: -2 } };
    const r = choiceSimulation(profs, ['brand', 'price'], { partWorths, scale: 1 });
    const shareBrand3 = r.marketShares.filter((_, i) => profs[i].brand === 3).reduce((s, m) => s + m.share, 0);
    const shareBrand1 = r.marketShares.filter((_, i) => profs[i].brand === 1).reduce((s, m) => s + m.share, 0);
    expect(shareBrand3).toBeGreaterThan(shareBrand1 * 3); // brand 3 (high part-worth) dominates
  });
});

describe('hardening — invalid inputs', () => {
  it('partWorthUtilities null for empty ratings', () => expect(partWorthUtilities([], profiles, ['brand', 'price'])).toBeNull());
  it('partWorthUtilities null for null attrs', () => expect(partWorthUtilities(ratings, profiles, null)).toBeNull());
  it('attributeImportance null for null result', () => expect(attributeImportance(null)).toBeNull());
  it('attributeImportance null for empty object', () => expect(attributeImportance({})).toBeNull());
  it('choiceSimulation null for empty profiles', () => expect(choiceSimulation([], ['brand'])).toBeNull());
  it('orthogonalDesign null for mismatched levels', () => expect(orthogonalDesign(['A', 'B'], [2])).toBeNull());
  it('marketSimulator null for null pwResult', () => { const pw = partWorthUtilities(ratings, profiles, ['brand', 'price', 'feature']); expect(marketSimulator(null, [{ brand: 1, price: 1 }])).toBeNull(); });
});

describe('hardening — degenerate data', () => {
  it('partWorthUtilities handles constant ratings', () => { const r = partWorthUtilities([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], profiles, ['brand', 'price', 'feature']); expect(r).not.toBeNull(); });
  it('choiceSimulation null for single-attr profiles', () => expect(choiceSimulation(profiles, ['brand'])).toBeNull());
  it('attributeImportance handles single-attribute result', () => { const r = partWorthUtilities(ratings, profiles, ['brand', 'price']); if (r) { const imp = attributeImportance(r); expect(imp.importance.length).toBe(2); } });
});
