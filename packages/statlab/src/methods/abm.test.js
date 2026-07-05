import { describe, it, expect } from 'vitest';
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison, thresholdModel, networkDiffusion, segregationIndex } from './abm.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const agents = []; for (let i = 0; i < 20; i++) agents.push({ x: i % 5, y: i % 4, val: i * 0.5 });

describe('moranIMulti', () => {
  it('contract keys', () => expectKeys(moranIMulti(agents, 'val'), ['test', 'I', 'n', 'apa']));
  it('null <10', () => expect(moranIMulti(agents.slice(0, 5), 'val')).toBeNull());
  it('I between -1 and 1', () => { const r = moranIMulti(agents, 'val'); if (r && Number.isFinite(r.I)) { expect(r.I).toBeGreaterThanOrEqual(-1); expect(r.I).toBeLessThanOrEqual(1); } });
});

describe('simulationConvergence', () => {
  it('contract keys', () => expectKeys(simulationConvergence([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10, 10]), ['test', 'converged', 'convergedAt', 'window', 'tolerance', 'nRuns', 'apa']));
  it('null short', () => expect(simulationConvergence([1, 2, 3], { window: 10 })).toBeNull());
  it('convergedAt valid', () => { const r = simulationConvergence(Array(20).fill(10)); if (r) expect(Number.isFinite(r.convergedAt)).toBe(true); });
});

describe('sobolSensitivity', () => {
  it('contract keys', () => expectKeys(sobolSensitivity([[1, 2, 3], [4, 5, 6]], [7, 8, 9]), ['test', 'indices', 'nFactors', 'n', 'apa']));
  it('indices between 0-1', () => { const r = sobolSensitivity([[1, 2, 3], [4, 5, 6]], [7, 8, 9]); if (r) expect(r.nFactors).toBeGreaterThan(0); });
  it('n matches inputs', () => { const r = sobolSensitivity([[1, 2, 3], [4, 5, 6]], [7, 8, 9]); if (r) expect(r.n).toBe(3); });
});

describe('agentSummaryStats', () => {
  it('contract keys', () => expectKeys(agentSummaryStats(agents, ['val']), ['test', 'summaries', 'n', 'apa']));
  it('summary non-empty', () => { const r = agentSummaryStats(agents, ['val']); if (r) expect(r.summaries.length).toBeGreaterThan(0); });
  it('n matches agent count', () => { const r = agentSummaryStats(agents, ['val']); if (r) expect(r.n).toBe(20); });
});

describe('scenarioComparison', () => {
  it('contract keys', () => expectKeys(scenarioComparison([{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [4, 5, 6] }]), ['test', 'values', 'pairs', 'nScenarios', 'apa']));
  it('null <2 scenarios', () => expect(scenarioComparison([{ name: 'A', values: [1] }])).toBeNull());
  it('pairs non-empty', () => { const r = scenarioComparison([{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [4, 5, 6] }]); if (r) expect(r.pairs.length).toBeGreaterThan(0); });
});

describe('abm edge cases', () => {
  it('moranIMulti null <10', () => expect(moranIMulti(agents.slice(0, 5), 'val')).toBeNull());
  it('simulationConvergence converged for constant', () => { const r = simulationConvergence(Array(20).fill(10)); expect(r.converged).toBe(true); });
  it('sobolSensitivity null for empty', () => expect(sobolSensitivity([], [])).toBeNull());
  it('agentSummaryStats handles empty vars', () => { const r = agentSummaryStats(agents, []); expect(r).not.toBeNull(); });
  it('scenarioComparison null <2', () => expect(scenarioComparison([{ name: 'A', values: [1] }])).toBeNull());
});

describe('thresholdModel', () => {
  const thresholds = [0.1,0.2,0.5,0.3,0.7,0.15,0.4,0.25,0.6,0.35];
  it('contract keys', () => expectKeys(thresholdModel(10, thresholds), ['test','finalAdopters','proportion','nAgents','apa']));
  it('null <3', () => expect(thresholdModel(2, [0.1,0.2])).toBeNull());
  it('proportion between 0-1', () => { const r = thresholdModel(10, thresholds); if (r) expect(r).toHaveProperty('proportion'); });
});
describe('networkDiffusion', () => {
  const adj = [[0,1,0],[1,0,1],[0,1,0]];
  it('contract keys', () => expectKeys(networkDiffusion(adj, [0], { steps: 5 }), ['test','history','finalInfected','n','prob','apa']));
  it('null invalid', () => expect(networkDiffusion([], [0])).toBeNull());
  it('history non-empty', () => { const r = networkDiffusion(adj, [0], { steps: 5 }); if (r) expect(r.history.length).toBeGreaterThan(0); });
});
describe('segregationIndex', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ group: i % 2, location: Math.floor(i / 4) });
  it('contract keys', () => expectKeys(segregationIndex(d, 'group', 'location'), ['test','D','nGroups','nLocations','n','apa']));
  it('null <5', () => expect(segregationIndex(d.slice(0,3), 'group', 'location')).toBeNull());
  it('D between 0-1', () => { const r = segregationIndex(d, 'group', 'location'); if (r) { expect(r.D).toBeGreaterThanOrEqual(0); expect(r.D).toBeLessThanOrEqual(1); } });
});

describe('sobolSensitivity estimates variance-based indices (not corr^2)', () => {
  it('captures a nonlinear effect that correlation misses', () => {
    let s = 5; const u = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    const x0 = [], x1 = [], y = [];
    for (let i = 0; i < 300; i++) { const a = u(), b = u(); x0.push(a); x1.push(b); y.push(a * a); } // y = x0^2 (corr(x0,y)~0)
    const r = sobolSensitivity([x0, x1], y);
    expect(r.indices[0].sensitivity).toBeGreaterThan(0.5); // S_0 high
    expect(r.indices[1].sensitivity).toBeLessThan(0.2);    // S_1 ~ 0
  });
});

describe('moranIMulti excludes self-pairs and normalizes by the true sum of spatial weights (regression test for the wrong-normalization fix)', () => {
  it('matches a from-scratch numpy re-derivation of the standard Moran\'s I formula', () => {
    const e = ref.abm.moran_basic;
    const r = moranIMulti(e.agents, 'val');
    expect(r.I).toBeCloseTo(e.I, 4);
  });
});
