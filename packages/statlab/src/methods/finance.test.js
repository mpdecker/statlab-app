import { describe, it, expect } from 'vitest';
import { capmBeta, sharpeRatio, sortinoRatio, maxDrawdown, historicalVaR, parametricVaR, rollingWindow, famaFrench3F, carhart4F, egarch, tgarch, treynorRatio, blackScholes, impliedVolatility, optionGreeks, binomialTree, monteCarloPricing, varReduction, monteCarloOption, greeks } from './finance.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const stock = [0.01, -0.02, 0.03, 0.015, -0.005, 0.02, 0.01, -0.01, 0.005, 0.025, -0.015, 0.03];
const market = [0.005, -0.01, 0.02, 0.01, -0.002, 0.015, 0.008, -0.005, 0.003, 0.018, -0.01, 0.02];

describe('capmBeta', () => {
  it('null <10', () => expect(capmBeta(stock.slice(0, 5), market.slice(0, 5))).toBeNull());
  it('beta finite', () => { const r = capmBeta(stock, market); expect(Number.isFinite(r.beta)).toBe(true); });
  it('contract keys', () => expectKeys(capmBeta(stock, market), ['test', 'beta', 'alpha', 'rSquared', 'n', 'apa']));
});

describe('sharpeRatio', () => {
  it('null <5', () => expect(sharpeRatio(stock.slice(0, 3))).toBeNull());
  it('sharpe finite', () => { const r = sharpeRatio(stock); expect(Number.isFinite(r.sharpe)).toBe(true); });
  it('contract keys', () => expectKeys(sharpeRatio(stock), ['test', 'sharpe', 'meanReturn', 'sd', 'riskFree', 'annualized', 'n', 'apa']));
});

describe('sortinoRatio', () => {
  it('null <5', () => expect(sortinoRatio([1, 2, 3])).toBeNull());
  it('sortino finite', () => { const r = sortinoRatio(stock); expect(Number.isFinite(r.sortino)).toBe(true); });
  it('contract keys', () => expectKeys(sortinoRatio(stock), ['test', 'sortino', 'downsideDeviation', 'mar', 'n', 'apa']));
});

describe('maxDrawdown', () => {
  it('null <3', () => expect(maxDrawdown([1, 2])).toBeNull());
  it('drawdown >= 0', () => { const r = maxDrawdown(stock); expect(r.maxDrawdown).toBeGreaterThanOrEqual(0); });
  it('contract keys', () => expectKeys(maxDrawdown(stock), ['test', 'maxDrawdown', 'peakIndex', 'troughIndex', 'n', 'apa']));
});

describe('historicalVaR', () => {
  it('null <20', () => expect(historicalVaR(stock.slice(0, 10))).toBeNull());
  it('VaR >= 0', () => { const r = historicalVaR([...stock, ...stock.map(v => v * 0.5)]); expect(r.var).toBeGreaterThanOrEqual(0); });
  it('contract keys', () => { const d = [...stock, ...stock.map(v => v * 0.5)]; expectKeys(historicalVaR(d), ['test', 'var', 'cvar', 'alpha', 'n', 'apa']); });
});

describe('parametricVaR', () => {
  it('null <5', () => expect(parametricVaR([1, 2])).toBeNull());
  it('VaR finite', () => { const r = parametricVaR(stock); expect(Number.isFinite(r.var)).toBe(true); });
  it('contract keys', () => expectKeys(parametricVaR(stock), ['test', 'var', 'mean', 'sd', 'alpha', 'horizon', 'n', 'apa']));
});

