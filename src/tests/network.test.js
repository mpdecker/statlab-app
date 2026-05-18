import { describe, it, expect } from 'vitest';
import {
  adjacencyFromEdges, centralityMeasures, communityDetection,
  sociogramLayout, networkFromEdgeList,
} from './network.js';
import { starEdgeList, ringEdgeList } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';

const star = networkFromEdgeList(starEdgeList());
const ring = networkFromEdgeList(ringEdgeList(6));
const { nodes, A, edges } = star;

describe('networkFromEdgeList', () => {
  it('parses hyphen edges', () => {
    expect(edges.length).toBeGreaterThan(0);
    expect(nodes).toContain('Hub');
  });

  it('deduplicates node names', () => {
    const net = networkFromEdgeList('A-B,B-C,C-A');
    expect(net.nodes.sort()).toEqual(['A', 'B', 'C']);
  });

  it('respects explicit nodeNames order', () => {
    const net = networkFromEdgeList('X-Y', ['Y', 'X', 'Z']);
    expect(net.nodes).toEqual(['Y', 'X', 'Z']);
  });

  it('ignores malformed pairs', () => {
    const net = networkFromEdgeList('A-B, broken, C-D');
    expect(net.edges.length).toBe(2);
  });
});

describe('adjacencyFromEdges', () => {
  it('symmetric undirected weights', () => {
    expect(A[0][1]).toBe(A[1][0]);
  });

  it('zero diagonal by default usage', () => {
    const net = networkFromEdgeList('A-B');
    expect(net.A[0][0]).toBe(0);
  });

  it('accumulates parallel edges', () => {
    const nodes = ['A', 'B'];
    const A2 = adjacencyFromEdges(nodes, [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'A', to: 'B', weight: 2 },
    ]);
    expect(A2[0][1]).toBe(3);
  });

  it('directed mode is asymmetric', () => {
    const nodes = ['A', 'B'];
    const Ad = adjacencyFromEdges(nodes, [{ from: 'A', to: 'B', weight: 1 }], false);
    expect(Ad[0][1]).toBe(1);
    expect(Ad[1][0]).toBe(0);
  });
});

describe('centralityMeasures', () => {
  it('returns null for empty matrix', () => expect(centralityMeasures([])).toBeNull());

  it('one node network', () => {
    const r = centralityMeasures([[0]]);
    expect(r.nodes).toHaveLength(1);
    expect(r.nodes[0].degree).toBe(0);
  });

  it('hub has highest degree in star', () => {
    const r = centralityMeasures(A);
    const hub = r.nodes.find(n => n.name === 'n0');
    const maxDeg = Math.max(...r.nodes.map(n => n.degree));
    expect(hub.degree).toBe(maxDeg);
  });

  it('degreeNorm in [0, 1]', () => {
    centralityMeasures(A).nodes.forEach(n => {
      expect(n.degreeNorm).toBeGreaterThanOrEqual(0);
      expect(n.degreeNorm).toBeLessThanOrEqual(1);
    });
  });

  it('betweenness and eigenvector defined', () => {
    const r = centralityMeasures(ring.A);
    r.nodes.forEach(n => {
      expect(n.betweenness).toBeGreaterThanOrEqual(0);
      expect(n.eigenvector).toBeGreaterThanOrEqual(0);
    });
  });

  it('contract fields', () => {
    const r = centralityMeasures(A);
    expectKeys(r, ['test', 'nodes', 'n', 'apa']);
    expect(r.test).toBe('Centrality Measures');
  });
});

describe('communityDetection', () => {
  it('returns null for single node', () => expect(communityDetection([[0]])).toBeNull());
  it('returns null for n < 2', () => expect(communityDetection([])).toBeNull());

  it('assigns community id per node', () => {
    const r = communityDetection(ring.A);
    expect(r.communities).toHaveLength(ring.A.length);
  });

  it('at least one community', () => {
    expect(communityDetection(A).nCommunities).toBeGreaterThanOrEqual(1);
  });

  it('modularity in [-0.5, 1] typically', () => {
    const q = communityDetection(ring.A).modularity;
    expect(q).toBeGreaterThanOrEqual(-0.5);
    expect(q).toBeLessThanOrEqual(1);
  });

  it('contract fields', () => {
    const r = communityDetection(A);
    expectKeys(r, ['test', 'communities', 'nCommunities', 'modularity', 'n', 'apa']);
  });
});

describe('sociogramLayout', () => {
  it('returns null for empty graph', () => expect(sociogramLayout([])).toBeNull());

  it('positions all nodes', () => {
    const r = sociogramLayout(A);
    expect(r.nodes).toHaveLength(A.length);
    r.nodes.forEach(n => {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    });
  });

  it('edges for each adjacency', () => {
    const r = sociogramLayout(ring.A);
    expect(r.edges.length).toBeGreaterThan(0);
    r.edges.forEach(e => {
      expect(e).toHaveProperty('from');
      expect(e).toHaveProperty('to');
      expect(e.weight).toBeGreaterThan(0);
    });
  });

  it('contract fields', () => {
    const r = sociogramLayout(A);
    expectKeys(r, ['test', 'nodes', 'edges', 'n', 'apa']);
    expect(r.test).toBe('Sociogram');
  });

  it('layout changes with iterations (not identical ring)', () => {
    const a = sociogramLayout(ring.A, 10);
    const b = sociogramLayout(ring.A, 80);
    const same = a.nodes.every((n, i) => n.x === b.nodes[i].x && n.y === b.nodes[i].y);
    expect(same).toBe(false);
  });
});
