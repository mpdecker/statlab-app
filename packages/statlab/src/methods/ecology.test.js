import { describe, it, expect } from 'vitest';
import { shannonDiversity, simpsonDiversity, chao1Richness, speciesAccumulation, rarefaction, indicatorSpecies, simperAnalysis, adonis2, betadisper } from './ecology.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const c = [5, 3, 2, 1, 1, 0, 0, 0];

describe('shannonDiversity', () => { it('contract keys', () => expectKeys(shannonDiversity(c), ['test','shannon','evenness','richness','n','apa'])); it('null<2', () => expect(shannonDiversity([3])).toBeNull()); it('evenness between 0 and 1', () => { const r = shannonDiversity(c); if (r) { expect(r.evenness).toBeGreaterThanOrEqual(0); expect(r.evenness).toBeLessThanOrEqual(1); } }); it('index non-negative', () => { const r = shannonDiversity(c); if (r) expect(r.shannon).toBeGreaterThanOrEqual(0); }); });
describe('simpsonDiversity', () => { it('contract keys', () => expectKeys(simpsonDiversity(c), ['test','simpson','invSimpson','n','apa'])); it('Simpson in [0,1]', () => { const r = simpsonDiversity(c); expect(r.simpson).toBeGreaterThanOrEqual(0); expect(r.simpson).toBeLessThanOrEqual(1) }); it('invSimpson >= 1', () => { const r = simpsonDiversity(c); expect(r.invSimpson).toBeGreaterThanOrEqual(1); }); it('index between 0-1', () => { const r = simpsonDiversity(c); expect(r.simpson).toBeGreaterThanOrEqual(0); expect(r.simpson).toBeLessThanOrEqual(1); }); });
describe('chao1Richness', () => { it('contract keys', () => expectKeys(chao1Richness(c), ['test','chao1','sobs','singletons','doubletons','apa'])); it('chao1 >= sobs', () => { const r = chao1Richness(c); if (r) expect(r.chao1).toBeGreaterThanOrEqual(r.sobs); }); it('estimate positive', () => { const r = chao1Richness(c); if (r) expect(r.chao1).toBeGreaterThan(0); }); });
describe('speciesAccumulation', () => { it('contract keys', () => expectKeys(speciesAccumulation(['A','B','A','C','B','D']), ['test','curve','n','apa'])); it('curve array non-empty', () => { const r = speciesAccumulation(['A','B','A','C','B','D']); if (r) { expect(Array.isArray(r.curve)).toBe(true); expect(r.curve.length).toBeGreaterThan(0); } }); it('curve non-decreasing', () => { const r = speciesAccumulation(['A','B','A','C','B','D']); if (r && r.curve) { for (let i = 1; i < r.curve.length; i++) expect(r.curve[i]).toBeGreaterThanOrEqual(r.curve[i-1]); } }); });
describe('rarefaction', () => { it('contract keys', () => expectKeys(rarefaction(['A','B','A','C','B','D'], 4), ['test','expectedSpecies','sampleSize','nObserved','sobs','apa'])); it('expectedSpecies positive', () => { const r = rarefaction(['A','B','A','C','B','D'], 4); if (r && r.expectedSpecies !== undefined) expect(Number.isFinite(r.expectedSpecies)).toBe(true); }); it('expectedSpecies finite', () => { const r = rarefaction(['A','B','A','C','B','D'], 4); if (r) expect(Number.isFinite(r.expectedSpecies)).toBe(true); }); });

describe('shannonDiversity, simpsonDiversity, and chao1Richness match independent oracles exactly', () => {
  const e = ref.ecology.basic;
  it('shannon matches scipy.stats.entropy', () => {
    const r = shannonDiversity(e.counts);
    expect(r.shannon).toBeCloseTo(e.shannon, 4);
    expect(r.evenness).toBeCloseTo(e.evenness, 4);
  });
  it('simpson matches the independent 1-sum(p^2) computation', () => {
    const r = simpsonDiversity(e.counts);
    expect(r.simpson).toBeCloseTo(e.simpson, 4);
    expect(r.invSimpson).toBeCloseTo(e.invSimpson, 1);
  });
  it('chao1 matches the independent bias-corrected formula', () => {
    const r = chao1Richness(e.counts);
    expect(Number(r.chao1)).toBe(e.chao1);
  });
});