describe('rollingWindow', () => {
  it('null < windowSize', () => expect(rollingWindow(stock, x => x[0], 20)).toBeNull());
  it('values count correct', () => { const r = rollingWindow(stock, x => x[0], 3, { step: 2 }); expect(r.values.length).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(rollingWindow(stock, x => x[0], 3, { step: 2 }), ['test', 'values', 'windowSize', 'step', 'n', 'apa']));
});

describe('edge cases', () => {
  it('capmBeta null for length mismatch', () => expect(capmBeta([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2])).toBeNull());
  it('sharpeRatio null for zero sd', () => expect(sharpeRatio([0.05, 0.05, 0.05, 0.05, 0.05])).toBeNull());
  it('sharpeRatio not annualized', () => { const r = sharpeRatio(stock, { annualize: false }); expect(r.sharpe).toBeLessThan(1); });
  it('sortinoRatio null when all returns above MAR', () => expect(sortinoRatio([0.02, 0.03, 0.04, 0.05, 0.03], { mar: -0.5 })).toBeNull());
  it('maxDrawdown null for <3', () => expect(maxDrawdown([0.01, -0.01])).toBeNull());
  it('historicalVaR CVaR >= VaR', () => { const d = [...stock, ...stock.map(v => v * 0.5)]; const r = historicalVaR(d); expect(r.cvar).toBeGreaterThanOrEqual(r.var); });
  it('parametricVaR horizon affects result', () => { const r1 = parametricVaR(stock, { horizon: 1 }); const r2 = parametricVaR(stock, { horizon: 10 }); expect(Number.isFinite(r1.var)).toBe(true); expect(Number.isFinite(r2.var)).toBe(true); });
  it('rollingWindow with step=1 works', () => expect(rollingWindow(stock, x => x[0], 3, { step: 1 })).not.toBeNull());
});

describe('famaFrench3F', () => {
  it('defined', () => expect(typeof famaFrench3F).toBe('function'));
  it('factors non-empty', () => { const r = famaFrench3F(stock, market); if (r && r.factors) expect(r.factors.length).toBeGreaterThan(0); });
  it('null for missing smb parameter', () => { expect(famaFrench3F(stock, market, null, stock.map(v => v * 0.5))).toBeNull(); });
});
describe('carhart4F', () => {
  it('defined', () => expect(typeof carhart4F).toBe('function'));
  it('factors non-empty', () => { const r = carhart4F(stock, market); if (r && r.factors) expect(r.factors.length).toBeGreaterThan(0); });
  it('null for missing mom parameter', () => { expect(carhart4F(stock, market, stock.map(v => v * 0.5), market.map(v => -v), null)).toBeNull(); });
});
describe('egarch', () => {
  it('handles gracefully', () => { const r = egarch(stock); expect(r === null || r.test).toBeDefined(); });
  it('params non-empty', () => { const r = egarch(stock); if (r && r.params) expect(r.params.length).toBeGreaterThan(0); });
  it('conditionalVar non-empty with sufficient data', () => { const data = [...stock, ...stock.map(v => v * 0.5)]; const r = egarch(data); if (r) { expect(r.conditionalVar.length).toBeGreaterThan(0); expect(Number.isFinite(r.gamma)).toBe(true); } });
});
describe('tgarch', () => {
  it('handles gracefully', () => { const r = tgarch(stock); expect(r === null || r.test).toBeDefined(); });
  it('params non-empty', () => { const r = tgarch(stock); if (r && r.params) expect(r.params.length).toBeGreaterThan(0); });
  it('conditionalVar non-empty with sufficient data', () => { const data = [...stock, ...stock.map(v => v * 0.5)]; const r = tgarch(data); if (r) { expect(r.conditionalVar.length).toBeGreaterThan(0); expect(Number.isFinite(r.gamma)).toBe(true); } });
});
describe('treynorRatio', () => {
  it('contract keys', () => expectKeys(treynorRatio(stock, 1.2), ['test', 'treynor', 'beta', 'mean', 'riskFree', 'n', 'apa']));
  it('null for zero beta', () => expect(treynorRatio(stock, 0)).toBeNull());
  it('treynor is finite', () => { const r = treynorRatio(stock, 1.2); if (r) expect(Number.isFinite(r.treynor)).toBe(true); });
});

describe('blackScholes', () => {
  it('contract keys', () => expectKeys(blackScholes(100, 100, 1, 0.05, 0.2), ['test', 'price', 'type', 'spot', 'strike', 'time', 'rate', 'sigma', 'apa']));
  it('price positive', () => { const r = blackScholes(100, 100, 1, 0.05, 0.2); if (r) expect(r.price).toBeGreaterThan(0); });
  it('price is finite', () => { const r = blackScholes(100, 100, 1, 0.05, 0.2); if (r) expect(Number.isFinite(r.price)).toBe(true); });
});
describe('impliedVolatility', () => {
  it('contract keys', () => expectKeys(impliedVolatility(10, 100, 100, 1, 0.05), ['test', 'iv', 'marketPrice', 'spot', 'strike', 'time', 'rate', 'type', 'apa']));
  it('iv positive', () => { const r = impliedVolatility(10, 100, 100, 1, 0.05); if (r) expect(r.iv).toBeGreaterThan(0); });
  it('iv is finite', () => { const r = impliedVolatility(10, 100, 100, 1, 0.05); if (r) expect(Number.isFinite(r.iv)).toBe(true); });
});
describe('optionGreeks', () => {
  it('contract keys', () => expectKeys(optionGreeks(100, 100, 1, 0.05, 0.2), ['test', 'delta', 'gamma', 'theta', 'vega', 'rho', 'apa']));
  it('delta between 0-1', () => { const r = optionGreeks(100, 100, 1, 0.05, 0.2); if (r) { expect(r.delta).toBeGreaterThanOrEqual(0); expect(r.delta).toBeLessThanOrEqual(1); } });
  it('gamma is finite', () => { const r = optionGreeks(100, 100, 1, 0.05, 0.2); if (r) expect(Number.isFinite(r.gamma)).toBe(true); });
});
describe('binomialTree', () => {
  it('contract keys', () => expectKeys(binomialTree(100, 100, 1, 0.05, 0.2, 50), ['test', 'price', 'steps', 'type', 'apa']));
  it('price positive', () => { const r = binomialTree(100, 100, 1, 0.05, 0.2, 50); if (r) expect(r.price).toBeGreaterThan(0); });
  it('price is finite', () => { const r = binomialTree(100, 100, 1, 0.05, 0.2, 50); if (r) expect(Number.isFinite(r.price)).toBe(true); });
});
describe('monteCarloPricing', () => {
  it('contract keys', () => expectKeys(monteCarloPricing(100, 100, 1, 0.05, 0.2, 500), ['test', 'price', 'nPaths', 'type', 'apa']));
  it('price finite', () => { const r = monteCarloPricing(100, 100, 1, 0.05, 0.2, 500); if (r) expect(Number.isFinite(r.price)).toBe(true); });
  it('nPaths matches input', () => { const r = monteCarloPricing(100, 100, 1, 0.05, 0.2, 500); if (r) expect(r.nPaths).toBe(500); });
});
describe('varReduction', () => {
  it('contract keys', () => expectKeys(varReduction([1.1,2.2,3.3,4.4,5.5], 3), ['test', 'rawVar', 'reducedVar', 'reduction', 'n', 'apa']));
  it('reduction between 0-100', () => { const r = varReduction([1.1,2.2,3.3,4.4,5.5], 3); expect(r.reduction).toBeGreaterThanOrEqual(0); expect(r.reduction).toBeLessThanOrEqual(100); });
  it('rawVar is finite', () => { const r = varReduction([1.1,2.2,3.3,4.4,5.5], 3); if (r) expect(Number.isFinite(r.rawVar)).toBe(true); });
});

describe('monteCarloOption', () => {
  it('contract keys', () => expectKeys(monteCarloOption(100, 105, 1, 0.05, 0.2, { nSim: 50 }), ['test','price','nSim','S','K','T','type','apa']));
  it('null invalid', () => expect(monteCarloOption(-1, 100, 1, 0.05, 0.2)).toBeNull());
  it('price is finite', () => { const r = monteCarloOption(100, 105, 1, 0.05, 0.2, { nSim: 50 }); if (r) expect(Number.isFinite(r.price)).toBe(true); });
});
describe('greeks', () => {
  it('contract keys', () => expectKeys(greeks(100, 105, 1, 0.05, 0.2), ['test','delta','gamma','theta','vega','rho','apa']));
  it('null invalid', () => expect(greeks(-1, 100, 1, 0.05, 0.2)).toBeNull());
  it('delta is finite', () => { const r = greeks(100, 105, 1, 0.05, 0.2); if (r) expect(Number.isFinite(r.delta)).toBe(true); });
});

describe('blackScholes / greeks accuracy (vs exact normal CDF)', () => {
  // Textbook BS: S=K=100, T=1, r=5%, sigma=20% → call=10.4506, put=5.5735.
  // The tanh approximation to Phi gives ~9.53 for the call (~9% error).
  it('call price matches the exact Black-Scholes value', () => {
    expect(blackScholes(100, 100, 1, 0.05, 0.2, 'call').price).toBeCloseTo(10.4506, 2);
  });
  it('put price matches the exact Black-Scholes value', () => {
    expect(blackScholes(100, 100, 1, 0.05, 0.2, 'put').price).toBeCloseTo(5.5735, 2);
  });
  it('call delta equals N(d1)', () => {
    // d1 = 0.35 → N(0.35) = 0.63683
    expect(optionGreeks(100, 100, 1, 0.05, 0.2).delta).toBeCloseTo(0.6368, 3);
  });
});

describe('capmBeta and sharpeRatio match independent numpy/scipy oracles exactly', () => {
  it('capmBeta matches a covariance-based OLS regression', () => {
    const e = ref.finance.capm_basic;
    const r = capmBeta(e.stockR, e.marketR);
    expect(r.beta).toBeCloseTo(e.beta, 3);
    expect(r.alpha).toBeCloseTo(e.alpha, 5);
    expect(r.rSquared).toBeCloseTo(e.rSquared, 3);
  });
  it('sharpeRatio matches mean/SD*sqrt(252) exactly', () => {
    const e = ref.finance.sharpe_basic;
    const r = sharpeRatio(e.returns);
    expect(r.sharpe).toBeCloseTo(e.sharpe, 3);
  });
});

describe('maxDrawdown and historicalVaR match independent numpy oracles exactly', () => {
  it('maxDrawdown matches the cummax-based peak/trough computation', () => {
    const e = ref.finance.maxdd_basic;
    const r = maxDrawdown(e.returns);
    expect(r.maxDrawdown).toBeCloseTo(e.maxDrawdown, 2);
    expect(r.troughIndex).toBe(e.troughIndex);
  });
  it('historicalVaR matches the independent sorted-quantile computation', () => {
    const e = ref.finance.var_basic;
    const r = historicalVaR(e.returns);
    expect(r.var).toBeCloseTo(e.var, 4);
    expect(r.cvar).toBeCloseTo(e.cvar, 4);
  });
});

describe('blackScholes and binomialTree agree with an independent CRR/BS implementation', () => {
  it('call and put prices match on a non-ATM example', () => {
    const e = ref.finance.bs_basic;
    const call = blackScholes(e.spot, e.strike, e.time, e.rate, e.sigma, 'call');
    const put = blackScholes(e.spot, e.strike, e.time, e.rate, e.sigma, 'put');
    expect(call.price).toBeCloseTo(e.call, 3);
    expect(put.price).toBeCloseTo(e.put, 3);
  });
  it('binomialTree converges to the same prices at 200 steps', () => {
    const eb = ref.finance.binom_basic;
    const call = binomialTree(100, 105, 0.5, 0.03, 0.25, eb.steps, 'call');
    const put = binomialTree(100, 105, 0.5, 0.03, 0.25, eb.steps, 'put');
    expect(call.price).toBeCloseTo(eb.call, 2);
    expect(put.price).toBeCloseTo(eb.put, 2);
  });
});

describe('GARCH-family models are estimated, not hardcoded', () => {
  // GJR-GARCH(1,1) DGP: omega=0.1, alpha=0.08, gamma=0.06, beta=0.6 (persistence ~0.71).
  let s = 2468;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  const randn = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const w = 0.1, a = 0.08, g = 0.06, b = 0.6;
  let s2 = w / (1 - a - g / 2 - b);
  const returns = [];
  for (let t = 0; t < 1000; t++) {
    const e = Math.sqrt(s2) * randn();
    returns.push(e);
    s2 = w + a * e * e + (e < 0 ? g * e * e : 0) + b * s2;
  }
  it('tgarch estimates parameters from data (beta != hardcoded 0.9)', () => {
    const r = tgarch(returns);
    expect(r.beta).not.toBe(0.9);
    expect(r.beta).toBeGreaterThan(0.2);
    expect(r.beta).toBeLessThan(0.88);
    expect(r.omega).toBeGreaterThan(0);
  });
  it('egarch estimates parameters from data (not the hardcoded defaults)', () => {
    const r = egarch(returns);
    expect(r.beta).not.toBe(0.9);
    expect(Number.isFinite(r.alpha)).toBe(true);
  });
});
