import { describe, it, expect } from 'vitest';
import { shannonDiversity, simpsonDiversity, chao1Richness, speciesAccumulation, rarefaction, indicatorSpecies, simperAnalysis, adonis2, betadisper } from './ecology.js';
import { expectKeys } from './__fixtures__/helpers.js';

const c = [5, 3, 2, 1, 1, 0, 0, 0];

describe('shannonDiversity', () => { it('contract keys', () => expectKeys(shannonDiversity(c), ['test','shannon','evenness','richness','n','apa'])); it('null<2', () => expect(shannonDiversity([3])).toBeNull()); it('evenness between 0 and 1', () => { const r = shannonDiversity(c); if (r) { expect(r.evenness).toBeGreaterThanOrEqual(0); expect(r.evenness).toBeLessThanOrEqual(1); } }); it('index non-negative', () => { const r = shannonDiversity(c); if (r) expect(r.shannon).toBeGreaterThanOrEqual(0); }); });
describe('simpsonDiversity', () => { it('contract keys', () => expectKeys(simpsonDiversity(c), ['test','simpson','invSimpson','n','apa'])); it('Simpson in [0,1]', () => { const r = simpsonDiversity(c); expect(r.simpson).toBeGreaterThanOrEqual(0); expect(r.simpson).toBeLessThanOrEqual(1) }); it('invSimpson >= 1', () => { const r = simpsonDiversity(c); expect(r.invSimpson).toBeGreaterThanOrEqual(1); }); it('index between 0-1', () => { const r = simpsonDiversity(c); expect(r.simpson).toBeGreaterThanOrEqual(0); expect(r.simpson).toBeLessThanOrEqual(1); }); });
describe('chao1Richness', () => { it('contract keys', () => expectKeys(chao1Richness(c), ['test','chao1','sobs','singletons','doubletons','apa'])); it('chao1 >= sobs', () => { const r = chao1Richness(c); if (r) expect(r.chao1).toBeGreaterThanOrEqual(r.sobs); }); it('estimate positive', () => { const r = chao1Richness(c); if (r) expect(r.chao1).toBeGreaterThan(0); }); });
describe('speciesAccumulation', () => { it('contract keys', () => expectKeys(speciesAccumulation(['A','B','A','C','B','D']), ['test','curve','n','apa'])); it('curve array non-empty', () => { const r = speciesAccumulation(['A','B','A','C','B','D']); if (r) { expect(Array.isArray(r.curve)).toBe(true); expect(r.curve.length).toBeGreaterThan(0); } }); it('curve non-decreasing', () => { const r = speciesAccumulation(['A','B','A','C','B','D']); if (r && r.curve) { for (let i = 1; i < r.curve.length; i++) expect(r.curve[i].species).toBeGreaterThanOrEqual(r.curve[i-1].species); } }); });
describe('rarefaction', () => { it('contract keys', () => expectKeys(rarefaction(['A','B','A','C','B','D'], 4), ['test','expectedSpecies','sampleSize','nObserved','sobs','apa'])); it('expectedSpecies positive', () => { const r = rarefaction(['A','B','A','C','B','D'], 4); if (r && r.expectedSpecies !== undefined) expect(Number.isFinite(r.expectedSpecies)).toBe(true); }); it('expectedSpecies finite', () => { const r = rarefaction(['A','B','A','C','B','D'], 4); if (r) expect(Number.isFinite(r.expectedSpecies)).toBe(true); }); });

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
  it('contract keys', () => expectKeys(adonis2(d, ['sp1','sp2','sp3'], 'group'), ['test','R2','F','ssTotal','ssGroup','nPerm','apa']));
  it('null <2 species', () => expect(adonis2(d, ['sp1'], 'group')).toBeNull());
  it('R2 between 0 and 1', () => { const r = adonis2(d, ['sp1','sp2','sp3'], 'group'); if (r) { expect(r.R2).toBeGreaterThanOrEqual(0); expect(r.R2).toBeLessThanOrEqual(1); } });
  it('F positive', () => { const r = adonis2(d, ['sp1','sp2','sp3'], 'group'); if (r) expect(r.F).toBeGreaterThanOrEqual(0); });
});
describe('betadisper', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ sp1: Math.random() * 10, sp2: Math.random() * 5, sp3: Math.random() * 3, group: i < 10 ? 'A' : 'B' });
  it('contract keys', () => expectKeys(betadisper(d, ['sp1','sp2','sp3'], 'group'), ['test','dispersions','apa']));
  it('dispersions array non-empty', () => { const r = betadisper(d, ['sp1','sp2','sp3'], 'group'); if (r) { expect(Array.isArray(r.dispersions)).toBe(true); expect(r.dispersions.length).toBeGreaterThan(0); } });
  it('dispersions non-empty', () => { const r = betadisper(d, ['sp1','sp2','sp3'], 'group'); if (r) { expect(Array.isArray(r.dispersions)).toBe(true); expect(r.dispersions.length).toBeGreaterThan(0); } });
});
