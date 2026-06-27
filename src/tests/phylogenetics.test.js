import { describe, it, expect } from 'vitest';
import { independentContrasts, pagelsLambda, blombergK, phylogeneticSignal, picCorrelation, pglsRegression, diversificationRate, ouTraitModel } from './phylogenetics.js';
import { expectKeys } from './__fixtures__/helpers.js';

const trait = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const trait2 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const tree = [1, 2, 3, 4, 5];

describe('independentContrasts', () => { it('contract keys', () => expectKeys(independentContrasts(tree, trait), ['test', 'contrasts', 'mean', 't', 'n', 'apa'])); it('null<5', () => expect(independentContrasts([1,2], [1,2])).toBeNull()); it('contrasts array non-empty', () => { const r = independentContrasts(tree, trait); if (r) { expect(Array.isArray(r.contrasts)).toBe(true); expect(r.contrasts.length).toBeGreaterThan(0); } }) });
describe('pagelsLambda', () => { it('contract keys', () => expectKeys(pagelsLambda(trait, tree), ['test', 'lambda', 'n', 'apa'])); it('null<5', () => expect(pagelsLambda([1,2], tree)).toBeNull()); it('lambda between 0 and 1', () => { const r = pagelsLambda(trait, tree); if (r) { expect(r.lambda).toBeGreaterThanOrEqual(0); expect(r.lambda).toBeLessThanOrEqual(1); } }) });
describe('blombergK', () => { it('contract keys', () => expectKeys(blombergK(trait, tree), ['test', 'K', 'n', 'apa'])); it('null<5', () => expect(blombergK([1,2], tree)).toBeNull()); it('K non-negative', () => { const r = blombergK(trait, tree); if (r) expect(r.K).toBeGreaterThanOrEqual(0); }) });
describe('phylogeneticSignal', () => { it('contract keys', () => expectKeys(phylogeneticSignal(trait, tree), ['test', 'statistic', 'p', 'method', 'n', 'apa'])); it('p between 0 and 1', () => { const r = phylogeneticSignal(trait, tree); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); it('n positive', () => { const r = phylogeneticSignal(trait, tree); if (r) expect(r.n).toBeGreaterThan(0); }) });
describe('picCorrelation', () => { it('contract keys', () => expectKeys(picCorrelation(trait, trait2, tree), ['test', 'r', 'n', 'apa'])); it('null mismatch', () => expect(picCorrelation([1,2],[3,4,5], tree)).toBeNull()); it('r between -1 and 1', () => { const r = picCorrelation(trait, trait2, tree); if (r) { expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); } }) });

describe('pglsRegression', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ x: i, y: i * 2 + Math.random() });
  it('contract keys', () => expectKeys(pglsRegression(d, 'x', 'y', 0.5), ['test','beta','lambda','n','apa']));
  it('null <5', () => expect(pglsRegression(d.slice(0,3), 'x', 'y')).toBeNull());
  it('beta finite', () => { const r = pglsRegression(d, 'x', 'y', 0.5); if (r && Array.isArray(r.beta)) expect(r.beta.every(b => Number.isFinite(b))).toBe(true); });
  it('lambda between 0 and 1', () => { const r = pglsRegression(d, 'x', 'y', 0.5); if (r) { expect(r.lambda).toBeGreaterThanOrEqual(0); expect(r.lambda).toBeLessThanOrEqual(1); } });
});
describe('diversificationRate', () => {
  const branches = [1.2, 0.8, 1.5, 0.6, 2.1, 0.9, 1.3, 0.7, 1.1, 0.5];
  it('contract keys', () => expectKeys(diversificationRate(branches), ['test','lambda','se','n','apa']));
  it('null <5', () => expect(diversificationRate([1,2])).toBeNull());
  it('lambda positive', () => { const r = diversificationRate(branches); if (r) expect(r.lambda).toBeGreaterThan(0); });
  it('se positive', () => { const r = diversificationRate(branches); if (r) expect(r.se).toBeGreaterThan(0); });
});
describe('ouTraitModel', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ trait: 5 + i * 0.3 + Math.random() });
  it('contract keys', () => expectKeys(ouTraitModel(d, 'trait'), ['test','alpha','theta','sigma2','logLik','n','apa']));
  it('null <5', () => expect(ouTraitModel(d.slice(0,3), 'trait')).toBeNull());
  it('alpha positive', () => { const r = ouTraitModel(d, 'trait'); if (r) expect(r.alpha).toBeGreaterThan(0); });
  it('sigma2 positive', () => { const r = ouTraitModel(d, 'trait'); if (r) expect(r.sigma2).toBeGreaterThan(0); });
});