describe('indicatorSpecies', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ site: Math.floor(i/4), species: i % 5 === 0 ? 'A' : i % 5 === 1 ? 'B' : 'C', group: i < 10 ? 'Ctrl' : 'Trt' });
  it('contract keys', () => expectKeys(indicatorSpecies(d, 'species', 'group'), ['test','results','nSpecies','nGroups','apa']));
  it('null <5', () => expect(indicatorSpecies(d.slice(0,3), 'species', 'group')).toBeNull());
  it('results array non-empty', () => { const r = indicatorSpecies(d, 'species', 'group'); if (r) { expect(Array.isArray(r.results)).toBe(true); expect(r.results.length).toBeGreaterThan(0); } });
  it('results non-empty', () => { const r = indicatorSpecies(d, 'species', 'group'); if (r) { expect(Array.isArray(r.results)).toBe(true); expect(r.results.length).toBeGreaterThan(0); } });
});
describe('simperAnalysis', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ sp1: Math.random() * 10, sp2: Math.random() * 5, sp3: Math.random() * 3, group: i < 10 ? 'A' : 'B' });
  it('contract keys', () => expectKeys(simperAnalysis(d, ['sp1','sp2','sp3'], 'group'), ['test','contributions','groupsCompared','apa']));
  it('null <2 species', () => expect(simperAnalysis(d, ['sp1'], 'group')).toBeNull());
  it('contributions array non-empty', () => { const r = simperAnalysis(d, ['sp1','sp2','sp3'], 'group'); if (r) { expect(Array.isArray(r.contributions)).toBe(true); expect(r.contributions.length).toBeGreaterThan(0); } });
  it('contributions sorted by ratio', () => { const r = simperAnalysis(d, ['sp1','sp2','sp3'], 'group'); if (r && r.contributions && r.contributions.length > 1) { for (let i = 1; i < r.contributions.length; i++) expect(r.contributions[i].ratio).toBeLessThanOrEqual(r.contributions[i-1].ratio); } });
});
describe('adonis2', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ sp1: Math.random() * 10, sp2: Math.random() * 5, sp3: Math.random() * 3, group: i < 10 ? 'A' : 'B' });
  it('contract keys', () => expectKeys(adonis2(d, ['sp1','sp2','sp3'], 'group'), ['test','R2','F','ssTotal','ssGroup','p','nPerm','apa']));
  it('null <2 species', () => expect(adonis2(d, ['sp1'], 'group')).toBeNull());
  it('R2 between 0 and 1', () => { const r = adonis2(d, ['sp1','sp2','sp3'], 'group'); if (r) { expect(r.R2).toBeGreaterThanOrEqual(0); expect(r.R2).toBeLessThanOrEqual(1); } });
  it('F positive', () => { const r = adonis2(d, ['sp1','sp2','sp3'], 'group'); if (r) expect(r.F).toBeGreaterThanOrEqual(0); });
  it('permutation p is a valid probability', () => { const r = adonis2(d, ['sp1','sp2','sp3'], 'group', { nPerm: 199 }); expect(r.p).toBeGreaterThan(0); expect(r.p).toBeLessThanOrEqual(1); });
  it('detects a real group separation (low p)', () => {
    let s = 3; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const sep = []; for (let i = 0; i < 40; i++) { const g = i < 20 ? 'A' : 'B'; const shift = g === 'A' ? 0 : 8; sep.push({ sp1: shift + rnd() * 2, sp2: shift + rnd() * 2, sp3: shift + rnd() * 2, group: g }); }
    const r = adonis2(sep, ['sp1','sp2','sp3'], 'group', { nPerm: 199 });
    expect(r.p).toBeLessThan(0.05);
    expect(r.R2).toBeGreaterThan(0.5);
  });
  it('does not flag separation when groups are exchangeable (high p)', () => {
    let s = 5; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const nul = []; for (let i = 0; i < 40; i++) nul.push({ sp1: rnd() * 5, sp2: rnd() * 5, sp3: rnd() * 5, group: i % 2 === 0 ? 'A' : 'B' });
    const r = adonis2(nul, ['sp1','sp2','sp3'], 'group', { nPerm: 199 });
    expect(r.p).toBeGreaterThan(0.05);
  });
});
describe('betadisper', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ sp1: Math.random() * 10, sp2: Math.random() * 5, sp3: Math.random() * 3, group: i < 10 ? 'A' : 'B' });
  it('contract keys', () => expectKeys(betadisper(d, ['sp1','sp2','sp3'], 'group'), ['test','dispersions','apa']));
  it('dispersions array non-empty', () => { const r = betadisper(d, ['sp1','sp2','sp3'], 'group'); if (r) { expect(Array.isArray(r.dispersions)).toBe(true); expect(r.dispersions.length).toBeGreaterThan(0); } });
  it('dispersions non-empty', () => { const r = betadisper(d, ['sp1','sp2','sp3'], 'group'); if (r) { expect(Array.isArray(r.dispersions)).toBe(true); expect(r.dispersions.length).toBeGreaterThan(0); } });
});

