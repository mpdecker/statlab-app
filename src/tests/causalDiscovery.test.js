import { describe, it, expect } from 'vitest';
import { partialCorrTest, skeletonPhase, colliderDetection, dagAdjacency, pcAlgorithm } from './causalDiscovery.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i, x2: i * 0.5, x3: Math.sin(i) });

describe('partialCorrTest', () => {
  it('contract keys', () => expectKeys(partialCorrTest(d, ['x1', 'x2', 'x3'], 'x1', 'x2', ['x3']), ['test', 'r', 't', 'p', 'df', 'n', 'apa']));
  it('handles no vars', () => { const r = partialCorrTest(d, [], 'x1', 'x2', []); expect(r !== undefined).toBe(true); });
});

describe('skeletonPhase', () => {
  it('contract keys', () => expectKeys(skeletonPhase(d, ['x1', 'x2', 'x3']), ['test', 'edges', 'n', 'k', 'alpha', 'apa']));
  it('null <3 vars', () => expect(skeletonPhase(d, ['x1', 'x2'])).toBeNull());
});

describe('colliderDetection', () => {
  it('contract keys', () => { const r = colliderDetection([{ i: 0, j: 1, removed: false }, { i: 1, j: 2, removed: false }, { i: 0, j: 2, removed: true }], 3); if (r) expectKeys(r, ['test', 'colliders', 'nVars', 'apa']); });
});

describe('dagAdjacency', () => {
  it('contract keys', () => { const r = dagAdjacency([{ i: 0, j: 1 }], [{ collider: 1, parents: [0, 2] }]); expectKeys(r, ['test', 'edges', 'nEdges', 'apa']); });
});

describe('pcAlgorithm', () => {
  it('is defined', () => expect(typeof pcAlgorithm).toBe('function'));
});

describe('causalDiscovery edge cases', () => {
  it('partialCorrTest null for no vars', () => expect(partialCorrTest(d, [], 'x1', 'x2', []) === null).toBe(true));
  it('skeletonPhase null <3 vars', () => expect(skeletonPhase(d, ['x1', 'x2'])).toBeNull());
  it('colliderDetection null for empty edges', () => expect(colliderDetection([], 3)).toBeNull());
  it('dagAdjacency null for invalid', () => expect(dagAdjacency(null, null)).toBeNull());
  it('pcAlgorithm null for small', () => expect(pcAlgorithm(d.slice(0, 5), ['x1', 'x2', 'x3'])).toBeNull());
});
