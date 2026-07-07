import { describe, it, expect } from 'vitest';
import { markovBlanket, beliefPropagation, factorGraph, bicScore, dseparation, variableElimination, treeWidth, junctionTree, hillClimbing, scoringBDeu, cpdag, dSeparationQuery } from './pgm.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('dSeparationQuery correctly handles a collider (regression test for the skipped-moralization fix)', () => {
  it('0 and 2 are d-separated when NOT conditioning on the collider, and NOT d-separated when conditioning on it', () => {
    const e = ref.pgm.collider_basic;
    expect(dSeparationQuery(e.edges, e.nVars, e.X, e.Y, []).separated).toBe(e.separatedNoZ);
    expect(dSeparationQuery(e.edges, e.nVars, e.X, e.Y, [1]).separated).toBe(e.separatedWithZ);
  });
});

const edges = [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 }];

describe('markovBlanket', () => {
  it('contract keys', () => expectKeys(markovBlanket(edges, 1), ['test', 'blanket', 'node', 'apa']));
  it('null for invalid', () => expect(markovBlanket(null, 1)).toBeNull());
  it('blanket array non-empty', () => { const r = markovBlanket(edges, 1); if (r) expect(r.blanket.length).toBeGreaterThan(0); });
});

describe('beliefPropagation', () => {
  it('contract keys', () => { const r = beliefPropagation([[0, 1], [0, 2]], [0, 1, 2], {}); if (r) expectKeys(r, ['test', 'marginals', 'n', 'apa']); });
  it('null <2 vars', () => expect(beliefPropagation([], [0], {})).toBeNull());
  it('marginals non-empty', () => { const r = beliefPropagation([[0, 1], [0, 2]], [0, 1, 2], {}); if (r) expect(r.marginals.length).toBeGreaterThan(0); });
});

describe('factorGraph', () => {
  it('contract keys', () => expectKeys(factorGraph([0, 1, 2], [[0, 1], [1, 2]]), ['test', 'variableNodes', 'factorNodes', 'nVars', 'nFactors', 'apa']));
  it('factors non-empty', () => { const r = factorGraph([0, 1, 2], [[0, 1], [1, 2]]); if (r) expect(r.factorNodes.length).toBeGreaterThan(0); });
  it('nVars matches input', () => { const r = factorGraph([0, 1, 2], [[0, 1], [1, 2]]); if (r) expect(r.nVars).toBe(3); });
});

describe('bicScore', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ a: i, b: i * 0.5, c: i % 2 });
  it('contract keys', () => expectKeys(bicScore(d, ['a', 'b', 'c'], edges.slice(0, 2).map(e => ({ from: ['a', 'b', 'c'][e.from], to: ['a', 'b', 'c'][e.to] }))), ['test', 'bic', 'nEdges', 'n', 'apa']));
  it('score finite', () => { const r = bicScore(d, ['a', 'b', 'c'], edges.slice(0, 2).map(e => ({ from: ['a', 'b', 'c'][e.from], to: ['a', 'b', 'c'][e.to] }))); if (r) expect(Number.isFinite(r.bic)).toBe(true); });
  it('nEdges matches', () => { const r = bicScore(d, ['a', 'b', 'c'], edges.slice(0, 2).map(e => ({ from: ['a', 'b', 'c'][e.from], to: ['a', 'b', 'c'][e.to] }))); if (r) expect(r.nEdges).toBe(2); });
});

