import { describe, it, expect } from 'vitest';
import { markovBlanket, beliefPropagation, factorGraph, bicScore, dseparation } from './pgm.js';
import { expectKeys } from './__fixtures__/helpers.js';

const edges = [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 }];

describe('markovBlanket', () => {
  it('contract keys', () => expectKeys(markovBlanket(edges, 1), ['test', 'blanket', 'node', 'apa']));
  it('null for invalid', () => expect(markovBlanket(null, 1)).toBeNull());
});

describe('beliefPropagation', () => {
  it('contract keys', () => { const r = beliefPropagation([[0, 1], [0, 2]], [0, 1, 2], {}); if (r) expectKeys(r, ['test', 'marginals', 'n', 'apa']); });
  it('null <2 vars', () => expect(beliefPropagation([], [0], {})).toBeNull());
});

describe('factorGraph', () => {
  it('contract keys', () => expectKeys(factorGraph([0, 1, 2], [[0, 1], [1, 2]]), ['test', 'variableNodes', 'factorNodes', 'nVars', 'nFactors', 'apa']));
});

describe('bicScore', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ a: i, b: i * 0.5, c: i % 2 });
  it('contract keys', () => expectKeys(bicScore(d, ['a', 'b', 'c'], edges.slice(0, 2).map(e => ({ from: ['a', 'b', 'c'][e.from], to: ['a', 'b', 'c'][e.to] }))), ['test', 'bic', 'nEdges', 'n', 'apa']));
});

describe('dseparation', () => {
  it('contract keys', () => expectKeys(dseparation(edges, 0, 3, [1, 2]), ['test', 'dSeparated', 'x', 'y', 'z', 'apa']));
  it('null for invalid', () => expect(dseparation(null, 0, 1)).toBeNull());
});
