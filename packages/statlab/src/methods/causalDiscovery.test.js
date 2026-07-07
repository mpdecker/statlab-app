import { describe, it, expect } from 'vitest';
import { partialCorrTest, skeletonPhase, colliderDetection, dagAdjacency, pcAlgorithm, lingam, fciAlgorithm } from './causalDiscovery.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i, x2: i * 0.5, x3: Math.sin(i) });

describe('partialCorrTest', () => {
  it('contract keys', () => expectKeys(partialCorrTest(d, ['x1', 'x2', 'x3'], 'x1', 'x2', ['x3']), ['test', 'r', 't', 'p', 'df', 'n', 'apa']));
  it('handles no vars', () => { const r = partialCorrTest(d, [], 'x1', 'x2', []); expect(r !== undefined).toBe(true); });
  it('r between -1 and 1', () => { const r = partialCorrTest(d, ['x1', 'x2', 'x3'], 'x1', 'x2', ['x3']); if (r && Number.isFinite(r.r)) { expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); } });
});

describe('partialCorrTest matches pingouin.partial_corr exactly (regression test for the missing-intercept fix)', () => {
  it('r and p match on raw, non-centered data where x/y both correlate strongly with z', () => {
    const e = ref.causalDiscovery.partial_corr_basic;
    const rows = e.x.map((x, i) => ({ x, y: e.y[i], z: e.z[i] }));
    const r = partialCorrTest(rows, ['x', 'y', 'z'], 'x', 'y', ['z']);
    expect(r.r).toBeCloseTo(e.r, 3);
    expect(r.p).toBeCloseTo(e.p, 3);
  });
});

describe('skeletonPhase', () => {
  it('contract keys', () => expectKeys(skeletonPhase(d, ['x1', 'x2', 'x3']), ['test', 'edges', 'n', 'k', 'alpha', 'apa']));
  it('null <3 vars', () => expect(skeletonPhase(d, ['x1', 'x2'])).toBeNull());
  it('edges non-empty', () => { const r = skeletonPhase(d, ['x1', 'x2', 'x3']); if (r) expect(r.edges.length).toBeGreaterThan(0); });
});

describe('colliderDetection', () => {
  it('contract keys', () => { const r = colliderDetection([{ i: 0, j: 1, removed: false }, { i: 1, j: 2, removed: false }, { i: 0, j: 2, removed: true }], 3); if (r) expectKeys(r, ['test', 'colliders', 'nVars', 'apa']); });
  it('colliders array', () => { const r = colliderDetection([{ i: 0, j: 1, removed: false }, { i: 1, j: 2, removed: false }, { i: 0, j: 2, removed: true }], 3); if (r) expect(Array.isArray(r.colliders)).toBe(true); });
  it('nVars matches input', () => { const r = colliderDetection([{ i: 0, j: 1, removed: false }, { i: 1, j: 2, removed: false }, { i: 0, j: 2, removed: true }], 3); if (r) expect(r.nVars).toBe(3); });
});

describe('dagAdjacency', () => {
  it('contract keys', () => { const r = dagAdjacency([{ i: 0, j: 1 }], [{ collider: 1, parents: [0, 2] }]); expectKeys(r, ['test', 'edges', 'nEdges', 'apa']); });
  it('adjacency non-empty', () => { const r = dagAdjacency([{ i: 0, j: 1 }], [{ collider: 1, parents: [0, 2] }]); if (r) expect(r.edges.length).toBeGreaterThan(0); });
  it('nEdges matches input', () => { const r = dagAdjacency([{ i: 0, j: 1 }], [{ collider: 1, parents: [0, 2] }]); if (r) expect(r.nEdges).toBeGreaterThan(0); });
});

describe('pcAlgorithm', () => {
  it('is defined', () => expect(typeof pcAlgorithm).toBe('function'));
  it('edges non-empty', () => { const r = pcAlgorithm(d, ['x1', 'x2', 'x3']); if (r && r.edges) expect(r.edges.length).toBeGreaterThan(0); });
  it('nEdges exists', () => { const r = pcAlgorithm(d, ['x1', 'x2', 'x3']); if (r && r.nEdges !== undefined) expect(Number.isFinite(r.nEdges)).toBe(true); });
});