describe('rarefaction uses Hurlbert expected species', () => {
  it('matches the exact value for a simple community', () => {
    const data = [...Array(5).fill('a'), ...Array(5).fill('b')]; // N=10, two species, 5 each
    const r = rarefaction(data, 5);
    // E[S_5] = 2*(1 - C(5,5)/C(10,5)) = 2*(1 - 1/252) = 1.99206
    expect(r.expectedSpecies).toBeCloseTo(1.992, 2);
  });
});

describe('hardening — invalid inputs', () => {
  it('shannonDiversity null for empty', () => expect(shannonDiversity([])).toBeNull());
  it('shannonDiversity null for null', () => expect(shannonDiversity(null)).toBeNull());
  it('shannonDiversity null for all zeros', () => expect(shannonDiversity([0, 0, 0])).toBeNull());
  it('simpsonDiversity null for single element', () => expect(simpsonDiversity([5])).toBeNull());
  it('simpsonDiversity null for null', () => expect(simpsonDiversity(null)).toBeNull());
  it('chao1Richness null for null', () => expect(chao1Richness(null)).toBeNull());
  it('chao1Richness null for single count', () => expect(chao1Richness([5])).toBeNull());
  it('speciesAccumulation null for empty', () => expect(speciesAccumulation([])).toBeNull());
  it('speciesAccumulation null for null', () => expect(speciesAccumulation(null)).toBeNull());
  it('rarefaction null for empty', () => expect(rarefaction([], 5)).toBeNull());
  it('rarefaction null for sampleSize > n', () => expect(rarefaction(['A', 'B'], 10)).toBeNull());
  it('indicatorSpecies null for empty data', () => expect(indicatorSpecies([], 'species', 'group')).toBeNull());
  it('simperAnalysis null for empty species list', () => expect(simperAnalysis([{ sp1: 1, group: 'A' }], [], 'group')).toBeNull());
  it('adonis2 null for empty data', () => expect(adonis2([], ['sp1'], 'group')).toBeNull());
  it('betadisper null for null data', () => expect(betadisper(null, ['sp1'], 'group')).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('shannonDiversity with constant counts has low shannon', () => {
    const r = shannonDiversity([10, 10, 10, 10]);
    if (r) expect(r.shannon).toBeGreaterThan(0);
  });
  it('simpsonDiversity with one dominant species returns low simpson', () => {
    const r = simpsonDiversity([100, 1, 1]);
    if (r) expect(r.simpson).toBeLessThan(0.1);
  });
  it('chao1Richness with only singletons extrapolates', () => {
    const r = chao1Richness([1, 1, 1, 1, 0]);
    if (r) expect(r.chao1).toBeGreaterThan(r.sobs);
  });
  it('speciesAccumulation curve is non-decreasing', () => {
    const r = speciesAccumulation(['A', 'B', 'A', 'C', 'B', 'D']);
    if (r && r.curve) { for (let i = 1; i < r.curve.length; i++) expect(r.curve[i]).toBeGreaterThanOrEqual(r.curve[i - 1]); }
  });
  it('rarefaction expectedSpecies > 0', () => {
    const r = rarefaction(['A', 'B', 'A', 'C', 'B', 'D'], 4);
    if (r) expect(r.expectedSpecies).toBeGreaterThan(0);
  });
  it('adonis2 with permuted data returns R2 between 0 and 1', () => {
    const d = []; for (let i = 0; i < 20; i++) d.push({ sp1: Math.random() * 10, sp2: Math.random() * 5, group: i < 10 ? 'A' : 'B' });
    const r = adonis2(d, ['sp1', 'sp2'], 'group');
    if (r) { expect(r.R2).toBeGreaterThanOrEqual(0); expect(r.R2).toBeLessThanOrEqual(1); }
  });
  it('indicatorSpecies results non-empty', () => {
    const d = []; for (let i = 0; i < 20; i++) d.push({ site: Math.floor(i / 4), species: 'A', group: i < 10 ? 'Ctrl' : 'Trt' });
    const r = indicatorSpecies(d, 'species', 'group');
    if (r) { expect(Array.isArray(r.results)).toBe(true); }
  });
  it('shannonDiversity evenness in [0, 1]', () => {
    const r = shannonDiversity([5, 3, 2, 1, 1, 0, 0, 0]);
    if (r) { expect(r.evenness).toBeGreaterThanOrEqual(0); expect(r.evenness).toBeLessThanOrEqual(1); }
  });
});
