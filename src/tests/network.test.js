import { describe, it, expect } from 'vitest';
import {
  adjacencyFromEdges, centralityMeasures, communityDetection,
  sociogramLayout, networkFromEdgeList,
  pageRank, closenessCentrality, graphMetrics, louvainCommunities, fitPowerLaw,
  networkDiffusion, SIRModel, qapTest, cugTest, networkAutocorrelation, degreeAssortativity, clusteringProfile,
} from './network.js';
import { starEdgeList, ringEdgeList } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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

  it('matches a networkx oracle for degree/betweenness/eigenvector centrality (regression test for the Brandes-algorithm fix)', () => {
    // Betweenness previously used "any node v with dist[v]==dist[t]-1" as a
    // stand-in for "v is a real predecessor of t on a shortest s→t path" —
    // not sufficient, and it massively overcounted (a node with TRUE
    // betweenness 0 got a large nonzero score; the hub's raw score was 5x
    // the graph's theoretical per-node maximum). Rewritten with real Brandes'
    // algorithm (predecessor sets + reverse-BFS dependency accumulation).
    const e = ref.network.centrality_basic;
    const r = centralityMeasures(e.A);
    r.nodes.forEach((node, i) => {
      expect(node.degree).toBe(e.degree[i]);
      expect(node.betweenness).toBeCloseTo(e.betweenness[i], 3);
      expect(node.eigenvector).toBeCloseTo(e.eigenvector_normed[i], 3);
    });
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

// ── PageRank ───────────────────────────────────────────────────────────────
describe('pageRank', () => {
  const A = [[0, 1, 1], [1, 0, 1], [1, 1, 0]];

  it('returns null for empty', () => {
    expect(pageRank(null)).toBeNull();
    expect(pageRank([[0]])).toBeNull();
  });

  it('scores sum to ~1', () => {
    const r = pageRank(A);
    const sum = r.scores.reduce((s, sc) => s + sc.pagerank, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it('contract keys', () => {
    expectKeys(pageRank(A), ['test', 'scores', 'damping', 'nIter', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = pageRank(A);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });

  it('matches a networkx.pagerank oracle', () => {
    const e = ref.network.centrality_basic;
    const r = pageRank(e.A);
    const byNode = Object.fromEntries(r.scores.map(s => [s.node, s.pagerank]));
    e.pagerank.forEach((p, i) => expect(byNode[i]).toBeCloseTo(p, 4));
  });
});

// ── Closeness Centrality ───────────────────────────────────────────────────
describe('closenessCentrality', () => {
  const A = [[0, 1, 0], [1, 0, 1], [0, 1, 0]];

  it('returns null for empty', () => {
    expect(closenessCentrality(null)).toBeNull();
  });

  it('center node has highest closeness', () => {
    const r = closenessCentrality(A);
    const sorted = [...r.scores].sort((a, b) => b.closeness - a.closeness);
    expect(sorted[0].node).toBe(1); // center node in the path
  });

  it('scores in [0, 1]', () => {
    const r = closenessCentrality(A);
    r.scores.forEach(s => {
      expect(s.closeness).toBeGreaterThanOrEqual(0);
    });
  });

  it('matches a networkx.closeness_centrality oracle', () => {
    const e = ref.network.centrality_basic;
    const r = closenessCentrality(e.A);
    const byNode = Object.fromEntries(r.scores.map(s => [s.node, s.closeness]));
    e.closeness.forEach((c, i) => expect(byNode[i]).toBeCloseTo(c, 4));
  });

  it('contract keys', () => {
    expectKeys(closenessCentrality(A), ['test', 'scores', 'n', 'apa']);
  });
});

// ── Graph Metrics ──────────────────────────────────────────────────────────
describe('graphMetrics', () => {
  const A = [[0, 1, 0], [1, 0, 1], [0, 1, 0]];

  it('returns null for small matrix', () => {
    expect(graphMetrics(null)).toBeNull();
  });

  it('diameter and density', () => {
    const r = graphMetrics(A);
    expect(r.diameter).toBe(2);
    expect(r.edgeDensity).toBeGreaterThan(0);
    expect(r.edgeDensity).toBeLessThan(1);
  });

  it('nComponents for connected graph', () => {
    const r = graphMetrics(A);
    expect(r.nComponents).toBe(1);
  });

  it('contract keys', () => {
    expectKeys(graphMetrics(A), ['test', 'diameter', 'avgPathLength', 'clusteringCoeff', 'edgeDensity', 'nComponents', 'n', 'nEdges', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = graphMetrics(A);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Louvain Communities ────────────────────────────────────────────────────
describe('louvainCommunities', () => {
  const A = [
    [0, 1, 1, 0, 0],
    [1, 0, 1, 0, 0],
    [1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
  ];

  it('returns null for small', () => {
    expect(louvainCommunities(null)).toBeNull();
  });

  it('modularity > 0', () => {
    const r = louvainCommunities(A);
    expect(r.modularity).toBeGreaterThan(0);
  });

  it('nCommunities within valid range', () => {
    const r = louvainCommunities(A);
    expect(r.nCommunities).toBeGreaterThanOrEqual(1);
    expect(r.nCommunities).toBeLessThanOrEqual(A.length);
  });

  it('contract keys', () => {
    expectKeys(louvainCommunities(A), ['test', 'communities', 'nCommunities', 'modularity', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = louvainCommunities(A);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Power-Law Fit ──────────────────────────────────────────────────────────
describe('fitPowerLaw', () => {
  const degrees = [2, 2, 3, 3, 4, 5, 6, 7, 8, 2, 3, 4, 2, 3, 2, 5, 6, 10, 12, 15];
  it('returns null for empty', () => { expect(fitPowerLaw(null)).toBeNull(); expect(fitPowerLaw([])).toBeNull(); });
  it('alpha > 1', () => { const r = fitPowerLaw(degrees); expect(r.alpha).toBeGreaterThan(1); });
  it('se is finite', () => { const r = fitPowerLaw(degrees); expect(Number.isFinite(r.se)).toBe(true); });
  it('contract keys', () => { expectKeys(fitPowerLaw(degrees), ['test', 'alpha', 'se', 'xmin', 'ksStat', 'n', 'nTail', 'apa']); });
  it('apa is a non-empty string', () => { const r = fitPowerLaw(degrees); expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); });
});

describe('networkDiffusion', () => {
  const A = [[0, 1, 1], [1, 0, 0], [1, 0, 0]];
  it('contract keys', () => expectKeys(networkDiffusion(A, [0]), ['test', 'diffusion', 'seeds', 'steps', 'alpha', 'n', 'apa']));
  it('diffusion length = steps+1', () => { const r = networkDiffusion(A, [0], { steps: 5 }); expect(r.diffusion).toHaveLength(6); });
});

describe('SIRModel', () => {
  const A = [[0, 1, 1], [1, 0, 0], [1, 0, 0]];
  it('contract keys', () => expectKeys(SIRModel(A, { steps: 5 }), ['test', 'curve', 'params', 'n', 'apa']));
  it('curve has entries', () => { const r = SIRModel(A, { steps: 5 }); expect(r.curve.length).toBeGreaterThan(0); });
});

describe('qapTest', () => { const A = [[0,1,0],[1,0,1],[0,1,0]]; it('contract keys', () => expectKeys(qapTest(A, A, {permutations:20}), ['test','obs','p','permutations','n','apa'])); it('p between 0-1', () => { const r = qapTest(A, A, {permutations:20}); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }); });
describe('cugTest', () => { const A = [[0,1,0],[1,0,1],[0,1,0]]; it('contract keys', () => expectKeys(cugTest(A, a => 1, {permutations:10}), ['test','obs','p','n','apa'])); it('p between 0-1', () => { const r = cugTest(A, a => 1, {permutations:10}); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }); });
describe('networkAutocorrelation', () => { const A2 = [[0,1,0],[1,0,1],[0,1,0]]; it('contract keys', () => expectKeys(networkAutocorrelation(A2, [1,2,3]), ['test','I','n','apa'])); it('autocorr between -1-1', () => { const r = networkAutocorrelation(A2, [1,2,3]); expect(r.I).toBeGreaterThanOrEqual(-1); expect(r.I).toBeLessThanOrEqual(1); }); });
describe('degreeAssortativity', () => { const A2 = [[0,1,0],[1,0,1],[0,1,0]]; it('contract keys', () => expectKeys(degreeAssortativity(A2), ['test','assortativity','m','n','apa'])); it('assortativity between -1-1', () => { const r = degreeAssortativity(A2); expect(r.assortativity).toBeGreaterThanOrEqual(-1); expect(r.assortativity).toBeLessThanOrEqual(1); }); });
describe('clusteringProfile', () => { const A2 = [[0,1,0],[1,0,1],[0,1,0]]; it('contract keys', () => expectKeys(clusteringProfile(A2), ['test','profile','n','apa'])); it('profile non-empty', () => { const r = clusteringProfile(A2); expect(r.profile.length).toBeGreaterThan(0); }); });
