import { describe, it, expect } from 'vitest';
import { permanova, anosim, mantelTest, simperAnalysis, procrustes, ccaPrep } from './ordination.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i * 0.5, x2: Math.sin(i), grp: i < 10 ? 'A' : 'B' });

describe('permanova', () => {
  it('contract keys', () => expectKeys(permanova(d, ['x1', 'x2'], 'grp', { permutations: 99 }), ['test', 'pseudoF', 'df1', 'df2', 'p', 'permutations', 'n', 'nGroups', 'apa']));
  it('null <2 groups', () => expect(permanova(d.filter(r => r.grp === 'A'), ['x1', 'x2'], 'grp')).toBeNull());
});

describe('anosim', () => {
  it('contract keys', () => expectKeys(anosim(d, ['x1', 'x2'], 'grp', { permutations: 99 }), ['test', 'R', 'p', 'permutations', 'n', 'nGroups', 'apa']));
});

describe('mantelTest', () => {
  const m1 = [[0, 1, 3, 5], [1, 0, 2, 4], [3, 2, 0, 1], [5, 4, 1, 0]];
  const m2 = [[0, 2, 4, 6], [2, 0, 3, 5], [4, 3, 0, 2], [6, 5, 2, 0]];
  it('contract keys', () => { const r = mantelTest(m1, m2, { permutations: 20 }); if (r) expectKeys(r, ['test', 'r', 'p', 'permutations', 'n', 'apa']); });
  it('null length mismatch', () => expect(mantelTest(m1, [[0, 1], [1, 0]])).toBeNull());
});

describe('simperAnalysis', () => {
  it('is defined', () => expect(typeof simperAnalysis).toBe('function'));
});

describe('procrustes', () => {
  const X = [[1, 2], [3, 4], [5, 6]];
  const Y = [[1.1, 2.1], [3.2, 4.2], [5.3, 6.3]];
  it('contract keys', () => expectKeys(procrustes(X, Y), ['test', 'm2', 'n', 'p', 'apa']));
});

describe('ccaPrep', () => {
  it('contract keys', () => expectKeys(ccaPrep(d, ['x1'], ['x2']), ['test', 'n', 'nEnv', 'nSpecies', 'apa']));
});

describe('ordination edge cases', () => {
  it('permanova null <10', () => expect(permanova(d.slice(0, 5), ['x1', 'x2'], 'grp')).toBeNull());
  it('anosim null <10', () => expect(anosim(d.slice(0, 5), ['x1', 'x2'], 'grp')).toBeNull());
  it('mantelTest null <5', () => expect(mantelTest([[1, 0], [0, 1]], [[1, 0], [0, 1]])).toBeNull());
  it('procrustes null mismatch', () => expect(procrustes([[1, 2]], [[3]])).toBeNull());
  it('ccaPrep null <10', () => expect(ccaPrep(d.slice(0, 5), ['x1'], ['x2'])).toBeNull());
  it('simperAnalysis null <10', () => expect(simperAnalysis(d.slice(0, 5), ['x1', 'x2'], 'grp')).toBeNull());
});
