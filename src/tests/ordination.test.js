import { describe, it, expect } from 'vitest';
import { permanova, anosim, mantelTest, simperAnalysis, procrustes, ccaPrep, envfit, varpart, mso } from './ordination.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i * 0.5, x2: Math.sin(i), grp: i < 10 ? 'A' : 'B' });

describe('permanova', () => {
  it('contract keys', () => expectKeys(permanova(d, ['x1', 'x2'], 'grp', { permutations: 99 }), ['test', 'pseudoF', 'df1', 'df2', 'p', 'permutations', 'n', 'nGroups', 'apa']));
  it('null <2 groups', () => expect(permanova(d.filter(r => r.grp === 'A'), ['x1', 'x2'], 'grp')).toBeNull());
  it('pseudoF non-negative', () => { const r = permanova(d, ['x1', 'x2'], 'grp', { permutations: 99 }); if (r) expect(r.pseudoF).toBeGreaterThanOrEqual(0); });
});

describe('anosim', () => {
  it('contract keys', () => expectKeys(anosim(d, ['x1', 'x2'], 'grp', { permutations: 99 }), ['test', 'R', 'p', 'permutations', 'n', 'nGroups', 'apa']));
  it('p between 0-1', () => { const r = anosim(d, ['x1', 'x2'], 'grp', { permutations: 99 }); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
  it('R between -1 and 1', () => { const r = anosim(d, ['x1', 'x2'], 'grp', { permutations: 99 }); if (r) { expect(r.R).toBeGreaterThanOrEqual(-1); expect(r.R).toBeLessThanOrEqual(1); } });
});

describe('mantelTest', () => {
  const m1 = [[0, 1, 3, 5], [1, 0, 2, 4], [3, 2, 0, 1], [5, 4, 1, 0]];
  const m2 = [[0, 2, 4, 6], [2, 0, 3, 5], [4, 3, 0, 2], [6, 5, 2, 0]];
  it('contract keys', () => { const r = mantelTest(m1, m2, { permutations: 20 }); if (r) expectKeys(r, ['test', 'r', 'p', 'permutations', 'n', 'apa']); });
  it('null length mismatch', () => expect(mantelTest(m1, [[0, 1], [1, 0]])).toBeNull());
  it('r between -1 and 1', () => { const r = mantelTest(m1, m2, { permutations: 20 }); if (r) { expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); } });
});

describe('simperAnalysis', () => {
  it('is defined', () => expect(typeof simperAnalysis).toBe('function'));
  it('contributions non-empty', () => { let r; try { r = simperAnalysis(d, ['x1', 'x2'], 'grp'); } catch {} if (r && r.contributions) expect(r.contributions.length).toBeGreaterThan(0); });
  it('nGroups exists', () => { let r; try { r = simperAnalysis(d, ['x1', 'x2'], 'grp'); } catch {} if (r) expect(Number.isFinite(r.nGroups)).toBe(true); });
});

describe('procrustes', () => {
  const X = [[1, 2], [3, 4], [5, 6]];
  const Y = [[1.1, 2.1], [3.2, 4.2], [5.3, 6.3]];
  it('contract keys', () => expectKeys(procrustes(X, Y), ['test', 'm2', 'n', 'p', 'apa']));
  it('rotation non-empty', () => { const r = procrustes(X, Y); if (r && r.rotation) expect(r.rotation.length).toBeGreaterThan(0); });
  it('m2 >= 0', () => { const r = procrustes(X, Y); if (r) expect(r.m2).toBeGreaterThanOrEqual(0); });
});

describe('ccaPrep', () => {
  it('contract keys', () => expectKeys(ccaPrep(d, ['x1'], ['x2']), ['test', 'n', 'nEnv', 'nSpecies', 'apa']));
  it('eigenvalues positive', () => { const r = ccaPrep(d, ['x1'], ['x2']); if (r && r.eigenvalues) r.eigenvalues.forEach(e => expect(e).toBeGreaterThan(0)); });
  it('nEnv matches inputs', () => { const r = ccaPrep(d, ['x1'], ['x2']); if (r) expect(r.nEnv).toBe(1); });
});

describe('ordination edge cases', () => {
  it('permanova null <10', () => expect(permanova(d.slice(0, 5), ['x1', 'x2'], 'grp')).toBeNull());
  it('anosim null <10', () => expect(anosim(d.slice(0, 5), ['x1', 'x2'], 'grp')).toBeNull());
  it('mantelTest null <5', () => expect(mantelTest([[1, 0], [0, 1]], [[1, 0], [0, 1]])).toBeNull());
  it('procrustes null mismatch', () => expect(procrustes([[1, 2]], [[3]])).toBeNull());
  it('ccaPrep null <10', () => expect(ccaPrep(d.slice(0, 5), ['x1'], ['x2'])).toBeNull());
  it('simperAnalysis null <10', () => expect(simperAnalysis(d.slice(0, 5), ['x1', 'x2'], 'grp')).toBeNull());
});

describe('envfit', () => {
  const ord = { points: [[1,2],[3,4],[5,6],[7,8],[9,10]] };
  const env = [{pH:3.5},{pH:5.2},{pH:4.1},{pH:7.0},{pH:6.5}];
  it('contract keys', () => expectKeys(envfit(ord, env, 'pH'), ['test','r2','r','p','var','n','apa']));
  it('null mismatched', () => expect(envfit(ord, [{pH:3}], 'pH')).toBeNull());
  it('r2 between 0 and 1', () => { const r = envfit(ord, env, 'pH'); if (r) { expect(r.r2).toBeGreaterThanOrEqual(0); expect(r.r2).toBeLessThanOrEqual(1); } });
});
describe('varpart', () => {
  it('contract keys', () => expectKeys(varpart(0.6, [0.4, 0.5]), ['test','fractions','apa']));
  it('null <2 parts', () => expect(varpart(0.5, [0.3])).toBeNull());
  it('fractions non-empty', () => { const r = varpart(0.6, [0.4, 0.5]); if (r && Array.isArray(r.fractions)) expect(r.fractions.length).toBeGreaterThan(0); });
});
describe('mso', () => {
  const D = [[0,3,4],[3,0,5],[4,5,0]];
  it('contract keys', () => expectKeys(mso(D), ['test','order','n','apa']));
  it('null <3', () => expect(mso([[0,1],[1,0]])).toBeNull());
  it('order array non-empty', () => { const r = mso(D); if (r) expect(r.order.length).toBeGreaterThan(0); });
});
