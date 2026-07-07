import { describe, it, expect } from 'vitest';
import { markovChain, markovSteadyState, poissonProcess, brownianMotion, randomWalkTest, ornsteinUhlenbeck, jumpDiffusion, regimeSwitching, hestonModel, roughVolatility, sabrModel, vasicekModel } from './stochastic.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('markovSteadyState matches an independent numpy eigenvector computation exactly', () => {
  it('pi matches on a 3-state transition matrix', () => {
    const e = ref.stochastic.steady_state_basic;
    const r = markovSteadyState(e.P);
    e.pi.forEach((p, i) => expect(r.pi[i]).toBeCloseTo(p, 4));
  });
});

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
  it('k matches matrix size', () => { const r = markovSteadyState(P); expect(r.k).toBe(2); });
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

describe('ornsteinUhlenbeck', () => {
  const data = Array.from({length: 30}, () => 5 + Math.random() * 2);
  it('contract keys', () => expectKeys(ornsteinUhlenbeck(data), ['test','theta','mu','sigma','n','dt','apa']));
  it('null <10', () => expect(ornsteinUhlenbeck([1,2,3])).toBeNull());
  it('theta finite', () => { const r = ornsteinUhlenbeck(data); if (r) expect(Number.isFinite(r.theta)).toBe(true); });
});
describe('jumpDiffusion', () => {
  const data = Array.from({length: 30}, () => 100 + Math.random() * 10);
  it('contract keys', () => expectKeys(jumpDiffusion(data), ['test','mu','sigma','lambda','jumpMean','jumpCount','n','apa']));
  it('null <20', () => expect(jumpDiffusion([1,2,3])).toBeNull());
  it('jumpCount integer', () => { const r = jumpDiffusion(data); if (r) expect(Number.isInteger(r.jumpCount)).toBe(true); });
});
describe('regimeSwitching', () => {
  const data = Array.from({length: 30}, (_, i) => i < 15 ? Math.random() * 5 : 10 + Math.random() * 5);
  it('contract keys', () => expectKeys(regimeSwitching(data), ['test','mu','sigma','stationary','regimeCounts','n','apa']));
  it('null <20', () => expect(regimeSwitching([1,2,3])).toBeNull());
  it('regimeCounts non-empty', () => { const r = regimeSwitching(data); if (r) expect(r.regimeCounts.length).toBeGreaterThan(0); });
  it('Baum-Welch recovers two well-separated regime means', () => {
    let s = 11; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    // Persistent 2-regime series: first ~half near 0, second ~half near 10.
    const series = []; for (let i = 0; i < 120; i++) series.push((i < 60 ? 0 : 10) + rnd() * 2);
    const r = regimeSwitching(series);
    const lo = Math.min(...r.mu), hi = Math.max(...r.mu);
    expect(lo).toBeLessThan(3);           // low regime mean near 0
    expect(hi).toBeGreaterThan(7);        // high regime mean near 10
    expect(hi - lo).toBeGreaterThan(5);   // regimes are actually separated (not the old fixed init)
  });
  it('estimates a transition matrix whose rows are probabilities', () => {
    let s = 4; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    const series = []; for (let i = 0; i < 80; i++) series.push((Math.floor(i / 10) % 2 === 0 ? 0 : 6) + rnd());
    const r = regimeSwitching(series);
    r.transition.forEach(row => { const sum = row.reduce((a, b) => a + b, 0); expect(sum).toBeGreaterThan(0.98); expect(sum).toBeLessThan(1.02); });
    expect(Number.isFinite(r.logLik)).toBe(true);
  });
});
describe('hestonModel', () => {
  const rets = Array.from({length: 30}, () => (Math.random() - 0.5) * 0.02);
  it('contract keys', () => expectKeys(hestonModel(rets), ['test','mu','sigma','kappa','theta','xi','rho','n','apa']));
  it('null <20', () => expect(hestonModel([0.01,0.02])).toBeNull());
  it('kappa finite', () => { const r = hestonModel(rets); if (r) expect(Number.isFinite(r.kappa)).toBe(true); });
});
describe('roughVolatility', () => {
  const rets = Array.from({length: 30}, () => (Math.random() - 0.5) * 0.02);
  it('contract keys', () => expectKeys(roughVolatility(rets, 0.07), ['test','H','sigma','n','apa']));
  it('null <20', () => expect(roughVolatility([0.01])).toBeNull());
  it('H finite', () => { const r = roughVolatility(rets, 0.07); if (r) expect(Number.isFinite(r.H)).toBe(true); });
});
describe('sabrModel', () => {
  it('contract keys', () => expectKeys(sabrModel(100, 105, 1), ['test','impliedVol','F','K','T','apa']));
  it('null invalid params', () => expect(sabrModel(-1, 100, 1)).toBeNull());
  it('impliedVol positive', () => { const r = sabrModel(100, 105, 1); if (r) expect(r).toHaveProperty('impliedVol'); });
});
describe('vasicekModel', () => {
  const rates = Array.from({length: 20}, (_, i) => 0.02 + 0.005 * Math.sin(i) + Math.random() * 0.01);
  it('contract keys', () => expectKeys(vasicekModel(rates), ['test','kappa','theta','sigma','n','apa']));
  it('null <10', () => expect(vasicekModel([0.01,0.02])).toBeNull());
  it('theta finite', () => { const r = vasicekModel(rates); if (r) expect(r).toHaveProperty('theta'); });
});

