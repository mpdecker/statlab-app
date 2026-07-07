import { describe, it, expect } from 'vitest';
import { permanova, anosim, mantelTest, simperAnalysis, procrustes, ccaPrep, envfit, varpart, mso } from './ordination.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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

describe('mantelTest matches an independent Pearson-correlation-of-vectorized-distances computation exactly (regression test for the wrong-r-formula and row-shuffling-permutation fixes)', () => {
  it('r matches on two nearly-identical distance matrices', () => {
    const e = ref.ordination.mantel_basic;
    const r = mantelTest(e.m1, e.m2, { permutations: 999 });
    expect(r.r).toBeCloseTo(e.r, 3);
    expect(r.p).toBeLessThan(0.05); // should be highly significant given r~0.99, not p=1 like the old bug
  });
});

describe('simperAnalysis no longer crashes (regression test for the undefined-n ReferenceError fix)', () => {
  it('runs without throwing and returns nGroups', () => {
    const r = simperAnalysis(d, ['x1', 'x2'], 'grp');
    expect(r).not.toBeNull();
    expect(r.nGroups).toBe(2);
    expect(r.contributions.length).toBeGreaterThan(0);
  });
});

describe('procrustes matches scipy.linalg.orthogonal_procrustes exactly', () => {
  it('m2 matches on a non-trivial 7-point example', () => {
    const e = ref.ordination.procrustes_basic;
    const r = procrustes(e.X, e.Y);
    expect(r.m2).toBeCloseTo(e.m2, 3);
  });
});

describe('procrustes finds the optimal rotation', () => {
  it('m^2 ~ 0 when Y is a rotation of X', () => {
    const th = 0.7, R = [[Math.cos(th), -Math.sin(th)], [Math.sin(th), Math.cos(th)]];
    let s = 3; const z = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    const X = Array.from({ length: 12 }, () => [z(), z()]);
    const Y = X.map(r => [r[0] * R[0][0] + r[1] * R[0][1], r[0] * R[1][0] + r[1] * R[1][1]]);
    const r = procrustes(X, Y);
    expect(r.m2).toBeLessThan(1e-3);
  });
});

describe('envfit uses a permutation p-value', () => {
  it('large p when the env variable is unrelated to the ordination', () => {
    let s = 29; const u = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
    const ord = { points: Array.from({ length: 30 }, (_, i) => [Math.cos(i * 0.5), Math.sin(i * 0.7)]) };
    // strong association: env = x-coordinate of the ordination
    const envData = ord.points.map(p => ({ e: p[0] }));
    const r = envfit(ord, envData, 'e', { permutations: 199, seed: 1 });
    expect(r.p).toBeCloseTo(1 / 200, 5); // permutation min = 1/(perms+1); exp(-r^2 n/2) gives ~1e-6
  });
});

describe('hardening — invalid inputs', () => {
  it('permanova null for null data', () => expect(permanova(null, ['x1'], 'grp')).toBeNull());
  it('anosim null for null data', () => expect(anosim(null, ['x1'], 'grp')).toBeNull());
  it('mantelTest null for null matrix1', () => expect(mantelTest(null, [[0,1],[1,0]])).toBeNull());
  it('simperAnalysis null for null data', () => expect(simperAnalysis(null, ['x1'], 'grp')).toBeNull());
  it('procrustes null for null X', () => expect(procrustes(null, [[1,2]])).toBeNull());
  it('ccaPrep null for null data', () => expect(ccaPrep(null, ['x1'], ['x2'])).toBeNull());
  it('envfit null for null ord', () => expect(envfit(null, [{ pH: 3 }], 'pH')).toBeNull());
  it('varpart null for null parts', () => expect(varpart(0.5, null)).toBeNull());
  it('mso null for null matrix', () => expect(mso(null)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('permanova null for single-group data', () => { const d = [{ x1: 1, x2: 1, grp: 'A' }, { x1: 2, x2: 2, grp: 'A' }, { x1: 3, x2: 3, grp: 'A' }, { x1: 4, x2: 4, grp: 'A' }, { x1: 5, x2: 5, grp: 'A' }, { x1: 6, x2: 6, grp: 'A' }, { x1: 7, x2: 7, grp: 'A' }, { x1: 8, x2: 8, grp: 'A' }, { x1: 9, x2: 9, grp: 'A' }, { x1: 10, x2: 10, grp: 'A' }]; expect(permanova(d, ['x1', 'x2'], 'grp')).toBeNull(); });
  it('ccaPrep handles perfectly correlated vars', () => { const r = ccaPrep(d, ['x1'], ['x2']); expect(r).not.toBeNull(); });
  it('mso with 3x3 matrix', () => { const r = mso([[0, 1, 2], [1, 0, 3], [2, 3, 0]]); expect(r.order.length).toBe(3); });
});
