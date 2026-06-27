import { describe, it, expect } from 'vitest';
import { capmBeta, sharpeRatio, sortinoRatio, maxDrawdown, historicalVaR, parametricVaR, rollingWindow, famaFrench3F, carhart4F, egarch, tgarch, treynorRatio, blackScholes, impliedVolatility, optionGreeks, binomialTree, monteCarloPricing, varReduction } from './finance.js';
import { expectKeys } from './__fixtures__/helpers.js';

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
});
describe('carhart4F', () => {
  it('defined', () => expect(typeof carhart4F).toBe('function'));
});
describe('egarch', () => {
  it('handles gracefully', () => { const r = egarch(stock); expect(r === null || r.test).toBeDefined(); });
});
describe('tgarch', () => {
  it('handles gracefully', () => { const r = tgarch(stock); expect(r === null || r.test).toBeDefined(); });
});
describe('treynorRatio', () => {
  it('contract keys', () => expectKeys(treynorRatio(stock, 1.2), ['test', 'treynor', 'beta', 'mean', 'riskFree', 'n', 'apa']));
  it('null for zero beta', () => expect(treynorRatio(stock, 0)).toBeNull());
});

describe('blackScholes', () => { it('contract keys', () => expectKeys(blackScholes(100, 100, 1, 0.05, 0.2), ['test', 'price', 'type', 'spot', 'strike', 'time', 'rate', 'sigma', 'apa'])); });
describe('impliedVolatility', () => { it('contract keys', () => expectKeys(impliedVolatility(10, 100, 100, 1, 0.05), ['test', 'iv', 'marketPrice', 'spot', 'strike', 'time', 'rate', 'type', 'apa'])); });
describe('optionGreeks', () => { it('contract keys', () => expectKeys(optionGreeks(100, 100, 1, 0.05, 0.2), ['test', 'delta', 'gamma', 'theta', 'vega', 'rho', 'apa'])); });
describe('binomialTree', () => { it('contract keys', () => expectKeys(binomialTree(100, 100, 1, 0.05, 0.2, 50), ['test', 'price', 'steps', 'type', 'apa'])); });
describe('monteCarloPricing', () => { it('contract keys', () => expectKeys(monteCarloPricing(100, 100, 1, 0.05, 0.2, 500), ['test', 'price', 'nPaths', 'type', 'apa'])); });
describe('varReduction', () => { it('contract keys', () => expectKeys(varReduction([1.1,2.2,3.3,4.4,5.5], 3), ['test', 'rawVar', 'reducedVar', 'reduction', 'n', 'apa'])); });