describe('dseparation', () => {
  it('contract keys', () => expectKeys(dseparation(edges, 0, 3, [1, 2]), ['test', 'dSeparated', 'x', 'y', 'z', 'apa']));
  it('null for invalid', () => expect(dseparation(null, 0, 1)).toBeNull());
  it('dSeparated is boolean', () => { const r = dseparation(edges, 0, 3, [1, 2]); if (r) expect(typeof r.dSeparated).toBe('boolean'); });
});
describe('variableElimination', () => {
  it('contract keys', () => expectKeys(variableElimination([{name:'f1', table:{'0':0.7,'1':0.3}}], ['X1']), ['test','query','nFactors','nEliminated','apa']));
  it('null empty', () => expect(variableElimination([], ['X'])).toBeNull());
  it('nFactors matches', () => { const r = variableElimination([{name:'f1', table:{'0':0.7,'1':0.3}}], ['X1']); if (r) expect(r.nFactors).toBe(1); });
});
describe('treeWidth', () => {
  const edges = [[0,1],[1,2],[2,3]];
  it('contract keys', () => expectKeys(treeWidth(edges, 4), ['test','treewidth','nVars','nEdges','apa']));
  it('null nVars<2', () => expect(treeWidth([], 1)).toBeNull());
  it('treewidth >= 0', () => { const r = treeWidth(edges, 4); if (r) expect(r.treewidth).toBeGreaterThanOrEqual(0); });
});
describe('junctionTree', () => {
  const edges = [[0,1],[1,2],[0,2]];
  it('contract keys', () => expectKeys(junctionTree(edges, 3), ['test','nClusters','nSepsets','nVars','apa']));
  it('null nVars<2', () => expect(junctionTree([], 1)).toBeNull());
  it('nClusters positive', () => { const r = junctionTree(edges, 3); if (r) expect(r.nClusters).toBeGreaterThan(0); });
});
describe('hillClimbing', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ x1: i, x2: i * 0.5, x3: i % 3 });
  it('contract keys', () => expectKeys(hillClimbing(d, ['x1','x2','x3'], { maxIter: 10 }), ['test','edges','score','nEdges','nVars','apa']));
  it('null <3 vars', () => expect(hillClimbing(d, ['x1','x2'])).toBeNull());
  it('score finite', () => { const r = hillClimbing(d, ['x1','x2','x3'], { maxIter: 10 }); if (r) expect(Number.isFinite(r.score)).toBe(true); });
});
describe('scoringBDeu', () => {
  const d = []; for (let i = 0; i < 15; i++) d.push({ x1: i, x2: i % 3 });
  it('contract keys', () => expectKeys(scoringBDeu(d, ['x1','x2'], [{from:0,to:1}]), ['test','score','nEdges','nVars','n','apa']));
  it('score finite', () => { const r = scoringBDeu(d, ['x1','x2'], [{from:0,to:1}]); if (r) expect(Number.isFinite(r.score)).toBe(true); });
  it('nVars matches', () => { const r = scoringBDeu(d, ['x1','x2'], [{from:0,to:1}]); if (r) expect(r.nVars).toBe(2); });
});
describe('cpdag', () => {
  const edges = [{from:0,to:2},{from:1,to:2}];
  it('contract keys', () => expectKeys(cpdag(edges, 3), ['test','edges','nEdges','nVars','colliders','apa']));
  it('null nVars<2', () => expect(cpdag([], 1)).toBeNull());
  it('colliders is array', () => { const r = cpdag(edges, 3); if (r) expect(Array.isArray(r.colliders)).toBe(true); });
});
describe('dSeparationQuery', () => {
  const edges = [{from:0,to:1},{from:1,to:2}];
  it('contract keys', () => expectKeys(dSeparationQuery(edges, 3, 0, 2, [1]), ['test','separated','query','nVars','apa']));
  it('null invalid', () => expect(dSeparationQuery([], 3, null, 2)).toBeNull());
  it('separated is boolean', () => { const r = dSeparationQuery(edges, 3, 0, 2, [1]); if (r) expect(typeof r.separated).toBe('boolean'); });
});

// ── Correctness tests for the real implementations ──────────────────
describe('treeWidth (min-degree elimination upper bound)', () => {
  it('tree (path) has treewidth 1', () => {
    expect(treeWidth([[0,1],[1,2],[2,3]], 4).treewidth).toBe(1);
  });
  it('triangle has treewidth 2', () => {
    expect(treeWidth([[0,1],[1,2],[0,2]], 3).treewidth).toBe(2);
  });
  it('K4 has treewidth 3', () => {
    expect(treeWidth([[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]], 4).treewidth).toBe(3);
  });
});

describe('bicScore (Gaussian BN, higher = better)', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ a: i, b: 2 * i + ((i * 7) % 5 - 2) * 0.1, c: (i % 4) });
  it('scores the true edge a->b higher than the empty graph', () => {
    const withEdge = bicScore(d, ['a','b'], [{ from: 'a', to: 'b' }]).bic;
    const noEdge = bicScore(d, ['a','b'], []).bic;
    expect(withEdge).toBeGreaterThan(noEdge);
  });
});

describe('hillClimbing (score-based structure search)', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i, x2: 2 * i + ((i * 3) % 5 - 2) * 0.1, x3: (i % 4) });
  it('connects the dependent pair x1,x2', () => {
    const r = hillClimbing(d, ['x1','x2','x3'], { maxIter: 20 });
    const has01 = r.edges.some(e => (e.from === 0 && e.to === 1) || (e.from === 1 && e.to === 0));
    expect(has01).toBe(true);
  });
});