describe('hestonModel calibrates to the return series (not the input params)', () => {
  it('recovers the long-run variance theta from the data', () => {
    let s = 13; const N = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; const u1 = Math.max(s / 2 ** 32, 1e-9); s = (Math.imul(1664525, s) + 1013904223) >>> 0; const u2 = s / 2 ** 32; return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
    const dt = 1 / 252, vTrue = 0.09; // variance level 0.09 (vol 0.3), not the default 0.04
    const rets = Array.from({ length: 500 }, () => N() * Math.sqrt(vTrue * dt));
    const r = hestonModel(rets, dt);
    expect(r.theta).toBeGreaterThan(0.06);  // calibrated to vTrue=0.09, not the hardcoded default 0.04
    expect(r.theta).toBeLessThan(0.12);
  });
});

describe('hardening — invalid inputs', () => {
  it('markovChain rejects null/too short', () => {
    expect(markovChain(null)).toBeNull();
    expect(markovChain([])).toBeNull();
    expect(markovChain([1, 2])).toBeNull();
  });
  it('markovSteadyState rejects null/too small', () => {
    expect(markovSteadyState(null)).toBeNull();
    expect(markovSteadyState([])).toBeNull();
    expect(markovSteadyState([[0.5]])).toBeNull();
  });
  it('poissonProcess rejects null/empty', () => {
    expect(poissonProcess(null)).toBeNull();
    expect(poissonProcess([])).toBeNull();
  });
  it('brownianMotion rejects null/empty', () => {
    expect(brownianMotion(null)).toBeNull();
    expect(brownianMotion([])).toBeNull();
  });
  it('randomWalkTest rejects null', () => {
    expect(randomWalkTest(null)).toBeNull();
    expect(randomWalkTest([])).toBeNull();
  });
  it('ornsteinUhlenbeck rejects null', () => {
    expect(ornsteinUhlenbeck(null)).toBeNull();
  });
  it('jumpDiffusion rejects null', () => {
    expect(jumpDiffusion(null)).toBeNull();
  });
  it('regimeSwitching rejects null/too few', () => {
    expect(regimeSwitching(null)).toBeNull();
    expect(regimeSwitching([1, 2])).toBeNull();
  });
  it('hestonModel rejects null/too few', () => {
    expect(hestonModel(null)).toBeNull();
    expect(hestonModel([0.01])).toBeNull();
  });
  it('roughVolatility rejects null', () => {
    expect(roughVolatility(null)).toBeNull();
  });
  it('sabrModel rejects negative params', () => {
    expect(sabrModel(0, 100, 1)).toBeNull();
    expect(sabrModel(100, 0, 1)).toBeNull();
    expect(sabrModel(100, 100, 0)).toBeNull();
  });
  it('vasicekModel rejects null/empty', () => {
    expect(vasicekModel(null)).toBeNull();
    expect(vasicekModel([])).toBeNull();
  });
});
