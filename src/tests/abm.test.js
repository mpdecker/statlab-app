import { describe, it, expect } from 'vitest';
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison } from './abm.js';
import { expectKeys } from './__fixtures__/helpers.js';

const agents = []; for (let i = 0; i < 20; i++) agents.push({ x: i % 5, y: i % 4, val: i * 0.5 });

describe('moranIMulti', () => {
  it('contract keys', () => expectKeys(moranIMulti(agents, 'val'), ['test', 'I', 'n', 'apa']));
  it('null <10', () => expect(moranIMulti(agents.slice(0, 5), 'val')).toBeNull());
});

describe('simulationConvergence', () => {
  it('contract keys', () => expectKeys(simulationConvergence([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10, 10]), ['test', 'converged', 'convergedAt', 'window', 'tolerance', 'nRuns', 'apa']));
  it('null short', () => expect(simulationConvergence([1, 2, 3], { window: 10 })).toBeNull());
});

describe('sobolSensitivity', () => {
  it('contract keys', () => expectKeys(sobolSensitivity([[1, 2, 3], [4, 5, 6]], [7, 8, 9]), ['test', 'indices', 'nFactors', 'n', 'apa']));
});

describe('agentSummaryStats', () => {
  it('contract keys', () => expectKeys(agentSummaryStats(agents, ['val']), ['test', 'summaries', 'n', 'apa']));
});

describe('scenarioComparison', () => {
  it('contract keys', () => expectKeys(scenarioComparison([{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [4, 5, 6] }]), ['test', 'values', 'pairs', 'nScenarios', 'apa']));
  it('null <2 scenarios', () => expect(scenarioComparison([{ name: 'A', values: [1] }])).toBeNull());
});

describe('abm edge cases', () => {
  it('moranIMulti null <10', () => expect(moranIMulti(agents.slice(0, 5), 'val')).toBeNull());
  it('simulationConvergence converged for constant', () => { const r = simulationConvergence(Array(20).fill(10)); expect(r.converged).toBe(true); });
  it('sobolSensitivity null for empty', () => expect(sobolSensitivity([], [])).toBeNull());
  it('agentSummaryStats handles empty vars', () => { const r = agentSummaryStats(agents, []); expect(r).not.toBeNull(); });
  it('scenarioComparison null <2', () => expect(scenarioComparison([{ name: 'A', values: [1] }])).toBeNull());
});