describe('scoringBDeu (rewards real dependency)', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i % 3, x2: i % 3 }); // x2 determined by x1
  it('scores x1->x2 higher than no edge', () => {
    const withEdge = scoringBDeu(d, ['x1','x2'], [{ from: 0, to: 1 }]).score;
    const noEdge = scoringBDeu(d, ['x1','x2'], []).score;
    expect(withEdge).toBeGreaterThan(noEdge);
  });
});

describe('dseparation (ancestral moral graph)', () => {
  it('chain 0->1->2: separated given 1, dependent given nothing', () => {
    const e = [{ from: 0, to: 1 }, { from: 1, to: 2 }];
    expect(dseparation(e, 0, 2, [1]).dSeparated).toBe(true);
    expect(dseparation(e, 0, 2, []).dSeparated).toBe(false);
  });
  it('collider 0->2<-1: separated given nothing, dependent given 2', () => {
    const e = [{ from: 0, to: 2 }, { from: 1, to: 2 }];
    expect(dseparation(e, 0, 1, []).dSeparated).toBe(true);
    expect(dseparation(e, 0, 1, [2]).dSeparated).toBe(false);
  });
});

// Chain A->B: P(A)={0.7,0.3}, P(B|A) gives exact P(B=0)=0.7*0.8+0.3*0.4=0.68
const fA = { vars: [0], table: { '0': 0.7, '1': 0.3 } };
const fBA = { vars: [0, 1], table: { '0,0': 0.8, '0,1': 0.2, '1,0': 0.4, '1,1': 0.6 } };

describe('variableElimination (real bucket elimination)', () => {
  it('computes the exact marginal of B in a chain', () => {
    const r = variableElimination([fA, fBA], [1]);
    expect(r.nEliminated).toBe(1);
    expect(r.marginal['0']).toBeCloseTo(0.68, 6);
    expect(r.marginal['1']).toBeCloseTo(0.32, 6);
  });
});

describe('beliefPropagation (real sum-product)', () => {
  it('matches the exact marginal of B in a chain', () => {
    const r = beliefPropagation([fA, fBA], [0, 1], {}, { maxIter: 20 });
    const mB = r.marginals.find(m => m.variable === 1);
    expect(mB.probs[mB.states.indexOf('0')]).toBeCloseTo(0.68, 5);
    const mA = r.marginals.find(m => m.variable === 0);
    expect(mA.probs[mA.states.indexOf('0')]).toBeCloseTo(0.7, 5);
  });
});

describe('hardening — invalid inputs', () => {
  it('markovBlanket null for null edges', () => expect(markovBlanket(null, 1)).toBeNull());
  it('beliefPropagation null for empty vars', () => expect(beliefPropagation([], [], {})).toBeNull());
  it('factorGraph null for null vars', () => expect(factorGraph(null, [[0, 1]])).toBeNull());
  it('bicScore null for empty data', () => expect(bicScore([], ['a'], [])).toBeNull());
  it('dseparation null for null edges', () => expect(dseparation(null, 0, 1)).toBeNull());
  it('variableElimination null for empty factors', () => expect(variableElimination([], ['X'])).toBeNull());
  it('treeWidth null for nVars<2', () => expect(treeWidth([], 1)).toBeNull());
  it('junctionTree null for nVars<2', () => expect(junctionTree([], 1)).toBeNull());
  it('hillClimbing null for <3 vars', () => { const d = [{ a: 1 }, { a: 2 }]; expect(hillClimbing(d, ['a'])).toBeNull(); });
  it('cpdag null for nVars<2', () => expect(cpdag([], 1)).toBeNull());
  it('dSeparationQuery null for null edges', () => expect(dSeparationQuery(null, 3, 0, 1)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('markovBlanket null for single-edge graph', () => expect(markovBlanket([{ from: 0, to: 1 }], 0)).toBeNull());
  it('treeWidth for complete graph', () => { const e = [[0, 1], [0, 2], [1, 2]]; expect(treeWidth(e, 3).treewidth).toBeGreaterThanOrEqual(1); });
  it('junctionTree for disconnected graph', () => { const edges = [[0, 1]]; const r = junctionTree(edges, 3); expect(r).not.toBeNull(); });
  it('scoringBDeu handles constant data', () => { const d = [{ x1: 0, x2: 0 }, { x1: 0, x2: 0 }]; const r = scoringBDeu(d, ['x1', 'x2'], [{ from: 0, to: 1 }]); expect(Number.isFinite(r.score)).toBe(true); });
  it('dseparation on chain', () => { const r = dseparation([{ from: 0, to: 1 }, { from: 1, to: 2 }], 0, 2, [1]); expect(r.dSeparated).toBe(true); });
});