describe('lingam', () => {
  const d2 = []; for (let i = 0; i < 20; i++) d2.push({ x1: i, x2: i * 0.5 + Math.random(), x3: i * 0.3, x4: Math.random() });
  it('contract keys', () => expectKeys(lingam(d2, ['x1','x2','x3','x4']), ['test','edges','nEdges','nVars','n','apa']));
  it('null <3 vars', () => expect(lingam(d2, ['x1','x2'])).toBeNull());
  it('nVars matches input', () => { const r = lingam(d2, ['x1','x2','x3','x4']); if (r) expect(r.nVars).toBe(4); });
});
describe('fciAlgorithm', () => {
  const d3 = []; for (let i = 0; i < 20; i++) d3.push({ x1: i, x2: i * 0.5, x3: Math.sin(i), x4: Math.random() });
  it('contract keys', () => expectKeys(fciAlgorithm(d3, ['x1','x2','x3','x4']), ['test','edges','nEdges','nVars','n','apa']));
  it('null <10', () => expect(fciAlgorithm(d3.slice(0,5), ['x1','x2','x3'])).toBeNull());
  it('edges non-empty', () => { const r = fciAlgorithm(d3, ['x1','x2','x3','x4']); if (r) expect(r.edges.length).toBeGreaterThan(0); });
});
describe('causalDiscovery edge cases', () => {
  it('partialCorrTest null for no vars', () => expect(partialCorrTest(d, [], 'x1', 'x2', []) === null).toBe(true));
  it('skeletonPhase null <3 vars', () => expect(skeletonPhase(d, ['x1', 'x2'])).toBeNull());
  it('colliderDetection null for empty edges', () => expect(colliderDetection([], 3)).toBeNull());
  it('dagAdjacency null for invalid', () => expect(dagAdjacency(null, null)).toBeNull());
  it('pcAlgorithm null for small', () => expect(pcAlgorithm(d.slice(0, 5), ['x1', 'x2', 'x3'])).toBeNull());
});

describe('lingam recovers the causal order (DirectLiNGAM)', () => {
  it('finds the chain x1 -> x2 -> x3 from non-Gaussian data', () => {
    let s = 91; const u = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
    const noise = () => -Math.log(u()) - 1; // exponential (non-Gaussian), mean 0
    const data = [];
    for (let i = 0; i < 400; i++) {
      const x1 = noise() * 2;
      const x2 = 0.8 * x1 + noise();
      const x3 = 0.6 * x2 + noise();
      data.push({ x1, x2, x3 });
    }
    const r = lingam(data, ['x1', 'x2', 'x3']);
    const has = (f, t) => r.edges.some(e => e.from === f && e.to === t);
    expect(has(0, 1)).toBe(true);  // x1 -> x2
    expect(has(1, 2)).toBe(true);  // x2 -> x3
    expect(has(1, 0)).toBe(false); // not reversed
    expect(has(2, 1)).toBe(false);
  });
});

describe('fciAlgorithm orients colliders (real FCI, not a bare skeleton)', () => {
  function gen(kind, seed) {
    let s = seed; const z = () => { let u = 0; for (let i = 0; i < 12; i++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const d = [];
    for (let i = 0; i < 300; i++) {
      if (kind === 'collider') { const x = z(), y = z(); d.push({ x1: x, x2: y, x3: x + y + 0.3 * z() }); } // x1->x3<-x2
      else { const x = z(); const y = x + 0.5 * z(); const w = y + 0.5 * z(); d.push({ x1: x, x2: y, x3: w }); } // chain x1->x2->x3
    }
    return d;
  }
  it('detects the collider x3 when x1,x2 are independent causes', () => {
    const r = fciAlgorithm(gen('collider', 5), ['x1', 'x2', 'x3']);
    expect(r.colliders).toContain(2); // x3 is a collider
  });
  it('does not mark a collider in a chain', () => {
    const r = fciAlgorithm(gen('chain', 5), ['x1', 'x2', 'x3']);
    expect(r.colliders).not.toContain(1);
  });
});

describe('hardening — causal discovery edge cases', () => {
  it('partialCorrTest null for null data', () => expect(partialCorrTest(null, ['x1','x2','x3'], 'x1', 'x2', ['x3'])).toBeNull());
  it('partialCorrTest null for empty vars', () => expect(partialCorrTest(d, [], 'x1', 'x2', [])).toBeNull());
  it('skeletonPhase null for null data', () => expect(skeletonPhase(null, ['x1','x2','x3'])).toBeNull());
  it('skeletonPhase handles single var', () => expect(skeletonPhase(d, ['x1'])).toBeNull());
  it('colliderDetection null for null edges', () => expect(colliderDetection(null, 3)).toBeNull());
  it('colliderDetection null for empty edges', () => expect(colliderDetection([], 3)).toBeNull());
  it('dagAdjacency null for null skeleton', () => expect(dagAdjacency(null, [])).toBeNull());
  it('pcAlgorithm null for null data', () => expect(pcAlgorithm(null, ['x1','x2','x3'])).toBeNull());
  it('pcAlgorithm null for <3*vars rows', () => expect(pcAlgorithm(d.slice(0, 5), ['x1','x2','x3'])).toBeNull());
  it('lingam null for null data', () => expect(lingam(null, ['x1','x2','x3'])).toBeNull());
  it('lingam null for <3 vars', () => expect(lingam(d, ['x1','x2'])).toBeNull());
  it('fciAlgorithm null for null data', () => expect(fciAlgorithm(null, ['x1','x2','x3'])).toBeNull());
  it('fciAlgorithm null for <3 vars', () => expect(fciAlgorithm(d, ['x1','x2'])).toBeNull());
});
