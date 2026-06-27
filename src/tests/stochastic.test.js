import { describe, it, expect } from 'vitest';
import { markovChain, markovSteadyState, poissonProcess, brownianMotion, randomWalkTest } from './stochastic.js';
import { expectKeys } from './__fixtures__/helpers.js';

const seq = [1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1, 2];
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

describe('markovChain', () => {
  it('null <20', () => expect(markovChain([1, 2, 1])).toBeNull());
  it('contract keys', () => expectKeys(markovChain(seq), ['test', 'transitionMatrix', 'states', 'n', 'apa']));
  it('rows sum to ~1', () => { const r = markovChain(seq); r.transitionMatrix.forEach(row => { const s = row.reduce((a, v) => a + v, 0); expect(s).toBeCloseTo(1, 1); }); });
});

describe('markovSteadyState', () => {
  const P = [[0.5, 0.5], [0.3, 0.7]];
  it('pi sums to ~1', () => { const r = markovSteadyState(P); const s = r.pi.reduce((a, v) => a + v, 0); expect(s).toBeCloseTo(1, 1); });
  it('contract keys', () => expectKeys(markovSteadyState(P), ['test', 'pi', 'k', 'apa']));
});

describe('poissonProcess', () => {
  it('null <10', () => expect(poissonProcess([1, 2, 3])).toBeNull());
  it('contract keys', () => expectKeys(poissonProcess(data), ['test', 'rate', 'meanInterArrival', 'chi2Dispersion', 'p', 'n', 'apa']));
  it('rate > 0', () => { const r = poissonProcess(data); expect(r.rate).toBeGreaterThan(0); });
});

describe('brownianMotion', () => {
  it('null <10', () => expect(brownianMotion([1, 2, 3])).toBeNull());
  it('contract keys', () => expectKeys(brownianMotion(data), ['test', 'drift', 'diffusion', 'n', 'dt', 'apa']));
  it('diffusion >= 0', () => { const r = brownianMotion(data); expect(r.diffusion).toBeGreaterThanOrEqual(0); });
});

describe('randomWalkTest', () => {
  it('null <20', () => expect(randomWalkTest(data.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(randomWalkTest(data), ['test', 'varianceRatio', 'z', 'p', 'q', 'n', 'apa']));
  it('p in [0,1]', () => { const r = randomWalkTest(data); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); });
});
